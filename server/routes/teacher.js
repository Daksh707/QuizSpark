const express = require('express');
const router = express.Router();

module.exports = (pool, requireAuth, requireTeacher) => {
  // Teacher Dashboard
  router.get('/dashboard', requireAuth, requireTeacher, async (req, res) => {
    try {
      // Get teacher's quizzes
      const quizzes = await pool.query(`
        SELECT q.*, 
               COUNT(DISTINCT qa.id) as total_attempts,
               COUNT(DISTINCT qst.id) as question_count
        FROM quizzes q
        LEFT JOIN quiz_attempts qa ON q.id = qa.quiz_id
        LEFT JOIN questions qst ON q.id = qst.quiz_id
        WHERE q.teacher_id = $1
        GROUP BY q.id
        ORDER BY q.created_at DESC
      `, [req.session.userId]);

      // Get teacher statistics
      const stats = await pool.query(`
        SELECT 
          COUNT(DISTINCT q.id) as total_quizzes,
          COUNT(DISTINCT CASE WHEN q.is_active = true THEN q.id END) as active_quizzes,
          COUNT(DISTINCT qa.id) as total_attempts,
          ROUND(AVG(CASE WHEN qa.completed_at IS NOT NULL THEN (qa.score::float / qa.total_points * 100) END), 1) as avg_score
        FROM quizzes q
        LEFT JOIN quiz_attempts qa ON q.id = qa.quiz_id
        WHERE q.teacher_id = $1
      `, [req.session.userId]);

      res.render('teacher/dashboard', {
        title: 'Teacher Dashboard - QuizMaster',
        user: {
          name: req.session.userName,
          role: req.session.userRole
        },
        quizzes: quizzes.rows,
        stats: stats.rows[0] || { total_quizzes: 0, active_quizzes: 0, total_attempts: 0, avg_score: 0 }
      });
      
    } catch (error) {
      console.error('Dashboard error:', error);
      res.status(500).send('Internal server error');
    }
  });

  // Create Quiz Page
  router.get('/create-quiz', requireAuth, requireTeacher, (req, res) => {
    res.render('teacher/create-quiz', {
      title: 'Create Quiz - QuizMaster',
      user: {
        name: req.session.userName,
        role: req.session.userRole
      }
    });
  });

  // Create Quiz POST
  router.post('/create-quiz', requireAuth, requireTeacher, async (req, res) => {
    const { title, description, duration, questions } = req.body;
    
    try {
      // Start transaction
      await pool.query('BEGIN');
      
      // Create quiz
      const quizResult = await pool.query(`
        INSERT INTO quizzes (title, description, duration, teacher_id, is_active)
        VALUES ($1, $2, $3, $4, false)
        RETURNING id
      `, [title, description, parseInt(duration), req.session.userId]);
      
      const quizId = quizResult.rows[0].id;
      
      // Parse and create questions
      const questionsArray = JSON.parse(questions);
      
      for (let i = 0; i < questionsArray.length; i++) {
        const question = questionsArray[i];
        await pool.query(`
          INSERT INTO questions (quiz_id, question_text, question_type, options, correct_answer, points, order_num)
          VALUES ($1, $2, $3, $4, $5, $6, $7)
        `, [
          quizId,
          question.questionText,
          question.questionType,
          JSON.stringify(question.options || []),
          question.correctAnswer,
          parseInt(question.points) || 10,
          i + 1
        ]);
      }
      
      await pool.query('COMMIT');
      
      res.redirect('/teacher/dashboard?success=Quiz created successfully');
      
    } catch (error) {
      await pool.query('ROLLBACK');
      console.error('Create quiz error:', error);
      res.redirect('/teacher/create-quiz?error=Failed to create quiz');
    }
  });

  // Quiz Management
  router.get('/quiz/:id', requireAuth, requireTeacher, async (req, res) => {
    const quizId = req.params.id;
    
    try {
      // Get quiz details
      const quiz = await pool.query('SELECT * FROM quizzes WHERE id = $1 AND teacher_id = $2', [quizId, req.session.userId]);
      
      if (quiz.rows.length === 0) {
        return res.status(404).send('Quiz not found');
      }
      
      // Get questions
      const questions = await pool.query('SELECT * FROM questions WHERE quiz_id = $1 ORDER BY order_num', [quizId]);
      
      // Get quiz attempts
      const attempts = await pool.query(`
        SELECT qa.*, u.username, u.first_name, u.last_name
        FROM quiz_attempts qa
        JOIN users u ON qa.student_id = u.id
        WHERE qa.quiz_id = $1
        ORDER BY qa.score DESC, qa.completed_at ASC
      `, [quizId]);

      res.render('teacher/quiz-details', {
        title: `${quiz.rows[0].title} - Quiz Management`,
        user: {
          name: req.session.userName,
          role: req.session.userRole
        },
        quiz: quiz.rows[0],
        questions: questions.rows,
        attempts: attempts.rows
      });
      
    } catch (error) {
      console.error('Quiz details error:', error);
      res.status(500).send('Internal server error');
    }
  });

  // Toggle Quiz Active Status
  router.post('/quiz/:id/toggle', requireAuth, requireTeacher, async (req, res) => {
    const quizId = req.params.id;
    
    try {
      await pool.query(`
        UPDATE quizzes 
        SET is_active = NOT is_active, updated_at = NOW() 
        WHERE id = $1 AND teacher_id = $2
      `, [quizId, req.session.userId]);
      
      res.redirect(`/teacher/quiz/${quizId}?success=Quiz status updated`);
      
    } catch (error) {
      console.error('Toggle quiz error:', error);
      res.redirect(`/teacher/quiz/${quizId}?error=Failed to update quiz`);
    }
  });

  // Live Leaderboard Page
  router.get('/quiz/:id/leaderboard', requireAuth, requireTeacher, async (req, res) => {
    const quizId = req.params.id;
    
    try {
      const quiz = await pool.query('SELECT * FROM quizzes WHERE id = $1 AND teacher_id = $2', [quizId, req.session.userId]);
      
      if (quiz.rows.length === 0) {
        return res.status(404).send('Quiz not found');
      }

      res.render('teacher/leaderboard', {
        title: `${quiz.rows[0].title} - Live Leaderboard`,
        user: {
          name: req.session.userName,
          role: req.session.userRole
        },
        quiz: quiz.rows[0]
      });
      
    } catch (error) {
      console.error('Leaderboard error:', error);
      res.status(500).send('Internal server error');
    }
  });

  return router;
};