import * as http from 'http';
import { env } from './config/env';
import { chatRoute } from './routes/chat';
import { emotionRoute } from './routes/emotion';

const server = http.createServer((req: any, res: any) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    res.end();
    return;
  }

  const url = new URL(req.url || '/', 'http://localhost');
  const path = url.pathname;

  if (path === '/api/emotion') {
    emotionRoute(req, res);
    return;
  }

  if (path === '/api/chat') {
    chatRoute(req, res);
    return;
  }

  if (path === '/' && req.method === 'GET') {
    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json');
    res.end(
      JSON.stringify({
        service: 'Unbind AI Companion API',
        status: 'online',
      })
    );
    return;
  }

  res.statusCode = 404;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify({ error: 'Not found' }));
});

server.listen(env.port, () => {
  console.log(`Unbind AI server listening on port ${env.port}`);
});
