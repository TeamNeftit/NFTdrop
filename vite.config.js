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
      strictPort: true, // ensures it never jumps to 3001 automatically
      open: true,
      host: true,
      proxy: {
        '/api': { target: 'http://127.0.0.1:3001', changeOrigin: true },
        '/auth': { target: 'http://127.0.0.1:3001', changeOrigin: true },
      }
    },
    build: {
      outDir: 'dist',
      assetsDir: 'assets',
      sourcemap: true,
      minify: 'terser',
      terserOptions: {
        compress: {
          drop_console: true,
          drop_debugger: true
        }
      }
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
