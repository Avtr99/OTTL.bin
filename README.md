# OTTL.bin: The Visual Telemetry Transformation Builder

**OTTL.bin is a visual, form-based interface that makes the OpenTelemetry Transformation Language (OTTL) accessible to everyone.**

[![License](https://img.shields.io/badge/license-MIT-blue)](https://opensource.org/licenses/MIT)

---

## Introduction

The OpenTelemetry Transformation Language (OTTL) is a powerful tool for manipulating telemetry data, but its steep learning curve and complex syntax can be a barrier for many users. OTTL.bin solves this problem by providing an intuitive, visual interface for building, testing, and deploying OTTL transformations.

Whether you're a beginner with no OTTL knowledge, an intermediate user exploring transformations, or a pro writing custom OTTL—OTTL.bin has you covered.

## Key Features

- **Visual Transformation Builder**: Create transformation pipelines using a form-based interface. No YAML or DSL knowledge required.
- **Live Preview with OTTL Interpreter**: See real-time before/after diffs as you build. Custom OTTL edits are applied to the preview instantly.
- **Auto-Detection**: Upload telemetry samples and get smart suggestions for sensitive data masking, high-cardinality cleanup, and more.
- **Transformation Catalog**: 14 transformation types across Privacy, Deletion, Filtering, Parsing, Attribute, and Metric categories.
- **Raw OTTL Editor**: Monaco-based editor with YAML syntax highlighting and validation for pro users.
- **OTTL Export**: Generate valid OpenTelemetry Collector YAML configuration ready for deployment.
- **Drag-and-Drop Pipeline**: Reorder transformations, toggle on/off, and preview at any step.

## Supported OTTL Functions (Interpreter)

The built-in OTTL interpreter supports these functions for live preview:

### Editors (mutating)
| Function | Description |
|----------|-------------|
| `set` | Set attribute values (strings, numbers, booleans) |
| `delete_key` | Delete attributes by key |
| `replace_pattern` | Regex-based find/replace |
| `keep_keys` | Keep only specified attributes |
| `truncate_all` | Truncate long string values |
| `limit` | Limit attribute count |
| `drop` | Mark records for dropping |

### Converters (pure functions)
| Function | Description |
|----------|-------------|
| `Concat` | Join values with separator |
| `Split` | Split strings and index |
| `Substring` | Extract substring by position and length |
| `ParseJSON` | Parse JSON strings |
| `SHA256` | Hash values (preview uses simple hash) |
| `IsMatch` | Regex condition matching |
| `ToUpperCase` | Convert string to uppercase |
| `ToLowerCase` | Convert string to lowercase |
| `ConvertCase` | Convert case (upper, lower, snake, camel) |
| `Now` | Current timestamp (ISO format) |
| `UnixNano` | Nanoseconds since epoch |
| `Int` | Convert to integer |
| `Double` | Convert to float |
| `String` | Convert to string |
| `Len` | Length of string or array |
| `UUID` | Generate random UUID |

## Getting Started

### Prerequisites

- Node.js 20.19+ or 22.12+
- npm, yarn, or pnpm

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/Avtr99/OTTL.bin.git
   cd OTTL.bin/ottl-bin-ui
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Start the development server:**
   ```bash
   npm run dev
   ```

The application will be available at `http://localhost:5173`.

### Build for Production

```bash
npm run build
```

## Technology Stack

- **Frontend**: React 19, TypeScript 5.8
- **UI Library**: HeroUI 2.8
- **Styling**: Tailwind CSS 4.1
- **Code Editor**: Monaco Editor
- **Drag & Drop**: @dnd-kit
- **Build Tool**: Vite 7

## Project Structure

```
ottl-bin-ui/
├── src/
│   ├── components/       # UI components
│   │   ├── modals/       # AddTransformationModal, etc.
│   │   ├── ottl/         # RawOttlEditorModal, OttlPreview
│   │   └── preview/      # LivePreviewPanel, AttributeContextMenu
│   ├── utils/
│   │   ├── ottlInterpreter.ts    # OTTL parser & interpreter
│   │   ├── otlpParser.ts         # OTLP JSON parser
│   │   ├── autoDetectTransformations.ts  # Smart detection rules
│   │   └── ottlGenerator.ts      # YAML config generator
│   └── App.tsx           # Main application
└── docs/                 # Product spec, UX design, user journeys
```

## Usage

1. **Upload** a telemetry sample (JSON format—traces, logs, or metrics)
2. **Review** auto-detected transformation suggestions
3. **Add** transformations from the catalog or write custom OTTL
4. **Preview** before/after diffs in real-time
5. **Export** the generated OTTL YAML for your OpenTelemetry Collector

## Documentation

- [Product Specification](docs/PRODUCT_SPEC.md)
- [UX Design](docs/CONSOLIDATED_UX_DESIGN.md)
- [User Journeys](docs/USER_JOURNEYS.md)
- [Gap Analysis](docs/USER_JOURNEY_GAP_ANALYSIS.md)

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.

## Contributing

Contributions are welcome! Please open an issue or submit a pull request.
