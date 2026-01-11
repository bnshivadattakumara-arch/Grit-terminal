import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  define: {
    // This allows the process.env.API_KEY used in the code to work locally
    'process.env': {
      API_KEY: "" // You can paste your key here for local testing, but never commit it!
    }
  },
  server: {
    port: 3000,
    open: true
  }
});