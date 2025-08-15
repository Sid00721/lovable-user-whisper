import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import { PaymentAnalytics } from "./pages/PaymentAnalytics";
import UserAnalytics from "./pages/UserAnalytics";
import Cowboy from "./pages/Cowboy";
import { LoginForm } from "./components/LoginForm";
import { useAuth } from "./hooks/useAuth";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => {
  const { isAuthenticated, isLoading, login, logout } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            {/* Public routes */}
            <Route path="/analytics" element={<UserAnalytics />} />
            <Route path="/cowboy" element={<Cowboy />} />
            
            {/* Protected routes */}
            {isAuthenticated ? (
              <>
                <Route path="/" element={<Index onLogout={logout} />} />
                <Route path="/payments" element={<PaymentAnalytics onBack={() => window.history.back()} />} />
              </>
            ) : (
              <Route path="/" element={<LoginForm onLogin={login} />} />
            )}
            
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
