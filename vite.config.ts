
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// GitHub Actions ortamında mıyız kontrol et (GitHub Pages için)
// Vercel veya yerel ortamda mıyız kontrol et
const isGithubPages = process.env.GITHUB_ACTIONS === 'true';

export default defineConfig({
  plugins: [react()],
  // GitHub Pages için repo adı, Vercel/Local için root ('/')
  base: isGithubPages ? '/sorumluluk-pro/' : '/', 
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    emptyOutDir: true,
    rollupOptions: {
      output: {
        manualChunks: undefined,
      },
    },
  },
});
