import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: { port: 3002 },
  preview: {
    port: 4173,
    host: '127.0.0.1',
    strictPort: true,
  },
  build: {
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        manualChunks(id: string) {
          if (!id.includes('node_modules')) {
            return null;
          }

          if (id.includes('node_modules/recharts')) {
            return 'vendor-recharts';
          }

          if (id.includes('node_modules/react')) {
            return 'vendor-react';
          }

          if (id.includes('node_modules/lucide-react') || id.includes('node_modules/@radix-ui')) {
            return 'vendor-ui';
          }

          if (id.includes('node_modules/framer-motion')) {
            return 'vendor-motion';
          }

          if (id.includes('node_modules/date-fns')) {
            return 'vendor-date-fns';
          }

          if (id.includes('node_modules/@supabase')) {
            return 'vendor-supabase';
          }

          if (id.includes('node_modules/@tanstack')) {
            return 'vendor-tanstack';
          }

          if (id.includes('node_modules/@tremor')) {
            return 'vendor-tremor';
          }

          if (id.includes('node_modules/@hookform') || id.includes('node_modules/react-hook-form')) {
            return 'vendor-form';
          }

          if (id.includes('node_modules/xlsx')) {
            return 'vendor-xlsx';
          }

          if (id.includes('node_modules/sonner')) {
            return 'vendor-sonner';
          }

          if (id.includes('node_modules/tailwind-merge')) {
            return 'vendor-tailwind-merge';
          }

          if (id.includes('node_modules/zod')) {
            return 'vendor-zod';
          }

          return 'vendor';
        },
      },
    },
  },
})
