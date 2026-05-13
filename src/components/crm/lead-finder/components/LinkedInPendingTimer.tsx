import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Clock, MapPin, Loader2 } from 'lucide-react';
import { BRAND } from '../constants';
import { formatPortugalTime, formatCountdown } from '../utils';

interface LinkedInPendingTimerProps {
  startedAt: string;
  estimatedReadyAt: string;
  hoursNeeded: number;
  onClick?: () => void;
}

export function LinkedInPendingTimer({ startedAt, estimatedReadyAt, hoursNeeded, onClick }: LinkedInPendingTimerProps) {
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  const readyTs   = new Date(estimatedReadyAt).getTime();
  const startTs   = new Date(startedAt).getTime();
  const total     = readyTs - startTs;
  const elapsed   = now - startTs;
  const remaining = Math.max(readyTs - now, 0);
  const exceeded  = now > readyTs;

  // When exceeded, keep bar at 99% pulsing until confirmed done
  const pct = exceeded ? 99 : Math.min((elapsed / Math.max(total, 1)) * 100, 98);

  const readyTimeStr = formatPortugalTime(new Date(estimatedReadyAt));
  const barColor     = exceeded ? '#10b981' : BRAND;

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className={`rounded-xl border p-5 space-y-4 ${onClick ? 'cursor-pointer hover:shadow-md transition-shadow' : ''}`}
      style={{ borderColor: exceeded ? '#10b98140' : `${BRAND}25`, background: exceeded ? '#10b98106' : `${BRAND}04` }}
      onClick={onClick}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold flex items-center gap-2" style={{ color: exceeded ? '#10b981' : BRAND }}>
          {exceeded
            ? <Loader2 className="w-4 h-4 animate-spin text-emerald-500" />
            : <Clock className="w-4 h-4" />}
          {exceeded ? 'Finalizing results…' : 'LinkedIn Search Scheduled'}
        </span>
        <span
          className="text-xs font-medium px-2.5 py-1 rounded-full border"
          style={
            exceeded
              ? { backgroundColor: '#10b98112', borderColor: '#10b98130', color: '#10b981' }
              : { backgroundColor: `${BRAND}12`, borderColor: `${BRAND}30`, color: BRAND }
          }
        >
          {exceeded ? 'Almost ready' : `${hoursNeeded}h processing window`}
        </span>
      </div>

      {/* Ready time + countdown */}
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="text-[10px] text-muted-foreground uppercase tracking-wide font-semibold mb-0.5">
            {exceeded ? 'Was scheduled for' : 'Results ready at'}
          </p>
          <p className="text-4xl font-extrabold tabular-nums leading-none" style={{ color: exceeded ? '#10b981' : BRAND }}>
            {readyTimeStr}
          </p>
          <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
            <MapPin className="w-3 h-3" /> Portugal time
          </p>
        </div>
        <div className="text-right">
          {exceeded ? (
            <div className="space-y-0.5">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide font-semibold">Status</p>
              <p className="text-lg font-bold text-emerald-600 flex items-center gap-1.5">
                <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                In a few minutes
              </p>
            </div>
          ) : (
            <div>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide font-semibold mb-0.5">Time remaining</p>
              <p className="text-2xl font-bold tabular-nums leading-none text-gray-800">
                {formatCountdown(remaining)}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Progress bar */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-[10px] text-muted-foreground">
          <span>Started {new Date(startedAt).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Lisbon' })}</span>
          <span className="font-medium" style={{ color: barColor }}>
            {exceeded ? 'Processing final results…' : `${pct.toFixed(0)}%`}
          </span>
        </div>
        <div className="relative h-3 w-full rounded-full bg-muted overflow-hidden">
          <motion.div
            className={`absolute inset-y-0 left-0 rounded-full ${exceeded ? 'animate-pulse' : ''}`}
            style={{ backgroundColor: barColor }}
            animate={{ width: exceeded ? '99%' : `${pct}%` }}
            transition={{ duration: exceeded ? 1.5 : 1, ease: 'easeOut', repeat: exceeded ? Infinity : 0, repeatType: 'reverse' }}
          />
        </div>
      </div>

      {/* Info */}
      <div className="rounded-lg p-3 text-xs text-muted-foreground leading-relaxed"
        style={{ backgroundColor: exceeded ? '#10b98108' : `${BRAND}08` }}>
        {exceeded
          ? '✅ Estimated time has passed — your leads are being compiled and will be ready in a few minutes. Check back shortly.'
          : hoursNeeded === 2
            ? '⚡ Search received during active hours (09:00–23:00 PT) — results delivered in ~2 hours.'
            : '🌙 Search received outside active hours — results will be ready within 5 hours when processing resumes.'}
        {!exceeded && (
          <p className="mt-1">You can navigate away safely — this job is saved and will appear in History when complete.</p>
        )}
      </div>
    </motion.div>
  );
}
