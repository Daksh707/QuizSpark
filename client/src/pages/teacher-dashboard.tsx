import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";

import AppHeader from "@/components/app-header";
import QuizCreatorModal from "@/components/quiz-creator-modal";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Plus, 
  ClipboardList, 
  Users, 
  BarChart3, 
  CheckCircle,
  ArrowUp,
  Edit,
  TrendingUp,
  Clock,
  HelpCircle
} from "lucide-react";

export default function TeacherDashboard() {
  const { user, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Redirect if not authenticated or not teacher
  useEffect(() => {
    if (!authLoading && (!user || user.role !== 'teacher')) {
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
    enabled: !!user && user.role === 'teacher',
    retry: false,
  });

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ["/api/teacher/stats"],
    enabled: !!user && user.role === 'teacher',
    retry: false,
  });

  const { data: recentQuizLeaderboard = [] } = useQuery({
    queryKey: ["/api/quizzes", quizzes[0]?.id, "leaderboard"],
    enabled: !!quizzes[0]?.id,
    retry: false,
  });

  if (authLoading || !user || user.role !== 'teacher') {
    return <div>Loading...</div>;
  }

  const getQuizStatusBadge = (quiz: any) => {
    if (quiz.isActive) {
      return <Badge className="bg-green-100 text-green-800">Active</Badge>;
    }
    return <Badge variant="secondary">Draft</Badge>;
  };

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-8">
          
          {/* Dashboard Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between space-y-4 md:space-y-0">
            <div>
              <h2 className="text-3xl font-bold text-gray-900">Teacher Dashboard</h2>
              <p className="mt-2 text-gray-600">Create and manage your quizzes, track student performance</p>
            </div>
            <Button 
              onClick={() => setIsModalOpen(true)}
              className="bg-primary hover:bg-blue-700 shadow-material"
              data-testid="button-create-quiz"
            >
              <Plus className="w-4 h-4 mr-2" />
              Create New Quiz
            </Button>
          </div>

          {/* Stats Overview */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card className="shadow-material">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Total Quizzes</p>
                    <p className="text-3xl font-bold text-gray-900" data-testid="text-total-quizzes">
                      {statsLoading ? '...' : stats?.totalQuizzes || 0}
                    </p>
                  </div>
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                    <ClipboardList className="text-primary text-xl" />
                  </div>
                </div>
                <div className="mt-4 flex items-center text-sm">
                  <span className="text-success"><ArrowUp className="w-4 h-4 mr-1" />12%</span>
                  <span className="text-gray-600 ml-2">from last month</span>
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-material">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Total Attempts</p>
                    <p className="text-3xl font-bold text-gray-900" data-testid="text-total-attempts">
                      {statsLoading ? '...' : stats?.totalAttempts || 0}
                    </p>
                  </div>
                  <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                    <Users className="text-secondary text-xl" />
                  </div>
                </div>
                <div className="mt-4 flex items-center text-sm">
                  <span className="text-success"><ArrowUp className="w-4 h-4 mr-1" />8%</span>
                  <span className="text-gray-600 ml-2">from last week</span>
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-material">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Avg Score</p>
                    <p className="text-3xl font-bold text-gray-900" data-testid="text-avg-score">
                      {statsLoading ? '...' : `${stats?.avgScore || 0}%`}
                    </p>
                  </div>
                  <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                    <BarChart3 className="text-accent text-xl" />
                  </div>
                </div>
                <div className="mt-4 flex items-center text-sm">
                  <span className="text-success"><ArrowUp className="w-4 h-4 mr-1" />3.2%</span>
                  <span className="text-gray-600 ml-2">from last quiz</span>
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-material">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Completion Rate</p>
                    <p className="text-3xl font-bold text-gray-900" data-testid="text-completion-rate">
                      {statsLoading ? '...' : `${stats?.completionRate || 0}%`}
                    </p>
                  </div>
                  <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                    <CheckCircle className="text-purple-600 text-xl" />
                  </div>
                </div>
                <div className="mt-4 flex items-center text-sm">
                  <span className="text-success"><ArrowUp className="w-4 h-4 mr-1" />1.4%</span>
                  <span className="text-gray-600 ml-2">from last month</span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Recent Quizzes & Live Activity */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* Recent Quizzes */}
            <div className="lg:col-span-2">
              <Card className="shadow-material">
                <div className="px-6 py-4 border-b border-gray-200">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-gray-900">Recent Quizzes</h3>
                    <Button variant="ghost" size="sm">View All</Button>
                  </div>
                </div>
                <CardContent className="p-6">
                  {quizzesLoading ? (
                    <div className="space-y-4">
                      {[1, 2, 3].map((i) => (
                        <div key={i} className="animate-pulse">
                          <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                          <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                        </div>
                      ))}
                    </div>
                  ) : quizzes.length === 0 ? (
                    <div className="text-center py-8">
                      <ClipboardList className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-500">No quizzes created yet</p>
                      <p className="text-sm text-gray-400 mt-1">Create your first quiz to get started</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {quizzes.slice(0, 3).map((quiz: any) => (
                        <div 
                          key={quiz.id} 
                          className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                          data-testid={`card-quiz-${quiz.id}`}
                        >
                          <div className="flex-1">
                            <h4 className="font-semibold text-gray-900" data-testid={`text-quiz-title-${quiz.id}`}>
                              {quiz.title}
                            </h4>
                            {quiz.description && (
                              <p className="text-sm text-gray-600 mt-1" data-testid={`text-quiz-description-${quiz.id}`}>
                                {quiz.description}
                              </p>
                            )}
                            <div className="flex items-center space-x-4 mt-2 text-sm text-gray-500">
                              <span><Clock className="w-4 h-4 mr-1 inline" />{quiz.duration} mins</span>
                              <span><HelpCircle className="w-4 h-4 mr-1 inline" />Questions</span>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2 ml-4">
                            {getQuizStatusBadge(quiz)}
                            <Button
                              variant="ghost"
                              size="sm"
                              data-testid={`button-edit-quiz-${quiz.id}`}
                            >
                              <Edit className="w-4 h-4 text-gray-400 hover:text-primary" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              data-testid={`button-view-results-${quiz.id}`}
                            >
                              <TrendingUp className="w-4 h-4 text-gray-400 hover:text-primary" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Live Leaderboard */}
            <div>
              <Card className="shadow-material">
                <div className="px-6 py-4 border-b border-gray-200">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-gray-900">Live Leaderboard</h3>
                    <Badge className="bg-green-100 text-green-800">
                      <span className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse"></span>
                      Live
                    </Badge>
                  </div>
                  {quizzes[0] && (
                    <p className="text-sm text-gray-600 mt-1">{quizzes[0].title}</p>
                  )}
                </div>
                <CardContent className="p-6">
                  {recentQuizLeaderboard.length === 0 ? (
                    <div className="text-center py-8">
                      <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-500">No quiz attempts yet</p>
                      <p className="text-sm text-gray-400 mt-1">Leaderboard will appear when students take quizzes</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {recentQuizLeaderboard.slice(0, 5).map((entry: any, index: number) => (
                        <div key={entry.id} className="flex items-center justify-between" data-testid={`leaderboard-entry-${index}`}>
                          <div className="flex items-center space-x-3">
                            <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-white ${
                              index === 0 ? 'bg-yellow-500' : 
                              index === 1 ? 'bg-gray-400' : 
                              index === 2 ? 'bg-orange-500' : 'bg-gray-300'
                            }`}>
                              {index + 1}
                            </div>
                            <div>
                              <p className="font-medium text-gray-900" data-testid={`text-student-name-${index}`}>
                                {entry.student.firstName ? 
                                  `${entry.student.firstName} ${entry.student.lastName || ''}`.trim() : 
                                  entry.student.email
                                }
                              </p>
                              <p className="text-xs text-gray-500">
                                {entry.completedAt ? 'Completed' : 'In progress'}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            {entry.completedAt ? (
                              <>
                                <p className="font-semibold text-gray-900" data-testid={`text-score-${index}`}>
                                  {Math.round((entry.score / entry.totalPoints) * 100)}%
                                </p>
                                <p className="text-xs text-gray-500">{entry.score} pts</p>
                              </>
                            ) : (
                              <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  
                  {recentQuizLeaderboard.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-gray-200">
                      <Button variant="ghost" size="sm" className="w-full">
                        View Full Leaderboard
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </main>

      <QuizCreatorModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
      />
    </div>
  );
}
