import path from 'path';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig, loadEnv } from 'vite';

const workspaceRoot = path.resolve(import.meta.dirname, '../..');

export default defineConfig(async ({ mode }) => {
  // Shell/deployment variables override local files. Only VITE_-prefixed values
  // are exposed to browser code by Vite.
  const env = { ...loadEnv(mode, workspaceRoot, ''), ...process.env };
  const basePath = env.BASE_PATH ?? '/';
  const localApiUrl = env.LOCAL_API_URL ?? 'http://127.0.0.1:3001';
  const apiPort = new URL(localApiUrl).port || '3001';
  const rawPort = env.WEB_PORT ?? (env.PORT && env.PORT !== apiPort ? env.PORT : '5173');
  const port = Number(rawPort);

  if (Number.isNaN(port) || port <= 0) {
    throw new Error(`Invalid PORT value: "${rawPort}"`);
  }

  return {
    base: basePath,
    envDir: workspaceRoot,
    plugins: [
      react(),
      tailwindcss({ optimize: false }),
    ],
    resolve: {
      alias: {
        '@': path.resolve(import.meta.dirname, 'src'),
        '@assets': path.resolve(
          import.meta.dirname,
          '..',
          '..',
          'attached_assets',
        ),
      },
      dedupe: ['react', 'react-dom'],
    },
    root: path.resolve(import.meta.dirname),
    build: {
      outDir: path.resolve(import.meta.dirname, 'dist/public'),
      emptyOutDir: true,
    },
    server: {
      port,
      strictPort: true,
      host: '0.0.0.0',
      allowedHosts: true,
      proxy: {
        '/api': {
          target: localApiUrl,
          // Keep the browser-facing Host header so the API's same-origin
          // mutation check continues to compare against the real web origin.
          changeOrigin: false,
        },
      },
      fs: {
        strict: true,
      },
    },
    preview: {
      port,
      host: '0.0.0.0',
      allowedHosts: true,
    },
  };
});
