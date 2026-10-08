import { createServer } from 'node:http';
import type { AddressInfo } from 'node:net';
import type { Server } from 'node:http';

export interface CapturedRequest {
  path: string;
  authorization: string | undefined;
  form: URLSearchParams;
}

export type FakeTwilioMode =
  | { kind: 'ok' }
  | { kind: 'error'; status: number; code: number }
  | { kind: 'slow'; delayMs: number };

/** Servidor HTTP local que imita a API de mensagens da Twilio. */
export async function startFakeTwilio() {
  const requests: CapturedRequest[] = [];
  let mode: FakeTwilioMode = { kind: 'ok' };

  const server: Server = createServer((req, res) => {
    let raw = '';
    req.on('data', (chunk) => (raw += chunk));
    req.on('end', () => {
      requests.push({ path: req.url ?? '', authorization: req.headers.authorization, form: new URLSearchParams(raw) });
      const reply = () => {
        res.setHeader('Content-Type', 'application/json');
        if (mode.kind === 'error') {
          res.statusCode = mode.status;
          res.end(JSON.stringify({ code: mode.code, message: 'erro simulado', status: mode.status }));
          return;
        }
        res.statusCode = 201;
        res.end(JSON.stringify({ sid: `SM${requests.length}`, status: 'queued' }));
      };
      if (mode.kind === 'slow') setTimeout(reply, mode.delayMs);
      else reply();
    });
  });

  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address() as AddressInfo;

  return {
    url: `http://127.0.0.1:${port}`,
    requests,
    setMode: (next: FakeTwilioMode) => {
      mode = next;
    },
    close: () =>
      new Promise<void>((resolve) => {
        server.closeAllConnections();
        server.close(() => resolve());
      }),
  };
}
