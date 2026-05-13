import {
  LayoutDashboard,
  Users,
  UserCheck,
  Target,
  Radar,
  Mail,
  Settings,
  Workflow,
  TrendingUp,
  TrendingDown,
  ClipboardList,
  CalendarDays,
  CalendarRange,
  Palette,
  Scale,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export interface MenuItem {
  id: string;
  label: string;
  icon: LucideIcon;
  locked?: boolean;
  comingSoon?: boolean;
}

export interface MenuGroup {
  id: string;
  label: string;
  locked?: boolean;
  items: MenuItem[];
}

export const MENU_GROUPS: MenuGroup[] = [
  {
    id: 'overview',
    label: 'Overview',
    locked: true,
    items: [{ id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, locked: true }],
  },
  {
    id: 'customers',
    label: 'Customers',
    items: [
      { id: 'lead-finder', label: 'Lead Finder', icon: Radar },
      { id: 'leads',       label: 'Leads',       icon: Target },
      { id: 'contacts',    label: 'Contacts',    icon: Users },
      { id: 'clients',     label: 'Clients',     icon: UserCheck },
    ],
  },
  {
    id: 'sales',
    label: 'Sales',
    items: [
      { id: 'pipeline',     label: 'Pipeline',     icon: Workflow, comingSoon: true },
      { id: 'email-sender', label: 'Email Sender', icon: Mail },
    ],
  },
  {
    id: 'finance',
    label: 'Finance',
    items: [
      { id: 'revenue',  label: 'Revenue',  icon: TrendingUp,   comingSoon: true },
      { id: 'expenses', label: 'Expenses', icon: TrendingDown, comingSoon: true },
    ],
  },
  {
    id: 'productivity',
    label: 'Productivity',
    items: [
      { id: 'tasks',    label: 'Tasks',    icon: ClipboardList, comingSoon: true },
      { id: 'calendar', label: 'Calendar', icon: CalendarDays,  comingSoon: true },
    ],
  },
  {
    id: 'marketing',
    label: 'Marketing',
    items: [
      { id: 'content-planning', label: 'Content Planning', icon: CalendarRange, comingSoon: true },
      { id: 'brand-identity',   label: 'Brand Identity',   icon: Palette,       comingSoon: true },
    ],
  },
  {
    id: 'legal',
    label: 'Legal',
    items: [
      { id: 'legal', label: 'Legal', icon: Scale, comingSoon: true },
    ],
  },
  {
    id: 'system',
    label: 'System',
    locked: true,
    items: [
      { id: 'settings',        label: 'Settings', icon: Settings, locked: true },
      { id: 'settings-emails', label: 'Emails',   icon: Mail,     locked: true },
    ],
  },
];

export const DEFAULT_GROUP_ORDER = MENU_GROUPS.map((g) => g.id);
