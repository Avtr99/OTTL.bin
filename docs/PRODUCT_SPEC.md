# OTTL.bin: Product Specification

**Version**: 1.1  
**Last Updated**: November 1, 2025  
**Status**: Draft for Review  
**Owner**: Product Team  

---

## Executive Summary

**OTTL.bin** is a visual transformation builder that makes the OpenTelemetry Transformation Language (OTTL) accessible to operators, SREs, and engineers without requiring deep YAML or DSL expertise. The product transforms a powerful but complex language into an intuitive, form-based interface while preserving full OTTL capabilities for advanced users.

**Problem**: OTTL has poor usability despite being the standard solution for telemetry transformation, data privacy, and cost optimization.

**Solution**: Visual, form-based builder with live preview, templates, and cost transparency.

**Target Users**: SREs, Platform Engineers, Security Officers, DevOps teams managing telemetry pipelines.

**Success Metrics**: 
- 90% task completion without documentation
- 80% faster than raw OTTL
- 50% average cost reduction for optimization users

---

## Product Overview

### 1.1 Vision

Enable anyone in an organization—from junior engineers to compliance officers—to safely and efficiently transform telemetry data without learning OTTL syntax.

### 1.2 Goals

**Primary Goals:**
1. Reduce time-to-first-transformation from 30 minutes to <3 minutes
2. Eliminate 95% of OTTL syntax errors
3. Make cost optimization accessible (achieve 40-70% savings)
4. Enable compliance workflows (GDPR, SOC2, PCI-DSS)

**Secondary Goals:**
1. Build template marketplace for best practices
2. Enable team collaboration on transformations
3. Provide A/B testing for transformation changes
4. Create audit trails for compliance

### 1.3 Non-Goals (Out of Scope for v1.0)

- Real-time transformation on production traffic (uses sample data only)
- Multi-tenant collaboration features
- Custom OTTL function development
- Integration with backends beyond Dash0 and OTel Collector
- Mobile app (responsive web only)

---

## User Personas

### Persona 1: Sarah - Site Reliability Engineer
- **Experience**: 2 years in ops, no OTTL knowledge
- **Goal**: Remove sensitive data from logs before external export
- **Pain Points**: Struggles with regex escaping in YAML, no way to test changes
- **Success Scenario**: Uploads logs → System detects passwords → One-click fix → Deploy

### Persona 2: Mike - Platform Engineer
- **Experience**: 5 years, some OTTL knowledge
- **Goal**: Reduce telemetry costs by 60%
- **Pain Points**: Takes hours to build sampling rules, no visibility into impact
- **Success Scenario**: Applies cost template → Customizes thresholds → Sees $10k/mo savings → Deploy

### Persona 3: Lisa - Security Officer
- **Experience**: Compliance expert, no technical background
- **Goal**: Ensure all logs are GDPR compliant
- **Pain Points**: Can't verify transformations, depends on engineering team
- **Success Scenario**: Selects GDPR template → Reviews transformations → Generates audit report → Certifies

### Persona 4: Alex - Staff Engineer
- **Experience**: 10 years, OTTL expert
- **Goal**: Build complex transformation pipeline quickly
- **Pain Points**: OTTL is verbose, hard to debug multi-step transformations
- **Success Scenario**: Uses visual builder for 80% → Raw OTTL for complex logic → Preview at each step

---

## Functional Requirements

### 3.1 Core Features (Must Have - v1.0)

#### FR-1: Pipeline Management
- **FR-1.1**: Create new transformation pipeline
- **FR-1.2**: Save pipeline with descriptive name
- **FR-1.3**: Load existing pipeline
- **FR-1.4**: Delete pipeline
- **FR-1.5**: Duplicate pipeline
- **FR-1.6**: Export pipeline as OTTL YAML
- **FR-1.7**: Import OTTL YAML (best-effort conversion to visual)

#### FR-2: Sample Data Management
- **FR-2.1**: Upload sample data (JSON, JSONL, OTLP formats)
- **FR-2.2**: Connect to live Dash0 data source
- **FR-2.3**: Limit samples to 1000 records maximum
- **FR-2.4**: Auto-detect telemetry type (traces/metrics/logs/profiles)
- **FR-2.5**: Display sample data statistics (record count, attribute count, size)

