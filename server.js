require("./instrument");

// All other imports below
// Import with `import * as Sentry from "@sentry/node"` if you are using ESM
// const Sentry = require("@sentry/node");


const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Database simulasi (dalam memori)
let products = [
  { id: 1, name: 'Laptop', price: 15000000, stock: 10 },
  { id: 2, name: 'Mouse', price: 150000, stock: 50 },
  { id: 3, name: 'Keyboard', price: 500000, stock: 30 }
];

let nextId = 4;

// Health check endpoint (untuk Kubernetes)
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

app.get('/readiness', (req, res) => {
  res.json({
    status: 'ready',
    timestamp: new Date().toISOString()
  });
});

// Routes

// GET - Mendapatkan semua produk
app.get('/api/products', (req, res) => {
  res.json({
    success: true,
    data: products,
    total: products.length
  });
});

// GET - Mendapatkan produk berdasarkan ID
app.get('/api/products/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const product = products.find(p => p.id === id);
  
  if (!product) {
    return res.status(404).json({
      success: false,
      message: 'Produk tidak ditemukan'
    });
  }
  
  res.json({
    success: true,
    data: product
  });
});

// POST - Menambah produk baru
app.post('/api/products', (req, res) => {
  const { name, price, stock } = req.body;
  
  // Validasi
  if (!name || !price || stock === undefined) {
    return res.status(400).json({
      success: false,
      message: 'Nama, harga, dan stok harus diisi'
    });
  }
  
  const newProduct = {
    id: nextId++,
    name,
    price: parseFloat(price),
    stock: parseInt(stock)
  };
  
  products.push(newProduct);
  
  res.status(201).json({
    success: true,
    message: 'Produk berhasil ditambahkan',
    data: newProduct
  });
});

// PUT - Mengupdate produk berdasarkan ID
app.put('/api/products/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const { name, price, stock } = req.body;
  
  const productIndex = products.findIndex(p => p.id === id);
  
  if (productIndex === -1) {
    return res.status(404).json({
      success: false,
      message: 'Produk tidak ditemukan'
    });
  }
  
  // Update produk
  if (name !== undefined) products[productIndex].name = name;
  if (price !== undefined) products[productIndex].price = parseFloat(price);
  if (stock !== undefined) products[productIndex].stock = parseInt(stock);
  
  res.json({
    success: true,
    message: 'Produk berhasil diupdate',
    data: products[productIndex]
  });
});

// DELETE - Menghapus produk berdasarkan ID
app.delete('/api/products/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const productIndex = products.findIndex(p => p.id === id);
  
  if (productIndex === -1) {
    return res.status(404).json({
      success: false,
      message: 'Produk tidak ditemukan'
    });
  }
  
  const deletedProduct = products.splice(productIndex, 1)[0];
  
  res.json({
    success: true,
    message: 'Produk berhasil dihapus',
    data: deletedProduct
  });
});

// ==================== ERROR ENDPOINTS ====================

// Error 500 - Internal Server Error
app.get('/api/error/500', (req, res) => {
  throw new Error('Ini adalah error 500 yang disengaja untuk testing');
});

// Error 400 - Bad Request
app.get('/api/error/400', (req, res) => {
  res.status(400).json({
    success: false,
    message: 'Bad Request - Parameter tidak valid',
    error: 'INVALID_REQUEST'
  });
});

// Error 401 - Unauthorized
app.get('/api/error/401', (req, res) => {
  res.status(401).json({
    success: false,
    message: 'Unauthorized - Token tidak valid',
    error: 'UNAUTHORIZED'
  });
});

// Error 403 - Forbidden
app.get('/api/error/403', (req, res) => {
  res.status(403).json({
    success: false,
    message: 'Forbidden - Akses ditolak',
    error: 'FORBIDDEN'
  });
});

// Error 429 - Too Many Requests
app.get('/api/error/429', (req, res) => {
  res.status(429).json({
    success: false,
    message: 'Too Many Requests - Rate limit exceeded',
    error: 'RATE_LIMIT_EXCEEDED'
  });
});

// Error 503 - Service Unavailable
app.get('/api/error/503', (req, res) => {
  res.status(503).json({
    success: false,
    message: 'Service Unavailable - Layanan sedang maintenance',
    error: 'SERVICE_UNAVAILABLE'
  });
});

// Timeout Error
app.get('/api/error/timeout', (req, res) => {
  // Tidak mengirim response, akan timeout
  setTimeout(() => {
    console.log('Request timeout (ini tidak akan terkirim ke client)');
  }, 60000);
});

// Memory Leak Simulation (gunakan dengan hati-hati!)
app.get('/api/error/memory-leak', (req, res) => {
  const leak = [];
  for (let i = 0; i < 1000000; i++) {
    leak.push(new Array(1000).fill('memory leak simulation'));
  }
  res.json({
    success: false,
    message: 'Memory leak triggered',
    arrayLength: leak.length
  });
});

// Database Connection Error Simulation
app.get('/api/error/db-connection', (req, res) => {
  res.status(503).json({
    success: false,
    message: 'Database connection failed',
    error: 'ECONNREFUSED',
    details: 'Could not connect to database server'
  });
});

// Validation Error
app.post('/api/error/validation', (req, res) => {
  res.status(422).json({
    success: false,
    message: 'Validation Error',
    errors: [
      { field: 'email', message: 'Email tidak valid' },
      { field: 'password', message: 'Password minimal 8 karakter' }
    ]
  });
});

// Route utama
app.get('/', (req, res) => {
  res.json({
    message: 'Selamat datang di API CRUD Produk',
    version: '1.0.0',
    endpoints: {
      products: {
        'GET /api/products': 'Mendapatkan semua produk',
        'GET /api/products/:id': 'Mendapatkan produk berdasarkan ID',
        'POST /api/products': 'Menambah produk baru',
        'PUT /api/products/:id': 'Mengupdate produk',
        'DELETE /api/products/:id': 'Menghapus produk'
      },
      errors: {
        'GET /api/error/500': 'Generate error 500',
        'GET /api/error/400': 'Generate error 400',
        'GET /api/error/401': 'Generate error 401',
        'GET /api/error/403': 'Generate error 403',
        'GET /api/error/429': 'Generate error 429',
        'GET /api/error/503': 'Generate error 503',
        'GET /api/error/timeout': 'Generate timeout error',
        'GET /api/error/memory-leak': 'Generate memory leak',
        'GET /api/error/db-connection': 'Simulate DB connection error',
        'POST /api/error/validation': 'Generate validation error'
      },
      health: {
        'GET /health': 'Health check',
        'GET /readiness': 'Readiness check'
      }
    }
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Error:', err.stack);
  res.status(500).json({
    success: false,
    message: 'Terjadi kesalahan pada server',
    error: err.message,
    timestamp: new Date().toISOString()
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Endpoint tidak ditemukan',
    path: req.path
  });
});

app.get("/debug-sentry", function mainHandler(req, res) {
  throw new Error("My first Sentry error!");
});

Sentry.setupExpressErrorHandler(app);


// Start server
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server berjalan di http://localhost:${PORT}`);
  console.log(`Node version: ${process.version}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});
