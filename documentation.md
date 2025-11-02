- `LivePreviewPanel` now accepts:
  - `variant: 'default' | 'modal'` to control sizing.
  - `onExpandRequest?: () => void` to surface the expand button.

- Modal expand helpers:
  - `isTransformationsModalOpen` / `setIsTransformationsModalOpen`
  - `isPreviewModalOpen` / `setIsPreviewModalOpen`

- Cost & Impact updates:
  - Added `MetricCard` and `CompactStat` helpers (see [CostImpactPanel.tsx](ottl-bin-ui/src/components/impact/CostImpactPanel.tsx)). These render compact headline metrics for storage reduction, savings, records impacted, and attribute changes.
  - `CostImpactPanel` now focuses on four key metrics, average record size, progress indicators, and removed attribute chips.
# OTTL.bin Documentation

## Project Overview

**OTTL.bin** is a visual transformation builder that makes the OpenTelemetry Transformation Language (OTTL) accessible through an intuitive, form-based interface.

### Version: 1.1
### Last Updated: November 1, 2025

---

## Documentation Index

### 1. Product Documentation
- **[PRODUCT_SPEC.md](docs/PRODUCT_SPEC.md)** - The "what we will build" document, outlining the vision, goals, and functional requirements.
- **[SOLUTION_SUMMARY.md](docs/SOLUTION_SUMMARY.md)** - A high-level overview of the "why we are building it" and "how it works."
- **[FINAL_IMPLEMENTATION_SUMMARY.md](FINAL_IMPLEMENTATION_SUMMARY.md)** - The "what we have built" document, summarizing the final implementation and features.

### 2. Design Documentation
- **[CONSOLIDATED_UX_DESIGN.md](docs/CONSOLIDATED_UX_DESIGN.md)** - The single source of truth for UX and design, consolidating all previous design documents.
  - Core Philosophy & User Experience
  - Complete Transformation Catalog
  - Key UI Patterns & Components
  - Visual Design System
  - Technical Implementation
  - Success Metrics

### 3. Implementation Documentation
- **[ottl-bin-ui/SETUP.md](ottl-bin-ui/SETUP.md)** - UI setup instructions
  - Installation steps
  - Project structure
  - Development guidelines
  - Troubleshooting

#### Transformation statement generation (App.tsx)
- `groupTransformationsBySignal` groups enabled transformations by their `signal` hint (`trace`, `metric`, `log`) before exporting OTTL.
- `buildTraceStatement`, `buildMetricStatement`, and `buildLogStatement` render signal-specific OTTL statements while respecting allowed path prefixes from the Transform Processor spec.
- `buildStatement` chooses the correct builder based on the transformation's signal.
- Each `Transformation` now carries:
  - `signal`: The primary signal this transformation targets
  - `compatibleSignals`: Array of all signals this transformation works with (displayed as badges in UI)
- The default catalog annotates entries with signal compatibility:
  - Metric-specific transformations: `compatibleSignals: ['metric']`
  - Privacy transformations: `compatibleSignals: ['trace', 'log']`
  - Universal transformations: `compatibleSignals: ['trace', 'metric', 'log']`
- Context-aware grouping buckets statements by the inferred context (e.g., `span`, `metric`, `log`) so the generated YAML emits Advanced Config blocks with the appropriate `context:` header for the Transform Processor's inference rules.

#### Visual signal indicators (TransformationCard.tsx)
- Transformation cards display signal compatibility badges with icons:
  - **Trace**: Activity icon, blue badge
  - **Metric**: BarChart3 icon, green badge
  - **Log**: FileText icon, yellow badge
- Helps users quickly identify which telemetry signals each transformation supports.

#### Signal validation (utils/ottlValidation.ts)
- **Function compatibility mapping**: `FUNCTION_COMPATIBILITY` maps all OTTL functions to their compatible signals:
  - **Metric-only functions**: `convert_sum_to_gauge`, `convert_gauge_to_sum`, `scale_metric`, `aggregate_on_attributes`, etc.
  - **Common functions**: `set`, `delete_key`, `replace_pattern`, `sha256`, etc. work across all signals (trace, metric, log)
