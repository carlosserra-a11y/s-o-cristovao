/**
 * Ponto de entrada (mantido na raiz para preservar os scripts `npm run dev`
 * e `npm start`). Toda a lógica vive em ./server — veja server/app.ts.
 */
import { startServer } from './server/server.ts';

startServer().catch((error: unknown) => {
  console.error('Falha ao iniciar o servidor:', error);
  process.exit(1);
});
