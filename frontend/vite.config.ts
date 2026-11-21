import react, { reactCompilerPreset } from '@vitejs/plugin-react'
import babel from '@rolldown/plugin-babel'
import { defineConfig } from 'vite'
import { nodePolyfills } from "vite-plugin-node-polyfills"

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    nodePolyfills(),
    babel({ presets: [reactCompilerPreset()] })
  ],
})
