import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig(async () => {
  // Dynamically import ESM-only MDX plugin to avoid require() error
  const { default: mdx } = await import('@mdx-js/rollup');
  const { default: remarkGfm } = await import('remark-gfm');

  return {
    plugins: [
      // MDX must come before react so JSX inside MDX is handled correctly
      mdx({
        remarkPlugins: [remarkGfm],
      }),
      react(),
    ],
    server: {
      port: 3000,
      open: true,
      host: true,
      proxy: {
        '/api': 'http://localhost:3001',
        '/auth': 'http://localhost:3001'
      }
    },
    build: {
      outDir: 'dist',
      assetsDir: 'assets',
      sourcemap: true
    },
    css: {
      devSourcemap: true
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, 'src'),
      },
    },
  };
});
