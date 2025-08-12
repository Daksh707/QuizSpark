const express = require('express');
const bcrypt = require('bcrypt');
const router = express.Router();

module.exports = (pool) => {
  // Login page
  router.get('/login', (req, res) => {
    res.render('auth/login', { 
      title: 'Login - QuizMaster',
      error: req.query.error 
    });
  });

  // Register page
  router.get('/register', (req, res) => {
    res.render('auth/register', { 
      title: 'Register - QuizMaster',
      error: req.query.error 
    });
  });

  // Login POST
  router.post('/login', async (req, res) => {
    const { email, password } = req.body;
    
    try {
      const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
      
      if (result.rows.length === 0) {
        return res.redirect('/login?error=Invalid email or password');
      }
      
      const user = result.rows[0];
      const passwordMatch = await bcrypt.compare(password, user.password_hash);
      
      if (!passwordMatch) {
        return res.redirect('/login?error=Invalid email or password');
      }
      
      req.session.userId = user.id;
      req.session.userRole = user.role;
      req.session.userName = user.first_name || user.username;
      
      if (user.role === 'teacher') {
        res.redirect('/teacher/dashboard');
      } else {
        res.redirect('/student/dashboard');
      }
      
    } catch (error) {
      console.error('Login error:', error);
      res.redirect('/login?error=Login failed. Please try again.');
    }
  });

  // Register POST
  router.post('/register', async (req, res) => {
    const { username, email, password, firstName, lastName, role } = req.body;
    
    try {
      // Check if user already exists
      const existingUser = await pool.query('SELECT id FROM users WHERE email = $1 OR username = $2', [email, username]);
      
      if (existingUser.rows.length > 0) {
        return res.redirect('/register?error=User already exists');
      }
      
      // Hash password
      const saltRounds = 10;
      const passwordHash = await bcrypt.hash(password, saltRounds);
      
      // Insert new user
      const result = await pool.query(`
        INSERT INTO users (username, email, password_hash, first_name, last_name, role)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING id, role, first_name, username
      `, [username, email, passwordHash, firstName, lastName, role || 'student']);
      
      const newUser = result.rows[0];
      
      req.session.userId = newUser.id;
      req.session.userRole = newUser.role;
      req.session.userName = newUser.first_name || newUser.username;
      
      if (newUser.role === 'teacher') {
        res.redirect('/teacher/dashboard');
      } else {
        res.redirect('/student/dashboard');
      }
      
    } catch (error) {
      console.error('Registration error:', error);
      res.redirect('/register?error=Registration failed. Please try again.');
    }
  });

  // Logout
  router.post('/logout', (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        console.error('Logout error:', err);
      }
      res.redirect('/');
    });
  });

  return router;
};