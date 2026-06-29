/**
 * 簽到共用：相機擷圖、GAS 送出
 * 寄信附件以鏡頭 JPEG 為主（小檔、穩定），不依賴 html2canvas 送後端
 */
window.MeetCheckin = {
  GAS_URL:
    'https://script.google.com/macros/s/AKfycbwYmxBxC34KK02UFW54hSX-VneckfVVm6rsTyEhCtCkamVvHmTf023EpmCydHyAsbV2WA/exec',
  MEET_URL: 'https://meet.google.com/kci-xjtu-dmr?hs=122',
  streamRef: null,

  /** 擷取鏡頭 JPEG（寬 480px，約 30–80KB，適合 GAS 與寄信附件） */
  captureWebcamJpeg(videoEl, maxW, quality) {
    if (!videoEl || videoEl.readyState !== 4 || !videoEl.videoWidth) {
      return '';
    }
    maxW = maxW || 480;
    quality = quality || 0.58;
    var w = videoEl.videoWidth;
    var h = videoEl.videoHeight;
    if (w > maxW) {
      h = Math.round((h * maxW) / w);
      w = maxW;
    }
    var canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    canvas.getContext('2d').drawImage(videoEl, 0, 0, w, h);
    return canvas.toDataURL('image/jpeg', quality);
  },

  sendToBackend(postData) {
    var body = JSON.stringify(postData);
    return fetch(this.GAS_URL, {
      method: 'POST',
      mode: 'no-cors',
      cache: 'no-cache',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: body,
    }).catch(function () {
      if (navigator.sendBeacon) {
        navigator.sendBeacon(
          window.MeetCheckin.GAS_URL,
          new Blob([body], { type: 'text/plain;charset=utf-8' })
        );
      }
    });
  },

  async startCamera() {
    const video = document.getElementById('webcam');
    const cameraStatus = document.getElementById('cameraStatus');
    try {
      if (!navigator.mediaDevices?.getUserMedia) throw new Error('不支援相機');
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user' },
        audio: false,
      });
      video.srcObject = stream;
      this.streamRef = stream;
      cameraStatus.style.display = 'none';
    } catch (err) {
      let msg = '無法存取相機';
      if (err.name === 'NotAllowedError') msg = '未取得相機權限';
      else if (err.name === 'NotFoundError') msg = '找不到相機裝置';
      cameraStatus.innerHTML =
        "<span class='text-red-500 font-bold'>" +
        msg +
        "</span><br><span class='text-xs mt-1 block'>（請允許相機以附簽到照片）</span>";
    }
  },

  stopCamera() {
    if (this.streamRef) {
      this.streamRef.getTracks().forEach((t) => t.stop());
      this.streamRef = null;
    }
  },

  resetCameraUI() {
    const video = document.getElementById('webcam');
    const photo = document.getElementById('capturedPhoto');
    const cameraStatus = document.getElementById('cameraStatus');
    if (!video) return;
    video.style.display = 'block';
    if (photo) photo.style.display = 'none';
    if (cameraStatus) {
      cameraStatus.style.display = 'flex';
      cameraStatus.innerHTML = '正在存取相機…<br>（請點擊允許）';
    }
  },

  capturePhotoPreview() {
    const video = document.getElementById('webcam');
    const photo = document.getElementById('capturedPhoto');
    const shot = this.captureWebcamJpeg(video);
    if (shot && photo) {
      photo.src = shot;
      photo.style.display = 'block';
      video.style.display = 'none';
    }
    return shot;
  },

  /**
   * 簽到送出：先擷取鏡頭照 → 寫入 postData.image → 送 GAS
   * videoEl 可傳 '#webcam' 元素或 '#guestWebcam'
   */
  submitSignIn(videoEl, postData, onDone) {
    const app = this;
    const video =
      typeof videoEl === 'string'
        ? document.querySelector(videoEl)
        : videoEl || document.getElementById('webcam');

    const shot = app.captureWebcamJpeg(video);
    if (!shot) {
      alert('無法擷取鏡頭畫面，請確認已允許相機權限後再試。');
      if (onDone) onDone(false);
      return Promise.resolve();
    }

    postData.image = shot;
    if (video && video.id === 'webcam') {
      app.capturePhotoPreview();
    }

    const btn = document.getElementById('submitBtn') || document.getElementById('guestSubmitBtn');
    if (btn) btn.style.display = 'none';

    return app.sendToBackend(postData).then(function () {
      app.stopCamera();
      if (onDone) onDone(true);
    });
  },

  /** 相容舊呼叫：視訊簽到頁 submitWithScreenshot */
  submitWithScreenshot(formAreaId, postData, onDone) {
    return this.submitSignIn(document.getElementById('webcam'), postData, onDone);
  },
};
