import dns from 'node:dns';
dns.setDefaultResultOrder('ipv4first');
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import hpp from 'hpp';
import rateLimit from 'express-rate-limit';
import morgan from 'morgan';
import { sanitizeRequest } from './shared/middleware/sanitize.js';
import { globalErrorHandler } from './shared/middleware/error-handler.js';
import { logger } from './shared/utils/logger.js';

const app = express();

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
  crossOriginEmbedderPolicy: false
}));

// CORS configuration
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, 
  max: 100, 
  message: {
    error: 'Too many requests from this IP, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api/', limiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Compression middleware
app.use(compression());
app.use(hpp());

// MongoDB injection protection
app.use(sanitizeRequest);

// Logging middleware
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('combined', {
    stream: {
      write: (message) => logger.info(message.trim())
    }
  }));
}

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Import routes
import authRoutes from './modules/auth/routes/auth-routes.js';
import userRoutes from './modules/auth/routes/user-routes.js';
import folderRoutes from './modules/deck/routes/folder-routes.js';
import deckRoutes from './modules/deck/routes/deck-routes.js';
import cardRoutes from './modules/deck/routes/card-routes.js';
import homeRoutes from './modules/deck/routes/home-routes.js';
import fileRoutes from './modules/file/routes/file-routes.js';
import aiRoutes from './modules/ai/routes/ai-routes.js';

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/folders', folderRoutes);
app.use('/api/decks', deckRoutes);
app.use('/api/cards', cardRoutes);
app.use('/api/home', homeRoutes);
app.use('/api/files', fileRoutes);
app.use('/api/ai', aiRoutes);

// Global error handler
app.use(globalErrorHandler);

// 404 handler 
app.use((req, res) => {
  return res.status(404).json({
    success: false,
    message: 'Route not found',
    details: {
        path: req.originalUrl,
        method: req.method
    }
  });
});

export default app;