#### FR-3: Transformation Catalog
Support 34 transformation types across 6 categories:

**FR-3.1 Attribute Operations (Must Have)**
- Add static attribute
- Derive from substring
- Concatenate multiple attributes
- Split and extract
- Case conversion (snake_case, camelCase, etc.)
- Copy between scopes

**FR-3.2 Parsing & Extraction (Must Have)**
- Parse JSON body
- Parse XML body
- Extract regex patterns
- Parse user agent strings

**FR-3.3 Privacy & Masking (Must Have)**
- Mask with pattern
- Hash attributes (SHA256, Murmur3, MD5)
- Redact with wildcards
- Partial masking

**FR-3.4 Filtering & Cost Control (Must Have)**
- Drop by condition
- Sample telemetry (smart/random/deterministic)
- Limit attribute count
- Truncate values
- Delete specific attributes
- Keep only listed attributes

**FR-3.5 Metric-Specific (Should Have)**
- Convert metric type
- Set metric metadata
- Datapoint operations
- Scale values

**FR-3.6 Advanced Operations (Should Have)**
- Type conversions
- Array operations
- Format strings
- Body remapping
- Custom OTTL editor

#### FR-4: Visual Transformation Editor
- **FR-4.1**: Each transformation is a card with drag handle
- **FR-4.2**: Cards show summary when collapsed
- **FR-4.3**: Cards expand to full form editor
- **FR-4.4**: Form validation with inline errors
- **FR-4.5**: Context selector (resource/span/log/datapoint)
- **FR-4.6**: Error mode selector (ignore/propagate/silent)
- **FR-4.7**: Conditional execution builder (where clauses)

#### FR-5: Sequential Preview System
- **FR-5.1**: Preview after any step in pipeline
- **FR-5.2**: Before/after comparison view
- **FR-5.3**: Side-by-side diff view
- **FR-5.4**: Highlight changed attributes
- **FR-5.5**: Show impact metrics (records affected, size change)
- **FR-5.6**: Navigate through sample records
- **FR-5.7**: Export preview state as JSON

#### FR-6: Drag-and-Drop Reordering
- **FR-6.1**: Drag transformation cards to reorder
- **FR-6.2**: Visual drop indicator
- **FR-6.3**: Update step numbers automatically
- **FR-6.4**: Invalidate preview cache on reorder

#### FR-7: Transformation Controls
- **FR-7.1**: Toggle transformation on/off (checkbox)
- **FR-7.2**: Edit transformation (opens form)
- **FR-7.3**: Duplicate transformation
- **FR-7.4**: Delete transformation (with confirmation)
- **FR-7.5**: Convert to raw OTTL
- **FR-7.6**: Add transformation from catalog

#### FR-8: Template Library
- **FR-8.1**: Browse templates by category (Security, Cost, Quality)
- **FR-8.2**: Preview template transformations
- **FR-8.3**: Apply template to pipeline
- **FR-8.4**: Customize after application
- **FR-8.5**: Save custom template
- **FR-8.6**: Export/import templates

**Required Templates (v1.0):**
- PII Masking (GDPR)
- Credential Sanitization
- High-Volume Sampling
- Attribute Cleanup
- Span Normalization

#### FR-9: Cost & Impact Analysis
- **FR-9.1**: Estimate storage reduction per transformation
- **FR-9.2**: Calculate monthly cost savings
- **FR-9.3**: Show record count changes
- **FR-9.4**: Display attribute count changes
- **FR-9.5**: Visualize volume reduction (bar charts)

#### FR-10: Smart Detection & Suggestions
- **FR-10.1**: Analyze sample data on upload
- **FR-10.2**: Detect sensitive data (passwords, emails, IPs)
- **FR-10.3**: Detect high attribute counts
- **FR-10.4**: Detect large values
- **FR-10.5**: Suggest one-click fixes
- **FR-10.6**: Dismiss suggestions

