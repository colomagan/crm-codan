import { useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Settings, Lock, GripVertical, Mail } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MENU_GROUPS } from './menuConfig';

const BRAND = 'hsl(38, 60%, 50%)';

interface SettingsSectionProps {
  visibleSections: Record<string, boolean>;
  onToggle: (id: string, value: boolean) => void;
  groupOrder: string[];
  onReorder: (newOrder: string[]) => void;
  onNavigate: (section: string) => void;
}

export function SettingsSection({
  visibleSections,
  onToggle,
  groupOrder,
  onReorder,
  onNavigate,
}: SettingsSectionProps) {
  const dragIndexRef = useRef<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const orderedGroups = groupOrder
    .map((id) => MENU_GROUPS.find((g) => g.id === id))
    .filter(Boolean) as typeof MENU_GROUPS;

  const totalItems = Object.keys(visibleSections).length;
  const totalVisible = Object.values(visibleSections).filter(Boolean).length;

  // ── Drag handlers ────────────────────────────────────────────────────────
  const handleDragStart = (index: number) => {
    dragIndexRef.current = index;
    setIsDragging(true);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (dragIndexRef.current === null || dragIndexRef.current === index) return;
    // Don't allow dragging onto locked groups
    if (orderedGroups[index]?.locked) return;
    setDragOverIndex(index);
  };

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    const dragIndex = dragIndexRef.current;
    if (dragIndex === null || dragIndex === dropIndex) {
      cleanup();
      return;
    }

    const draggedGroup = orderedGroups[dragIndex];
    const targetGroup = orderedGroups[dropIndex];

    // Locked groups (Overview, System) cannot be moved
    if (draggedGroup?.locked || targetGroup?.locked) {
      cleanup();
      return;
    }

    const newOrder = [...groupOrder];
    // Remove dragged item
    const [removed] = newOrder.splice(
      newOrder.indexOf(draggedGroup!.id),
      1
    );
    // Insert before target
    const targetIdx = newOrder.indexOf(targetGroup!.id);
    newOrder.splice(targetIdx, 0, removed);

    onReorder(newOrder);
    cleanup();
  };

  const handleDragEnd = () => cleanup();

  const cleanup = () => {
    dragIndexRef.current = null;
    setDragOverIndex(null);
    setIsDragging(false);
  };

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center shadow"
            style={{ background: `linear-gradient(135deg, ${BRAND} 0%, #0550a0 100%)` }}
          >
            <Settings className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight" style={{ color: BRAND }}>
              Settings
            </h1>
            <p className="text-muted-foreground text-sm mt-0.5">
              Customize your workspace and navigation
            </p>
          </div>
        </div>

        <div
          className="text-xs font-semibold px-3 py-1.5 rounded-full"
          style={{ backgroundColor: `${BRAND}12`, color: BRAND }}
        >
          {totalVisible} / {totalItems} sections visible
        </div>
      </motion.div>

      {/* Email Configuration */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.08 }}
      >
        <Card className="shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Email Configuration</CardTitle>
          </CardHeader>
          <CardContent>
            <button
              onClick={() => onNavigate('settings-emails')}
              className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg hover:bg-gray-50 transition-colors text-left group"
            >
              <div className="p-1.5 rounded-md bg-blue-50 text-blue-600 group-hover:bg-blue-100 transition-colors">
                <Mail className="w-4 h-4" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-800">Sender Accounts</p>
                <p className="text-xs text-gray-500">Manage SMTP identities for outgoing email</p>
              </div>
            </button>
          </CardContent>
        </Card>
      </motion.div>

      {/* Navigation Visibility + Order */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <Card className="shadow-sm">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <CardTitle className="text-base">Navigation</CardTitle>
              <Badge variant="secondary" className="text-xs font-normal">Sidebar</Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              Toggle visibility and drag the grip handle{' '}
              <GripVertical className="inline w-3.5 h-3.5 -mt-0.5 text-muted-foreground" />{' '}
              to reorder sections. Locked items always stay in place.
            </p>
          </CardHeader>

          <CardContent className="pt-2 space-y-1.5">
            {orderedGroups.map((group, gi) => {
              const isGroupLocked = !!group.locked;
              const isDragTarget = dragOverIndex === gi;
              const isBeingDragged = isDragging && dragIndexRef.current === gi;

              return (
                <div key={group.id}>
                  {/* Drop indicator above */}
                  <AnimatePresence>
                    {isDragTarget && (
                      <motion.div
                        initial={{ scaleX: 0, opacity: 0 }}
                        animate={{ scaleX: 1, opacity: 1 }}
                        exit={{ scaleX: 0, opacity: 0 }}
                        transition={{ duration: 0.15 }}
                        className="h-0.5 rounded-full mx-2 mb-1"
                        style={{ backgroundColor: BRAND, transformOrigin: 'left' }}
                      />
                    )}
                  </AnimatePresence>

                  {/* Group card */}
                  <div
                    draggable={!isGroupLocked}
                    onDragStart={() => handleDragStart(gi)}
                    onDragOver={(e) => handleDragOver(e, gi)}
                    onDrop={(e) => handleDrop(e, gi)}
                    onDragEnd={handleDragEnd}
                    className="rounded-lg transition-all duration-150"
                    style={{
                      opacity: isBeingDragged ? 0.4 : 1,
                      cursor: isGroupLocked ? 'default' : 'grab',
                    }}
                  >
                    {/* Group label row */}
                    <div className="flex items-center gap-2 px-2 py-1">
                      {/* Drag handle */}
                      <div
                        className="flex-shrink-0 transition-colors"
                        style={{ color: isGroupLocked ? 'transparent' : '#cbd5e1' }}
                      >
                        <GripVertical className="w-4 h-4" />
                      </div>

                      <span
                        className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                        style={{ backgroundColor: BRAND }}
                      />
                      <p
                        className="text-[10px] font-bold uppercase tracking-[0.15em]"
                        style={{ color: `${BRAND}99` }}
                      >
                        {group.label}
                      </p>
                      <div
                        className="flex-1 h-px"
                        style={{ background: `linear-gradient(90deg, ${BRAND}20, transparent)` }}
                      />
                      {isGroupLocked && (
                        <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                          <Lock className="w-2.5 h-2.5" />
                          Locked
                        </span>
                      )}
                    </div>

                    {/* Items */}
                    <div className="space-y-1 pl-8 pr-2 pb-1">
                      {group.items.map((item) => {
                        const isItemLocked = !!item.locked;
                        const isOn = visibleSections[item.id] ?? true;

                        return (
                          <div
                            key={item.id}
                            className="flex items-center justify-between px-3 py-2.5 rounded-lg transition-colors"
                            style={{
                              backgroundColor: isOn ? `${BRAND}06` : 'transparent',
                              border: `1px solid ${isOn ? `${BRAND}14` : '#f1f5f9'}`,
                            }}
                          >
                            <div className="flex items-center gap-3">
                              <div
                                className="w-8 h-8 rounded-md flex items-center justify-center flex-shrink-0 transition-colors"
                                style={
                                  isOn
                                    ? { backgroundColor: `${BRAND}15`, color: BRAND }
                                    : { backgroundColor: '#f1f5f9', color: '#94a3b8' }
                                }
                              >
                                <item.icon className="w-4 h-4" />
                              </div>
                              <div>
                                <p
                                  className="text-sm font-medium transition-colors"
                                  style={{ color: isOn ? '#1e293b' : '#94a3b8' }}
                                >
                                  {item.label}
                                </p>
                                {isItemLocked && (
                                  <p className="text-[11px] text-muted-foreground flex items-center gap-1 mt-0.5">
                                    <Lock className="w-2.5 h-2.5" />
                                    Always visible
                                  </p>
                                )}
                              </div>
                            </div>

                            {/* Switch */}
                            {isItemLocked ? (
                              <div
                                className="h-5 w-9 rounded-full flex items-center justify-end pr-0.5 cursor-not-allowed opacity-40"
                                style={{ backgroundColor: BRAND }}
                              >
                                <div className="h-4 w-4 bg-white rounded-full shadow" />
                              </div>
                            ) : (
                              <Switch
                                checked={isOn}
                                onCheckedChange={(v) => onToggle(item.id, v)}
                                className={isOn ? '[&[data-state=checked]]:bg-[#096fd3]' : ''}
                              />
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
