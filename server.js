const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');

const PORT = 3000;
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
      console.error(err);
      res.writeHead(500);
      res.end(JSON.stringify({ error: 'Failed to upload' }));
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

  if (req.url === '/api/ip' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ ip: getLocalIp(), port: PORT }));
    return;
  }

  // --- Static Files Serving ---
  let filePath = path.join(PUBLIC_DIR, req.url === '/' ? 'index.html' : req.url);
  
  if (req.url === '/upload') {
    filePath = path.join(PUBLIC_DIR, 'upload.html');
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

server.listen(PORT, '0.0.0.0', () => {
  console.log(`\n==============================================`);
  console.log(`LocalDrop Server running!`);
  console.log(`Access dashboard on PC: http://localhost:${PORT}`);
  console.log(`Access on mobile device: http://${getLocalIp()}:${PORT}/upload`);
  console.log(`==============================================\n`);
});
