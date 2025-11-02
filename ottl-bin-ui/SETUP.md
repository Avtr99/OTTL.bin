# OTTL.bin UI - Setup Instructions

## Overview
Production-ready UI for OTTL.bin built with React, TypeScript, Vite, and Hero UI.

## Prerequisites
- Node.js 18+ or 20+
- npm, yarn, pnpm, or bun

## Installation

### 1. Install Dependencies

```bash
npm install
```

This will install:
- **Hero UI** - Component library
- **Tailwind CSS** - Styling
- **Lucide React** - Icons
- **Monaco Editor** - Code editor
- **@dnd-kit** - Drag and drop
- **Zustand** - State management
- **React Query** - Data fetching
- **Sonner** - Toast notifications
- **Recharts** - Charts

### 2. Start Development Server

```bash
npm run dev
```

The app will be available at `http://localhost:5173`

### 3. Build for Production

```bash
npm run build
```

Output will be in the `dist/` directory.

### 4. Preview Production Build

```bash
npm run preview
```

## Project Structure

```
ottl-bin-ui/
├── src/
│   ├── components/
│   │   ├── layout/
│   │   │   ├── AppShell.tsx
│   │   │   └── HeaderBar.tsx
│   │   ├── transformations/
│   │   ├── preview/
│   │   └── modals/
│   ├── stores/
│   ├── hooks/
│   ├── types/
│   ├── utils/
│   ├── App.tsx
│   ├── main.tsx
│   └── index.css
├── public/
├── docs/
│   ├── HERO_UI_DESIGN_TOKENS.md
│   └── HERO_UI_COMPONENTS.md
├── tailwind.config.js
├── postcss.config.js
├── vite.config.ts
└── package.json
```

## Design System

### Colors
- **Primary Blue**: `#3B82F6` - Actions, links
- **Success Green**: `#10B981` - Additive operations
- **Warning Yellow**: `#F59E0B` - Privacy/security
- **Danger Red**: `#EF4444` - Destructive operations
- **Secondary Purple**: `#A855F7` - Parsing operations
- **Cost Orange**: `#F97316` - Cost-related

### Typography
- **UI Font**: Inter
- **Code Font**: JetBrains Mono

### Spacing
- Base unit: 4px
- Card padding: 16px
- Section spacing: 24px
- Element gap: 12px

## Key Features

### ✅ Implemented
- [x] Hero UI integration
- [x] Tailwind CSS configuration
- [x] Design tokens extracted
- [x] Base layout structure
- [x] Header navigation
- [x] Responsive grid system

### 🚧 In Progress
- [ ] Transformation cards
- [ ] Live preview panel
- [ ] WYSIWYG context menu
- [ ] Template library modal
- [ ] Cost impact panel

### 📋 Planned
- [ ] Drag-and-drop reordering
- [ ] Raw OTTL editor
- [ ] Smart suggestions
- [ ] Export functionality
- [ ] Deployment integration

## Development Guidelines

### Component Structure
```tsx
import type { ReactNode } from 'react';
import { Card } from '@heroui/react';

interface MyComponentProps {
  children?: ReactNode;
  title: string;
}

export function MyComponent({ children, title }: MyComponentProps) {
  return (
    <Card>
      <h3>{title}</h3>
      {children}
    </Card>
  );
}
```

### Styling
- Use Tailwind utility classes
- Follow Hero UI component API
- Reference design tokens in `docs/HERO_UI_DESIGN_TOKENS.md`

### State Management
- Use Zustand for global state
- Use React Query for server state
- Use local state for component-specific state

## Troubleshooting

### TypeScript Errors
The TypeScript errors about missing modules will resolve after running `npm install`.

### Tailwind CSS Warnings
The `@tailwind` directive warnings are expected - they're processed by PostCSS.

### Port Already in Use
If port 5173 is in use, Vite will automatically try the next available port.

## Documentation

- [Product Specification](../docs/PRODUCT_SPEC.md)
- [Hero UI Design Tokens](../docs/HERO_UI_DESIGN_TOKENS.md)
- [Hero UI Components Mapping](../docs/HERO_UI_COMPONENTS.md)
- [Enhanced UX Design](../docs/ENHANCED_UX_DESIGN.md)

## Next Steps

1. **Install dependencies**: `npm install`
2. **Start dev server**: `npm run dev`
3. **Implement transformation cards** (see `docs/HERO_UI_COMPONENTS.md`)
4. **Add preview functionality**
5. **Implement WYSIWYG features** (FR-13)

## Support

For issues or questions, refer to:
- [Hero UI Documentation](https://www.heroui.com/docs)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
- [Vite Documentation](https://vitejs.dev/guide/)
