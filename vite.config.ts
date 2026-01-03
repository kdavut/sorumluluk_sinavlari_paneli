
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // GitHub Pages'de repo adınıza göre çalışması için göreceli yolları kullanır.
  base: './', 
});