#### FR-11: Export & Deployment
- **FR-11.1**: Export as OTTL YAML (transform processor config)
- **FR-11.2**: Export as JSON (for API integration)
- **FR-11.3**: Copy to clipboard
- **FR-11.4**: Download as file
- **FR-11.5**: Deploy to Dash0 (integration)
- **FR-11.6**: Deploy to OTel Collector (webhook/API)

#### FR-12: Raw OTTL Escape Hatch
- **FR-12.1**: Add custom OTTL statement anywhere in pipeline
- **FR-12.2**: Syntax highlighting (Monaco editor)
- **FR-12.3**: Real-time syntax validation
- **FR-12.4**: Autocomplete for OTTL functions
- **FR-12.5**: Error highlighting with line numbers
- **FR-12.6**: Test custom OTTL on sample data

### 3.2 Enhanced Features (Should Have - v1.5)

#### FR-13: Direct Manipulation / WYSIWYG
Transform preview data interactively through direct manipulation.

- **FR-13.1**: Right-click context menu on preview values
- **FR-13.2**: Quick actions for simple transformations:
  - Mask Value (immediate)
  - Hash Value (SHA256, Murmur3, MD5)
  - Delete Attribute (immediate)
  - Redact Value (immediate)
- **FR-13.3**: Highlight selection for substring extraction
- **FR-13.4**: Auto-configure transformation cards from preview
- **FR-13.5**: Pre-fill forms with source attribute and detected patterns
- **FR-13.6**: Visual feedback showing where card was inserted
- **FR-13.7**: Keyboard shortcuts for common actions
- **FR-13.8**: Undo/redo for quick actions
- **FR-13.9**: Onboarding tooltip: "💡 Try right-clicking values"

**Supported Transformations (Phase 2):**
- Mask Value → Creates masking transformation
- Hash Value → Creates hashing transformation  
- Delete Attribute → Creates delete transformation
- Copy Value → Copies to clipboard (utility)
- Inspect → Opens attribute detail view

**Advanced Actions (Phase 3):**
- Extract Pattern → Opens form with pre-filled regex
- Parse JSON → Detects JSON strings, suggests parsing
- Split Attribute → Highlights delimiter, suggests split
- Convert Type → Detects type mismatch, suggests conversion

**User Experience:**
```
User sees: "password": "secret123" in preview
User right-clicks → Selects "Mask Value"
System creates: Mask transformation card at current step
Preview updates: "password": "***"
```

**Success Metrics:**
- % transformations created via WYSIWYG: Target >30%
- Time-to-first-transformation: <60 seconds
- Feature discovery rate: >60% of users try it
- Error rate: <5% invalid transformations

#### FR-14: Collaboration
- Share pipelines via link
- Comment on transformation steps
- Version history with rollback
- Team templates

#### FR-15: A/B Testing
- Deploy to percentage of traffic
- Compare metrics before/after
- Automatic rollback on errors
- Gradual rollout (10% → 50% → 100%)

#### FR-16: AI-Powered Suggestions
- Analyze telemetry and recommend optimizations
- Natural language transformation builder
- Anomaly detection in preview

### 3.3 Future Features (Nice to Have - v2.0)

#### FR-17: Advanced Features
- Multi-pipeline orchestration
- Conditional branching (if/else)
- Loop over arrays
- External data enrichment
- Custom function library

---

## Technical Requirements

### 4.1 Performance

**TR-1: Response Times**
- Page load: <2 seconds
- Transformation save: <500ms
- Preview generation: <3 seconds for 1000 records
- Export YAML: <1 second

**TR-2: Scalability**
- Support up to 1000 sample records
- Support up to 50 transformations per pipeline
- Handle attributes up to 1MB per record
- Process 100 concurrent users

**TR-3: Browser Support**
- Chrome 90+ (primary)
- Firefox 88+
- Safari 14+
- Edge 90+
- No IE11 support

### 4.2 Data & Storage

