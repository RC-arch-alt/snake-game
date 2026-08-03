const http = require('http');
const fs = require('fs');
const path = require('path');

const port = 3000;

const server = http.createServer((req, res) => {
  console.log('Request received:', req.url);

  // Sanitize the URL: resolve against __dirname and prevent directory traversal
  // 1. Decode URI components
  // 2. Resolve against project root
  // 3. Verify the result is still inside the project directory
  const decodedUrl = decodeURIComponent(req.url);
  const requestedPath = path.resolve(__dirname, '.' + decodedUrl);

  // Ensure we don't escape the project directory
  if (!requestedPath.startsWith(__dirname)) {
    res.writeHead(403, { 'Content-Type': 'text/plain' });
    return res.end('Forbidden');
  }

  // Default to index.html for '/'
  let filePath = req.url === '/' ? path.join(__dirname, 'index.html') : requestedPath;

  fs.readFile(filePath, (err, data) => {
    if (err) {
      if (err.code === 'ENOENT') {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        return res.end('Not Found');
      }
      res.writeHead(500, { 'Content-Type': 'text/plain' });
      return res.end('Server Error');
    }

    const extname = path.extname(filePath);
    let contentType = 'text/html';

    switch (extname) {
      case '.js':
        contentType = 'text/javascript';
        break;
      case '.css':
        contentType = 'text/css';
        break;
      case '.json':
        contentType = 'application/json';
        break;
      case '.png':
        contentType = 'image/png';
        break;
      case '.jpg':
      case '.jpeg':
        contentType = 'image/jpeg';
        break;
    }

    res.writeHead(200, { 'Content-Type': contentType });
    res.end(data, 'utf-8');
  });
});

server.listen(port, () => {
  console.log(`Server running at http://localhost:${port}/`);
});