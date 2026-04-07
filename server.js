/**
 * ============================================================
 * NextStep | AI Assessment Server
 * Version: 10.0.0 - Professional Production Ready
 * Author: NextStep Team
 * Description: Production-ready Express server for NextStep API
 * ============================================================
 */

import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import assessmentHandler from './api/assessment.js';

// ============================================================
// CONFIGURATION
// ============================================================

// Load environment variables
dotenv.config();

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;
const IS_PRODUCTION = process.env.NODE_ENV === 'production';
const IS_DEVELOPMENT = !IS_PRODUCTION;

// ============================================================
// MIDDLEWARE
// ============================================================

// CORS Configuration
const corsOptions = {
    origin: IS_PRODUCTION ? process.env.CORS_ORIGIN || 'https://nextstep-platform.onrender.com' : '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
    credentials: true,
    optionsSuccessStatus: 200
};

app.use(cors(corsOptions));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Serve static files (HTML, CSS, JS, images)
app.use(express.static(__dirname));

// ============================================================
// SECURITY HEADERS
// ============================================================

app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    next();
});

// ============================================================
// LOGGING MIDDLEWARE
// ============================================================

app.use((req, res, next) => {
    const start = Date.now();

    res.on('finish', () => {
        const duration = Date.now() - start;
        const status = res.statusCode;

        if (IS_DEVELOPMENT) {
            const statusColor = status >= 500 ? '\x1b[31m' : status >= 400 ? '\x1b[33m' : '\x1b[32m';
            console.log(`${statusColor}${req.method}${'\x1b[0m'} ${req.url} - ${status} (${duration}ms)`);
        } else {
            console.log(`[${new Date().toISOString()}] ${req.method} ${req.url} - ${status} (${duration}ms)`);
        }
    });

    next();
});

// ============================================================
// API ROUTES
// ============================================================

// Main assessment endpoint
app.post('/api/assessment', async (req, res) => {
    const startTime = Date.now();

    try {
        await assessmentHandler(req, res);
        const duration = Date.now() - startTime;
        console.log(`✅ API request completed in ${duration}ms`);
    } catch (error) {
        console.error('❌ API Error:', error);
        const duration = Date.now() - startTime;
        res.status(500).json({
            success: false,
            error: 'Internal server error',
            message: 'حدث خطأ في الخادم. الرجاء المحاولة مرة أخرى',
            duration: `${duration}ms`
        });
    }
});

// ============================================================
// FRONTEND ROUTES
// ============================================================

// Home page
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Roadmaps page
app.get('/roadmaps.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'roadmaps.html'));
});

// Assessment page
app.get('/assessment', (req, res) => {
    res.sendFile(path.join(__dirname, 'assessment', 'assessment.html'));
});

app.get('/assessment/assessment.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'assessment', 'assessment.html'));
});

// ============================================================
// HEALTH & TEST ROUTES
// ============================================================

// Health check endpoint
app.get('/health', (req, res) => {
    const memoryUsage = process.memoryUsage();

    res.status(200).json({
        status: 'healthy',
        uptime: process.uptime(),
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development',
        version: '10.0.0',
        memory: {
            rss: Math.round(memoryUsage.rss / 1024 / 1024),
            heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024),
            heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024)
        },
        services: {
            gemini: !!process.env.GEMINI_API_KEY
        }
    });
});

// Simple test endpoint
app.get('/test', (req, res) => {
    res.json({
        success: true,
        message: '🚀 NextStep API Server is running!',
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development',
        endpoints: {
            api: '/api/assessment (POST)',
            health: '/health (GET)',
            test: '/test (GET)'
        }
    });
});

// ============================================================
// ERROR HANDLING MIDDLEWARE
// ============================================================

// 404 handler - Route not found
app.use((req, res) => {
    res.status(404).json({
        success: false,
        error: 'Not Found',
        message: `المسار ${req.method} ${req.url} غير موجود`
    });
});

// Global error handler
app.use((err, req, res, next) => {
    console.error('❌ Global error:', err);

    // Handle specific error types
    if (err.type === 'entity.too.large') {
        return res.status(413).json({
            success: false,
            error: 'Payload too large',
            message: 'البيانات المرسلة كبيرة جداً. الحد الأقصى 10 ميجابايت'
        });
    }

    if (err.code === 'ECONNREFUSED') {
        return res.status(503).json({
            success: false,
            error: 'Service Unavailable',
            message: 'الخدمة غير متاحة حالياً. الرجاء المحاولة لاحقاً'
        });
    }

    res.status(500).json({
        success: false,
        error: 'Internal Server Error',
        message: err.message || 'حدث خطأ غير متوقع'
    });
});

// ============================================================
// START SERVER
// ============================================================

const server = app.listen(PORT, () => {
    console.log('');
    console.log('='.repeat(70));
    console.log('🚀 NextStep AI Assessment Server');
    console.log('='.repeat(70));
    console.log(`📍 Local:        http://localhost:${PORT}`);
    console.log(`📍 Test:         http://localhost:${PORT}/test`);
    console.log(`📍 Health:       http://localhost:${PORT}/health`);
    console.log(`📍 API:          http://localhost:${PORT}/api/assessment (POST)`);
    console.log(`📍 Frontend:     http://localhost:${PORT}`);
    console.log(`📍 Assessment:   http://localhost:${PORT}/assessment/assessment.html`);
    console.log('='.repeat(70));
    console.log(`⚡ Environment:  ${process.env.NODE_ENV || 'development'}`);
    console.log(`🔐 CORS Origin:  ${IS_PRODUCTION ? (process.env.CORS_ORIGIN || 'restricted') : '*'}`);
    console.log(`🤖 AI Service:   ${process.env.GEMINI_API_KEY ? '✅ Gemini Configured' : '❌ Not configured'}`);
    console.log('='.repeat(70));
    console.log('');
});

// ============================================================
// GRACEFUL SHUTDOWN
// ============================================================

const shutdown = async (signal) => {
    console.log(`\n🛑 Received ${signal}, shutting down gracefully...`);

    server.close(() => {
        console.log('✅ HTTP server closed');
        process.exit(0);
    });

    // Force close after 10 seconds
    setTimeout(() => {
        console.error('⚠️ Could not close connections in time, forcing shutdown');
        process.exit(1);
    }, 10000);
};

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
    console.error('❌ Uncaught Exception:', error);
    shutdown('uncaughtException');
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
});