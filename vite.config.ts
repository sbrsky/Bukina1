import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  return {
    plugins: [react(), tailwindcss()],
    define: {
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
    },
    build: {
      chunkSizeWarningLimit: 600,
      rollupOptions: {
        output: {
          manualChunks: (id) => {
            // Firebase v12+ lives under @firebase/* or firebase/*
            if (
              id.includes('node_modules/firebase') ||
              id.includes('node_modules/@firebase')
            ) return 'vendor-firebase';

            // Google Genai SDK — separate, only Admin panel needs it
            if (
              id.includes('node_modules/@google/genai') ||
              id.includes('node_modules/@google-cloud')
            ) return 'vendor-genai';

            // Framer Motion / motion
            if (
              id.includes('node_modules/motion') ||
              id.includes('node_modules/framer-motion')
            ) return 'vendor-motion';

            // i18next ecosystem
            if (
              id.includes('node_modules/i18next') ||
              id.includes('node_modules/react-i18next')
            ) return 'vendor-i18n';

            // Lucide icons
            if (id.includes('node_modules/lucide-react')) return 'vendor-icons';

            // React DOM (largest single library)
            if (id.includes('node_modules/react-dom')) return 'vendor-react-dom';

            // React core + router
            if (
              id.includes('node_modules/react/') ||
              id.includes('node_modules/react-router') ||
              id.includes('node_modules/scheduler')
            ) return 'vendor-react';

            // EmailJS
            if (id.includes('node_modules/@emailjs')) return 'vendor-email';

            // Everything else in node_modules → misc (should be tiny now)
            if (id.includes('node_modules')) return 'vendor-misc';
          },
        },
      },
    },
  };
});
