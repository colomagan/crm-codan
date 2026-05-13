import { useState, useEffect } from 'react';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import { Dashboard } from './Dashboard';
import { ClientsSection } from './ClientsSection';
import { ContactsSection } from './ContactsSection';
import { LeadsSection } from './LeadsSection';
import { EmailSenderSection } from './EmailSenderSection';
import { LeadFinderSection } from './lead-finder';
import { SettingsSection } from './SettingsSection';
import { SettingsEmailsSection } from './SettingsEmailsSection';
import { DEFAULT_GROUP_ORDER } from './menuConfig';
import { supabase } from '@/integrations/supabase/client';
import { motion, AnimatePresence } from 'framer-motion';

const LOCKED_ITEMS = new Set(['dashboard', 'settings', 'settings-emails']);

const DEFAULT_VISIBILITY: Record<string, boolean> = {
  dashboard: true,
  leads: true,
  contacts: true,
  clients: true,
  'lead-finder': true,
  'email-sender': true,
  settings: true,
  'settings-emails': true,
};

const SESSION_KEY = 'crm_active_section';

export function CRMLayout() {
  const [activeSection, setActiveSectionState] = useState(
    () => sessionStorage.getItem(SESSION_KEY) || 'dashboard'
  );
  const [visibleSections, setVisibleSections] = useState(DEFAULT_VISIBILITY);
  const [groupOrder, setGroupOrder] = useState(DEFAULT_GROUP_ORDER);

  useEffect(() => {
    supabase
      .from('app_settings')
      .select('visible_sections, group_order')
      .eq('id', 1)
      .single()
      .then(({ data, error }) => {
        if (error || !data) return;
        if (data.visible_sections && typeof data.visible_sections === 'object') {
          setVisibleSections(data.visible_sections as Record<string, boolean>);
        }
        if (Array.isArray(data.group_order) && data.group_order.length > 0) {
          setGroupOrder(data.group_order as string[]);
        }
      });
  }, []);

  const setActiveSection = (section: string) => {
    sessionStorage.setItem(SESSION_KEY, section);
    setActiveSectionState(section);
  };

  const handleToggle = (id: string, value: boolean) => {
    if (LOCKED_ITEMS.has(id)) return;
    const next = { ...visibleSections, [id]: value };
    setVisibleSections(next);
    if (!value && activeSection === id) setActiveSection('dashboard');
    supabase
      .from('app_settings')
      .upsert({ id: 1, visible_sections: next, updated_at: new Date().toISOString() })
      .then(({ error }) => {
        if (error) console.error('Failed to save visible_sections:', error.message);
      });
  };

  const handleReorder = (newOrder: string[]) => {
    setGroupOrder(newOrder);
    supabase
      .from('app_settings')
      .upsert({ id: 1, group_order: newOrder, updated_at: new Date().toISOString() })
      .then(({ error }) => {
        if (error) console.error('Failed to save group_order:', error.message);
      });
  };

  const renderContent = () => {
    switch (activeSection) {
      case 'dashboard':       return <Dashboard />;
      case 'contacts':        return <ContactsSection />;
      case 'leads':           return <LeadsSection />;
      case 'clients':         return <ClientsSection />;
      case 'lead-finder':     return <LeadFinderSection />;
      case 'email-sender':    return <EmailSenderSection />;
      case 'settings':
        return (
          <SettingsSection
            visibleSections={visibleSections}
            onToggle={handleToggle}
            groupOrder={groupOrder}
            onReorder={handleReorder}
            onNavigate={setActiveSection}
          />
        );
      case 'settings-emails': return <SettingsEmailsSection />;
      default: return <Dashboard />;
    }
  };

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar
        activeSection={activeSection}
        onSectionChange={setActiveSection}
        visibleSections={visibleSections}
        groupOrder={groupOrder}
      />
      <div className="flex-1 flex flex-col min-w-0">
        <Topbar />
        <main className="flex-1 overflow-auto">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeSection}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.25 }}
            >
              {renderContent()}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}
