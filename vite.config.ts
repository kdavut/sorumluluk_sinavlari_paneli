
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // Boş string veya './' kullanımı asset yollarının doğru çözülmesini sağlar
  base: '', 
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
  }
});
