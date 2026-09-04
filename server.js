require('dotenv').config();

const express = require('express');
const cors = require('cors');

const app = express();

const PORT = process.env.PORT || 3000;
const NODE_ENV = process.env.NODE_ENV || 'development';
const APP_VERSION = process.env.APP_VERSION || '1.0.0';

app.use(cors());
app.use(express.json());

// GET / -> uygulamanın çalıştığını gösteren cevap
app.get('/', (req, res) => {
  res.json({
    message: 'Backend application is running',
  });
});

// GET /api/health -> sağlık durumu
app.get('/api/health', (req, res) => {
  res.json({
    status: 'UP',
  });
});

// GET /api/info -> uygulama bilgisi
app.get('/api/info', (req, res) => {
  res.json({
    application: 'Backend Application',
    version: APP_VERSION,
    environment: NODE_ENV,
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Not Found',
    path: req.originalUrl,
  });
});

// Genel hata yakalama
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({
    error: 'Internal Server Error',
  });
});

app.listen(PORT, '127.0.0.1', () => {
  console.log(`Backend ${NODE_ENV} ortamında ${PORT} portunda çalışıyor (127.0.0.1)`);
});
