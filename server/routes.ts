import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { insertQuizSchema, insertQuestionSchema, insertQuizAttemptSchema } from "@shared/schema";
import { z } from "zod";

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth middleware
  await setupAuth(app);

  // Auth routes
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Quiz routes
  app.get('/api/quizzes', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      let quizzes;
      if (user.role === 'teacher') {
        quizzes = await storage.getQuizzesByTeacher(userId);
      } else {
        quizzes = await storage.getActiveQuizzes();
      }

      res.json(quizzes);
    } catch (error) {
      console.error("Error fetching quizzes:", error);
      res.status(500).json({ message: "Failed to fetch quizzes" });
    }
  });

  app.post('/api/quizzes', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user || user.role !== 'teacher') {
        return res.status(403).json({ message: "Only teachers can create quizzes" });
      }

      const quizData = insertQuizSchema.parse({
        ...req.body,
        teacherId: userId,
      });

      const quiz = await storage.createQuiz(quizData);
      res.json(quiz);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid quiz data", errors: error.errors });
      }
      console.error("Error creating quiz:", error);
      res.status(500).json({ message: "Failed to create quiz" });
    }
  });

  app.get('/api/quizzes/:id', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const quiz = await storage.getQuizById(id);
      
      if (!quiz) {
        return res.status(404).json({ message: "Quiz not found" });
      }

      res.json(quiz);
    } catch (error) {
      console.error("Error fetching quiz:", error);
      res.status(500).json({ message: "Failed to fetch quiz" });
    }
  });

  app.put('/api/quizzes/:id', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user || user.role !== 'teacher') {
        return res.status(403).json({ message: "Only teachers can update quizzes" });
      }

      const quiz = await storage.getQuizById(id);
      if (!quiz || quiz.teacherId !== userId) {
        return res.status(404).json({ message: "Quiz not found" });
      }

      const updates = insertQuizSchema.partial().parse(req.body);
      const updatedQuiz = await storage.updateQuiz(id, updates);
      res.json(updatedQuiz);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid quiz data", errors: error.errors });
      }
      console.error("Error updating quiz:", error);
      res.status(500).json({ message: "Failed to update quiz" });
    }
  });

  // Question routes
  app.get('/api/quizzes/:quizId/questions', isAuthenticated, async (req: any, res) => {
    try {
      const { quizId } = req.params;
      const questions = await storage.getQuestionsByQuiz(quizId);
      res.json(questions);
    } catch (error) {
      console.error("Error fetching questions:", error);
      res.status(500).json({ message: "Failed to fetch questions" });
    }
  });

  app.post('/api/quizzes/:quizId/questions', isAuthenticated, async (req: any, res) => {
    try {
      const { quizId } = req.params;
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user || user.role !== 'teacher') {
        return res.status(403).json({ message: "Only teachers can create questions" });
      }

      const quiz = await storage.getQuizById(quizId);
      if (!quiz || quiz.teacherId !== userId) {
        return res.status(404).json({ message: "Quiz not found" });
      }

      const questionData = insertQuestionSchema.parse({
        ...req.body,
        quizId,
      });

      const question = await storage.createQuestion(questionData);
      res.json(question);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid question data", errors: error.errors });
      }
      console.error("Error creating question:", error);
      res.status(500).json({ message: "Failed to create question" });
    }
  });

  // Quiz attempt routes
  app.post('/api/quizzes/:quizId/attempts', isAuthenticated, async (req: any, res) => {
    try {
      const { quizId } = req.params;
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user || user.role !== 'student') {
        return res.status(403).json({ message: "Only students can take quizzes" });
      }

      const attemptData = insertQuizAttemptSchema.parse({
        ...req.body,
        quizId,
        studentId: userId,
      });

      const attempt = await storage.createQuizAttempt(attemptData);
      res.json(attempt);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid attempt data", errors: error.errors });
      }
      console.error("Error creating quiz attempt:", error);
      res.status(500).json({ message: "Failed to create quiz attempt" });
    }
  });

  app.put('/api/quiz-attempts/:id', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const userId = req.user.claims.sub;

      // Get the attempt to verify ownership
      const attempts = await storage.getQuizAttemptsByStudent(userId);
      const attempt = attempts.find(a => a.id === id);
      
      if (!attempt) {
        return res.status(404).json({ message: "Quiz attempt not found" });
      }

      const updates = insertQuizAttemptSchema.partial().parse(req.body);
      const updatedAttempt = await storage.updateQuizAttempt(id, updates);
      res.json(updatedAttempt);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid attempt data", errors: error.errors });
      }
      console.error("Error updating quiz attempt:", error);
      res.status(500).json({ message: "Failed to update quiz attempt" });
    }
  });

  app.get('/api/my-attempts', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const attempts = await storage.getQuizAttemptsByStudent(userId);
      res.json(attempts);
    } catch (error) {
      console.error("Error fetching attempts:", error);
      res.status(500).json({ message: "Failed to fetch attempts" });
    }
  });

  // Leaderboard routes
  app.get('/api/quizzes/:quizId/leaderboard', isAuthenticated, async (req: any, res) => {
    try {
      const { quizId } = req.params;
      const leaderboard = await storage.getLeaderboard(quizId);
      res.json(leaderboard);
    } catch (error) {
      console.error("Error fetching leaderboard:", error);
      res.status(500).json({ message: "Failed to fetch leaderboard" });
    }
  });

  // Teacher analytics routes
  app.get('/api/teacher/stats', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user || user.role !== 'teacher') {
        return res.status(403).json({ message: "Only teachers can access stats" });
      }

      const quizzes = await storage.getQuizzesByTeacher(userId);
      const totalQuizzes = quizzes.length;
      const activeQuizzes = quizzes.filter(q => q.isActive).length;
      
      // Calculate additional stats
      let totalAttempts = 0;
      let totalScore = 0;
      let totalPossibleScore = 0;
      
      for (const quiz of quizzes) {
        const attempts = await storage.getQuizAttemptsByQuiz(quiz.id);
        const completedAttempts = attempts.filter(a => a.completedAt);
        totalAttempts += completedAttempts.length;
        
        for (const attempt of completedAttempts) {
          totalScore += attempt.score || 0;
          totalPossibleScore += attempt.totalPoints || 0;
        }
      }

      const avgScore = totalPossibleScore > 0 ? (totalScore / totalPossibleScore) * 100 : 0;
      const completionRate = totalAttempts > 0 ? 100 : 0; // Simplified calculation

      res.json({
        totalQuizzes,
        activeQuizzes,
        totalAttempts,
        avgScore: parseFloat(avgScore.toFixed(1)),
        completionRate: parseFloat(completionRate.toFixed(1)),
      });
    } catch (error) {
      console.error("Error fetching teacher stats:", error);
      res.status(500).json({ message: "Failed to fetch teacher stats" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
