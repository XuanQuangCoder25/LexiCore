import { defineConfig, loadEnv } from 'vite'
import { fileURLToPath } from 'url'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'

const __dirname = fileURLToPath(new URL('.', import.meta.url))

function figmaAssetResolver() {
  return {
    name: 'figma-asset-resolver',
    resolveId(id: string) {
      if (id.startsWith('figma:asset/')) {
        const filename = id.replace('figma:asset/', '')
        return `${__dirname}src/assets/${filename}`
      }
    },
  }
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const backendTarget = env.VITE_API_URL || process.env.VITE_API_URL || 'http://localhost:5000'

  return {
    plugins: [
      figmaAssetResolver(),
      react(),
      tailwindcss(),
    ],
    resolve: {
      alias: {
        '@': `${__dirname}src/app`,
      },
      dedupe: ['react', 'react-dom'],
    },
    server: {
      proxy: {
        '/api': {
          target: backendTarget,
          changeOrigin: true,
          secure: false,
        },
        '/socket.io': {
          target: backendTarget,
          ws: true,
          changeOrigin: true,
          secure: false,
        },
      },
    },
  }
})
