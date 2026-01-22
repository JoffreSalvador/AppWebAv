import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,       // Obligamos a usar este puerto
    strictPort: true, // Si el 5173 está ocupado, Vite fallará en lugar de cambiar de puerto
    host: true        // Opcional: permite acceder desde la red local (útil si pruebas con celular)
  }
})
