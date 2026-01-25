import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, __dirname, '');
  const normalizeBasePath = (value: string | undefined): string => {
    const trimmed = (value ?? '').trim();
    if (!trimmed || trimmed === '/') {
      return '';
    }
    const withLeading = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
    return withLeading.endsWith('/') ? withLeading.slice(0, -1) : withLeading;
  };

  const basePath = normalizeBasePath(env.VITE_BASE_PATH);
  const apiProxyPath = basePath ? `${basePath}/api` : '/api';

  return {
    plugins: [react()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    base: basePath ? `${basePath}/` : '/',
    define: {
      __MANIFEST_UPLOAD_CONCURRENCY__: JSON.stringify(
        env.MANIFEST_UPLOAD_CONCURRENCY ?? '',
      ),
    },
    server: {
      port: 3001,
      proxy: {
        [apiProxyPath]: {
          target: 'http://localhost:3000',
          changeOrigin: true,
        },
      },
    },
  };
});
