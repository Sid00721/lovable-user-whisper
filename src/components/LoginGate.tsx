import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Lock, Eye, EyeOff } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface LoginGateProps {
  onLogin: () => void;
}

const LoginGate = ({ onLogin }: LoginGateProps) => {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  // Set your secure password here - in production, use environment variables
  const ADMIN_PASSWORD = import.meta.env.VITE_ADMIN_PASSWORD || 'voqo2025admin';

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    // Simulate a brief loading state for better UX
    setTimeout(() => {
      if (password === ADMIN_PASSWORD) {
        localStorage.setItem('voqo_admin_authenticated', 'true');
        onLogin();
        toast({
          title: 'Welcome to Voqo CRM!',
          description: 'Successfully authenticated.',
        });
      } else {
        toast({
          title: 'Access Denied',
          description: 'Invalid password. Please try again.',
          variant: 'destructive',
        });
        setPassword('');
      }
      setIsLoading(false);
    }, 800);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="text-center space-y-4">
          <div className="mx-auto w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center">
            <Lock className="h-8 w-8 text-white" />
          </div>
          <CardTitle className="text-2xl font-bold text-gray-900">
            Voqo CRM Access
          </CardTitle>
          <p className="text-gray-600">
            Enter the admin password to access the CRM dashboard
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="relative">
              <Input
                type={showPassword ? 'text' : 'password'}
                placeholder="Enter admin password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pr-10"
                disabled={isLoading}
                autoFocus
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                disabled={isLoading}
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
            <Button 
              type="submit" 
              className="w-full bg-blue-600 hover:bg-blue-700"
              disabled={isLoading || !password.trim()}
            >
              {isLoading ? 'Authenticating...' : 'Access CRM'}
            </Button>
          </form>
          <div className="mt-6 text-center">
            <p className="text-xs text-gray-500">
              Authorized personnel only. All access is logged.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default LoginGate;