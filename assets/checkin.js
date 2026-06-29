/**
 * 簽到共用：相機、截圖壓縮、GAS 送出
 * 與視訊委員填答相同：fetch + no-cors + postData.contents
 */
window.MeetCheckin = {
  GAS_URL:
    'https://script.google.com/macros/s/AKfycbwYmxBxC34KK02UFW54hSX-VneckfVVm6rsTyEhCtCkamVvHmTf023EpmCydHyAsbV2WA/exec',
  MEET_URL: 'https://meet.google.com/kci-xjtu-dmr?hs=122',
  streamRef: null,

  /** 從 video 元素擷取小尺寸 JPEG（寄信附件備援，最可靠） */
  captureWebcamJpeg(videoEl, maxW, quality) {
    if (!videoEl || videoEl.readyState !== 4 || !videoEl.videoWidth) {
      return '';
    }
    maxW = maxW || 640;
    quality = quality || 0.62;
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

  /** 壓縮截圖；失敗時保留原圖（若不太大） */
  compressImageDataUrl(dataUrl, maxW, quality) {
    maxW = maxW || 720;
    quality = quality || 0.55;
    return new Promise(function (resolve) {
      if (!dataUrl || dataUrl.indexOf('data:image') !== 0) {
        resolve('');
        return;
      }
      var img = new Image();
      img.onload = function () {
        var w = img.width;
        var h = img.height;
        if (w > maxW) {
          h = Math.round((h * maxW) / w);
          w = maxW;
        }
        var canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        canvas.getContext('2d').drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.onerror = function () {
        /* 壓縮失敗時勿丟棄，原圖若 < 900KB 仍送出 */
        resolve(dataUrl.length < 900000 ? dataUrl : '');
      };
      img.src = dataUrl;
    });
  },

  /** 合併表單截圖與鏡頭快照，確保至少有一張圖送到 GAS */
  prepareImagesForSend(postData) {
    var self = this;
    var webcamShot = postData.photo || '';
    var formShot = postData.image || '';
    return self.compressImageDataUrl(formShot).then(function (compressed) {
      postData.image = compressed || webcamShot || formShot || '';
      delete postData.photo;
      if (!postData.image) {
        postData.imageOmitted = true;
      }
      return postData;
    });
  },

  sendToBackend(postData) {
    var self = this;
    return self.prepareImagesForSend(postData).then(function (ready) {
      var body = JSON.stringify(ready);
      return fetch(self.GAS_URL, {
        method: 'POST',
        mode: 'no-cors',
        cache: 'no-cache',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: body,
      }).catch(function () {
        if (navigator.sendBeacon) {
          navigator.sendBeacon(
            self.GAS_URL,
            new Blob([body], { type: 'text/plain;charset=utf-8' })
          );
        }
      });
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
        "</span><br><span class='text-xs mt-1 block'>（不影響簽到，仍可送出）</span>";
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
    video.style.display = 'block';
    photo.style.display = 'none';
    cameraStatus.style.display = 'flex';
    cameraStatus.innerHTML = '正在存取相機…<br>（請點擊允許）';
  },

  capturePhotoPreview() {
    const video = document.getElementById('webcam');
    const photo = document.getElementById('capturedPhoto');
    const shot = this.captureWebcamJpeg(video);
    if (shot) {
      photo.src = shot;
      photo.style.display = 'block';
      video.style.display = 'none';
    }
  },

  submitWithScreenshot(formAreaId, postData, onDone) {
    const app = this;
    const video = document.getElementById('webcam');
    postData.photo = app.captureWebcamJpeg(video);
    app.capturePhotoPreview();
    const btn = document.getElementById('submitBtn');
    if (btn) btn.style.display = 'none';

    setTimeout(function () {
      html2canvas(document.getElementById(formAreaId), {
        backgroundColor: '#ffffff',
        scale: 1,
        useCORS: true,
        logging: false,
      })
        .then(function (canvas) {
          postData.image = canvas.toDataURL('image/jpeg', 0.65);
          return app.sendToBackend(postData);
        })
        .then(function () {
          app.stopCamera();
          if (onDone) onDone(true);
        })
        .catch(function () {
          /* html2canvas 失敗仍送鏡頭快照 */
          postData.image = '';
          app.sendToBackend(postData).finally(function () {
            app.stopCamera();
            if (onDone) onDone(false);
          });
        });
    }, 150);
  },
};
