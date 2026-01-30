
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  // Set the third parameter to '' to load all env regardless of the `VITE_` prefix.
  const env = loadEnv(mode, (process as any).cwd(), '');
  
  // Check for various naming conventions
  const apiKey = env.API_KEY || env.VITE_API_KEY || process.env.API_KEY;

  return {
    plugins: [react()],
    build: {
      outDir: 'dist',
      // Fixes the "Some chunks are larger than 500 kB" warning
      chunkSizeWarningLimit: 1000, 
      rollupOptions: {
        output: {
          manualChunks: {
            // Split code into separate chunks for better performance and caching
            'vendor-react': ['react', 'react-dom'],
            'vendor-genai': ['@google/genai'],
            'vendor-ui': ['lucide-react']
          }
        }
      }
    },
    define: {
      // This allows 'process.env.API_KEY' to work in the browser code
      'process.env.API_KEY': JSON.stringify(apiKey),
      // Prevent "process is not defined" error
      'process.env': {}
    }
  };
});
