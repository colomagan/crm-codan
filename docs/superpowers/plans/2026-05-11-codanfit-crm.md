# CodanFit CRM Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Clone the Aires-Soft CRM into this repo, keeping only Lead Finder, Leads, Contacts, Clients, Email Sender, and Settings/Emails modules, applying the CodanFit dark gold luxury theme from campus-zen-unlocked.

**Architecture:** Copy source files from `C:/Users/Lucas Magan/Desktop/as/Aires-Soft/crm` and make targeted modifications — theme (CSS vars → gold/obsidian), branding ("CodanFit CRM"), menuConfig (keep 6 modules only), .env placeholders for new Supabase project. No new logic, just adapting existing working code.

**Tech Stack:** Vite 5, React 18, TypeScript 5, Tailwind CSS 3, Shadcn/ui (Radix), Supabase JS v2, Framer Motion, React Router v6, React Query v5, Sonner, Recharts, xlsx

---

## Source & Destination

- **Source:** `C:/Users/Lucas Magan/Desktop/as/Aires-Soft/crm`
- **Destination:** `C:/Users/Lucas Magan/Desktop/as/Aires-Soft/Codan/crm` (current working dir)

---

## File Map

| File | Action | Notes |
|------|--------|-------|
| `package.json` | Create | Copy + rename to codanfit-crm |
| `tsconfig.json` | Copy | Exact |
| `tsconfig.app.json` | Copy | Exact |
| `tsconfig.node.json` | Copy | Exact |
| `vite.config.ts` | Copy | Exact |
| `postcss.config.js` | Copy | Exact |
| `tailwind.config.ts` | Create | Add gold/marble/obsidian/bronze colors |
| `index.html` | Create | Update title to "CodanFit CRM" |
| `src/index.css` | Create | Campus dark gold theme CSS vars |
| `src/main.tsx` | Copy | Exact |
| `src/App.tsx` | Create | BRAND → gold, import only needed pages |
| `src/lib/utils.ts` | Copy | Exact |
| `src/types/crm.ts` | Copy | Exact |
| `src/hooks/useAuth.ts` | Copy | Exact |
| `src/integrations/supabase/client.ts` | Copy | Exact |
| `src/pages/Login.tsx` | Create | BRAND → gold, title "CodanFit CRM" |
| `src/pages/Index.tsx` | Copy | Exact |
| `src/pages/LeadDetail.tsx` | Copy | Exact |
| `src/pages/ContactDetail.tsx` | Copy | Exact |
| `src/pages/ClientDetail.tsx` | Copy | Exact |
| `src/pages/EmailHistory.tsx` | Copy | Exact |
| `src/pages/EmailHistoryDetail.tsx` | Copy | Exact |
| `src/pages/NotFound.tsx` | Copy | Exact |
| `src/components/ui/*` | Copy all | Exact (19 files) |
| `src/components/crm/menuConfig.ts` | Create | Keep only 6 modules + system |
| `src/components/crm/Sidebar.tsx` | Create | BRAND → gold, name "CodanFit CRM" |
| `src/components/crm/Topbar.tsx` | Copy | Exact |
| `src/components/crm/CRMLayout.tsx` | Copy | Exact |
| `src/components/crm/LeadsSection.tsx` | Copy | Exact |
| `src/components/crm/ContactsSection.tsx` | Copy | Exact |
| `src/components/crm/ClientsSection.tsx` | Copy | Exact |
| `src/components/crm/EmailSenderSection.tsx` | Copy | Exact |
| `src/components/crm/SettingsEmailsSection.tsx` | Copy | Exact |
| `src/components/crm/lead-finder/*` | Copy all | Exact |
| `src/components/crm/Dashboard.tsx` | Copy | Exact |
| `src/components/crm/SettingsSection.tsx` | Copy | Exact |
| `.env` | Create | Supabase placeholders + Apify keys |
| `.env.example` | Create | Same as .env with empty values |
| `docs/database-tables.md` | Create | All SQL table definitions |

---

## Task 1: Project Config Files

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `tsconfig.app.json`
- Create: `tsconfig.node.json`
- Create: `vite.config.ts`
- Create: `postcss.config.js`
- Create: `components.json`

- [ ] **Step 1: Create package.json**

