import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { GraduationCap, Users, BarChart3, Trophy } from "lucide-react";

export default function Landing() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-surface shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
                <GraduationCap className="text-white text-xl" />
              </div>
              <h1 className="text-xl font-bold text-gray-900">QuizMaster</h1>
            </div>
            
            <Button 
              onClick={() => window.location.href = '/api/login'}
              data-testid="button-login"
              className="bg-primary hover:bg-blue-700"
            >
              Sign In
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-gray-900 mb-4">
            Dynamic Quiz & Exam Platform
          </h2>
          <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
            Create engaging quizzes, track student progress, and watch real-time leaderboards update instantly. 
            Perfect for teachers and students.
          </p>
          <Button 
            onClick={() => window.location.href = '/api/login'}
            data-testid="button-get-started"
            size="lg"
            className="bg-primary hover:bg-blue-700 text-lg px-8 py-3"
          >
            Get Started
          </Button>
        </div>

        {/* Features */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-16">
          <Card className="shadow-material">
            <CardContent className="p-6 text-center">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                <GraduationCap className="text-primary text-xl" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Easy Quiz Creation</h3>
              <p className="text-gray-600 text-sm">
                Create comprehensive quizzes with multiple question types in minutes
              </p>
            </CardContent>
          </Card>

          <Card className="shadow-material">
            <CardContent className="p-6 text-center">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                <Users className="text-secondary text-xl" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Student Management</h3>
              <p className="text-gray-600 text-sm">
                Track student progress and performance across all quizzes
              </p>
            </CardContent>
          </Card>

          <Card className="shadow-material">
            <CardContent className="p-6 text-center">
              <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                <BarChart3 className="text-accent text-xl" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Real-time Analytics</h3>
              <p className="text-gray-600 text-sm">
                Get instant insights into quiz performance and student engagement
              </p>
            </CardContent>
          </Card>

          <Card className="shadow-material">
            <CardContent className="p-6 text-center">
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                <Trophy className="text-purple-600 text-xl" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Live Leaderboards</h3>
              <p className="text-gray-600 text-sm">
                Motivate students with real-time leaderboards and scoring
              </p>
            </CardContent>
          </Card>
        </div>

        {/* How it works */}
        <div className="text-center">
          <h3 className="text-2xl font-bold text-gray-900 mb-8">How It Works</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-primary text-white rounded-full flex items-center justify-center mx-auto mb-4 text-2xl font-bold">
                1
              </div>
              <h4 className="text-lg font-semibold text-gray-900 mb-2">Sign In</h4>
              <p className="text-gray-600">
                Teachers and students sign in with their accounts to access the platform
              </p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-secondary text-white rounded-full flex items-center justify-center mx-auto mb-4 text-2xl font-bold">
                2
              </div>
              <h4 className="text-lg font-semibold text-gray-900 mb-2">Create or Take</h4>
              <p className="text-gray-600">
                Teachers create quizzes while students browse and take available assessments
              </p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-accent text-white rounded-full flex items-center justify-center mx-auto mb-4 text-2xl font-bold">
                3
              </div>
              <h4 className="text-lg font-semibold text-gray-900 mb-2">Track Progress</h4>
              <p className="text-gray-600">
                Monitor performance with real-time analytics and leaderboards
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
