// QuizMaster - Main application entry point (ES Module)
import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';

const require = createRequire(import.meta.url);
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const { app, server, pool } = require('./server/app.js');
const authRoutes = require('./server/routes/auth.js');
const teacherRoutes = require('./server/routes/teacher.js');
const studentRoutes = require('./server/routes/student.js');

// Initialize database
async function initializeDatabase() {
  try {
    const schemaPath = join(__dirname, 'server', 'database', 'schema.sql');
    if (fs.existsSync(schemaPath)) {
      const schema = fs.readFileSync(schemaPath, 'utf8');
      await pool.query(schema);
      console.log('✅ Database initialized successfully');
    }
  } catch (error) {
    console.error('❌ Database initialization error:', error.message);
  }
}

// Routes setup
function setupRoutes() {
  // Landing page
  app.get('/', (req, res) => {
    if (req.session.userId) {
      if (req.session.userRole === 'teacher') {
        return res.redirect('/teacher/dashboard');
      } else {
        return res.redirect('/student/dashboard');
      }
    }
    
    res.render('index', { 
      title: 'QuizMaster - Dynamic Quiz Platform',
      user: null
    });
  });

  // Health check endpoint
  app.get('/api/health', (req, res) => {
    res.status(200).json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || 'development',
      version: '1.0.0'
    });
  });

  // API route for real-time leaderboard data
  app.get('/api/leaderboard/:quizId', async (req, res) => {
    try {
      const leaderboard = await pool.query(`
        SELECT qa.score, qa.total_points, u.username, u.first_name, u.last_name,
               qa.completed_at, qa.started_at
        FROM quiz_attempts qa
        JOIN users u ON qa.student_id = u.id
        WHERE qa.quiz_id = $1 AND qa.completed_at IS NOT NULL
        ORDER BY qa.score DESC
        LIMIT 10
      `, [req.params.quizId]);

      res.json(leaderboard.rows);
    } catch (error) {
      console.error('Leaderboard API error:', error);
      res.status(500).json({ error: 'Failed to fetch leaderboard' });
    }
  });

  // Authentication middleware functions
  const requireAuth = (req, res, next) => {
    if (req.session.userId) {
      next();
    } else {
      res.redirect('/login');
    }
  };

  const requireTeacher = async (req, res, next) => {
    if (req.session.userId) {
      try {
        const result = await pool.query('SELECT role FROM users WHERE id = $1', [req.session.userId]);
        if (result.rows[0] && result.rows[0].role === 'teacher') {
          next();
        } else {
          res.status(403).send('Access denied. Teacher role required.');
        }
      } catch (error) {
        console.error('Error checking user role:', error);
        res.status(500).send('Internal server error');
      }
    } else {
      res.redirect('/login');
    }
  };

  // Use route modules
  app.use('/', authRoutes(pool));
  app.use('/teacher', teacherRoutes(pool, requireAuth, requireTeacher));
  app.use('/student', studentRoutes(pool, requireAuth));

  // Error handling middleware
  app.use((err, req, res, next) => {
    console.error('Application error:', err.stack);
    res.status(500).render('error', {
      title: 'Error - QuizMaster',
      message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong!',
      error: process.env.NODE_ENV === 'development' ? err : {},
      user: req.session.userId ? { name: req.session.userName, role: req.session.userRole } : null
    });
  });

  // 404 handler
  app.use('*', (req, res) => {
    res.status(404).render('404', {
      title: '404 - Page Not Found',
      user: req.session.userId ? { name: req.session.userName, role: req.session.userRole } : null
    });
  });
}

// Start the server
async function startServer() {
  console.log('🚀 Starting QuizMaster server...');
  
  await initializeDatabase();
  setupRoutes();
  
  const PORT = process.env.PORT || 5000;
  
  server.listen(PORT, '0.0.0.0', () => {
    console.log(`🌐 QuizMaster server running on http://0.0.0.0:${PORT}`);
    console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log('🎯 Tech Stack: Node.js + Express.js + EJS + PostgreSQL + Socket.IO');
    console.log('✅ Server ready for connections');
  });
}

// Handle graceful shutdown
process.on('SIGTERM', () => {
  console.log('📴 SIGTERM received, shutting down gracefully');
  server.close(() => {
    console.log('🔚 Process terminated');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('📴 SIGINT received, shutting down gracefully');
  server.close(() => {
    console.log('🔚 Process terminated');
    process.exit(0);
  });
});

// Start the application
startServer().catch(error => {
  console.error('❌ Failed to start server:', error);
  process.exit(1);
});