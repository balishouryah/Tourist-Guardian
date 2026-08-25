import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Simple Vite plugin to serve Vercel API functions locally
const vercelApiPlugin = () => ({
  name: 'vercel-api-plugin',
  configureServer(server) {
    server.middlewares.use('/api/nearby-services', async (req, res) => {
      try {
        // Import the handler
        const path = await import('path');
        const apiPath = path.resolve('./api/nearby-services.js');
        // Use file:// URL to ensure Windows compatibility and proper ESM resolution
        const handlerModule = await import('file://' + apiPath);
        const handler = handlerModule.default;
        
        // Mock a Web Request object for the Edge handler
        const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
        const webReq = new Request(url.toString(), {
          method: req.method,
          headers: req.headers
        });
        
        // Call the Edge handler
        const webRes = await handler(webReq);
        
        // Send back the response via Node's res
        res.statusCode = webRes.status;
        webRes.headers.forEach((value, key) => {
          res.setHeader(key, value);
        });
        const text = await webRes.text();
        res.end(text);
      } catch (e) {
        console.error('[Local API] Error:', e);
        res.statusCode = 500;
        res.end(JSON.stringify({ error: 'Local API proxy failed', details: e.message }));
      }
    });
  }
});

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), vercelApiPlugin()],
})