**TR-4: Data Management**
- Sample data stored client-side (IndexedDB) up to 50MB
- Pipelines stored in backend database
- No PII stored server-side (samples processed client-side)
- Automatic cleanup of old samples after 7 days

**TR-5: Export Formats**
- OTTL YAML (OpenTelemetry standard)
- JSON (API-compatible)
- Human-readable markdown (documentation)

### 4.3 Security

**TR-6: Security Requirements**
- All API calls over HTTPS
- Authentication required (OAuth 2.0)
- RBAC for pipeline management
- Audit logging for all changes
- No execution of arbitrary code
- Sample data encrypted at rest
- XSS protection on all inputs

### 4.4 Validation

**TR-7: Validation Layers**
- Client-side form validation (immediate feedback)
- Preview validation (test on samples)
- Server-side OTTL syntax validation
- Deployment dry-run option

**TR-8: Error Handling**
- User-friendly error messages
- Suggestions for common mistakes
- Link to documentation
- Recovery options (undo, reset)

### 4.5 Accessibility

**TR-9: WCAG 2.1 AA Compliance**
- Keyboard navigation for all features
- Screen reader support (ARIA labels)
- Color contrast ratios ≥4.5:1
- Focus indicators visible
- No flashing content

### 4.6 Responsive Design

**TR-10: Device Support**
- Desktop: 1280px+ (primary experience)
- Tablet: 768px-1279px (optimized)
- Mobile: 320px-767px (basic functionality)
- Touch-friendly controls (44px min target size)

---

## User Interface Specifications

### 5.1 Layout Structure

```
┌─────────────────────────────────────────┐
│ Header: Logo, Templates, Export, User  │
├─────────────────────────────────────────┤
│ Pipeline Info: Name, Telemetry Type    │
├─────────────────────────────────────────┤
│ Input Section: Sample data stats       │
├─────────────────────────────────────────┤
│ Transformations: Card list (vertical)  │
├─────────────────────────────────────────┤
│ Output Section: Final stats & impact   │
├─────────────────────────────────────────┤
│ Actions: Preview, Export, Deploy       │
└─────────────────────────────────────────┘
```

### 5.2 Color Palette

**Primary Colors:**
- Brand Blue: `#3B82F6` (actions, links)
- Success Green: `#10B981` (additive operations)
- Warning Yellow: `#F59E0B` (privacy/security)
- Danger Red: `#EF4444` (destructive operations)

**Semantic Colors:**
- Purple: `#A855F7` (parsing operations)
- Orange: `#F97316` (cost-related)
- Gray: `#6B7280` (metric-specific)

**Neutrals:**
- Background: `#F9FAFB`
- Card: `#FFFFFF`
- Border: `#E5E7EB`
- Text Primary: `#111827`
- Text Secondary: `#6B7280`

### 5.3 Typography

**Font Family:**
- UI: Inter (Google Fonts)
- Code: JetBrains Mono

**Sizes:**
- H1: 24px / 600 weight
- H2: 20px / 600 weight
- H3: 16px / 600 weight
- Body: 14px / 400 weight
- Small: 12px / 400 weight
- Code: 13px / 400 weight

### 5.4 Spacing

- Unit: 4px
- Card padding: 16px (4 units)
- Section spacing: 24px (6 units)
- Element gap: 12px (3 units)
- Tight spacing: 8px (2 units)

### 5.5 Components

**Transformation Card:**
- Height: Auto (min 60px collapsed)
- Border radius: 8px
- Shadow: `0 1px 3px rgba(0,0,0,0.1)`
- Hover: `0 4px 6px rgba(0,0,0,0.1)`

**Buttons:**
- Primary: Blue background, white text
- Secondary: White background, blue border
- Danger: Red background, white text
- Height: 40px
- Border radius: 6px

**Form Inputs:**
- Height: 40px
- Border: 1px solid `#E5E7EB`
- Border radius: 6px
- Focus: 2px blue outline

### 5.6 Animations

**Transitions:**
- Card expand/collapse: 200ms ease-out
- Drag-and-drop: 150ms ease-in-out
- Button hover: 100ms ease
- Focus ring: instant

