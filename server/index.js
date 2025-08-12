const { app, server, pool } = require('./app');
const authRoutes = require('./routes/auth');
const teacherRoutes = require('./routes/teacher');
const studentRoutes = require('./routes/student');
const fs = require('fs');
const path = require('path');

// Initialize database
async function initializeDatabase() {
  try {
    const schemaPath = path.join(__dirname, 'database', 'schema.sql');
    if (fs.existsSync(schemaPath)) {
      const schema = fs.readFileSync(schemaPath, 'utf8');
      await pool.query(schema);
      console.log('Database initialized successfully');
    }
  } catch (error) {
    console.error('Database initialization error:', error);
  }
}

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

// Use routes
app.use('/', authRoutes(pool));
app.use('/teacher', teacherRoutes(pool, 
  (req, res, next) => req.session.userId ? next() : res.redirect('/login'),
  async (req, res, next) => {
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
  }
));
app.use('/student', studentRoutes(pool, 
  (req, res, next) => req.session.userId ? next() : res.redirect('/login')
));

// Error handling
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).render('error', {
    title: 'Error - QuizMaster',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong!',
    error: process.env.NODE_ENV === 'development' ? err : {}
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).render('404', {
    title: '404 - Page Not Found',
    user: req.session.userId ? { name: req.session.userName, role: req.session.userRole } : null
  });
});

const PORT = process.env.PORT || 5000;

async function startServer() {
  await initializeDatabase();
  
  server.listen(PORT, '0.0.0.0', () => {
    console.log(`QuizMaster server running on http://0.0.0.0:${PORT}`);
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  });
}

startServer().catch(console.error);