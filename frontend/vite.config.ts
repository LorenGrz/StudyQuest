import { defineConfig } from 'vite'
import react, { reactCompilerPreset } from '@vitejs/plugin-react'
import babel from '@rolldown/plugin-babel'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    babel({ presets: [reactCompilerPreset()] })
  ],
  server: {
    host: '0.0.0.0',
    port: 5173,
    watch: {
      // Necesario en Windows con Docker: el bind mount no propaga
      // eventos inotify al contenedor Linux, así que usamos polling
      usePolling: true,
      interval: 1000,
    },
  },
})