**Loading States:**
- Skeleton loaders for data
- Spinner for async operations
- Progress bar for preview generation

---

## User Flows

### 6.1 First-Time User Flow (Novice)

```
1. Landing → Upload sample data
2. System analyzes → Shows detected issues
3. User clicks "Auto-Fix" → Masking rule created
4. Preview shows before/after → User verifies
5. Click "Deploy" → Success confirmation
```

**Time**: 2-3 minutes  
**Steps**: 5  
**Decisions**: 2 (accept suggestions, deploy)

### 6.2 Template Application Flow (Intermediate)

```
1. Click "Templates" → Browse catalog
2. Select "Cost Optimization" → Preview transformations
3. Click "Apply" → Added to pipeline
4. Customize thresholds → Update sample rate
5. Preview impact → See $10k/mo savings
6. Deploy with monitoring → Gradual rollout
```

**Time**: 10-15 minutes  
**Steps**: 6  
**Decisions**: 3 (template, customization, deploy)

### 6.3 Custom Pipeline Flow (Expert)

```
1. Start blank pipeline → Add first transformation
2. Configure → Fill form (or write raw OTTL)
3. Preview → Verify on samples
4. Add more transformations → Reorder as needed
5. Test edge cases → Toggle on/off to debug
6. Save as template → Share with team
7. Deploy to production → Monitor metrics
```

**Time**: 20-30 minutes  
**Steps**: 7+  
**Decisions**: Multiple

### 6.4 Compliance Workflow (Security Officer)

```
1. Select "GDPR Compliance" template
2. Review each transformation → Understand what it does
3. Add custom rule → Credit card masking
4. Test on sample data → Verify compliance
5. Generate audit report → PDF with evidence
6. Deploy and certify → Compliance proof
```

**Time**: 15-20 minutes  
**Steps**: 6  
**Output**: Audit-ready documentation

---

## Success Metrics & KPIs

### 7.1 Usability Metrics

**Primary:**
- **Task Completion Rate**: ≥90% without documentation
- **Time to First Transformation**: <3 minutes (baseline: 30 min)
- **Error Rate**: <5% invalid configurations
- **User Satisfaction**: ≥4.5/5 rating

**Secondary:**
- Form field error rate: <10%
- Preview usage: >80% of users
- Template adoption: >60% start from template
- Raw OTTL usage: <20% of transformations

### 7.2 Business Metrics

**Cost Impact:**
- Average cost reduction: 50% for optimization users
- Median monthly savings: $5,000
- ROI: 10x within 12 months

**Adoption:**
- Weekly active users: 1,000+ (6 months)
- Pipelines created: 10,000+ (12 months)
- Templates applied: 20,000+ (12 months)

**Efficiency:**
- 80% faster than raw OTTL
- 95% fewer syntax errors
- 3x faster iteration cycles

### 7.3 Product Health Metrics

- System uptime: 99.9%
- Page load time: p95 <2s
- Preview generation: p95 <5s
- Error rate: <0.1%

---

## Dependencies & Integrations

### 8.1 External Dependencies

**Required:**
- Dash0 API (data source, deployment target)
- OpenTelemetry Collector (deployment target)
- OTTL Parser Library (syntax validation)

**Optional:**
- GitHub (template marketplace)
- Slack (deployment notifications)
- DataDog/New Relic (monitoring integrations)

### 8.2 Technology Stack

**Frontend:**
- React 18+
- TypeScript 5+
- Vite (build tool)
- Shadcn/ui + Radix UI (components)
- TailwindCSS (styling)
- Monaco Editor (code editor)
- @dnd-kit/core (drag-and-drop)
- Zustand (state management)
- React Query (API calls)

**Backend:**
- Node.js 20+ / Go (TBD)
- PostgreSQL (pipeline storage)
- Redis (caching)
- WebAssembly (OTTL validation)

**Infrastructure:**
- AWS/GCP (TBD)
- Docker + Kubernetes
- CDN for static assets
- S3 for exports

### 8.3 API Endpoints

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

## Development Phases

### 9.1 Phase 1: MVP (6-8 weeks)