```json
{
  "name": "codanfit-crm",
  "private": true,
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "lint": "eslint .",
    "preview": "vite preview"
  },
  "dependencies": {
    "@hookform/resolvers": "^3.10.0",
    "@radix-ui/react-alert-dialog": "^1.1.15",
    "@radix-ui/react-avatar": "^1.1.10",
    "@radix-ui/react-checkbox": "^1.3.3",
    "@radix-ui/react-dialog": "^1.1.14",
    "@radix-ui/react-dropdown-menu": "^2.1.15",
    "@radix-ui/react-label": "^2.1.7",
    "@radix-ui/react-popover": "^1.1.15",
    "@radix-ui/react-progress": "^1.1.8",
    "@radix-ui/react-scroll-area": "^1.2.9",
    "@radix-ui/react-select": "^2.2.5",
    "@radix-ui/react-separator": "^1.1.7",
    "@radix-ui/react-slot": "^1.2.3",
    "@radix-ui/react-switch": "^1.2.6",
    "@radix-ui/react-toast": "^1.2.14",
    "@radix-ui/react-tooltip": "^1.2.7",
    "@supabase/supabase-js": "^2.91.1",
    "@tanstack/react-query": "^5.83.0",
    "class-variance-authority": "^0.7.1",
    "clsx": "^2.1.1",
    "date-fns": "^3.6.0",
    "framer-motion": "^12.34.1",
    "lucide-react": "^0.462.0",
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "react-hook-form": "^7.61.1",
    "react-router-dom": "^6.30.1",
    "recharts": "^2.15.4",
    "sonner": "^1.7.4",
    "tailwind-merge": "^2.6.0",
    "tailwindcss-animate": "^1.0.7",
    "xlsx": "^0.18.5",
    "zod": "^3.25.76"
  },
  "devDependencies": {
    "@types/node": "^22.16.5",
    "@types/react": "^18.3.23",
    "@types/react-dom": "^18.3.7",
    "@vitejs/plugin-react-swc": "^3.11.0",
    "autoprefixer": "^10.4.21",
    "postcss": "^8.5.6",
    "tailwindcss": "^3.4.17",
    "typescript": "^5.8.3",
    "vite": "^5.4.19"
  }
}
```

- [ ] **Step 2: Create tsconfig.json**

```json
{
  "files": [],
  "references": [
    { "path": "./tsconfig.app.json" },
    { "path": "./tsconfig.node.json" }
  ]
}
```

- [ ] **Step 3: Create tsconfig.app.json**

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": false,
    "noUnusedParameters": false,
    "noFallthroughCasesInSwitch": true,
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["src"]
}
```

- [ ] **Step 4: Create tsconfig.node.json**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2023"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "isolatedModules": true,
    "noEmit": true,
    "strict": true
  },
  "include": ["vite.config.ts"]
}
```

- [ ] **Step 5: Create vite.config.ts**

```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';
import path from 'path';

export default defineConfig({
  base: '/',
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    host: true,
    port: 5173,
  },
  preview: {
    host: true,
    port: 4173,
  },
});
```

- [ ] **Step 6: Create postcss.config.js**

```javascript
export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};
```

- [ ] **Step 7: Create components.json** (Shadcn config)

Copy from source: `C:/Users/Lucas Magan/Desktop/as/Aires-Soft/crm/components.json`

- [ ] **Step 8: Install dependencies**

```bash
cd "C:/Users/Lucas Magan/Desktop/as/Aires-Soft/Codan/crm"
npm install
```

Expected: `node_modules` created, no errors.

---

## Task 2: Theme — Tailwind Config + CSS Variables

**Files:**
- Create: `tailwind.config.ts`
- Create: `src/index.css`

- [ ] **Step 1: Create tailwind.config.ts** with campus gold/dark luxury colors

