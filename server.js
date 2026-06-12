const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');

const PORT_START = 3000;
let PORT = PORT_START;
const UPLOAD_DIR = path.join(__dirname, 'uploads');
const PUBLIC_DIR = path.join(__dirname, 'public');

// Ensure upload directory exists
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

// Get Local IP
function getLocalIp() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return 'localhost';
}

const server = http.createServer((req, res) => {
  // CORS for safety
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, X-File-Name');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    return res.end();
  }

  // --- API Routes ---
  if (req.url === '/api/upload' && req.method === 'POST') {
    const rawFileName = req.headers['x-file-name'];
    if (!rawFileName) {
      res.writeHead(400);
      return res.end(JSON.stringify({ error: 'No X-File-Name header provided.' }));
    }

    const safeName = decodeURIComponent(rawFileName).replace(/[^a-zA-Z0-9.-]/g, '_');
    const timestamp = Date.now();
    const finalName = `${timestamp}-${safeName}`;
    const filePath = path.join(UPLOAD_DIR, finalName);

    const writeStream = fs.createWriteStream(filePath);
    
    req.pipe(writeStream);

    req.on('end', () => {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true, message: 'File saved successfully' }));
    });

    req.on('error', (err) => {
      console.error('Upload Error:', err);
      writeStream.destroy();
      res.writeHead(500);
      res.end(JSON.stringify({ error: 'Failed to upload' }));
    });

    req.on('aborted', () => {
      console.warn(`Upload aborted by client. Cleaning up partial file: ${finalName}`);
      writeStream.destroy();
      fs.unlink(filePath, (err) => {
        if (err) console.error('Error cleaning up aborted file:', err);
      });
    });
    return;
  }

  if (req.url === '/api/files' && req.method === 'GET') {
    fs.readdir(UPLOAD_DIR, (err, files) => {
      if (err) {
        res.writeHead(500);
        return res.end(JSON.stringify({ error: 'Failed to read dir' }));
      }

      const fileStats = files.map(file => {
        const stats = fs.statSync(path.join(UPLOAD_DIR, file));
        return {
          name: file,
          size: stats.size,
          createdAt: stats.birthtime
        };
      });

      fileStats.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ files: fileStats }));
    });
    return;
  }

  if (req.url.startsWith('/download/') && req.method === 'GET') {
    const filename = decodeURIComponent(req.url.substring('/download/'.length));
    // Basic protection against directory traversal
    const safeFilename = path.basename(filename);
    const filePath = path.join(UPLOAD_DIR, safeFilename);

    fs.access(filePath, fs.constants.F_OK, (err) => {
      if (err) {
        res.writeHead(404);
        return res.end('File not found');
      }

      const stat = fs.statSync(filePath);
      
      // Remove timestamp for the download name if we want, or keep it. We'll keep it for simplicity.
      // E.g., 1717140889123-MyVideo.mp4 -> MyVideo.mp4
      const originalNameMatch = safeFilename.match(/^\d+-(.+)$/);
      const downloadName = originalNameMatch ? originalNameMatch[1] : safeFilename;

      res.writeHead(200, {
        'Content-Type': 'application/octet-stream',
        'Content-Length': stat.size,
        'Content-Disposition': `attachment; filename="${downloadName.replace(/"/g, '\\"')}"`
      });

      const readStream = fs.createReadStream(filePath);
      readStream.pipe(res);
    });
    return;
  }

  if (req.url === '/api/ip' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ ip: getLocalIp(), port: PORT }));
    return;
  }

  // --- Static Files Serving ---
  // The user might send something like /../../../windows/system32/cmd.exe
  // path.normalize resolves these.
  const normalizedUrl = path.normalize(req.url === '/' ? '/index.html' : req.url);
  let filePath = path.join(PUBLIC_DIR, normalizedUrl);
  
  if (req.url === '/upload') {
    filePath = path.join(PUBLIC_DIR, 'upload.html');
  }

  // Security check: Directory Traversal Prevention
  // Ensure that the final resolved absolute path actually resides within our public folder.
  if (!filePath.startsWith(PUBLIC_DIR)) {
    console.warn(`Directory Traversal Attempt Blocked: ${req.url}`);
    res.writeHead(403);
    return res.end('403 Forbidden: Invalid Path');
  }

  const extname = String(path.extname(filePath)).toLowerCase();
  const mimeTypes = {
    '.html': 'text/html',
    '.js': 'text/javascript',
    '.css': 'text/css',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpg',
    '.svg': 'image/svg+xml'
  };

  const contentType = mimeTypes[extname] || 'application/octet-stream';

  fs.readFile(filePath, (error, content) => {
    if (error) {
      if (error.code === 'ENOENT') {
        res.writeHead(404);
        res.end('404 Not Found');
      } else {
        res.writeHead(500);
        res.end(`Server Error: ${error.code}`);
      }
    } else {
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(content, 'utf-8');
    }
  });
});

function startServer(port) {
  server.listen(port, '0.0.0.0')
    .on('listening', () => {
      PORT = port;
      console.log(`\n==============================================`);
      console.log(`LocalDrop Server running!`);
      console.log(`Access dashboard on PC: http://127.0.0.1:${PORT}`);
      console.log(`Access on mobile device: http://${getLocalIp()}:${PORT}/upload`);
      console.log(`==============================================\n`);
      
      const { exec } = require('child_process');
      const startCommand = process.platform === 'win32' ? 'start' : process.platform === 'darwin' ? 'open' : 'xdg-open';
      exec(`${startCommand} http://127.0.0.1:${PORT}`);
    })
    .on('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        console.log(`Port ${port} is in use, trying ${port + 1}...`);
        startServer(port + 1);
      } else {
        console.error('Server failed to start:', err);
      }
    });
}

startServer(PORT);
