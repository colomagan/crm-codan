import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Home } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-6">
      <div className="text-center space-y-2">
        <h1 className="text-7xl font-bold text-muted-foreground/30">404</h1>
        <p className="text-xl font-semibold text-foreground">Page not found</p>
        <p className="text-muted-foreground">The page you're looking for doesn't exist.</p>
      </div>
      <Button asChild>
        <Link to="/">
          <Home className="w-4 h-4 mr-2" />
          Back to home
        </Link>
      </Button>
    </div>
  );
}
