import { createProxyMiddleware } from 'http-proxy-middleware'

export default function handler(req, res) {
  // Get the target API URL from environment variable
  const targetUrl = process.env.VITE_API_BASE_URL || 'http://localhost:3000'
  
  // Create proxy middleware
  const proxy = createProxyMiddleware({
    target: targetUrl,
    changeOrigin: true,
    pathRewrite: {
      '^/api': '', // Remove /api prefix when forwarding
    },
    onError: (err, req, res) => {
      console.error('Proxy Error:', err)
      res.status(500).json({ error: 'Proxy error' })
    },
    onProxyReq: (proxyReq, req, res) => {
      // Log the proxy request
      console.log(`Proxying ${req.method} ${req.url} to ${targetUrl}`)
    }
  })

  // Handle the request
  proxy(req, res, (result) => {
    if (result instanceof Error) {
      console.error('Proxy middleware error:', result)
      res.status(500).json({ error: 'Proxy middleware error' })
    }
  })
} 