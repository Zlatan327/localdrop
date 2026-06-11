let serverIp = 'localhost';
let serverPort = 3000;
let shareQrCodeInstance = null;

async function init() {
  try {
    const res = await fetch('/api/ip');
    const data = await res.json();
    serverIp = data.ip;
    serverPort = data.port;
    
    const uploadUrl = `http://${serverIp}:${serverPort}/upload`;
    document.getElementById('url-box').innerText = uploadUrl;

    if (serverIp === 'localhost') {
      document.getElementById('offline-warning').style.display = 'block';
    }
    
    new QRCode(document.getElementById("qrcode"), {
      text: uploadUrl,
      width: 200,
      height: 200,
      colorDark: "#000000",
      colorLight: "#ffffff",
      correctLevel: QRCode.CorrectLevel.L
    });

    fetchFiles();
    setInterval(fetchFiles, 3000);
  } catch (e) {
    console.error('Init failed', e);
    throw new Error('Failed to initialize dashboard: ' + e.message);
  }
}

async function fetchFiles() {
  try {
    const res = await fetch('/api/files');
    const data = await res.json();
    const list = document.getElementById('file-list');
    
    if (!data.files || data.files.length === 0) {
      list.innerHTML = `
        <div style="text-align: center; padding: 3rem 1rem; color: var(--text-muted); border: 2px dashed var(--border); border-radius: 1rem;">
          <p>No files available. Share a file from PC or upload from a device.</p>
        </div>
      `;
      return;
    }

    list.innerHTML = data.files.map(f => {
      const ext = f.name.split('.').pop().toLowerCase();
      let iconSvg = '<path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/>';
      let iconColor = 'var(--primary)';
      let iconBg = 'rgba(59, 130, 246, 0.1)';

      if (['zip', 'rar', 'tar', 'gz', '7z'].includes(ext)) {
        iconSvg = '<path d="M21 8v13H3V3h13l5 5z"/><path d="M21 8h-5V3"/><path d="M10 12v6"/><path d="M14 12v6"/><path d="M10 12h4"/><path d="M10 15h4"/><path d="M10 18h4"/>';
        iconColor = '#f59e0b';
        iconBg = 'rgba(245, 158, 11, 0.1)';
      } else if (['js', 'ts', 'py', 'java', 'c', 'cpp', 'html', 'css', 'json'].includes(ext)) {
        iconSvg = '<polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/>';
        iconColor = '#8b5cf6';
        iconBg = 'rgba(139, 92, 246, 0.1)';
      } else if (['pdf', 'doc', 'docx', 'txt', 'csv', 'xlsx'].includes(ext)) {
        iconSvg = '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/>';
        iconColor = '#10b981';
        iconBg = 'rgba(16, 185, 129, 0.1)';
      } else if (['png', 'jpg', 'jpeg', 'svg', 'gif', 'webp'].includes(ext)) {
        iconSvg = '<rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/>';
        iconColor = '#ec4899';
        iconBg = 'rgba(236, 72, 153, 0.1)';
      } else if (['mp4', 'mov', 'avi', 'mkv', 'webm'].includes(ext)) {
        iconSvg = '<rect x="2" y="2" width="20" height="20" rx="2.18" ry="2.18"/><line x1="7" y1="2" x2="7" y2="22"/><line x1="17" y1="2" x2="17" y2="22"/><line x1="2" y1="12" x2="22" y2="12"/><line x1="2" y1="7" x2="7" y2="7"/><line x1="2" y1="17" x2="7" y2="17"/><line x1="17" y1="17" x2="22" y2="17"/><line x1="17" y1="7" x2="22" y2="7"/>';
        iconColor = '#ef4444';
        iconBg = 'rgba(239, 68, 68, 0.1)';
      }

      const shareUrl = `http://${serverIp}:${serverPort}/download/${encodeURIComponent(f.name)}`;

      return `
      <div class="file-item">
        <div class="file-icon" style="color: ${iconColor}; background: ${iconBg};">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${iconSvg}</svg>
        </div>
        <div class="file-info">
          <div class="file-name" title="${f.name}">${f.name}</div>
          <div class="file-meta">
            ${(f.size / 1024 / 1024).toFixed(2)} MB &bull; ${new Date(f.createdAt).toLocaleString()}
          </div>
        </div>
        <button class="action-btn" onclick="openShareModal('${shareUrl}')">Share</button>
      </div>
    `}).join('');

  } catch (e) {
    console.error('Fetch files failed', e);
    throw new Error('Failed to load files: ' + e.message);
  }
}

// Share Modal Logic
function openShareModal(url) {
  document.getElementById('share-url-box').innerText = url;
  
  const qrContainer = document.getElementById('share-qrcode');
  qrContainer.innerHTML = '';
  
  new QRCode(qrContainer, {
    text: url,
    width: 180,
    height: 180,
    colorDark: "#000000",
    colorLight: "#ffffff",
    correctLevel: QRCode.CorrectLevel.L
  });
  
  document.getElementById('share-modal').classList.add('active');
}

function closeShareModal(event) {
  if (event && event.target !== event.currentTarget) return;
  document.getElementById('share-modal').classList.remove('active');
}

function copyShareLink() {
  const url = document.getElementById('share-url-box').innerText;
  navigator.clipboard.writeText(url).then(() => {
    const btn = document.querySelector('.modal-content .btn');
    const origText = btn.innerText;
    btn.innerText = 'Copied!';
    setTimeout(() => btn.innerText = origText, 2000);
  });
}

// PC Upload Logic
function handlePcFileSelect(event) {
  const file = event.target.files[0];
  if (!file) return;

  const xhr = new XMLHttpRequest();
  xhr.upload.onprogress = function(e) {
    if (e.lengthComputable) {
      const percent = (e.loaded / e.total) * 100;
      document.getElementById('pc-progress').style.width = percent + '%';
    }
  };

  xhr.onload = function() {
    document.getElementById('pc-progress').style.width = '0%';
    if (xhr.status === 200) {
      fetchFiles();
    } else {
      throw new Error('Upload failed with status: ' + xhr.status);
    }
  };

  xhr.open('POST', '/api/upload', true);
  xhr.setRequestHeader('Content-Type', 'application/octet-stream');
  xhr.setRequestHeader('X-File-Name', encodeURIComponent(file.name));
  xhr.send(file);
}

// Event Listeners for Dropzone
document.addEventListener('DOMContentLoaded', () => {
  const pcDropzone = document.getElementById('pc-dropzone');
  if (pcDropzone) {
    pcDropzone.addEventListener('dragover', (e) => {
      e.preventDefault();
      pcDropzone.classList.add('dragover');
    });
    pcDropzone.addEventListener('dragleave', () => pcDropzone.classList.remove('dragover'));
    pcDropzone.addEventListener('drop', (e) => {
      e.preventDefault();
      pcDropzone.classList.remove('dragover');
      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        document.getElementById('pc-fileInput').files = e.dataTransfer.files;
        handlePcFileSelect({ target: { files: e.dataTransfer.files } });
      }
    });
  }

  // Initialize App
  init();
});
