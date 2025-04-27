import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { visualizer } from 'rollup-plugin-visualizer';
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    visualizer(), 
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'robots.txt', 'images/*.png'],
      manifest: {
        name: 'Typocalypse Storm',
        short_name: 'TypeStorm',
        description: 'A typing effects application',
        theme_color: '#000000',
        icons: [
          {
            src: '/images/ts_logo_small.png',
            sizes: '192x192',
            type: 'image/png'
          }
        ]
      }
    })
  ],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          react: [
            'react',
            'react-dom'
          ],
          gsap: [
            'gsap'
          ],
          pixi: [
            'pixi.js',
            '@pixi/filter-glow',
            '@pixi/filter-blur'
          ]
        }
      }
    }
  }
})