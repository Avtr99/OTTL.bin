# OTLP JSON Upload Guide

## Overview
The OTTL Transformation UI now supports uploading OpenTelemetry Protocol (OTLP) JSON files directly. This allows you to:

1. Upload real telemetry data from your OpenTelemetry collectors
2. Visualize transformations on actual production data
3. Test OTTL statements against realistic payloads

## Supported Formats

### 1. OTLP JSON (OpenTelemetry Protocol)
Standard OTLP export format with `resourceSpans`, `resourceLogs`, or `resourceMetrics`:

```json
{
  "resourceSpans": [
    {
      "resource": {
        "attributes": [
          { "key": "service.name", "value": { "stringValue": "frontend" } }
        ]
      },
      "scopeSpans": [
        {
          "scope": { "name": "tracer" },
          "spans": [
            {
              "name": "GET /api",
              "traceId": "abc123",
              "spanId": "def456",
              "attributes": [
                { "key": "http.method", "value": { "stringValue": "GET" } }
              ]
            }
          ]
        }
      ]
    }
  ]
}
```

### 2. Flat JSON Array
Simple array of telemetry records:

```json
[
  { "trace.id": "abc123", "span.name": "GET /api", "http.method": "GET" },
  { "trace.id": "def456", "span.name": "POST /data", "http.method": "POST" }
]
```

### 3. JSONL (JSON Lines)
One JSON object per line:

```
{"trace.id": "abc123", "span.name": "GET /api"}
{"trace.id": "def456", "span.name": "POST /data"}
```

### 4. Key=Value Format
Space-separated key=value pairs:

```
trace.id=abc123 span.name="GET /api" http.method=GET
trace.id=def456 span.name="POST /data" http.method=POST
```

## How It Works

### OTLP Parsing
The parser (`src/utils/otlpParser.ts`) automatically:

1. **Detects OTLP format** by checking for `resourceSpans`, `resourceLogs`, or `resourceMetrics`
2. **Flattens nested structures** into dot-notation keys:
   - Resource attributes → `resource.{key}`
   - Scope attributes → `scope.{key}`
   - Span attributes → `span.attributes.{key}`
   - Core span fields → `trace.id`, `span.id`, `span.name`, etc.

3. **Extracts typed values** from OTLP value objects:
   - `stringValue` → string
   - `intValue` → number
   - `doubleValue` → number
   - `boolValue` → boolean
   - `arrayValue` → array
   - `kvlistValue` → nested object

### Example Transformation

**Input OTLP:**
```json
{
  "resourceSpans": [{
    "resource": {
      "attributes": [
        { "key": "service.name", "value": { "stringValue": "frontend" } }
      ]
    },
    "scopeSpans": [{
      "spans": [{
        "name": "GET /api",
        "traceId": "abc123",
        "attributes": [
          { "key": "http.method", "value": { "stringValue": "GET" } },
          { "key": "http.status_code", "value": { "intValue": "200" } }
        ]
      }]
    }]
  }]
}
```

**Flattened Record:**
```json
{
  "trace.id": "abc123",
  "span.name": "GET /api",
  "resource.service.name": "frontend",
  "span.attributes.http.method": "GET",
  "span.attributes.http.status_code": 200
}
```

## Usage

1. **Click "Upload Sample"** in the UI
2. **Select your OTLP JSON file** (e.g., `Sample telemetry.json`)
3. **View parsed records** in the Live Preview panel
4. **Apply transformations** and see before/after comparison
5. **Export OTTL** with the correct context and signal grouping

## Sensitive Data Detection

The parser automatically identifies potential PII in OTLP files:
- `dash0.auth.token` → Flagged as sensitive
- Email addresses in attributes → Suggested for hashing
- IP addresses → Suggested for masking
- UUIDs and GUIDs → Suggested for redaction

## Limitations

- Maximum 250 records per upload (configurable)
- Large nested structures may be simplified
- Some OTLP-specific metadata (events, links) are preserved but not deeply parsed

## Testing Your OTTL

After uploading an OTLP file:

1. **Add transformations** from the catalog
2. **Enable/disable** individual steps
3. **Reorder** transformations to optimize the pipeline
4. **Preview** the impact on real data
5. **Export** the final OTTL configuration

The generated OTTL will include proper context grouping:
```yaml
transform:
  error_mode: ignore
  trace_statements:
    - context: span
      statements:
        - set(span.attributes["http.method"], "REDACTED")
    - context: resource
      statements:
        - delete_key(resource, "dash0.auth.token")
```
