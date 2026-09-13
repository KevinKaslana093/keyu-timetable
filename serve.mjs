import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
const root=path.resolve('dist');
const types={'.html':'text/html;charset=utf-8','.js':'application/javascript','.mjs':'application/javascript','.json':'application/json','.css':'text/css','.svg':'image/svg+xml','.png':'image/png'};
http.createServer((req,res)=>{try{const route=decodeURIComponent(new URL(req.url,'http://localhost').pathname),file=path.resolve(root,'.'+(route==='/'?'/index.html':route));if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return;}const data=fs.readFileSync(file);res.writeHead(200,{'Content-Type':types[path.extname(file)]||'application/octet-stream'});res.end(data);}catch{res.writeHead(404).end('Not found');}}).listen(4173,'127.0.0.1',()=>console.log('课屿: http://127.0.0.1:4173'));
