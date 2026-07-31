import { defineConfig, Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import fs from 'node:fs';
import path from 'node:path';

const localRoomStorePath = path.resolve(process.cwd(), '.monopoly-rooms.local.json');

const readRooms = (): Record<string, unknown> => {
  try {
    return JSON.parse(fs.readFileSync(localRoomStorePath, 'utf8')) as Record<string, unknown>;
  } catch {
    return {};
  }
};

const writeRooms = (rooms: Record<string, unknown>) => {
  fs.writeFileSync(localRoomStorePath, `${JSON.stringify(rooms, null, 2)}\n`);
};

const localRoomApi = (): Plugin => {
  return {
    name: 'local-room-api',
    configureServer(server) {
      server.middlewares.use('/api/rooms', (req, res) => {
        const url = new URL(req.url ?? '/', 'http://localhost');
        const roomCode = url.pathname.replace(/^\//, '').trim().toUpperCase();

        if (!roomCode) {
          res.statusCode = 400;
          res.end(JSON.stringify({ error: 'Missing room code' }));
          return;
        }

        if (req.method === 'GET') {
          const rooms = readRooms();
          const state = rooms[roomCode] ?? null;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ state }));
          return;
        }

        if (req.method === 'PUT') {
          let body = '';
          req.on('data', (chunk) => {
            body += chunk;
          });
          req.on('end', () => {
            try {
              const parsed = JSON.parse(body || '{}') as { state?: unknown };
              if (!parsed.state) {
                res.statusCode = 400;
                res.end(JSON.stringify({ error: 'Missing state' }));
                return;
              }
              const rooms = readRooms();
              rooms[roomCode] = parsed.state;
              writeRooms(rooms);
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ ok: true }));
            } catch {
              res.statusCode = 400;
              res.end(JSON.stringify({ error: 'Invalid JSON' }));
            }
          });
          return;
        }

        res.statusCode = 405;
        res.end(JSON.stringify({ error: 'Method not allowed' }));
      });
    }
  };
};

export default defineConfig({
  plugins: [react(), localRoomApi()],
  root: '.',
  build: {
    outDir: 'dist',
    emptyOutDir: true
  }
});
