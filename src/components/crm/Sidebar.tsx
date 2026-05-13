import { cn } from '@/lib/utils';
import { Dumbbell, LogOut } from 'lucide-react';
import { motion } from 'framer-motion';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { MENU_GROUPS } from './menuConfig';

const BRAND = 'hsl(38, 60%, 50%)';
const BRAND_HEX = '#c9973a';

interface SidebarProps {
  activeSection: string;
  onSectionChange: (section: string) => void;
  visibleSections: Record<string, boolean>;
  groupOrder: string[];
}

export function Sidebar({ activeSection, onSectionChange, visibleSections, groupOrder }: SidebarProps) {
  const { signOut } = useAuth();
  let animIndex = 0;

  const orderedGroups = groupOrder
    .map((id) => MENU_GROUPS.find((g) => g.id === id))
    .filter(Boolean) as typeof MENU_GROUPS;

  return (
    <motion.aside
      initial={{ x: -20, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ duration: 0.4 }}
      className="w-72 min-h-screen flex flex-col"
      style={{
        background: 'linear-gradient(180deg, hsl(20,10%,4%) 0%, hsl(20,8%,6%) 100%)',
        borderRight: '1px solid hsl(30,8%,18%)',
      }}
    >
      {/* Logo */}
      <div className="p-5 flex items-center gap-3" style={{ borderBottom: '1px solid hsl(30,8%,15%)' }}>
        <div
          className="w-9 h-9 rounded-lg flex items-center justify-center shadow-md flex-shrink-0"
          style={{ backgroundColor: BRAND }}
        >
          <Dumbbell className="w-5 h-5 text-black" />
        </div>
        <div>
          <p className="font-bold text-sm text-foreground">CodanFit CRM</p>
          <p className="text-[10px] text-muted-foreground">Management System</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-6 overflow-y-auto">
        {orderedGroups.map((group) => {
          const visibleItems = group.items.filter(
            (item) => visibleSections[item.id] !== false
          );
          if (visibleItems.length === 0) return null;

          return (
            <div key={group.id}>
              {/* Group label */}
              <div className="flex items-center gap-2 px-3 mb-2">
                <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: BRAND }} />
                <p
                  className="text-[10px] font-bold uppercase tracking-[0.15em]"
                  style={{ color: `${BRAND_HEX}99` }}
                >
                  {group.label}
                </p>
                <div
                  className="flex-1 h-px"
                  style={{ background: `linear-gradient(90deg, ${BRAND_HEX}40, transparent)` }}
                />
              </div>

              <div className="space-y-0.5">
                {visibleItems.map((item) => {
                  const isActive = activeSection === item.id;
                  const delay = animIndex++ * 0.04;

                  return (
                    <motion.button
                      key={item.id}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay }}
                      onClick={() => !item.comingSoon && onSectionChange(item.id)}
                      className={cn(
                        'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left text-sm transition-all duration-200 relative overflow-hidden group',
                        item.comingSoon && 'cursor-default opacity-60'
                      )}
                      style={
                        isActive
                          ? {
                              background: `linear-gradient(135deg, ${BRAND_HEX}20 0%, ${BRAND_HEX}10 100%)`,
                              borderLeft: `2px solid ${BRAND}`,
                              color: BRAND,
                            }
                          : {
                              borderLeft: '2px solid transparent',
                              color: 'hsl(30,10%,50%)',
                            }
                      }
                    >
                      {!isActive && !item.comingSoon && (
                        <span
                          className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200 rounded-lg"
                          style={{ background: `${BRAND_HEX}10` }}
                        />
                      )}
                      <span
                        className="relative z-10 w-8 h-8 flex items-center justify-center rounded-md transition-all duration-200 flex-shrink-0"
                        style={
                          isActive
                            ? { background: `${BRAND_HEX}25`, color: BRAND }
                            : { color: 'hsl(30,10%,40%)' }
                        }
                      >
                        <item.icon
                          className={cn('w-4 h-4 transition-all duration-200', !isActive && !item.comingSoon && 'group-hover:scale-110')}
                        />
                      </span>
                      <span
                        className={cn(
                          'relative z-10 font-medium transition-colors duration-200 flex-1',
                          !isActive && !item.comingSoon && 'group-hover:text-foreground'
                        )}
                      >
                        {item.label}
                      </span>
                      {item.comingSoon && (
                        <span
                          className="relative z-10 text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full flex-shrink-0"
                          style={{
                            color: 'hsl(38,60%,50%)',
                            background: 'hsl(38,60%,50%,0.12)',
                            border: '1px solid hsl(38,60%,50%,0.25)',
                          }}
                        >
                          Soon
                        </span>
                      )}
                      {isActive && !item.comingSoon && (
                        <motion.span
                          layoutId="activeIndicator"
                          className="absolute right-3 w-1.5 h-1.5 rounded-full"
                          style={{ backgroundColor: BRAND }}
                        />
                      )}
                    </motion.button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="p-4 space-y-2" style={{ borderTop: '1px solid hsl(30,8%,15%)' }}>
        <Button
          variant="ghost"
          size="sm"
          onClick={signOut}
          className="w-full justify-start gap-2 text-muted-foreground hover:text-destructive hover:bg-destructive/5"
        >
          <LogOut className="w-4 h-4" />
          Sign out
        </Button>
        <div
          className="flex items-center gap-2 px-3 py-2 rounded-lg"
          style={{ background: `${BRAND_HEX}10` }}
        >
          <Dumbbell className="w-3.5 h-3.5 flex-shrink-0" style={{ color: BRAND }} />
          <span className="text-xs font-medium text-muted-foreground">
            <span style={{ color: BRAND }}>CodanFit</span> CRM
          </span>
        </div>
      </div>
    </motion.aside>
  );
}
