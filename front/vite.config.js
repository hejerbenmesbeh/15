import { defineConfig } from 'vite'
import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import history from 'connect-history-api-fallback'

export default defineConfig({
  plugins: [
    tailwindcss(),
    tanstackStart(),
    react(),
  ],

  server: {
    port: 3000,
    middlewareMode: false,
  },

  configureServer(server) {
    server.middlewares.use(
      history({
        disableDotRule: true,
      })
    )
  },

  resolve: {
    tsconfigPaths: true,
  },
})