```typescript
import type { Config } from 'tailwindcss';
import animate from 'tailwindcss-animate';

const config: Config = {
  darkMode: ['class'],
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    container: {
      center: true,
      padding: '2rem',
      screens: { '2xl': '1400px' },
    },
    extend: {
      fontFamily: {
        display: ['Cormorant Garamond', 'Georgia', 'serif'],
        body: ['Inter', 'system-ui', 'sans-serif'],
      },
      colors: {
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        sidebar: {
          DEFAULT: 'hsl(var(--sidebar-background))',
          foreground: 'hsl(var(--sidebar-foreground))',
          primary: 'hsl(var(--sidebar-primary))',
          'primary-foreground': 'hsl(var(--sidebar-primary-foreground))',
          accent: 'hsl(var(--sidebar-accent))',
          'accent-foreground': 'hsl(var(--sidebar-accent-foreground))',
          border: 'hsl(var(--sidebar-border))',
          ring: 'hsl(var(--sidebar-ring))',
        },
        gold: {
          DEFAULT: 'hsl(38 60% 50%)',
          light: 'hsl(40 50% 65%)',
          dark: 'hsl(35 55% 35%)',
        },
        marble: 'hsl(40 15% 90%)',
        obsidian: 'hsl(20 10% 6%)',
        bronze: 'hsl(30 40% 35%)',
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
      keyframes: {
        'accordion-down': {
          from: { height: '0' },
          to: { height: 'var(--radix-accordion-content-height)' },
        },
        'accordion-up': {
          from: { height: 'var(--radix-accordion-content-height)' },
          to: { height: '0' },
        },
        'fade-in': {
          from: { opacity: '0', transform: 'translateY(10px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'glow-pulse': {
          '0%, 100%': { boxShadow: '0 0 20px hsl(38 60% 50% / 0.3)' },
          '50%': { boxShadow: '0 0 40px hsl(38 60% 50% / 0.6)' },
        },
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
        'fade-in': 'fade-in 0.5s ease-out',
        'glow-pulse': 'glow-pulse 2s ease-in-out infinite',
      },
    },
  },
  plugins: [animate],
};

export default config;
```

- [ ] **Step 2: Create src/index.css** with campus dark luxury theme

```css
@import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;500;600;700&family=Inter:wght@400;500;600;700&display=swap');

@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    --background: 20 10% 4%;
    --foreground: 40 30% 92%;

    --card: 20 8% 8%;
    --card-foreground: 40 30% 92%;

    --popover: 20 8% 8%;
    --popover-foreground: 40 30% 92%;

    --primary: 38 60% 50%;
    --primary-foreground: 20 10% 4%;

    --secondary: 20 6% 14%;
    --secondary-foreground: 40 20% 80%;

    --muted: 20 6% 18%;
    --muted-foreground: 30 10% 55%;

    --accent: 38 45% 40%;
    --accent-foreground: 40 30% 92%;

    --destructive: 0 62% 45%;
    --destructive-foreground: 40 30% 92%;

    --border: 30 8% 18%;
    --input: 30 8% 18%;
    --ring: 38 60% 50%;

    --radius: 0.5rem;

    --sidebar-background: 20 10% 4%;
    --sidebar-foreground: 40 30% 92%;
    --sidebar-primary: 38 60% 50%;
    --sidebar-primary-foreground: 20 10% 4%;
    --sidebar-accent: 20 6% 14%;
    --sidebar-accent-foreground: 40 30% 92%;
    --sidebar-border: 30 8% 18%;
    --sidebar-ring: 38 60% 50%;
  }
}

@layer base {
  * {
    @apply border-border;
  }

  body {
    @apply bg-background text-foreground antialiased;
    font-family: 'Inter', system-ui, sans-serif;
  }
}

@layer utilities {
  .text-gradient-gold {
    background: linear-gradient(135deg, hsl(38 60% 65%), hsl(38 60% 50%), hsl(35 55% 35%));
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }

  .glow-gold {
    box-shadow: 0 0 20px hsl(38 60% 50% / 0.3);
  }

  .glass-dark {
    @apply backdrop-blur-xl border;
    background: hsl(20 8% 8% / 0.8);
    border-color: hsl(30 8% 18%);
  }
}
```

---

## Task 3: Environment & Supabase Client

**Files:**
- Create: `.env`
- Create: `.env.example`
- Create: `src/integrations/supabase/client.ts`

- [ ] **Step 1: Create .env**

```env
# Supabase — fill in after creating your CodanFit Supabase project
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=

# Apify — Lead Finder API
VITE_AIRES_FINDER_TOKEN=your_apify_token_here
VITE_AIRES_FINDER_ACTOR=compass/crawler-google-places
VITE_AIRES_FINDER_ACTOR2=danube-home/linkedin-scraper-ligh
```

