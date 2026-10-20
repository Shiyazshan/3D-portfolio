import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  // Relative asset paths: the same build works on Vercel, Netlify or a GitHub Pages sub-path.
  base: './',
  build: {
    chunkSizeWarningLimit: 1200,
    rollupOptions: {
      output: {
        // Keep the heavy 3D stack in its own cacheable chunk.
        manualChunks(id) {
          if (/node_modules\/(three|@react-three)/.test(id)) return 'three'
          if (/node_modules\/(gsap|lenis|motion)/.test(id)) return 'motion'
        },
      },
    },
  },
})
