const dotenv = require('dotenv');
dotenv.config();

const express = require('express');
const cors = require('cors');
const pool = require('./config/db');
const authRoutes = require('./routes/auth.routes');
const goalsRoutes = require('./routes/goals.routes');
const meditationRoutes = require('./routes/meditation.routes');
const moodRoutes = require('./routes/mood.routes');
const journalRoutes = require('./routes/journal.routes');
const testRoutes = require('./routes/test.routes'); // Add this line
const dashboardRoutes = require('./routes/dashboard.routes'); // Add this line

const app = express();
const PORT = process.env.PORT || 3000;

// CORS configuration
const FRONTEND_ORIGIN = process.env.VITE_ORIGIN || 'http://localhost:5173';
app.use(cors({
  origin: FRONTEND_ORIGIN,
  credentials: true,
  methods: ['GET','POST','PUT','DELETE','OPTIONS'],
  allowedHeaders: ['Content-Type','Authorization','X-Requested-With']
}));

app.use(express.json());

// Request logger
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} → ${req.method} ${req.originalUrl}`);
  next();
});

// Mount routes
app.use('/api/auth', authRoutes);
app.use('/api/goals', goalsRoutes);
app.use('/api/meditation', meditationRoutes);
app.use('/api/mood', moodRoutes);
app.use('/api/journal', journalRoutes);
app.use('/api/test', testRoutes); // Add this line
app.use('/api/dashboard', dashboardRoutes); // Add this line

app.get('/', (_req, res) => res.json({ status: 'ok', time: new Date().toISOString() }));

app.get('/db-check', async (_req, res) => {
  try {
    const [rows] = await pool.query('SELECT DATABASE() AS db');
    res.json({ status: 'db_ok', database: rows[0].db || null });
  } catch (err) {
    res.status(500).json({ status: 'db_error', error: err.message || String(err) });
  }
});

(async () => {
  try {
    const [rows] = await pool.query('SELECT DATABASE() AS db');
    console.log('Connected to database:', rows[0].db);
  } catch (err) {
    console.error('Database connection failed at startup:', err.message);
  }

  const server = app.listen(PORT, () => {
    console.log(`Server listening on http://localhost:${PORT}`);
    console.log('Mounted routes: /api/auth, /api/goals, /api/meditation, /api/mood, /api/journal, /api/test, /api/dashboard');
  });

  const graceful = async () => {
    console.log('Shutting down...');
    server.close(async () => {
      try {
        await pool.end();
      } catch (_) {}
      process.exit(0);
    });
  };

  process.on('SIGINT', graceful);
  process.on('SIGTERM', graceful);
})();