- [ ] **Step 2: Create .env.example**

```env
# Supabase
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=

# Apify — Lead Finder API
VITE_AIRES_FINDER_TOKEN=
VITE_AIRES_FINDER_ACTOR=compass/crawler-google-places
VITE_AIRES_FINDER_ACTOR2=danube-home/linkedin-scraper-ligh
```

- [ ] **Step 3: Create .gitignore** (so .env is not committed)

```
node_modules
dist
.env
.env.local
```

- [ ] **Step 4: Create src/integrations/supabase/client.ts**

```typescript
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
```

---

## Task 4: Shared Code (Types, Lib, Hooks)

Copy these files **exactly** from source — no modifications needed.

**Files to copy:**
- `src/lib/utils.ts`
- `src/types/crm.ts`
- `src/hooks/useAuth.ts`

- [ ] **Step 1: Create src/lib/utils.ts**

```typescript
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

- [ ] **Step 2: Copy src/types/crm.ts from source**

Copy exact content from `C:/Users/Lucas Magan/Desktop/as/Aires-Soft/crm/src/types/crm.ts`.

Note: This file references `@/components/crm/legal/types` at the bottom. Since we are not including the legal module, replace the last line:
```typescript
// Remove this line:
export type { LegalDocStatus, LegalCategory, LegalDocument } from '@/components/crm/legal/types';
```

- [ ] **Step 3: Copy src/hooks/useAuth.ts from source**

Copy exact content from `C:/Users/Lucas Magan/Desktop/as/Aires-Soft/crm/src/hooks/useAuth.ts`.

---

## Task 5: UI Components (Shadcn/ui)

Copy all files from `C:/Users/Lucas Magan/Desktop/as/Aires-Soft/crm/src/components/ui/` to `src/components/ui/`.

Files to copy (19 total):
- `alert-dialog.tsx`, `avatar.tsx`, `badge.tsx`, `button.tsx`, `card.tsx`
- `checkbox.tsx`, `dialog.tsx`, `dropdown-menu.tsx`, `input.tsx`, `label.tsx`
- `popover.tsx`, `progress.tsx`, `select.tsx`, `separator.tsx`, `skeleton.tsx`
- `switch.tsx`, `table.tsx`, `textarea.tsx`, `tooltip.tsx`

- [ ] **Step 1: Copy all UI components**

Run in terminal:
```bash
cp -r "C:/Users/Lucas Magan/Desktop/as/Aires-Soft/crm/src/components/ui/." "C:/Users/Lucas Magan/Desktop/as/Aires-Soft/Codan/crm/src/components/ui/"
```

Expected: 19 `.tsx` files in `src/components/ui/`.

---

## Task 6: CRM Layout (Sidebar, Topbar, CRMLayout)

**Files:**
- Create: `src/components/crm/menuConfig.ts` (trimmed to 6 modules)
- Create: `src/components/crm/Sidebar.tsx` (gold theme + CodanFit branding)
- Copy: `src/components/crm/Topbar.tsx` (exact)
- Copy: `src/components/crm/CRMLayout.tsx` (exact)

- [ ] **Step 1: Create src/components/crm/menuConfig.ts** (keep only required modules)

```typescript
import {
  LayoutDashboard,
  Users,
  UserCheck,
  Target,
  Radar,
  Mail,
  Settings,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export interface MenuItem {
  id: string;
  label: string;
  icon: LucideIcon;
  locked?: boolean;
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
      { id: 'email-sender', label: 'Email Sender', icon: Mail },
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
```

- [ ] **Step 2: Create src/components/crm/Sidebar.tsx** (gold theme + CodanFit branding)

Copy from `C:/Users/Lucas Magan/Desktop/as/Aires-Soft/crm/src/components/crm/Sidebar.tsx` and make these changes:

1. Change `const BRAND = '#096fd3'` to `const BRAND = 'hsl(38, 60%, 50%)'`
2. Change sidebar background style from blue-tinted white to obsidian dark:
   ```
   background: 'linear-gradient(180deg, hsl(20,10%,4%) 0%, hsl(20,8%,6%) 100%)'
   borderRight: `1px solid hsl(30,8%,18%)`
   ```
3. Update logo text:
   ```tsx
   <p className="font-bold text-sm text-foreground">CodanFit CRM</p>
   <p className="text-[10px] text-muted-foreground">Management System</p>
   ```
4. For active nav items, update inline color to use gold:
   ```
   color: 'hsl(38, 60%, 50%)'
   borderLeft: '2px solid hsl(38, 60%, 50%)'
   background: 'linear-gradient(135deg, hsl(38,60%,50%,0.15) 0%, hsl(38,60%,50%,0.08) 100%)'
   ```
5. Group label dot and text: change `backgroundColor: BRAND` and `color: \`${BRAND}99\`` to use BRAND constant

- [ ] **Step 3: Copy src/components/crm/Topbar.tsx from source**

```bash
cp "C:/Users/Lucas Magan/Desktop/as/Aires-Soft/crm/src/components/crm/Topbar.tsx" "C:/Users/Lucas Magan/Desktop/as/Aires-Soft/Codan/crm/src/components/crm/Topbar.tsx"
```

- [ ] **Step 4: Copy src/components/crm/CRMLayout.tsx from source**

```bash
cp "C:/Users/Lucas Magan/Desktop/as/Aires-Soft/crm/src/components/crm/CRMLayout.tsx" "C:/Users/Lucas Magan/Desktop/as/Aires-Soft/Codan/crm/src/components/crm/CRMLayout.tsx"
```

Note: CRMLayout imports many sections (expenses, legal, revenue, etc.) that we are not copying. After copying, remove imports and cases for: `ExpensesSection`, `RevenueSection`, `LegalSection`, `StockSection`, `TasksSection`, `CalendarSection`, `ContentPlanningSection`, `BrandIdentitySection`, `PipelineSection`. Keep only: `Dashboard`, `LeadFinderSection`, `LeadsSection`, `ContactsSection`, `ClientsSection`, `EmailSenderSection`, `SettingsSection`, `SettingsEmailsSection`.

The switch/render logic in CRMLayout should only render the 6 kept sections. Remove all other cases.

---

## Task 7: Lead Finder Module

Copy all files from `C:/Users/Lucas Magan/Desktop/as/Aires-Soft/crm/src/components/crm/lead-finder/` to `src/components/crm/lead-finder/`.

- [ ] **Step 1: Copy entire lead-finder directory**

```bash
cp -r "C:/Users/Lucas Magan/Desktop/as/Aires-Soft/crm/src/components/crm/lead-finder/." "C:/Users/Lucas Magan/Desktop/as/Aires-Soft/Codan/crm/src/components/crm/lead-finder/"
```

Expected files: `LeadFinderSection.tsx`, `constants.ts`, `types.ts`, `utils.ts`, and all component files in `components/` subdirectory.

---

## Task 8: Leads, Contacts, Clients Sections + Detail Pages

Copy these files exactly:

- [ ] **Step 1: Copy CRM sections**

```bash
cp "C:/Users/Lucas Magan/Desktop/as/Aires-Soft/crm/src/components/crm/LeadsSection.tsx" "C:/Users/Lucas Magan/Desktop/as/Aires-Soft/Codan/crm/src/components/crm/LeadsSection.tsx"
cp "C:/Users/Lucas Magan/Desktop/as/Aires-Soft/crm/src/components/crm/ContactsSection.tsx" "C:/Users/Lucas Magan/Desktop/as/Aires-Soft/Codan/crm/src/components/crm/ContactsSection.tsx"
cp "C:/Users/Lucas Magan/Desktop/as/Aires-Soft/crm/src/components/crm/ClientsSection.tsx" "C:/Users/Lucas Magan/Desktop/as/Aires-Soft/Codan/crm/src/components/crm/ClientsSection.tsx"
cp "C:/Users/Lucas Magan/Desktop/as/Aires-Soft/crm/src/components/crm/Dashboard.tsx" "C:/Users/Lucas Magan/Desktop/as/Aires-Soft/Codan/crm/src/components/crm/Dashboard.tsx"
cp "C:/Users/Lucas Magan/Desktop/as/Aires-Soft/crm/src/components/crm/SettingsSection.tsx" "C:/Users/Lucas Magan/Desktop/as/Aires-Soft/Codan/crm/src/components/crm/SettingsSection.tsx"
```

- [ ] **Step 2: Copy detail pages**

```bash
cp "C:/Users/Lucas Magan/Desktop/as/Aires-Soft/crm/src/pages/LeadDetail.tsx" "C:/Users/Lucas Magan/Desktop/as/Aires-Soft/Codan/crm/src/pages/LeadDetail.tsx"
cp "C:/Users/Lucas Magan/Desktop/as/Aires-Soft/crm/src/pages/ContactDetail.tsx" "C:/Users/Lucas Magan/Desktop/as/Aires-Soft/Codan/crm/src/pages/ContactDetail.tsx"
cp "C:/Users/Lucas Magan/Desktop/as/Aires-Soft/crm/src/pages/ClientDetail.tsx" "C:/Users/Lucas Magan/Desktop/as/Aires-Soft/Codan/crm/src/pages/ClientDetail.tsx"
cp "C:/Users/Lucas Magan/Desktop/as/Aires-Soft/crm/src/pages/NotFound.tsx" "C:/Users/Lucas Magan/Desktop/as/Aires-Soft/Codan/crm/src/pages/NotFound.tsx"
```

- [ ] **Step 3: Check if Dashboard.tsx imports hooks from hooks/ directory**

Run:
```bash
grep -n "import" "C:/Users/Lucas Magan/Desktop/as/Aires-Soft/crm/src/components/crm/Dashboard.tsx" | head -20
```

If it imports `useDashboardData`, copy that hook:
```bash
cp "C:/Users/Lucas Magan/Desktop/as/Aires-Soft/crm/src/hooks/useDashboardData.ts" "C:/Users/Lucas Magan/Desktop/as/Aires-Soft/Codan/crm/src/hooks/useDashboardData.ts"
```

---

## Task 9: Email Sender + Settings Emails

- [ ] **Step 1: Copy EmailSenderSection.tsx**

```bash
cp "C:/Users/Lucas Magan/Desktop/as/Aires-Soft/crm/src/components/crm/EmailSenderSection.tsx" "C:/Users/Lucas Magan/Desktop/as/Aires-Soft/Codan/crm/src/components/crm/EmailSenderSection.tsx"
```

- [ ] **Step 2: Copy SettingsEmailsSection.tsx**

```bash
cp "C:/Users/Lucas Magan/Desktop/as/Aires-Soft/crm/src/components/crm/SettingsEmailsSection.tsx" "C:/Users/Lucas Magan/Desktop/as/Aires-Soft/Codan/crm/src/components/crm/SettingsEmailsSection.tsx"
```

- [ ] **Step 3: Copy Email History pages**

```bash
cp "C:/Users/Lucas Magan/Desktop/as/Aires-Soft/crm/src/pages/EmailHistory.tsx" "C:/Users/Lucas Magan/Desktop/as/Aires-Soft/Codan/crm/src/pages/EmailHistory.tsx"
cp "C:/Users/Lucas Magan/Desktop/as/Aires-Soft/crm/src/pages/EmailHistoryDetail.tsx" "C:/Users/Lucas Magan/Desktop/as/Aires-Soft/Codan/crm/src/pages/EmailHistoryDetail.tsx"
```

- [ ] **Step 4: Copy Supabase Edge Functions**

```bash
cp -r "C:/Users/Lucas Magan/Desktop/as/Aires-Soft/crm/supabase/functions/." "C:/Users/Lucas Magan/Desktop/as/Aires-Soft/Codan/crm/supabase/functions/"
```

These are the `send-email` and `track-open` edge functions needed for email sending.

---

## Task 10: Main Entry + App + Pages

- [ ] **Step 1: Create index.html**

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>CodanFit CRM</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

- [ ] **Step 2: Create src/main.tsx**

```typescript
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
```

- [ ] **Step 3: Create src/App.tsx** (BRAND updated to gold)

```typescript
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
            style={{ borderTopColor: BRAND, borderRightColor: `${BRAND}40` }}
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
```

- [ ] **Step 4: Create src/pages/Index.tsx**

```typescript
import { CRMLayout } from '@/components/crm/CRMLayout';

export default function Index() {
  return <CRMLayout />;
}
```

- [ ] **Step 5: Create src/pages/Login.tsx** (CodanFit branding + gold theme)

```typescript
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Lock, Mail, Loader2, Dumbbell } from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';

const BRAND = 'hsl(38, 60%, 50%)';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) return;
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      toast.error('Authentication error', {
        description: 'Invalid credentials. Please try again.',
      });
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4 relative overflow-hidden">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div
          className="absolute -top-40 -right-40 w-96 h-96 rounded-full blur-3xl opacity-10"
          style={{ backgroundColor: BRAND }}
        />
        <div
          className="absolute -bottom-40 -left-40 w-96 h-96 rounded-full blur-3xl opacity-10"
          style={{ backgroundColor: BRAND }}
        />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md relative z-10"
      >
        <div className="text-center mb-8">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.4, delay: 0.1 }}
            className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-6 shadow-lg"
            style={{ backgroundColor: BRAND }}
          >
            <Dumbbell className="w-8 h-8 text-black" />
          </motion.div>
          <h1 className="text-4xl font-bold text-foreground tracking-tight mb-2 font-display">
            CodanFit CRM
          </h1>
          <p className="text-muted-foreground">
            Sign in to your account to continue
          </p>
        </div>

        <Card className="border shadow-xl bg-card">
          <CardContent className="p-8">
            <form onSubmit={handleLogin} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-medium">
                  Email address
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10"
                    required
                    autoComplete="email"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm font-medium">
                  Password
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10"
                    required
                    autoComplete="current-password"
                  />
                </div>
              </div>

              <Button
                type="submit"
                className="w-full h-11 font-medium text-black"
                style={{ backgroundColor: BRAND }}
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    Signing in...
                  </>
                ) : (
                  'Sign in'
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        <p className="text-center text-xs text-muted-foreground mt-6">
          Powered by <span className="font-medium" style={{ color: BRAND }}>CodanFit</span>
        </p>
      </motion.div>
    </div>
  );
}
```

---

## Task 11: Check & Fix Remaining Imports

After copying all files, some components may import modules we didn't include. Run TypeScript check to find broken imports.

- [ ] **Step 1: Run TypeScript check**

```bash
npx tsc --noEmit 2>&1 | head -60
```

- [ ] **Step 2: Fix any broken imports**

Common issues to expect:
- `CRMLayout.tsx` importing removed modules → remove those import lines and their switch cases
- `crm.ts` importing legal types → remove the `export type { ... } from '@/components/crm/legal/types'` line
- `SettingsSection.tsx` or `Dashboard.tsx` importing hooks not yet copied → copy those hooks

For each TypeScript error, either:
a) Copy the missing file from source if it's a hook/util we need
b) Remove the import if it's for a module we intentionally excluded