- `isFunctionCompatibleWithSignal()` validates if a function can be used with a specific signal type.
- `getFunctionCompatibilityLabel()` returns human-readable labels like "Metric only" or "All signals".
- `validateStatementForSignal()` performs comprehensive validation:
  - Checks function compatibility with target signal
  - Validates path prefixes (e.g., `span.*` for traces, `metric.*` for metrics, `log.*` for logs)
  - Returns detailed error messages for incompatible usage
- `inferSignalFromStatement()` auto-detects the signal from function names and path prefixes in raw OTTL.

#### Raw OTTL Editor sync and validation (RawOttlEditorModal.tsx)
- **Sync indicator**: Displays how many transformations are generating the OTTL.
- **Auto-sync**: When `hasCustomEdits` is false, the editor auto-syncs with visual pipeline changes via `generateDefaultOttl()`.
- **Signal compatibility validation**: On save, the editor validates all statements against their signal sections:
  - Detects `trace_statements`, `metric_statements`, and `log_statements` sections
  - Validates each statement for function and path prefix compatibility
  - Shows inline error messages with line numbers for incompatible usage
  - Example: "Line 15: Function 'scale_metric' is not compatible with trace signal. Compatible with: metric"
- Users can revert custom edits to restore auto-sync behavior.

---

## Quick Start

### For Product Managers
1. Read [PRODUCT_SPEC.md](docs/PRODUCT_SPEC.md) for complete feature list
2. Review [ENHANCED_UX_DESIGN.md](docs/ENHANCED_UX_DESIGN.md) for UX patterns
3. Check development phases for timeline

### For Designers
1. Review [HERO_UI_DESIGN_TOKENS.md](docs/HERO_UI_DESIGN_TOKENS.md) for design system
2. Check [ENHANCED_UX_DESIGN.md](docs/ENHANCED_UX_DESIGN.md) for UI patterns
3. Reference color palette and typography specifications

### For Developers
1. Read [ottl-bin-ui/SETUP.md](ottl-bin-ui/SETUP.md) for setup
2. Review [HERO_UI_COMPONENTS.md](docs/HERO_UI_COMPONENTS.md) for component API
3. Install dependencies: `cd ottl-bin-ui && npm install`
4. Start dev server: `npm run dev`

---

## Key Features

### Core Features (v1.0 - MVP)
- ✅ Pipeline management (create, save, load, delete, export)
- ✅ Sample data upload and management
- ✅ 15 core transformations
- ✅ Basic before/after preview
- ✅ OTTL YAML export
- ✅ 3 templates (PII Protection Essentials, Cost Control Starter, HTTP Telemetry Cleanup)

### Enhanced Features (v1.5)
- 🚧 **FR-13: Direct Manipulation / WYSIWYG** (NEW in v1.1)
  - Right-click context menu on preview values
  - Quick actions: Mask, Hash, Delete
  - Auto-configure transformation cards
  - Visual feedback
- 🚧 All 34 transformations
- 🚧 Sequential preview with diff view
- 🚧 Advanced templates (10 total)
- 🚧 Cost estimation
- 🚧 Smart detection & suggestions
- 🚧 Raw OTTL editor

### Future Features (v2.0)
- 📋 Collaboration features
- 📋 A/B testing framework
- 📋 Template marketplace
- 📋 AI-powered suggestions
- 📋 Multi-pipeline orchestration

---

## Technology Stack

### Frontend
- **Framework**: React 19 + TypeScript 5
- **Build Tool**: Vite 7
- **UI Library**: Hero UI 2.8.5
- **Styling**: Tailwind CSS 3.4
- **Icons**: Lucide React
- **Code Editor**: Monaco Editor
- **Drag & Drop**: @dnd-kit
- **State Management**: Zustand
- **Data Fetching**: React Query
- **Notifications**: Sonner
- **Charts**: Recharts

