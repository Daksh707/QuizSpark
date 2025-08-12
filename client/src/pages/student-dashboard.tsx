import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";

import AppHeader from "@/components/app-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  CheckCircle, 
  BarChart3, 
  Trophy,
  Clock,
  HelpCircle,
  Star,
  Calendar,
  Users
} from "lucide-react";

export default function StudentDashboard() {
  const { user, isLoading: authLoading } = useAuth();
  const { toast } = useToast();

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

  const { data: quizzes = [], isLoading: quizzesLoading } = useQuery({
    queryKey: ["/api/quizzes"],
    enabled: !!user && user.role === 'student',
    retry: false,
  });

  const { data: attempts = [] } = useQuery({
    queryKey: ["/api/my-attempts"],
    enabled: !!user && user.role === 'student',
    retry: false,
  });

  if (authLoading || !user || user.role !== 'student') {
    return <div>Loading...</div>;
  }

  const completedQuizzes = attempts.filter((attempt: any) => attempt.completedAt);
  const avgScore = completedQuizzes.length > 0 
    ? completedQuizzes.reduce((sum: number, attempt: any) => 
        sum + ((attempt.score / attempt.totalPoints) * 100), 0) / completedQuizzes.length
    : 0;

  const getQuizStatus = (quiz: any) => {
    const attempt = attempts.find((a: any) => a.quizId === quiz.id);
    if (attempt?.completedAt) {
      return { status: 'completed', attempt };
    }
    if (attempt) {
      return { status: 'in_progress', attempt };
    }
    return { status: 'available' };
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge className="bg-gray-100 text-gray-800">Completed</Badge>;
      case 'in_progress':
        return <Badge className="bg-yellow-100 text-yellow-800">In Progress</Badge>;
      case 'available':
        return <Badge className="bg-green-100 text-green-800">
          <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
          Available
        </Badge>;
      default:
        return <Badge variant="secondary">Unknown</Badge>;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-8">
          
          {/* Student Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between space-y-4 md:space-y-0">
            <div>
              <h2 className="text-3xl font-bold text-gray-900">Available Quizzes</h2>
              <p className="mt-2 text-gray-600">Select a quiz to begin or continue your assessment</p>
            </div>
          </div>

          {/* Student Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="shadow-material">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Quizzes Completed</p>
                    <p className="text-3xl font-bold text-gray-900" data-testid="text-completed-quizzes">
                      {completedQuizzes.length}
                    </p>
                  </div>
                  <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                    <CheckCircle className="text-secondary text-xl" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-material">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Average Score</p>
                    <p className="text-3xl font-bold text-gray-900" data-testid="text-average-score">
                      {avgScore.toFixed(1)}%
                    </p>
                  </div>
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                    <BarChart3 className="text-primary text-xl" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-material">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Current Rank</p>
                    <p className="text-3xl font-bold text-gray-900" data-testid="text-current-rank">
                      --
                    </p>
                  </div>
                  <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                    <Trophy className="text-accent text-xl" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Available Quizzes */}
          <Card className="shadow-material">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Available Quizzes</h3>
            </div>
            <CardContent className="p-6">
              {quizzesLoading ? (
                <div className="space-y-6">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="animate-pulse border border-gray-200 rounded-xl p-6">
                      <div className="h-6 bg-gray-200 rounded w-3/4 mb-4"></div>
                      <div className="h-4 bg-gray-200 rounded w-full mb-4"></div>
                      <div className="flex space-x-4">
                        <div className="h-4 bg-gray-200 rounded w-20"></div>
                        <div className="h-4 bg-gray-200 rounded w-20"></div>
                        <div className="h-4 bg-gray-200 rounded w-20"></div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : quizzes.length === 0 ? (
                <div className="text-center py-12">
                  <Users className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">No Quizzes Available</h3>
                  <p className="text-gray-500">There are no active quizzes at the moment.</p>
                  <p className="text-sm text-gray-400 mt-1">Check back later for new assessments.</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {quizzes.map((quiz: any) => {
                    const { status, attempt } = getQuizStatus(quiz);
                    
                    return (
                      <div 
                        key={quiz.id} 
                        className="border border-gray-200 rounded-xl p-6 hover:border-primary hover:shadow-md transition-all"
                        data-testid={`card-quiz-${quiz.id}`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center space-x-3 mb-2">
                              <h4 className="text-xl font-semibold text-gray-900" data-testid={`text-quiz-title-${quiz.id}`}>
                                {quiz.title}
                              </h4>
                              {getStatusBadge(status)}
                            </div>
                            {quiz.description && (
                              <p className="text-gray-600 mb-4" data-testid={`text-quiz-description-${quiz.id}`}>
                                {quiz.description}
                              </p>
                            )}
                            
                            <div className="flex flex-wrap items-center gap-6 text-sm text-gray-500">
                              <div className="flex items-center">
                                <Clock className="w-4 h-4 mr-2 text-primary" />
                                <span>{quiz.duration} minutes</span>
                              </div>
                              <div className="flex items-center">
                                <HelpCircle className="w-4 h-4 mr-2 text-primary" />
                                <span>Multiple questions</span>
                              </div>
                              <div className="flex items-center">
                                <Star className="w-4 h-4 mr-2 text-primary" />
                                <span>Intermediate</span>
                              </div>
                              <div className="flex items-center">
                                <Calendar className="w-4 h-4 mr-2 text-primary" />
                                <span>Available now</span>
                              </div>
                            </div>
                          </div>
                          
                          <div className="ml-6 text-right">
                            <div className="mb-2">
                              <span className="text-sm text-gray-500">
                                {status === 'completed' ? 'Your Score' : 'Best Score'}
                              </span>
                              <p className="text-lg font-semibold text-primary" data-testid={`text-quiz-score-${quiz.id}`}>
                                {attempt && attempt.completedAt 
                                  ? `${Math.round((attempt.score / attempt.totalPoints) * 100)}%`
                                  : '--'
                                }
                              </p>
                            </div>
                            {status === 'completed' ? (
                              <Button 
                                variant="outline"
                                data-testid={`button-view-results-${quiz.id}`}
                              >
                                View Results
                              </Button>
                            ) : status === 'in_progress' ? (
                              <Link href={`/quiz/${quiz.id}`}>
                                <Button 
                                  className="bg-secondary hover:bg-green-700"
                                  data-testid={`button-continue-quiz-${quiz.id}`}
                                >
                                  Continue Quiz
                                </Button>
                              </Link>
                            ) : (
                              <Link href={`/quiz/${quiz.id}`}>
                                <Button 
                                  className="bg-primary hover:bg-blue-700"
                                  data-testid={`button-start-quiz-${quiz.id}`}
                                >
                                  Start Quiz
                                </Button>
                              </Link>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