- [ ] **Step 3: Re-run TypeScript check until clean**

```bash
npx tsc --noEmit 2>&1 | head -60
```

Expected: No errors (or only minor ones unrelated to missing files).

---

## Task 12: Database Tables Documentation

**Files:**
- Create: `docs/database-tables.md`

- [ ] **Step 1: Create docs/database-tables.md**

```markdown
# CodanFit CRM — Database Tables

All tables below must be created in your Supabase project.
Run each SQL block in the Supabase SQL Editor.

---

## Authentication

Handled by Supabase Auth. No manual table needed.
`auth.users` is automatically created by Supabase.

---

## 1. leads

Uncontacted prospects discovered via Lead Finder or manual entry.

```sql
create table public.leads (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  business_name text not null default '',
  first_name text not null default '',
  last_name text not null default '',
  email text,
  phone text,
  website text,
  source text,
  city text,
  state text,
  country_code text,
  category text,
  notes text,
  google_maps_url text,
  score numeric,
  reviews_count integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.leads enable row level security;

create policy "Users manage own leads"
  on public.leads for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index idx_leads_user_id on public.leads(user_id);
```

---

## 2. contacts

Leads that have been contacted (type = LEAD_CONTACTED) or confirmed clients (type = CLIENT).

```sql
create table public.contacts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  type text not null default 'LEAD_CONTACTED'
    check (type in ('CLIENT', 'LEAD_CONTACTED', 'LEAD_NOT_CONTACTED')),
  business_name text not null default '',
  first_name text not null default '',
  last_name text not null default '',
  whatsapp text,
  email text,
  website text,
  labels text[] not null default '{}',
  last_contact_date date,
  channel text,
  notes text,
  source text,
  country_code text,
  country_name text,
  province text,
  city text,
  category text,
  google_maps_url text,
  score numeric,
  reviews_count integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.contacts enable row level security;

create policy "Users manage own contacts"
  on public.contacts for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index idx_contacts_user_id on public.contacts(user_id);
create index idx_contacts_type on public.contacts(type);
```

---

## 3. crm_clients

Confirmed paying clients.

```sql
create table public.crm_clients (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  business_name text not null default '',
  first_name text not null default '',
  last_name text not null default '',
  email text,
  phone text,
  website text,
  source text,
  notes text,
  status text not null default 'active'
    check (status in ('active', 'inactive', 'paused')),
  city text,
  category text,
  country_code text,
  labels text[] not null default '{}',
  channel text,
  google_maps_url text,
  score numeric,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.crm_clients enable row level security;

create policy "Users manage own clients"
  on public.crm_clients for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index idx_crm_clients_user_id on public.crm_clients(user_id);
create index idx_crm_clients_status on public.crm_clients(status);
```

---

## 4. sender_accounts

SMTP email accounts used for sending emails.

```sql
create table public.sender_accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  email text not null,
  smtp_host text not null,
  smtp_port integer not null default 587,
  smtp_user text not null,
  smtp_pass text not null,
  signature_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.sender_accounts enable row level security;

create policy "Users manage own sender accounts"
  on public.sender_accounts for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
```

---

## 5. email_signatures

HTML/text email signatures with optional image.

```sql
create table public.email_signatures (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  html text,
  text text,
  image_url text,
  image_position text default 'bottom'
    check (image_position in ('top', 'bottom', 'left', 'right')),
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.email_signatures enable row level security;

create policy "Users manage own signatures"
  on public.email_signatures for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- FK from sender_accounts to email_signatures
alter table public.sender_accounts
  add constraint fk_sender_signature
  foreign key (signature_id) references public.email_signatures(id)
  on delete set null;
```

---

## 6. email_logs

Record of every email sent.

```sql
create table public.email_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  sender_account_id uuid references public.sender_accounts(id) on delete set null,
  subject text not null,
  body_html text,
  body_text text,
  recipients jsonb not null default '[]',
  status text not null default 'sent'
    check (status in ('sent', 'failed', 'pending')),
  sent_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.email_logs enable row level security;

create policy "Users view own email logs"
  on public.email_logs for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index idx_email_logs_user_id on public.email_logs(user_id);
```

---

## 7. email_opens

Tracks when recipients open emails (via pixel tracking).

```sql
create table public.email_opens (
  id uuid primary key default gen_random_uuid(),
  email_log_id uuid references public.email_logs(id) on delete cascade not null,
  recipient_email text not null,
  opened_at timestamptz not null default now()
);

alter table public.email_opens enable row level security;

create policy "Users view own email opens"
  on public.email_opens for select
  using (
    exists (
      select 1 from public.email_logs
      where email_logs.id = email_opens.email_log_id
        and email_logs.user_id = auth.uid()
    )
  );

create index idx_email_opens_log_id on public.email_opens(email_log_id);
```

---

## Edge Functions to Deploy

After setting up your Supabase project, deploy these edge functions from `supabase/functions/`:

1. **send-email** — handles SMTP email sending
2. **track-open** — handles email open tracking pixel

Deploy with:
```bash
supabase functions deploy send-email --project-ref YOUR_PROJECT_REF
supabase functions deploy track-open --project-ref YOUR_PROJECT_REF
```
```

---

## Task 13: Final Verification

- [ ] **Step 1: Run dev server**

```bash
npm run dev
```

Expected: Server starts at `http://localhost:5173` with no build errors.

- [ ] **Step 2: Open browser and verify**

Navigate to `http://localhost:5173`.

Expected:
- Login page shows "CodanFit CRM" title with gold accent color on dark background
- After login (requires Supabase DB to be set up), sidebar shows only: Dashboard, Lead Finder, Leads, Contacts, Clients, Email Sender, Settings, Emails
- Dark gold luxury theme visible throughout (no blue colors remaining)

- [ ] **Step 3: Check for console errors**

Open browser DevTools → Console. Expected: No TypeScript/import errors. The only expected warning is Supabase connection warning if VITE_SUPABASE_URL is empty.

- [ ] **Step 4: Build check**

```bash
npm run build
```

Expected: `dist/` created successfully, no build errors.
```