### Backend (Planned)
- Node.js 20+ / Go (TBD)
- PostgreSQL (pipeline storage)
- Redis (caching)
- WebAssembly (OTTL validation)

---

## Component Library

### Layout Components
- `<AppShell>` - Main application wrapper
- `<HeaderBar>` - Top navigation with logo, templates, export, user menu
- `<PipelineHeader>` - Pipeline name, telemetry type, status

### Transformation Components
- `<TransformationCard>` - Individual transformation with drag handle
- `<TransformationList>` - Ordered list with DnD support
- `<AddTransformationModal>` - Catalog search and selection
- `<TemplateLibraryModal>` - Curated template browser with impact estimates

### Preview Components
- `<LivePreviewPanel>` - Before/after comparison
- `<WysiwygContextMenu>` - Right-click actions (FR-13)
- `<CostImpactPanel>` - Cost and impact metrics

### Form Components
- Hero UI `Input`, `Select`, `Textarea`, `Checkbox`, `Switch`
- Custom form builders for transformation configuration

---

## Design System

### Colors
```typescript
Primary Blue:    #3B82F6  // Actions, links
Success Green:   #10B981  // Additive operations
Warning Yellow:  #F59E0B  // Privacy/security
Danger Red:      #EF4444  // Destructive operations
Secondary Purple:#A855F7  // Parsing operations
Cost Orange:     #F97316  // Cost-related
Metric Gray:     #6B7280  // Metric-specific
```

### Typography
```typescript
Font Family:
  UI:   Inter (400, 500, 600, 700)
  Code: JetBrains Mono (400, 500, 600)

Font Sizes:
  H1: 24px / 600 weight
  H2: 20px / 600 weight
  H3: 16px / 600 weight
  Body: 14px / 400 weight
  Small: 12px / 400 weight
  Code: 13px / 400 weight
```

### Spacing (4px base)
```typescript
Card padding:     16px (space-4)
Section spacing:  24px (space-6)
Element gap:      12px (space-3)
Tight spacing:    8px (space-2)
```

### Shadows
```typescript
Card default:  0 1px 3px rgba(0,0,0,0.1)
Card hover:    0 4px 6px rgba(0,0,0,0.1)
```

---

## User Personas

### 1. Sarah - Site Reliability Engineer
- **Experience**: 2 years in ops, no OTTL knowledge
- **Goal**: Remove sensitive data from logs
- **Success**: Upload logs → Auto-fix → Deploy (2-3 minutes)

### 2. Mike - Platform Engineer
- **Experience**: 5 years, some OTTL knowledge
- **Goal**: Reduce telemetry costs by 60%
- **Success**: Apply template → Customize → See savings → Deploy (10-15 minutes)

### 3. Lisa - Security Officer
- **Experience**: Compliance expert, no technical background
- **Goal**: Ensure GDPR compliance
- **Success**: Select template → Review → Generate report → Certify (15-20 minutes)

### 4. Alex - Staff Engineer
- **Experience**: 10 years, OTTL expert
- **Goal**: Build complex pipeline quickly
- **Success**: Visual builder + raw OTTL → Preview → Deploy (20-30 minutes)

---

## Success Metrics

### Usability Goals
- ✅ First transformation in <3 minutes
- ✅ 90% success rate without docs
- ✅ <5% invalid configurations
- ✅ 4.5+ satisfaction rating

### Business Impact
- 💰 50% average cost reduction
- ⏱️ 80% faster than raw OTTL
- 🎯 95% fewer errors
- 📈 3x faster iteration cycles

---

## Development Phases

### Phase 1: MVP (6-8 weeks) ✅
- Pipeline CRUD
- 15 core transformations
- Basic preview
- OTTL export
- 3 templates
- Sample data upload

### Phase 2: Enhanced (6-8 weeks) 🚧
- All 34 transformations
- Sequential preview with diff
- **Direct Manipulation / WYSIWYG** (FR-13)
- Advanced templates (10 total)
- Cost estimation
- Smart detection
- Raw OTTL editor

