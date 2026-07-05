/**
 * 簽到共用：相機擷圖、GAS 送出（v4）
 */
window.MeetCheckin = {
  GAS_URL:
    'https://script.google.com/macros/s/AKfycbwWh5saY0FCsGB7firXQsxcr7buDlPdwLYxea10EeRrsNeYaj9i_HAfudv5Mp3ryQCROg/exec',
  MEET_URL: 'https://meet.google.com/kci-xjtu-dmr?hs=122',
  streamRef: null,

  waitForVideoReady(video, timeoutMs) {
    timeoutMs = timeoutMs || 8000;
    return new Promise(function (resolve, reject) {
      if (!video) {
        reject(new Error('no video'));
        return;
      }
      function ok() {
        if (video.videoWidth > 0 && video.videoHeight > 0) {
          resolve(video);
        }
      }
      ok();
      if (video.videoWidth > 0) {
        resolve(video);
        return;
      }
      var timer = setTimeout(function () {
        reject(new Error('相機逾時'));
      }, timeoutMs);
      video.onloadedmetadata = function () {
        video.play().catch(function () {});
      };
      video.onloadeddata = function () {
        clearTimeout(timer);
        ok();
        resolve(video);
      };
    });
  },

  captureWebcamJpeg(videoEl, maxW, quality) {
    if (!videoEl || !videoEl.videoWidth || !videoEl.videoHeight) {
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

  async bindStreamToVideo(video, stream, statusEl) {
    if (!video) return;
    video.setAttribute('playsinline', 'true');
    video.setAttribute('autoplay', 'true');
    video.muted = true;
    video.srcObject = stream;
    try {
      await video.play();
    } catch (e) {
      /* iOS 可能需使用者手勢，略過 */
    }
    try {
      await this.waitForVideoReady(video, 8000);
      if (statusEl) statusEl.style.display = 'none';
      this.setSubmitReady(true);
    } catch (e) {
      if (statusEl) {
        statusEl.innerHTML =
          "<span class='text-amber-600 font-bold'>相機載入中…</span><br><span class='text-xs'>若持續無畫面請重新整理</span>";
      }
    }
  },

  setSubmitReady(ready) {
    ['submitBtn', 'guestSubmitBtn'].forEach(function (id) {
      var btn = document.getElementById(id);
      if (!btn) return;
      btn.disabled = !ready;
      btn.style.opacity = ready ? '1' : '0.5';
    });
  },

  async startCamera() {
    const video = document.getElementById('webcam');
    const cameraStatus = document.getElementById('cameraStatus');
    this.setSubmitReady(false);
    try {
      if (!navigator.mediaDevices?.getUserMedia) throw new Error('不支援相機');
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
        audio: false,
      });
      this.streamRef = stream;
      await this.bindStreamToVideo(video, stream, cameraStatus);
    } catch (err) {
      let msg = '無法存取相機';
      if (err.name === 'NotAllowedError') msg = '未取得相機權限';
      else if (err.name === 'NotFoundError') msg = '找不到相機裝置';
      if (cameraStatus) {
        cameraStatus.innerHTML =
          "<span class='text-red-500 font-bold'>" +
          msg +
          "</span><br><span class='text-xs mt-1 block'>（請允許相機以附簽到照片）</span>";
      }
      this.setSubmitReady(false);
    }
  },

  stopCamera() {
    if (this.streamRef) {
      this.streamRef.getTracks().forEach(function (t) {
        t.stop();
      });
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
    this.setSubmitReady(false);
  },

  capturePhotoPreview(video, photo) {
    video = video || document.getElementById('webcam');
    photo = photo || document.getElementById('capturedPhoto');
    var shot = this.captureWebcamJpeg(video);
    if (shot && photo) {
      photo.src = shot;
      photo.style.display = 'block';
      if (video) video.style.display = 'none';
    }
    return shot;
  },

  async submitSignIn(videoEl, postData, onDone) {
    var app = this;
    var video =
      typeof videoEl === 'string'
        ? document.querySelector(videoEl)
        : videoEl || document.getElementById('webcam');
    var photo =
      video && video.id === 'guestWebcam'
        ? document.getElementById('guestCapturedPhoto')
        : document.getElementById('capturedPhoto');

    try {
      if (video) await app.waitForVideoReady(video, 5000);
    } catch (e) {
      /* 仍嘗試擷取 */
    }

    var shot = app.captureWebcamJpeg(video);
    if (!shot && photo && photo.src && photo.src.indexOf('data:image') === 0) {
      shot = photo.src;
    }
    if (!shot) {
      alert('無法擷取鏡頭畫面。\n請確認：\n1. 已允許相機\n2. 畫面中看得到自己\n3. 再按一次簽到');
      postData.imageLen = 0;
      if (onDone) onDone(false);
      return;
    }

    postData.image = shot;
    postData.imageLen = shot.length;

    if (video && video.id === 'webcam') {
      app.capturePhotoPreview(video, photo);
    } else if (video && photo && shot) {
      photo.src = shot;
      photo.style.display = 'block';
      video.style.display = 'none';
    }

    var btn = document.getElementById('submitBtn') || document.getElementById('guestSubmitBtn');
    if (btn) btn.style.display = 'none';

    return app.sendToBackend(postData).then(function () {
      app.stopCamera();
      if (onDone) onDone(true);
    });
  },

  submitWithScreenshot(formAreaId, postData, onDone) {
    return this.submitSignIn(document.getElementById('webcam'), postData, onDone);
  },
};
