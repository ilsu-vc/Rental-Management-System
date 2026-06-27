import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config();

// Import routes
import authRoutes from './routes/auth';
import buildingRoutes from './routes/buildings';
import roomRoutes from './routes/rooms';
import tenantRoutes from './routes/tenants';
import billRoutes from './routes/bills';
import announcementRoutes from './routes/announcements';
import reportRoutes from './routes/reports';

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
let clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
if (clientUrl.endsWith('/')) {
  clientUrl = clientUrl.slice(0, -1);
}

app.use(cors({
  origin: [clientUrl, 'http://localhost:5173', 'http://localhost:3000'],
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging for debugging deployment issues
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// API Routes (supports both /api prefix and root paths for robustness)
const mountRoutes = (prefix: string) => {
  app.use(`${prefix}/auth`, authRoutes);
  app.use(`${prefix}/buildings`, buildingRoutes);
  app.use(`${prefix}/rooms`, roomRoutes);
  app.use(`${prefix}/tenants`, tenantRoutes);
  app.use(`${prefix}/bills`, billRoutes);
  app.use(`${prefix}/announcements`, announcementRoutes);
  app.use(`${prefix}/reports`, reportRoutes);
};

mountRoutes('/api');
mountRoutes('');

// Health check
const healthHandler = (req: express.Request, res: express.Response) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    cors_origin: clientUrl,
  });
};
app.get('/api/health', healthHandler);
app.get('/health', healthHandler);

// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined,
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`
  ╔══════════════════════════════════════════════╗
  ║          🏢 RentaHub API Server              ║
  ║  ──────────────────────────────────────────  ║
  ║  Port:    ${String(PORT).padEnd(35)}║
  ║  Mode:    ${(process.env.NODE_ENV || 'development').padEnd(35)}║
  ║  Health:  http://localhost:${PORT}/api/health   ║
  ╚══════════════════════════════════════════════╝
  `);
});

export default app;
