
# OTTL.bin: Consolidated UX & Design Specification

## 1. Core Philosophy & User Experience

OTTL.bin is a form-based, wizard-style interface for building OTTL transformations. It prioritizes an intuitive, tactile experience that makes telemetry transformation accessible to all skill levels, from novices to experts.

### 1.1. Design Principles

- **Progressive Complexity**: The UI starts simple and reveals complexity only when needed. Novices can use visual editors and templates, while experts can access raw OTTL.
- **Context-Aware Interface**: The UI adapts based on the type of telemetry data (traces, metrics, logs, profiles), showing only relevant options and smart defaults.
- **Live Visual Feedback**: Users see a live preview of their transformation results after each step, including the impact on data and cost.
- **Error Prevention**: The system includes multiple layers of validation to prevent errors before they happen.
- **Escape Hatch**: Advanced users can always drop into a raw OTTL editor for complex or unsupported scenarios.

### 1.2. User Journeys

- **First-Time User (No OTTL Knowledge)**:
  1. Upload sample data.
  2. The system analyzes the data and suggests fixes (e.g., "Sensitive data detected").
  3. User clicks "Auto-Fix" to apply a pre-built transformation.
  4. User previews the before/after results and deploys with one click.
  - **Time to complete**: ~2 minutes.

- **Cost Optimization Expert**:
  1. Connect to live data to see current costs.
  2. Apply a "High-Volume Sampling" template.
  3. Customize the rules and thresholds to meet specific needs.
  4. Review the projected cost savings.
  5. A/B test the new configuration before full deployment.
  - **Time to complete**: ~10 minutes.

- **Compliance Officer**:
  1. Select a "GDPR Compliance" template.
  2. Review the pre-configured transformations (e.g., email hashing, IP masking).
  3. Add a custom rule for credit card redaction.
  4. Generate an audit trail report.
  5. Deploy the configuration to ensure compliance.
  - **Time to complete**: ~15 minutes.

## 2. Complete Transformation Catalog

OTTL.bin provides visual editors for over 34 different OTTL transformation types, categorized for clarity:

| Category | Color | Transformation Types |
|---|---|---|
| **Attribute Operations** | 🟢 Green | Add Static Attribute, Derive from Substring, Concatenate, Split & Extract, Case Conversion, Copy Between Scopes |
| **Parsing & Extraction** | 🟣 Purple | Parse JSON, Parse XML, Extract Regex Patterns, Parse User Agent |
| **Privacy & Masking** | 🟡 Yellow | Mask with Pattern, Hash Attributes, Redact with Wildcards, Partial Masking |
| **Filtering & Cost Control** | 🟠 Orange | Drop by Condition, Sample Telemetry, Limit Attribute Count, Truncate Values |
| **Deletion** | 🔴 Red | Delete Specific Attributes, Keep Only Listed, Remove by Pattern |
| **Metric-Specific** | ⚙️ Gray | Convert Metric Type, Set Metric Metadata, Datapoint Operations, Scale Values |
| **Formatting & Presentation** | 🎨 | Format Strings, Format Timestamps, Normalize Units, Sort Arrays |
| **Advanced Operations** | 🔧 | Type Conversion, Body Remapping, Severity Adjustment, Cache Variables, Custom OTTL |

## 3. Key UI Patterns & Components

### 3.1. Main Dashboard

The main dashboard provides a high-level overview of the transformation pipeline, including:
- Input and output data summaries.
- A list of transformation cards.
- Estimated cost savings.
- Options to preview, export, and deploy the pipeline.

```
┌────────────────────────────────────────────────────────────────────┐
│ OTTL.bin                    [Templates ▼] [Export ▼] [@Profile]  │
├────────────────────────────────────────────────────────────────────┤
│  Pipeline: "Production Log Cleanup"         [Telemetry: Logs ▼]   │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│  📥 INPUT                    250 log records                       │
│  └─ Source: app-logs.json   Uploaded 2 minutes ago                │
│  ┌──────────────────── TRANSFORMATIONS ─────────────────────┐     │
│  │  [⋮] [✓] 1. 🟣 Parse JSON Body                           │     │
│  │  [⋮] [✓] 2. 🟡 Hash Email Addresses                      │     │
│  │  [⋮] [✓] 3. 🟠 Drop Health Checks                        │     │
│  │  [+ Add Transformation]  [📚 Browse Templates]           │     │
│  └────────────────────────────────────────────────────────────┘     │
│  📤 OUTPUT                   205 log records                       │
│  └─ Records: -45 (18% reduction)                                  │
│     💰 Estimated savings: $275/month                               │
│  [▶ Preview Pipeline] [Export YAML] [Deploy to Dash0]            │
└────────────────────────────────────────────────────────────────────┘
```

