import path from 'path';
import dotenv from 'dotenv';

// Load environment variables from local or root .env
dotenv.config({ path: path.resolve(__dirname, '../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

import { createApp } from './app';
import { APP_CONFIG } from '@tempo/shared';

const PORT = parseInt(process.env.PORT || `${APP_CONFIG.DEFAULT_PORT}`, 10);
const app = createApp();

if (process.env.VERCEL !== '1' && process.env.NODE_ENV !== 'test') {
  const server = app.listen(PORT, () => {
    // eslint-disable-next-line no-console
    console.log(`===============================================`);
    // eslint-disable-next-line no-console
    console.log(`🚀 Tempo API Server running on port ${PORT}`);
    // eslint-disable-next-line no-console
    console.log(`   Health check: http://localhost:${PORT}/health`);
    // eslint-disable-next-line no-console
    console.log(`   API Health:   http://localhost:${PORT}/api/health`);
    // eslint-disable-next-line no-console
    console.log(`   Environment:  ${process.env.NODE_ENV || 'development'}`);
    // eslint-disable-next-line no-console
    console.log(`===============================================`);
  });

  // Graceful shutdown handling
  const shutdown = (signal: string) => {
    // eslint-disable-next-line no-console
    console.log(`Received ${signal}. Shutting down Tempo API gracefully...`);
    server.close(() => {
      // eslint-disable-next-line no-console
      console.log('HTTP server closed.');
      process.exit(0);
    });

    // Force shutdown after timeout
    setTimeout(() => {
      // eslint-disable-next-line no-console
      console.error('Forced shutdown due to timeout.');
      process.exit(1);
    }, 5000);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

export { app };
export default app;

if (typeof module !== 'undefined' && module.exports) {
  // Support both direct CommonJS function require and ES default export
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (module.exports as any) = app;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (module.exports as any).default = app;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (module.exports as any).app = app;
}