**Goal**: Core functionality for early adopters

**Deliverables:**
- Pipeline CRUD
- 15 core transformations (add, remove, mask, parse JSON, drop, sample)
- Basic preview (before/after)
- OTTL export
- 3 templates (PII Masking, Cost Optimization, Basic Cleanup)
- Sample data upload

**Team**: 2 Frontend, 1 Backend, 1 Designer

### 9.2 Phase 2: Enhanced (6-8 weeks)

**Goal**: Full feature set

**Deliverables:**
- All 34 transformations
- Sequential preview with diff view
- Direct Manipulation / WYSIWYG (simple actions)
- Advanced templates (10 total)
- Cost estimation
- Smart detection & suggestions
- Deployment integration (Dash0)
- Raw OTTL editor
- Mobile-optimized UI

**Team**: 2 Frontend, 1 Backend, 1 Designer, 1 QA

### 9.3 Phase 3: Scale & Polish (8-12 weeks)

**Goal**: Production-ready

**Deliverables:**
- Collaboration features
- A/B testing framework
- Template marketplace
- Performance optimization
- Comprehensive documentation
- Integration tests
- Security audit
- User onboarding flow

**Team**: 3 Frontend, 2 Backend, 1 Designer, 1 QA, 1 DevOps

---

## Risk Assessment

### 10.1 Technical Risks

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| OTTL validation complexity | Medium | High | Use official OTTL parser, WebAssembly wrapper |
| Preview performance on large datasets | Medium | Medium | Limit to 1000 samples, Web Workers |
| Browser compatibility issues | Low | Medium | Automated cross-browser testing |
| State management complexity | Medium | Medium | Use proven library (Zustand), clear architecture |

### 10.2 Product Risks

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Users need features not in forms | Medium | High | Raw OTTL escape hatch, feature prioritization |
| Template library insufficient | Medium | Medium | User research, analytics on usage patterns |
| Adoption slower than expected | Low | High | Strong onboarding, clear value proposition |
| Cost estimation inaccurate | Medium | Low | Under-promise, iterate based on feedback |
| WYSIWYG feature not discoverable | Medium | Low | Onboarding tooltips, A/B testing, keyboard shortcuts |

### 10.3 Business Risks

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Competitive solution launched | Low | High | Fast iteration, strong IP, user lock-in |
| Integration maintenance burden | Medium | Medium | Clear API contracts, automated testing |
| Support ticket volume | Medium | Medium | Self-service docs, in-app help, templates |

---

## Open Questions

1. **Pricing Model**: Free tier? Per-pipeline? Per-user? Part of Dash0 platform?
2. **Deployment Targets**: Which observability backends to support beyond Dash0?
3. **Multi-tenancy**: Org-level vs personal pipelines?
4. **Data Residency**: Where to store pipelines for compliance?
5. **Mobile Strategy**: Progressive Web App or native apps in future?
6. **AI Features**: Priority and timeline for ML-based suggestions?
7. **On-Premise**: Demand for self-hosted version?

---

## Approval & Sign-off

| Role | Name | Date | Signature |
|------|------|------|-----------|
| Product Manager | | | |
| Engineering Lead | | | |
| Design Lead | | | |
| Security Officer | | | |
| CTO | | | |

---

## Appendices

### A. Glossary

- **OTTL**: OpenTelemetry Transformation Language
- **OTel**: OpenTelemetry
- **Span**: A unit of work in distributed tracing
- **Datapoint**: A single metric measurement
- **Resource**: Metadata about telemetry source
- **Cardinality**: Number of unique values in a dimension

### B. References

- [OpenTelemetry Transform Processor](https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/main/processor/transformprocessor)
- [OTTL Language Specification](https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/main/pkg/ottl)
- [Original Design Documents](./ENHANCED_UX_DESIGN.md)

### C. Revision History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2025-10-31 | Product Team | Initial draft |
| 1.1 | 2025-11-01 | Product Team | Added FR-13: Direct Manipulation / WYSIWYG feature for Phase 2 |

---

**End of Specification**
