/**
 * 簽到共用：相機、截圖、GAS 送出
 */
window.MeetCheckin = {
  GAS_URL: 'https://script.google.com/macros/s/AKfycbwYmxBxC34KK02UFW54hSX-VneckfVVm6rsTyEhCtCkamVvHmTf023EpmCydHyAsbV2WA/exec',
  MEET_URL: 'https://meet.google.com/kci-xjtu-dmr?hs=122',
  streamRef: null,

  sendToBackend(postData) {
    const body = JSON.stringify(postData);
    try {
      let iframe = document.getElementById('gas_hidden_frame');
      if (!iframe) {
        iframe = document.createElement('iframe');
        iframe.name = iframe.id = 'gas_hidden_frame';
        iframe.style.display = 'none';
        document.body.appendChild(iframe);
      }
      const form = document.createElement('form');
      form.method = 'POST';
      form.action = this.GAS_URL;
      form.target = 'gas_hidden_frame';
      form.style.display = 'none';
      const input = document.createElement('input');
      input.type = 'hidden';
      input.name = 'payload';
      input.value = body;
      form.appendChild(input);
      document.body.appendChild(form);
      form.submit();
      setTimeout(() => form.remove(), 3000);
    } catch (e) {
      if (navigator.sendBeacon) {
        navigator.sendBeacon(this.GAS_URL, new Blob([body], { type: 'text/plain;charset=utf-8' }));
      }
    }
  },

  async startCamera() {
    const video = document.getElementById('webcam');
    const cameraStatus = document.getElementById('cameraStatus');
    try {
      if (!navigator.mediaDevices?.getUserMedia) throw new Error('不支援相機');
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' }, audio: false });
      video.srcObject = stream;
      this.streamRef = stream;
      cameraStatus.style.display = 'none';
    } catch (err) {
      let msg = '無法存取相機';
      if (err.name === 'NotAllowedError') msg = '未取得相機權限';
      else if (err.name === 'NotFoundError') msg = '找不到相機裝置';
      cameraStatus.innerHTML = `<span class="text-red-500 font-bold">${msg}</span><br><span class="text-xs mt-1 block">（不影響簽到，仍可送出）</span>`;
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
    if (this.streamRef && video.readyState === 4) {
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      canvas.getContext('2d').drawImage(video, 0, 0);
      photo.src = canvas.toDataURL('image/jpeg', 0.8);
      photo.style.display = 'block';
      video.style.display = 'none';
    }
  },

  submitWithScreenshot(formAreaId, postData, onDone) {
    const app = this;
    app.capturePhotoPreview();
    document.getElementById('submitBtn').style.display = 'none';

    setTimeout(() => {
      html2canvas(document.getElementById(formAreaId), {
        backgroundColor: '#ffffff',
        scale: 1.5,
        useCORS: true,
        logging: false,
      })
        .then((canvas) => {
          postData.image = canvas.toDataURL('image/jpeg', 0.8);
          app.sendToBackend(postData);
          app.stopCamera();
          onDone(true);
        })
        .catch(() => {
          postData.image = '';
          app.sendToBackend(postData);
          app.stopCamera();
          onDone(false);
        });
    }, 150);
  },
};
