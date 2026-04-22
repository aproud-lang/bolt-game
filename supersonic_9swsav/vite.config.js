import mockNoon2Core from './.mock-noon2-core/vitePlugin.js';
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  // Use a relative base so builds work from any S3/CDN prefix.
  // Override with ACTIVITY_BASE_PATH if a fixed path is required.
  base: process.env.ACTIVITY_BASE_PATH || './',
  plugins: [mockNoon2Core(), react()],
  server: {
    // Allow embedding in iframes (for classroom slides)
    headers: {
      'X-Frame-Options': 'ALLOWALL',
      'Content-Security-Policy': "frame-ancestors *",
    },
  },
})
