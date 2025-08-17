
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';

const port = process.env.PORT || 5050;
const dirArg = process.argv.find(a => a.startsWith('--dir='));
const root = dirArg ? path.resolve(dirArg.split('=')[1]) : path.resolve('dist');

const server = http.createServer((req, res) => {
  const parsed = url.parse(req.url);
  let pathname = decodeURIComponent(parsed.pathname || '/');
  if (pathname.endsWith('/')) pathname += 'index.html';
  const filePath = path.join(root, pathname);

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404);
      res.end('Not found');
    } else {
      res.writeHead(200);
      res.end(data);
    }
  });
});

server.listen(port, () => {
  console.log(`Static server running at http://localhost:${port} serving ${root}`);
});
