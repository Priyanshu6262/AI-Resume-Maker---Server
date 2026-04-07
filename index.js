const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// ─── CORS ─────────────────────────────────────────────────────────────────────
const allowedOrigins = [
    'http://localhost:5173',
    'http://localhost:3000',
    // Add your Vercel frontend URL here after deployment, e.g.:
    // 'https://your-frontend.vercel.app'
    process.env.CLIENT_URL, // set this in Render environment variables
].filter(Boolean); // removes undefined if CLIENT_URL is not set

app.use(cors({
    origin: (origin, callback) => {
        // Allow requests with no origin (mobile apps, curl, Postman)
        if (!origin) return callback(null, true);
        if (allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            callback(new Error(`CORS: Origin "${origin}" not allowed`));
        }
    },
    credentials: true,
}));

// ─── BODY PARSERS ─────────────────────────────────────────────────────────────
app.use(express.json({ limit: '4mb' }));
app.use(express.urlencoded({ limit: '4mb', extended: true }));

// ─── HEALTH CHECK (Render uses this to verify server is up) ───────────────────
app.get('/', (req, res) => {
    res.status(200).json({
        status: 'ok',
        message: 'AI Resume Maker API is running 🚀',
        timestamp: new Date().toISOString(),
    });
});

// ─── ROUTES ───────────────────────────────────────────────────────────────────
app.use('/api/auth',    require('./routes/authRoutes'));
app.use('/api/resumes', require('./routes/resumeRoutes'));
app.use('/api/enhance', require('./routes/enhanceRoutes'));

// ─── 404 HANDLER ──────────────────────────────────────────────────────────────
app.use((req, res) => {
    res.status(404).json({ message: `Route ${req.method} ${req.originalUrl} not found` });
});

// ─── GLOBAL ERROR HANDLER ──────────────────────────────────────────────────────
app.use((err, req, res, next) => {
    console.error('Unhandled Error:', err.message || err);
    res.status(err.status || 500).json({
        message: err.message || 'Internal Server Error',
    });
});

// ─── MONGODB + SERVER START ────────────────────────────────────────────────────
const MONGO_URI = process.env.MONGO_URI;
if (!MONGO_URI) {
    console.error('❌  MONGO_URI is not set. Please add it to your environment variables.');
    process.exit(1);
}

mongoose
    .connect(MONGO_URI)
    .then(() => {
        console.log('✅  MongoDB Connected');
        app.listen(PORT, '0.0.0.0', () => {
            console.log(`🚀  Server running on port ${PORT}`);
        });
    })
    .catch((err) => {
        console.error('❌  MongoDB Connection Error:', err.message);
        process.exit(1);
    });

// ─── GRACEFUL SHUTDOWN ────────────────────────────────────────────────────────
process.on('SIGTERM', async () => {
    console.log('SIGTERM received. Closing server gracefully...');
    await mongoose.connection.close();
    process.exit(0);
});

process.on('SIGINT', async () => {
    console.log('SIGINT received. Closing server gracefully...');
    await mongoose.connection.close();
    process.exit(0);
});
