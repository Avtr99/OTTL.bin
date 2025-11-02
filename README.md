
# OTTL.bin: The Visual Telemetry Transformation Builder

**OTTL.bin is a visual, form-based interface that makes the OpenTelemetry Transformation Language (OTTL) accessible to everyone.**

![OTTL.bin Hero Image](https://via.placeholder.com/1200x600.png?text=OTTL.bin+UI+Screenshot)

[![Build Status](https://img.shields.io/badge/build-passing-brightgreen)](https://github.com/git-user/OTTL.bin)
[![License](https://img.shields.io/badge/license-MIT-blue)](https://opensource.org/licenses/MIT)
[![Version](https://img.shields.io/badge/version-1.1-orange)](https://github.com/git-user/OTTL.bin)

---

## Introduction

The OpenTelemetry Transformation Language (OTTL) is a powerful tool for manipulating telemetry data, but its steep learning curve and complex syntax can be a barrier for many users. OTTL.bin solves this problem by providing an intuitive, visual interface for building, testing, and deploying OTTL transformations.

Whether you're a seasoned SRE, a security-conscious engineer, or a cost-savvy operator, OTTL.bin empowers you to transform your telemetry data with confidence and ease.

## Key Features

- **Visual Transformation Builder**: Create complex transformation pipelines using a simple, form-based interface. No YAML or DSL knowledge required.
- **Live Preview**: See the real-time impact of your transformations on your data before you deploy.
- **Smart Suggestions**: Automatically detect potential issues in your telemetry data and get one-click suggestions for fixes.
- **Cost & Impact Analysis**: Understand the cost and performance implications of your transformations before they hit production.
- **Template Library**: Get started quickly with pre-built templates for common use cases like PII masking, cost optimization, and data normalization.
- **Raw OTTL Escape Hatch**: Drop into a raw OTTL editor at any time for advanced use cases and maximum flexibility.
- **Drag-and-Drop Reordering**: Easily reorder transformations in your pipeline to get the logic just right.

## Live Demo

Experience the power of OTTL.bin for yourself in our live demo:

[**Launch Live Demo**](http://localhost:5173)

*(Note: The live demo is running locally on your machine.)*

## Getting Started

### Prerequisites

- Node.js 18+
- npm, yarn, or pnpm

### Installation

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/git-user/OTTL.bin.git
    cd OTTL.bin/ottl-bin-ui
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    ```

3.  **Start the development server:**
    ```bash
    npm run dev
    ```

The application will be available at `http://localhost:5173`.

## Technology Stack

- **Frontend**: React 19, TypeScript 5
- **UI Library**: Hero UI 2.8.5
- **Styling**: Tailwind CSS 3.4
- **State Management**: Zustand
- **Data Fetching**: React Query
- **Drag & Drop**: @dnd-kit
- **Code Editor**: Monaco Editor

## Documentation

For more detailed information about the project, please see our comprehensive documentation:

- [**Master Documentation Index**](documentation.md)
- [**Consolidated UX & Design Specification**](docs/CONSOLIDATED_UX_DESIGN.md)
- [**Product Specification**](docs/PRODUCT_SPEC.md)

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.

## Contact

For questions, support, or to get involved with the project, please [open an issue](https://github.com/git-user/OTTL.bin/issues) on our GitHub repository.
