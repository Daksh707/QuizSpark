import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useRoute } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";

import AppHeader from "@/components/app-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { 
  Clock, 
  ArrowLeft, 
  ArrowRight, 
  Bookmark,
  CheckCircle,
  Circle
} from "lucide-react";

export default function QuizTaking() {
  const [, params] = useRoute("/quiz/:id");
  const { user, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [markedForReview, setMarkedForReview] = useState<Set<string>>(new Set());
  const [attemptId, setAttemptId] = useState<string | null>(null);

  const quizId = params?.id;

  // Redirect if not authenticated or not student
  useEffect(() => {
    if (!authLoading && (!user || user.role !== 'student')) {
      toast({
        title: "Unauthorized",
        description: "You are logged out. Logging in again...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
    }
  }, [user, authLoading, toast]);

  const { data: quiz, isLoading: quizLoading } = useQuery({
    queryKey: ["/api/quizzes", quizId],
    enabled: !!quizId && !!user,
    retry: false,
  });

  const { data: questions = [], isLoading: questionsLoading } = useQuery({
    queryKey: ["/api/quizzes", quizId, "questions"],
    enabled: !!quizId && !!user,
    retry: false,
  });

  // Initialize quiz attempt
  const initializeAttemptMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", `/api/quizzes/${quizId}/attempts`, {
        answers: {},
      });
      return response.json();
    },
    onSuccess: (attempt) => {
      setAttemptId(attempt.id);
      if (quiz) {
        setTimeRemaining(quiz.duration * 60); // Convert minutes to seconds
      }
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Error",
        description: "Failed to start quiz. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Submit quiz
  const submitQuizMutation = useMutation({
    mutationFn: async () => {
      if (!attemptId) throw new Error("No attempt ID");
      
      // Calculate score
      let score = 0;
      let totalPoints = 0;
      
      questions.forEach((question: any) => {
        totalPoints += question.points || 10;
        const userAnswer = answers[question.id];
        if (userAnswer === question.correctAnswer) {
          score += question.points || 10;
        }
      });

      const response = await apiRequest("PUT", `/api/quiz-attempts/${attemptId}`, {
        answers,
        score,
        totalPoints,
        completedAt: new Date(),
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/my-attempts"] });
      toast({
        title: "Quiz Submitted",
        description: "Your answers have been submitted successfully!",
      });
      // Redirect to results or dashboard
      window.location.href = "/";
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Error",
        description: "Failed to submit quiz. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Initialize attempt when quiz loads
  useEffect(() => {
    if (quiz && questions.length > 0 && !attemptId) {
      initializeAttemptMutation.mutate();
    }
  }, [quiz, questions.length, attemptId]);

  // Timer countdown
  useEffect(() => {
    if (timeRemaining <= 0) return;

    const timer = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev <= 1) {
          submitQuizMutation.mutate();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [timeRemaining]);

  if (authLoading || !user || user.role !== 'student') {
    return <div>Loading...</div>;
  }

  if (quizLoading || questionsLoading) {
    return (
      <div className="min-h-screen bg-background">
        <AppHeader />
        <div className="max-w-4xl mx-auto px-4 py-8">
          <div className="animate-pulse space-y-6">
            <div className="h-32 bg-gray-200 rounded-xl"></div>
            <div className="h-96 bg-gray-200 rounded-xl"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!quiz || questions.length === 0) {
    return (
      <div className="min-h-screen bg-background">
        <AppHeader />
        <div className="max-w-4xl mx-auto px-4 py-8 text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Quiz Not Found</h2>
          <p className="text-gray-600">The quiz you're looking for doesn't exist or has no questions.</p>
        </div>
      </div>
    );
  }

  const currentQuestion = questions[currentQuestionIndex];
  const progress = ((currentQuestionIndex + 1) / questions.length) * 100;
  
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleAnswerChange = (questionId: string, answer: string) => {
    setAnswers(prev => ({ ...prev, [questionId]: answer }));
  };

  const handleMarkForReview = (questionId: string) => {
    setMarkedForReview(prev => {
      const newSet = new Set(prev);
      if (newSet.has(questionId)) {
        newSet.delete(questionId);
      } else {
        newSet.add(questionId);
      }
      return newSet;
    });
  };

  const getQuestionStatus = (questionId: string, index: number) => {
    if (index === currentQuestionIndex) return 'current';
    if (answers[questionId]) return 'answered';
    if (markedForReview.has(questionId)) return 'marked';
    return 'unanswered';
  };

  const getQuestionButtonClass = (status: string) => {
    switch (status) {
      case 'current':
        return 'bg-primary text-white';
      case 'answered':
        return 'bg-green-100 text-green-800 border-green-300';
      case 'marked':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      default:
        return 'border border-gray-300 text-gray-600';
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      
      <main className="max-w-4xl mx-auto px-4 py-8">
        {/* Quiz Header */}
        <Card className="shadow-material mb-8">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-2xl font-bold text-gray-900" data-testid="text-quiz-title">
                  {quiz.title}
                </h2>
                <p className="text-gray-600">
                  Question <span data-testid="text-current-question">{currentQuestionIndex + 1}</span> of{" "}
                  <span data-testid="text-total-questions">{questions.length}</span>
                </p>
              </div>
              <div className="text-right">
                <div className="flex items-center space-x-2 text-lg font-mono">
                  <Clock className="text-primary" />
                  <span className="font-bold text-primary" data-testid="text-time-remaining">
                    {formatTime(timeRemaining)}
                  </span>
                </div>
                <div className="w-48 bg-gray-200 rounded-full h-2 mt-2">
                  <div 
                    className="bg-primary h-2 rounded-full" 
                    style={{ width: `${progress}%` }}
                    data-testid="progress-bar"
                  ></div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Question Content */}
        <Card className="shadow-material">
          <CardContent className="p-8">
            <div className="mb-6">
              <div className="flex items-start space-x-4">
                <span className="flex-shrink-0 w-8 h-8 bg-primary text-white rounded-full flex items-center justify-center font-bold">
                  {currentQuestionIndex + 1}
                </span>
                <div className="flex-1">
                  <h3 className="text-xl font-semibold text-gray-900 mb-4" data-testid="text-question">
                    {currentQuestion.questionText}
                  </h3>
                  
                  {currentQuestion.questionType === 'multiple_choice' && (
                    <RadioGroup
                      value={answers[currentQuestion.id] || ""}
                      onValueChange={(value) => handleAnswerChange(currentQuestion.id, value)}
                      className="space-y-4"
                    >
                      {currentQuestion.options?.map((option: string, index: number) => (
                        <div key={index} className="flex items-start space-x-4 p-4 border border-gray-200 rounded-lg hover:border-primary hover:bg-blue-50 cursor-pointer transition-all">
                          <RadioGroupItem value={option} id={`option-${index}`} className="mt-1" data-testid={`radio-option-${index}`} />
                          <Label htmlFor={`option-${index}`} className="flex-1 cursor-pointer">
                            {option}
                          </Label>
                        </div>
                      ))}
                    </RadioGroup>
                  )}

                  {currentQuestion.questionType === 'true_false' && (
                    <RadioGroup
                      value={answers[currentQuestion.id] || ""}
                      onValueChange={(value) => handleAnswerChange(currentQuestion.id, value)}
                      className="space-y-4"
                    >
                      <div className="flex items-start space-x-4 p-4 border border-gray-200 rounded-lg hover:border-primary hover:bg-blue-50 cursor-pointer transition-all">
                        <RadioGroupItem value="true" id="true" className="mt-1" data-testid="radio-true" />
                        <Label htmlFor="true" className="flex-1 cursor-pointer">True</Label>
                      </div>
                      <div className="flex items-start space-x-4 p-4 border border-gray-200 rounded-lg hover:border-primary hover:bg-blue-50 cursor-pointer transition-all">
                        <RadioGroupItem value="false" id="false" className="mt-1" data-testid="radio-false" />
                        <Label htmlFor="false" className="flex-1 cursor-pointer">False</Label>
                      </div>
                    </RadioGroup>
                  )}

                  {currentQuestion.questionType === 'short_answer' && (
                    <Textarea
                      value={answers[currentQuestion.id] || ""}
                      onChange={(e) => handleAnswerChange(currentQuestion.id, e.target.value)}
                      placeholder="Enter your answer here..."
                      className="min-h-32"
                      data-testid="textarea-short-answer"
                    />
                  )}
                </div>
              </div>
            </div>

            {/* Navigation */}
            <div className="flex items-center justify-between pt-6 border-t border-gray-200">
              <Button
                variant="outline"
                onClick={() => setCurrentQuestionIndex(prev => Math.max(0, prev - 1))}
                disabled={currentQuestionIndex === 0}
                data-testid="button-previous"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Previous
              </Button>
              
              <div className="flex items-center space-x-4">
                <Button
                  variant="ghost"
                  onClick={() => handleMarkForReview(currentQuestion.id)}
                  data-testid="button-mark-review"
                >
                  <Bookmark className={`w-4 h-4 mr-2 ${markedForReview.has(currentQuestion.id) ? 'fill-current' : ''}`} />
                  {markedForReview.has(currentQuestion.id) ? 'Marked for Review' : 'Mark for Review'}
                </Button>
                
                {currentQuestionIndex === questions.length - 1 ? (
                  <Button
                    onClick={() => submitQuizMutation.mutate()}
                    disabled={submitQuizMutation.isPending}
                    className="bg-secondary hover:bg-green-700"
                    data-testid="button-submit"
                  >
                    {submitQuizMutation.isPending ? 'Submitting...' : 'Submit Quiz'}
                  </Button>
                ) : (
                  <Button
                    onClick={() => setCurrentQuestionIndex(prev => Math.min(questions.length - 1, prev + 1))}
                    data-testid="button-next"
                  >
                    Next
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Quiz Navigation Sidebar */}
        <div className="fixed right-8 top-1/2 transform -translate-y-1/2 bg-surface rounded-xl shadow-material p-4 w-64">
          <h4 className="font-semibold text-gray-900 mb-4">Question Overview</h4>
          <div className="grid grid-cols-5 gap-2 mb-4">
            {questions.map((question: any, index: number) => {
              const status = getQuestionStatus(question.id, index);
              return (
                <button
                  key={question.id}
                  onClick={() => setCurrentQuestionIndex(index)}
                  className={`w-10 h-10 rounded-lg text-sm font-medium ${getQuestionButtonClass(status)}`}
                  data-testid={`button-question-${index + 1}`}
                >
                  {index + 1}
                </button>
              );
            })}
          </div>
          
          <div className="text-xs space-y-2 mb-4">
            <div className="flex items-center">
              <div className="w-4 h-4 bg-primary rounded mr-2"></div>
              <span>Current</span>
            </div>
            <div className="flex items-center">
              <div className="w-4 h-4 bg-green-100 border border-green-300 rounded mr-2"></div>
              <span>Answered</span>
            </div>
            <div className="flex items-center">
              <div className="w-4 h-4 bg-yellow-100 border border-yellow-300 rounded mr-2"></div>
              <span>Marked for review</span>
            </div>
            <div className="flex items-center">
              <div className="w-4 h-4 border border-gray-300 rounded mr-2"></div>
              <span>Not answered</span>
            </div>
          </div>
          
          <Button
            onClick={() => submitQuizMutation.mutate()}
            disabled={submitQuizMutation.isPending}
            className="w-full bg-secondary hover:bg-green-700"
            data-testid="button-submit-sidebar"
          >
            {submitQuizMutation.isPending ? 'Submitting...' : 'Submit Quiz'}
          </Button>
        </div>
      </main>
    </div>
  );
}
