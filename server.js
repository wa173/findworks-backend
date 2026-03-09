const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const authRoutes        = require('./routes/auth');
const workerRoutes      = require('./routes/workers');
const jobRoutes         = require('./routes/jobs');
const reviewRoutes      = require('./routes/reviews');
const applicationRoutes = require('./routes/applications');

const app = express();

// ── RATE LIMITERS ─────────────────────────────────────────────────────────────

// General limit — 100 requests per 15 minutes per IP
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { error: 'Too many requests. Please slow down and try again in 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Auth limit — 10 attempts per 15 minutes per IP (prevents brute force)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: 'Too many login attempts. Please try again in 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Post limit — 20 posts per hour per IP (prevents spam job/worker posts)
const postLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 20,
  message: { error: 'You are posting too fast. Please wait an hour before posting again.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// ── MIDDLEWARE ────────────────────────────────────────────────────────────────
app.use(cors());
app.use(express.json());
app.use(generalLimiter); // Apply general limit to all routes

// ── ROUTES ────────────────────────────────────────────────────────────────────
app.use('/api/auth',         authLimiter, authRoutes);
app.use('/api/workers',      workerRoutes);
app.use('/api/jobs',         jobRoutes);
app.use('/api/reviews',      reviewRoutes);
app.use('/api/applications', applicationRoutes);

// Post-specific limits
app.use('/api/workers',      postLimiter);
app.use('/api/jobs',         postLimiter);
app.use('/api/reviews',      postLimiter);
app.use('/api/applications', postLimiter);

// ── HEALTH CHECK ──────────────────────────────────────────────────────────────
app.get('/', (req, res) => {
  res.json({ message: 'FindWorks API is running 🚀' });
});

// ── START ─────────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`✅ FindWorks server running on port ${PORT}`);
});