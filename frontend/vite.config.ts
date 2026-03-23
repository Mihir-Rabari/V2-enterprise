import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
      },
      plugins: [react()],
      build: {
        // Output directly into Express's static folder
        outDir: '../backend/public',
        emptyOutDir: true,
        // Warn if any chunk exceeds 600KB
        chunkSizeWarningLimit: 600,
        rollupOptions: {
          output: {
            // Split vendor libs into separate cached chunks
            manualChunks: {
              'vendor-react':  ['react', 'react-dom', 'react-router-dom'],
              'vendor-motion': ['framer-motion'],
              'vendor-charts': ['recharts'],
              'vendor-ui':     ['lucide-react', 'clsx', 'tailwind-merge'],
            },
          },
        },
      },
      define: {
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
});

