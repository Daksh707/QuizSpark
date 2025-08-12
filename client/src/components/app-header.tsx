import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { GraduationCap, ChevronDown } from "lucide-react";
import { Link, useLocation } from "wouter";

export default function AppHeader() {
  const { user } = useAuth();
  const [location] = useLocation();

  const getRoleIcon = (role: string) => {
    return role === 'teacher' ? 'fas fa-chalkboard-teacher' : 'fas fa-user-graduate';
  };

  const getRoleBadgeColor = (role: string) => {
    return role === 'teacher' 
      ? 'bg-green-100 text-green-800' 
      : 'bg-blue-100 text-blue-800';
  };

  const getNavLinks = (role: string) => {
    if (role === 'teacher') {
      return [
        { href: '/', label: 'Dashboard', active: location === '/' },
        { href: '#', label: 'My Quizzes', active: false },
        { href: '#', label: 'Analytics', active: false },
      ];
    } else {
      return [
        { href: '/', label: 'My Quizzes', active: location === '/' },
        { href: '#', label: 'Results', active: false },
        { href: '#', label: 'Leaderboard', active: false },
      ];
    }
  };

  if (!user) return null;

  const navLinks = getNavLinks(user.role);

  return (
    <header className="bg-surface shadow-sm border-b border-gray-200 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center space-x-4">
            <Link href="/" className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
                <GraduationCap className="text-white text-xl" />
              </div>
              <h1 className="text-xl font-bold text-gray-900">QuizMaster</h1>
            </Link>
          </div>
          
          <nav className="hidden md:flex space-x-8">
            {navLinks.map((link) => (
              <Link 
                key={link.label}
                href={link.href} 
                className={`px-3 py-2 rounded-md ${
                  link.active 
                    ? 'text-primary font-medium bg-blue-50' 
                    : 'text-gray-600 hover:text-primary hover:bg-gray-50'
                }`}
                data-testid={`link-${link.label.toLowerCase().replace(' ', '-')}`}
              >
                {link.label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center space-x-4">
            <span className={`hidden sm:inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getRoleBadgeColor(user.role)}`}>
              <i className={`${getRoleIcon(user.role)} mr-2`}></i>
              {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
            </span>
            <div className="flex items-center space-x-3">
              {user.profileImageUrl && (
                <img 
                  src={user.profileImageUrl} 
                  alt="Profile" 
                  className="w-8 h-8 rounded-full object-cover"
                  data-testid="img-profile"
                />
              )}
              <span className="text-sm font-medium text-gray-700" data-testid="text-username">
                {user.firstName ? `${user.firstName} ${user.lastName || ''}`.trim() : user.email}
              </span>
              <Button
                onClick={() => window.location.href = '/api/logout'}
                variant="ghost"
                size="sm"
                data-testid="button-logout"
              >
                <ChevronDown className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
