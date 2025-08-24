const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const path = require('path');

const app = express();
const PORT = 3000;

// Servir arquivos estáticos do build
app.use(express.static(path.join(__dirname, '../dist')));

// Proxy para a API
app.use('/v1', createProxyMiddleware({
  target: 'https://api.envio-boleto.olympiabank.xyz',
  changeOrigin: true,
  secure: true,
  headers: {
    'Origin': 'https://api.envio-boleto.olympiabank.xyz'
  },
  onProxyReq: (proxyReq, req, res) => {
    console.log(`🔄 Proxy: ${req.method} ${req.url} → ${proxyReq.path}`);
  },
  onError: (err, req, res) => {
    console.error('❌ Erro no proxy:', err.message);
    res.status(500).json({ error: 'Erro no proxy' });
  }
}));

// Rota para todas as outras requisições (SPA)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../dist/index.html'));
});

app.listen(PORT, () => {
  console.log(`🚀 Servidor preview rodando em http://localhost:${PORT}`);
  console.log(`🔗 Proxy configurado para /v1 → https://api.envio-boleto.olympiabank.xyz`);
  console.log(`📁 Servindo arquivos de: ${path.join(__dirname, '../dist')}`);
});
