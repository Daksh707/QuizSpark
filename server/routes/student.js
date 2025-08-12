const express = require('express');
const router = express.Router();

module.exports = (pool, requireAuth) => {
  // Student Dashboard
  router.get('/dashboard', requireAuth, async (req, res) => {
    try {
      // Get available quizzes
      const quizzes = await pool.query(`
        SELECT q.*, u.first_name as teacher_name, u.last_name as teacher_lastname,
               COUNT(qst.id) as question_count,
               qa.id as attempt_id, qa.score, qa.total_points, qa.completed_at, qa.started_at
        FROM quizzes q
        JOIN users u ON q.teacher_id = u.id
        LEFT JOIN questions qst ON q.id = qst.quiz_id
        LEFT JOIN quiz_attempts qa ON q.id = qa.quiz_id AND qa.student_id = $1
        WHERE q.is_active = true
        GROUP BY q.id, u.first_name, u.last_name, qa.id, qa.score, qa.total_points, qa.completed_at, qa.started_at
        ORDER BY q.created_at DESC
      `, [req.session.userId]);

      // Get student statistics
      const stats = await pool.query(`
        SELECT 
          COUNT(DISTINCT qa.id) as total_attempts,
          COUNT(DISTINCT CASE WHEN qa.completed_at IS NOT NULL THEN qa.id END) as completed_quizzes,
          ROUND(AVG(CASE WHEN qa.completed_at IS NOT NULL THEN (qa.score::float / qa.total_points * 100) END), 1) as avg_score
        FROM quiz_attempts qa
        WHERE qa.student_id = $1
      `, [req.session.userId]);

      res.render('student/dashboard', {
        title: 'Student Dashboard - QuizMaster',
        user: {
          name: req.session.userName,
          role: req.session.userRole
        },
        quizzes: quizzes.rows,
        stats: stats.rows[0] || { total_attempts: 0, completed_quizzes: 0, avg_score: 0 }
      });
      
    } catch (error) {
      console.error('Student dashboard error:', error);
      res.status(500).send('Internal server error');
    }
  });

  // Start Quiz
  router.get('/quiz/:id/start', requireAuth, async (req, res) => {
    const quizId = req.params.id;
    
    try {
      // Check if quiz is active
      const quiz = await pool.query('SELECT * FROM quizzes WHERE id = $1 AND is_active = true', [quizId]);
      
      if (quiz.rows.length === 0) {
        return res.redirect('/student/dashboard?error=Quiz not found or not active');
      }

      // Check if student already has an attempt
      const existingAttempt = await pool.query(
        'SELECT * FROM quiz_attempts WHERE quiz_id = $1 AND student_id = $2',
        [quizId, req.session.userId]
      );

      let attemptId;
      
      if (existingAttempt.rows.length === 0) {
        // Create new attempt
        const newAttempt = await pool.query(`
          INSERT INTO quiz_attempts (quiz_id, student_id, answers, started_at)
          VALUES ($1, $2, '{}', NOW())
          RETURNING id
        `, [quizId, req.session.userId]);
        
        attemptId = newAttempt.rows[0].id;
      } else {
        attemptId = existingAttempt.rows[0].id;
        
        // If already completed, redirect to results
        if (existingAttempt.rows[0].completed_at) {
          return res.redirect(`/student/quiz/${quizId}/results`);
        }
      }

      res.redirect(`/student/quiz/${quizId}/take?attempt=${attemptId}`);
      
    } catch (error) {
      console.error('Start quiz error:', error);
      res.redirect('/student/dashboard?error=Failed to start quiz');
    }
  });

  // Take Quiz
  router.get('/quiz/:id/take', requireAuth, async (req, res) => {
    const quizId = req.params.id;
    const attemptId = req.query.attempt;
    
    try {
      // Get quiz details
      const quiz = await pool.query('SELECT * FROM quizzes WHERE id = $1 AND is_active = true', [quizId]);
      
      if (quiz.rows.length === 0) {
        return res.redirect('/student/dashboard?error=Quiz not found or not active');
      }

      // Get questions (without correct answers for security)
      const questions = await pool.query(`
        SELECT id, question_text, question_type, options, points, order_num
        FROM questions 
        WHERE quiz_id = $1 
        ORDER BY order_num
      `, [quizId]);

      // Get current attempt
      const attempt = await pool.query(
        'SELECT * FROM quiz_attempts WHERE id = $1 AND student_id = $2',
        [attemptId, req.session.userId]
      );

      if (attempt.rows.length === 0) {
        return res.redirect('/student/dashboard?error=Quiz attempt not found');
      }

      // Calculate time remaining
      const startTime = new Date(attempt.rows[0].started_at);
      const currentTime = new Date();
      const elapsedMinutes = (currentTime - startTime) / (1000 * 60);
      const timeRemaining = Math.max(0, quiz.rows[0].duration - elapsedMinutes);

      res.render('student/take-quiz', {
        title: `${quiz.rows[0].title} - Quiz`,
        user: {
          name: req.session.userName,
          role: req.session.userRole
        },
        quiz: quiz.rows[0],
        questions: questions.rows,
        attempt: attempt.rows[0],
        timeRemaining: Math.ceil(timeRemaining),
        attemptId
      });
      
    } catch (error) {
      console.error('Take quiz error:', error);
      res.status(500).send('Internal server error');
    }
  });

  // Submit Quiz
  router.post('/quiz/:id/submit', requireAuth, async (req, res) => {
    const quizId = req.params.id;
    const { answers, attemptId } = req.body;
    
    try {
      // Get questions with correct answers
      const questions = await pool.query('SELECT * FROM questions WHERE quiz_id = $1', [quizId]);
      
      // Calculate score
      let score = 0;
      let totalPoints = 0;
      const answersObj = JSON.parse(answers);
      
      questions.rows.forEach(question => {
        totalPoints += question.points;
        const studentAnswer = answersObj[question.id];
        
        if (studentAnswer && studentAnswer.toLowerCase().trim() === question.correct_answer.toLowerCase().trim()) {
          score += question.points;
        }
      });

      // Update attempt
      await pool.query(`
        UPDATE quiz_attempts 
        SET answers = $1, score = $2, total_points = $3, completed_at = NOW()
        WHERE id = $4 AND student_id = $5
      `, [answers, score, totalPoints, attemptId, req.session.userId]);

      res.redirect(`/student/quiz/${quizId}/results?attempt=${attemptId}`);
      
    } catch (error) {
      console.error('Submit quiz error:', error);
      res.redirect(`/student/quiz/${quizId}/take?attempt=${attemptId}&error=Failed to submit quiz`);
    }
  });

  // Quiz Results
  router.get('/quiz/:id/results', requireAuth, async (req, res) => {
    const quizId = req.params.id;
    const attemptId = req.query.attempt;
    
    try {
      // Get quiz details
      const quiz = await pool.query('SELECT * FROM quizzes WHERE id = $1', [quizId]);
      
      if (quiz.rows.length === 0) {
        return res.redirect('/student/dashboard?error=Quiz not found');
      }

      // Get attempt details
      const attempt = await pool.query(
        'SELECT * FROM quiz_attempts WHERE id = $1 AND student_id = $2',
        [attemptId, req.session.userId]
      );

      if (attempt.rows.length === 0 || !attempt.rows[0].completed_at) {
        return res.redirect('/student/dashboard?error=Quiz results not found');
      }

      // Get questions and answers for review
      const questions = await pool.query('SELECT * FROM questions WHERE quiz_id = $1 ORDER BY order_num', [quizId]);
      
      // Get leaderboard
      const leaderboard = await pool.query(`
        SELECT qa.score, qa.total_points, u.username, u.first_name, u.last_name
        FROM quiz_attempts qa
        JOIN users u ON qa.student_id = u.id
        WHERE qa.quiz_id = $1 AND qa.completed_at IS NOT NULL
        ORDER BY qa.score DESC
        LIMIT 10
      `, [quizId]);

      const studentAnswers = attempt.rows[0].answers;

      res.render('student/quiz-results', {
        title: `${quiz.rows[0].title} - Results`,
        user: {
          name: req.session.userName,
          role: req.session.userRole
        },
        quiz: quiz.rows[0],
        attempt: attempt.rows[0],
        questions: questions.rows,
        studentAnswers,
        leaderboard: leaderboard.rows,
        percentage: Math.round((attempt.rows[0].score / attempt.rows[0].total_points) * 100)
      });
      
    } catch (error) {
      console.error('Quiz results error:', error);
      res.status(500).send('Internal server error');
    }
  });

  // Student Quiz History
  router.get('/history', requireAuth, async (req, res) => {
    try {
      const history = await pool.query(`
        SELECT qa.*, q.title, q.duration, 
               u.first_name as teacher_name, u.last_name as teacher_lastname
        FROM quiz_attempts qa
        JOIN quizzes q ON qa.quiz_id = q.id
        JOIN users u ON q.teacher_id = u.id
        WHERE qa.student_id = $1 AND qa.completed_at IS NOT NULL
        ORDER BY qa.completed_at DESC
      `, [req.session.userId]);

      res.render('student/history', {
        title: 'Quiz History - QuizMaster',
        user: {
          name: req.session.userName,
          role: req.session.userRole
        },
        history: history.rows
      });
      
    } catch (error) {
      console.error('Quiz history error:', error);
      res.status(500).send('Internal server error');
    }
  });

  return router;
};