### 3.2. Transformation Card

Each transformation is represented by a draggable card that summarizes its configuration and impact.

```
┌────────────────────────────────────────────┐
│ [⋮] [✓] 1. Mask Passwords         [⚙️][×]│
├────────────────────────────────────────────┤
│ Pattern: password=VALUE                    │
│ In: process.command_line                   │
│ 📊 23/250 records • <1% size change        │
│ [Expand for Details ▼]                    │
└────────────────────────────────────────────┘
```

### 3.3. Live Preview System

The live preview panel shows the effect of each transformation step on the sample data.

```
┌──────────────── PREVIEW ────────────────────┐
│ View: [Step 2 of 5 ▼] [Before/After ▼]    │
├────────────────────────────────────────────┤
│ Sample 1 of 250    [◄ Prev] [Next ►]      │
│                                             │
│ BEFORE              AFTER                  │
│ password=secret123  password=******** ✓    │
│ user@email.com      a3c5f2e8... ✓          │
│ 47 attributes       5 attributes ✓         │
│                                             │
│ [▶ Replay All Steps] [Export Sample]       │
└─────────────────────────────────────────────┘
```

### 3.4. Template Library

The template library provides pre-built solutions for common use cases like security, cost optimization, and data quality.

```
┌─────────── TEMPLATES ───────────┐
│ 🔒 Security & Compliance        │
│ ├─ PII Masking (GDPR) ⭐       │
│ ├─ Credential Sanitization      │
│                                  │
│ 💰 Cost Optimization            │
│ ├─ High-Volume Sampling ⭐      │
│ ├─ Attribute Cleanup            │
│                                  │
│ [+ Create Custom Template]      │
└──────────────────────────────────┘
```

### 3.5. Smart Suggestions

The system proactively analyzes uploaded data and suggests one-click fixes for common issues.

```
┌─────────────────────────────────────────┐
│ 💡 Detected Issues:                     │
│                                          │
│ ⚠️  Sensitive Data Found                │
│     23 logs contain passwords           │
│     [Auto-Fix] [Configure] [Ignore]     │
│                                          │
│ 📊 High Attribute Count                 │
│     Avg 67 attrs (recommended: <20)     │
│     [Optimize] [Keep As-Is]             │
└─────────────────────────────────────────┘
```

## 4. Visual Design System (Dark Observatory Refresh)

| Token | Value | Usage |
|---|---|---|
| `background` | `#12121B` | Primary viewport background |
| `surface` | `#1B1F2B` | Cards, navigation shell |
| `border` | `#2B3142` | Default border color |
| `text-primary` | `#F3F4F6` | High-contrast copy |
| `text-secondary` | `#9CA3B5` | Muted copy, helper text |
| `primary` | `#7C6CFF` | Primary actions, hero chips |
| `secondary` | `#F97316` | Secondary actions, accent badges |
| `success` | `#10B981` | Positive state chips |
| `warning` | `#FBBF24` | Warning chips, impact banners |
| `danger` | `#EF4444` | Error state warnings |

- **Typography**: `Inter` for UI text, `JetBrains Mono` for code.
- **Spacing**: 4px grid system.
- **Iconography**: Lucide Icons.

## 5. Technical Implementation

### 5.1. Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Frontend Application                     │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ Transformation│  │   Preview    │  │    OTTL      │      │
│  │    Builder   │─→│   Engine     │←→│   Compiler   │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                        Backend API                           │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │   OTTL       │  │  Validation  │  │   Telemetry  │      │
│  │ Validator    │  │   Service    │  │   Sampler    │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
```

### 5.2. Technology Stack

- **Frontend**: React 18 + TypeScript
- **UI Components**: Hero UI (or a similar library like Shadcn/ui)
- **Styling**: TailwindCSS
- **State Management**: Zustand or Jotai
- **Code Editor**: Monaco Editor
- **Drag & Drop**: @dnd-kit/core

### 5.3. Performance & Security

- **Performance**: Caching, debouncing, virtual scrolling, and Web Workers are used to ensure a responsive UI.
- **Security**: Input sanitization, Regex DoS protection, and OTTL injection prevention are implemented to protect against vulnerabilities.

## 6. Success Metrics

- **Usability**:
  - First transformation created in < 3 minutes.
  - < 5% invalid configurations.
  - 4.5+ user satisfaction rating.
- **Business Impact**:
  - 50% average cost reduction for users.
  - 80% faster transformation creation compared to raw OTTL.
  - 95% fewer errors in production.