### Phase 3: Scale & Polish (8-12 weeks) 📋
- Collaboration features
- A/B testing
- Template marketplace
- Performance optimization
- Comprehensive documentation
- Security audit

---

## API Endpoints (Planned)

```
POST   /api/v1/pipelines              Create pipeline
GET    /api/v1/pipelines/:id          Get pipeline
PUT    /api/v1/pipelines/:id          Update pipeline
DELETE /api/v1/pipelines/:id          Delete pipeline
GET    /api/v1/pipelines              List pipelines

POST   /api/v1/pipelines/:id/preview  Preview transformations
POST   /api/v1/pipelines/:id/validate Validate OTTL
POST   /api/v1/pipelines/:id/export   Export YAML
POST   /api/v1/pipelines/:id/deploy   Deploy to target

GET    /api/v1/templates              List templates
GET    /api/v1/templates/:id          Get template
POST   /api/v1/templates              Save custom template

POST   /api/v1/samples                Upload sample data
GET    /api/v1/samples/:source        Get live data from source
```

---

## Installation

### Prerequisites
- Node.js 18+ or 20+
- npm, yarn, pnpm, or bun

### Steps
```bash
# Navigate to UI directory
cd ottl-bin-ui

# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

---

## Contributing

### Code Style
- Use TypeScript for type safety
- Follow React best practices
- Use Tailwind utility classes
- Reference Hero UI component API
- Add JSDoc comments for functions and components

### Component Structure
```tsx
import type { ReactNode } from 'react';

interface ComponentProps {
  children?: ReactNode;
  title: string;
}

/**
 * ComponentName - Brief description
 * Detailed description of what this component does
 */
export function ComponentName({ children, title }: ComponentProps) {
  return (
    <div>
      <h3>{title}</h3>
      {children}
    </div>
  );
}
```

### State Management
- **Global state**: Zustand
- **Server state**: React Query
- **Local state**: React useState/useReducer

---

## Troubleshooting

### TypeScript Errors
All module not found errors will resolve after `npm install`.

### Tailwind CSS Warnings
The `@tailwind` directive warnings are expected - processed by PostCSS.

### Port Already in Use
Vite will automatically try the next available port if 5173 is in use.

---

## Resources

### External Documentation
- [Hero UI Documentation](https://www.heroui.com/docs)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
- [React Documentation](https://react.dev)
- [Vite Documentation](https://vitejs.dev)
- [OpenTelemetry Transform Processor](https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/main/processor/transformprocessor)
- [OTTL Language Specification](https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/main/pkg/ottl)

### Internal Documentation
- [Product Specification](docs/PRODUCT_SPEC.md)
- [Enhanced UX Design](docs/ENHANCED_UX_DESIGN.md)
- [Hero UI Design Tokens](docs/HERO_UI_DESIGN_TOKENS.md)
- [Hero UI Components](docs/HERO_UI_COMPONENTS.md)
- [Setup Instructions](ottl-bin-ui/SETUP.md)

---

## Changelog

### v1.1 (November 1, 2025)
- ✨ Added FR-13: Direct Manipulation / WYSIWYG feature
- ✨ Introduced TemplateLibraryModal with curated templates (PII Protection Essentials, Cost Control Starter, HTTP Telemetry Cleanup)
- 📝 Created Hero UI design tokens documentation
- 📝 Created Hero UI components mapping
- 🎨 Initialized React + Vite + TypeScript project
- 🎨 Configured Tailwind CSS with Hero UI
- 🏗️ Implemented base layout structure
- 🏗️ Created AppShell and HeaderBar components

### v1.0 (October 31, 2025)
- 📝 Initial product specification
- 📝 Enhanced UX design documentation
- 📝 User journey documentation
- 📝 Visual mockups

---

## License

MIT

---

## Contact

For questions or support, please refer to the documentation or contact the product team.
