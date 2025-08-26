const express = require('express');
const path = require('path');
const fs = require('fs');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const cookieParser = require('cookie-parser');
require('dotenv').config();
const visitorSubmissionsRouter = require('./routes/visitor-submissions');

const app = express();
// Trust the first proxy (Render)
app.set('trust proxy', 1);
const PORT = process.env.PORT || 5500;
const isDev = process.env.NODE_ENV !== 'production';

// Security middleware with CSP suitable for local dev
app.use(helmet({
    contentSecurityPolicy: {
        useDefaults: true,
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'", "'unsafe-inline'", 'https://cdn.jsdelivr.net'],
            styleSrc: ["'self'", "'unsafe-inline'", 'https://cdnjs.cloudflare.com'],
            imgSrc: ["'self'", 'data:'],
            fontSrc: ["'self'", 'https://cdnjs.cloudflare.com', 'data:'],
            connectSrc: ["'self'", ...(isDev ? ['http://127.0.0.1:5500'] : [])],
            objectSrc: ["'none'"],
            upgradeInsecureRequests: null,
        },
    },
}));

// CORS configuration
const corsOptions = {
    origin: function (origin, callback) {
        // Allow requests with no origin (like mobile apps or curl requests)
        if (!origin) return callback(null, true);
        
        const allowedOrigins = [
            'http://127.0.0.1:5500',
            'http://localhost:5500',
            'file://',
            'https://yourdomain.com'  // Add your production domain here
        ];
        
        if (allowedOrigins.includes(origin)) {
            return callback(null, true);
        }
        
        // For development, you might want to log blocked origins
        console.warn(`Blocked by CORS: ${origin}`);
        return callback(new Error('Not allowed by CORS'));
    },
    methods: ['GET', 'POST', 'PATCH', 'OPTIONS', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    credentials: true,
    optionsSuccessStatus: 200
};

// Apply CORS middleware
app.use(cors(corsOptions));

// Handle preflight requests
app.options('*', cors(corsOptions));

// Parse JSON bodies (built into Express 4.16+)
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Add headers before the routes are defined
app.use((req, res, next) => {
    const origin = req.headers.origin;
    if (origin) {
        res.header('Access-Control-Allow-Origin', origin);
    }
    res.header('Access-Control-Allow-Methods', 'GET, POST, PATCH, OPTIONS, DELETE');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
    res.header('Access-Control-Allow-Credentials', 'true');
    
    // Handle preflight requests
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    
    next();
});

// Rate limiting (respects X-Forwarded-For via trust proxy)
app.use(rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    standardHeaders: true,   // return rate limit info in the RateLimit-* headers
    legacyHeaders: false,    // disable the X-RateLimit-* headers
    message: 'Too many requests from this IP, please try again later.'
}));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// Admin auth routes (before static) - mount after parsers
const adminRoutes = require('./routes/admin');
const { verifyToken } = require('./middleware/authMiddleware');
app.use('/api/admin', adminRoutes);

// Protect admin dashboard HTML with redirect instead of JSON 401
app.get('/admin/dashboard.html', (req, res) => {
    try {
        const token = req.cookies && req.cookies['admintoken'];
        if (!token) return res.redirect('/admin/login.html');
        verifyToken(token); // throws if invalid/expired
        return res.sendFile(path.join(__dirname, 'admin', 'dashboard.html'));
    } catch (_) {
        return res.redirect('/admin/login.html');
    }
});

// Serve static files
app.use(express.static('.'));
app.use(express.static(path.join(__dirname, 'public')));
app.use('/admin', express.static(path.join(__dirname, 'admin')));

// Root route -> index.html
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// MongoDB connection (single connect, no deprecated options)
if (!process.env.MONGODB_URI) {
    console.warn('⚠️  MONGODB_URI is not set. Database will be Disconnected.');
}

const startServer = async () => {
    try {
        if (process.env.MONGODB_URI) {
            const mongoUri = process.env.MONGODB_URI;
            const mongoDbName = process.env.MONGODB_DB || undefined;
            await mongoose.connect(mongoUri, mongoDbName ? { dbName: mongoDbName } : undefined);
            console.log(`✅ Connected to MongoDB${mongoDbName ? ` (db: ${mongoDbName})` : ''}`);
            // Connection state logging
            const conn = mongoose.connection;
            conn.on('disconnected', () => console.log('🔌 MongoDB disconnected'));
            conn.on('reconnected', () => console.log('♻️  MongoDB reconnected'));
            conn.on('error', (e) => console.error('❗ MongoDB error:', e.message));

            // Seed default admin if none exists
            try {
                const Admin = require('./models/Admin');
                const bcrypt = require('bcryptjs');
                const count = await Admin.countDocuments();
                if (count === 0) {
                    const username = process.env.ADMIN_USERNAME || 'admin';
                    const password = process.env.ADMIN_PASSWORD || 'ChangeMe@123';
                    const passwordHash = await bcrypt.hash(password, 10);
                    await Admin.create({ username, passwordHash });
                    console.log(`👤 Seeded default admin -> username: ${username} | password: ${password}`);
                }
            } catch (seedErr) {
                console.warn('Admin seed skipped:', seedErr?.message || seedErr);
            }
        } else {
            console.log('ℹ️  Starting server without MongoDB connection.');
        }

        // Start server only after attempting DB connect
        app.listen(PORT, () => {
            console.log(`🚀 Server running on http://127.0.0.1:${PORT}`);
            console.log(`📊 Health check: http://127.0.0.1:${PORT}/api/health`);
        });
    } catch (err) {
        console.error('❌ MongoDB connection error:', err);
        // Still start the server so /api/health can report Disconnected
        app.listen(PORT, () => {
            console.log(`🚀 Server running (DB disconnected) on http://127.0.0.1:${PORT}`);
            console.log(`📊 Health check: http://127.0.0.1:${PORT}/api/health`);
        });
    }
};

// Import routes
const hireRoutes = require('./routes/hire');
const contactRoutes = require('./routes/contact');
const analyticsRoutes = require('./routes/analytics');
const emailTestRoutes = require('./routes/email-test');

// Use routes
app.use('/api/hire', hireRoutes);
app.use('/api/contact', contactRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/email', emailTestRoutes);
app.use('/api/visitor-submissions', visitorSubmissionsRouter);

// CV download route
const CV_PATH = path.join(__dirname, 'public', 'cv', 'resume.pdf');
app.get('/cv', (req, res) => {
    try {
        if (!fs.existsSync(CV_PATH)) {
            return res.status(404).json({ message: 'CV not found. Place your file at public/cv/resume.pdf' });
        }
        return res.download(CV_PATH, 'Resume.pdf');
    } catch (err) {
        console.error('CV download error:', err);
        return res.status(500).json({ message: 'Failed to download CV' });
    }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
    const state = mongoose.connection.readyState; // 0=disconnected,1=connected,2=connecting,3=disconnecting
    const stateName = ['Disconnected', 'Connected', 'Connecting', 'Disconnecting'][state] || 'Unknown';
    res.json({
        status: 'OK',
        timestamp: new Date().toISOString(),
        database: stateName,
        readyState: state
    });
});

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/portfolio', {
    useNewUrlParser: true,
    useUnifiedTopology: true
})
.then(() => console.log('Connected to MongoDB'))
.catch(err => console.error('MongoDB connection error:', err));

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({
        message: 'Something went wrong!',
        error: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
    });
});

// 404 handler
app.use('*', (req, res) => {
    res.status(404).sendFile(path.join(__dirname, '404.html'));
});

// Start server (after DB connect attempt)
startServer();
