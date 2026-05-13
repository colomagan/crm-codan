import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Toaster } from 'sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { useAuth } from '@/hooks/useAuth';
import { motion } from 'framer-motion';
import Login from './pages/Login';
import Index from './pages/Index';
import ContactDetail from './pages/ContactDetail';
import LeadDetail from './pages/LeadDetail';
import ClientDetail from './pages/ClientDetail';
import NotFound from './pages/NotFound';
import EmailHistory from './pages/EmailHistory';
import EmailHistoryDetail from './pages/EmailHistoryDetail';

const BRAND = 'hsl(38, 60%, 50%)';

const queryClient = new QueryClient();

function AuthGate() {
  const { session, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex flex-col items-center gap-4"
        >
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
            className="w-10 h-10 rounded-full border-4 border-transparent"
            style={{ borderTopColor: BRAND, borderRightColor: `${BRAND}` }}
          />
          <span className="text-muted-foreground text-sm font-medium">Loading...</span>
        </motion.div>
      </div>
    );
  }

  if (!session) {
    return <Login />;
  }

  return (
    <Routes>
      <Route path="/" element={<Index />} />
      <Route path="/clients/:id" element={<ContactDetail />} />
      <Route path="/leads/:id" element={<LeadDetail />} />
      <Route path="/crm-clients/:id" element={<ClientDetail />} />
      <Route path="/email-history" element={<EmailHistory />} />
      <Route path="/email-history/:id" element={<EmailHistoryDetail />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster richColors position="top-right" />
      <BrowserRouter basename={import.meta.env.BASE_URL}>
        <AuthGate />
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
