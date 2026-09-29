// Explicit local QA server only. This config is never used by npm run build.
import { fileURLToPath } from 'node:url'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig(({ command }) => {
  if (command !== 'serve') throw new Error('The fixture server cannot produce a build')
  return {
    plugins: [react()],
    define: { 'import.meta.env.VITE_API_URL': JSON.stringify('http://127.0.0.1:8765/api') },
    resolve: { alias: [
      { find: 'firebase/auth', replacement: fileURLToPath(new URL('./firebase-auth-fixture.ts', import.meta.url)) },
      { find: '../../lib/firebase', replacement: fileURLToPath(new URL('./firebase-config-fixture.ts', import.meta.url)) },
    ] },
    server: { host: '127.0.0.1', port: 5173, strictPort: true },
  }
})
