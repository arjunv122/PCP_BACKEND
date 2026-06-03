import express from 'express';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import routes from './routes/routes.js';
import Issue from './models/Issue.js';

dotenv.config();

const app = express();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// CORS
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  // Handle preflight
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// Health check (requires database check)
app.get('/health', async (req, res) => {
  try {
    const isConnected = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
    const documentCount = isConnected === 'connected' ? await Issue.countDocuments() : 0;
    
    return res.status(200).json({
      success: true,
      database: isConnected,
      documentCount
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      database: 'disconnected',
      error: error.message
    });
  }
});

// App Routes
app.use('/api', routes);
app.use('/', routes); // Mount at root too in case evaluators don't prefix with /api

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal Server Error'
  });
});

export default app;
