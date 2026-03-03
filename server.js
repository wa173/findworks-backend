const express = require('express');
const cors = require('cors');
require('dotenv').config();

const authRoutes    = require('./routes/auth');
const workerRoutes  = require('./routes/workers');
const jobRoutes     = require('./routes/jobs');
const reviewRoutes  = require('./routes/reviews');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/auth',    authRoutes);
app.use('/api/workers', workerRoutes);
app.use('/api/jobs',    jobRoutes);
app.use('/api/reviews', reviewRoutes);

// Health check
app.get('/', (req, res) => {
  res.json({ message: 'FindWorks API is running 🚀' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`✅ FindWorks server running on port ${PORT}`);
});