const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');
const session = require('express-session');
const bcrypt = require('bcrypt');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');
const { Pool } = require('pg');
const ConnectPgSimple = require('connect-pg-simple');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com", "https://cdn.jsdelivr.net"],
      fontSrc: ["'self'", "https://fonts.gstatic.com", "https://cdn.jsdelivr.net"],
      scriptSrc: ["'self'", "'unsafe-inline'", "https://cdn.socket.io", "https://cdn.jsdelivr.net"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "ws:", "wss:"]
    }
  }
}));

// Middleware
app.use(morgan('combined'));
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, '../public')));

// View engine setup
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, '../views'));

// PostgreSQL connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Session configuration with PostgreSQL store
const PgSession = ConnectPgSimple(session);
app.use(session({
  store: new PgSession({
    pool: pool,
    tableName: 'sessions'
  }),
  secret: process.env.SESSION_SECRET || 'your-secret-key-change-in-production',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));

// Authentication middleware
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

// Socket.IO for real-time features
const activeQuizzes = new Map();
const userSockets = new Map();

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  socket.on('join-quiz', (data) => {
    const { quizId, userId, userRole } = data;
    socket.join(`quiz-${quizId}`);
    userSockets.set(userId, socket.id);
    
    if (!activeQuizzes.has(quizId)) {
      activeQuizzes.set(quizId, {
        participants: new Set(),
        leaderboard: []
      });
    }
    
    activeQuizzes.get(quizId).participants.add(userId);
    
    // Notify others about new participant
    socket.to(`quiz-${quizId}`).emit('user-joined', {
      userId,
      participantCount: activeQuizzes.get(quizId).participants.size
    });
  });

  socket.on('submit-answer', async (data) => {
    const { quizId, questionId, answer, userId, score } = data;
    
    try {
      // Update database
      await pool.query(
        'UPDATE quiz_attempts SET answers = answers || $1, score = $2, updated_at = NOW() WHERE quiz_id = $3 AND student_id = $4',
        [JSON.stringify({ [questionId]: answer }), score, quizId, userId]
      );

      // Update real-time leaderboard
      const leaderboard = await pool.query(`
        SELECT qa.score, qa.total_points, u.username, u.first_name, u.last_name
        FROM quiz_attempts qa
        JOIN users u ON qa.student_id = u.id
        WHERE qa.quiz_id = $1 AND qa.completed_at IS NOT NULL
        ORDER BY qa.score DESC
        LIMIT 10
      `, [quizId]);

      // Broadcast updated leaderboard
      io.to(`quiz-${quizId}`).emit('leaderboard-update', leaderboard.rows);
      
    } catch (error) {
      console.error('Error updating answer:', error);
    }
  });

  socket.on('complete-quiz', async (data) => {
    const { quizId, userId, finalScore, totalPoints } = data;
    
    try {
      await pool.query(
        'UPDATE quiz_attempts SET score = $1, total_points = $2, completed_at = NOW() WHERE quiz_id = $3 AND student_id = $4',
        [finalScore, totalPoints, quizId, userId]
      );

      // Get updated leaderboard
      const leaderboard = await pool.query(`
        SELECT qa.score, qa.total_points, u.username, u.first_name, u.last_name
        FROM quiz_attempts qa
        JOIN users u ON qa.student_id = u.id
        WHERE qa.quiz_id = $1 AND qa.completed_at IS NOT NULL
        ORDER BY qa.score DESC
        LIMIT 10
      `, [quizId]);

      // Broadcast final leaderboard update
      io.to(`quiz-${quizId}`).emit('leaderboard-update', leaderboard.rows);
      io.to(`quiz-${quizId}`).emit('quiz-completed', {
        userId,
        score: finalScore,
        totalPoints
      });
      
    } catch (error) {
      console.error('Error completing quiz:', error);
    }
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
    // Clean up user from active quizzes
    for (const [userId, socketId] of userSockets.entries()) {
      if (socketId === socket.id) {
        userSockets.delete(userId);
        // Remove from all quiz rooms
        for (const [quizId, quiz] of activeQuizzes.entries()) {
          if (quiz.participants.has(userId)) {
            quiz.participants.delete(userId);
            socket.to(`quiz-${quizId}`).emit('user-left', {
              userId,
              participantCount: quiz.participants.size
            });
          }
        }
        break;
      }
    }
  });
});

module.exports = { app, server, io, pool, requireAuth, requireTeacher };