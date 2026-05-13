import { useState, useEffect } from 'react';
import { Clock, Bell, Search } from 'lucide-react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useAuth } from '@/hooks/useAuth';

const BRAND = 'hsl(38, 60%, 50%)';

export function Topbar() {
  const { session } = useAuth();
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const formattedTime = new Intl.DateTimeFormat('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  }).format(time);

  const formattedDate = new Intl.DateTimeFormat('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  }).format(time);

  const userEmail = session?.user?.email ?? '';
  const initials = userEmail
    ? userEmail.substring(0, 2).toUpperCase()
    : 'U';

  return (
    <motion.header
      initial={{ y: -10, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="h-16 border-b flex items-center justify-between px-6 bg-card/60 backdrop-blur-sm flex-shrink-0"
      style={{ borderColor: `${BRAND}12` }}
    >
      {/* Search */}
      <div className="relative w-72">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search..."
          className="pl-9 h-9 bg-muted/40 border-transparent focus-visible:border-input focus-visible:bg-background"
        />
      </div>

      {/* Right side */}
      <div className="flex items-center gap-3">
        {/* Clock pill */}
        <div className="flex items-center gap-2 bg-muted/40 px-4 py-2 rounded-xl border border-border/50">
          <Clock className="w-3.5 h-3.5 text-muted-foreground" />
          <span className="text-sm font-mono font-medium tabular-nums">{formattedTime}</span>
          <span className="text-xs text-muted-foreground hidden sm:inline">{formattedDate}</span>
        </div>

        {/* Notifications */}
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="w-4 h-4" />
          <span
            className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full"
            style={{ backgroundColor: BRAND }}
          />
        </Button>

        {/* Avatar */}
        <Avatar className="w-8 h-8 cursor-pointer">
          <AvatarFallback
            className="text-xs font-bold text-white"
            style={{ backgroundColor: BRAND }}
          >
            {initials}
          </AvatarFallback>
        </Avatar>
      </div>
    </motion.header>
  );
}
