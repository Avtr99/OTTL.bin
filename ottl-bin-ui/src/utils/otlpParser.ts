/**
 * OTLP (OpenTelemetry Protocol) JSON Parser
 * Converts OTLP JSON format to flat telemetry records for visualization
 */

export type ValueType = 'string' | 'int' | 'double' | 'bool' | 'array' | 'kvlist' | 'unknown';

export interface TypedValue {
  value: unknown;
  type: ValueType;
}

export type TelemetryRecord = Record<string, unknown>;
export type TypedTelemetryRecord = Record<string, TypedValue>;

interface OTLPAttribute {
  key: string;
  value: {
    stringValue?: string;
    intValue?: string | number;
    doubleValue?: number;
    boolValue?: boolean;
    arrayValue?: { values: unknown[] };
    kvlistValue?: { values: OTLPAttribute[] };
  };
}

interface OTLPSpan {
  name: string;
  spanId: string;
  traceId: string;
  parentSpanId?: string;
  kind?: number;
  startTimeUnixNano: string;
  endTimeUnixNano: string;
  attributes: OTLPAttribute[];
  status?: {
    code: number;
    message: string;
  };
  events?: unknown[];
  links?: unknown[];
}

interface OTLPResource {
  attributes: OTLPAttribute[];
}

interface OTLPScope {
  name: string;
  version?: string;
  attributes?: OTLPAttribute[];
}

interface OTLPScopeSpans {
  scope: OTLPScope;
  spans: OTLPSpan[];
  schemaUrl?: string;
}

interface OTLPResourceSpans {
  resource: OTLPResource;
  scopeSpans: OTLPScopeSpans[];
  schemaUrl?: string;
}

interface OTLPTraceData {
  resourceSpans?: OTLPResourceSpans[];
  resourceLogs?: unknown[];
  resourceMetrics?: unknown[];
}

/**
 * Extract value from OTLP attribute value object
 */
function extractAttributeValue(value: OTLPAttribute['value']): unknown {
  if (value.stringValue !== undefined) return value.stringValue;
  if (value.intValue !== undefined) return value.intValue;
  if (value.doubleValue !== undefined) return value.doubleValue;
  if (value.boolValue !== undefined) return value.boolValue;
  if (value.arrayValue) return value.arrayValue.values;
  if (value.kvlistValue) {
    const obj: Record<string, unknown> = {};
    value.kvlistValue.values.forEach((attr) => {
      obj[attr.key] = extractAttributeValue(attr.value);
    });
    return obj;
  }
  return null;
}

/**
 * Extract value with type information from OTLP attribute value object
 */
function extractTypedAttributeValue(value: OTLPAttribute['value']): TypedValue {
  if (value.stringValue !== undefined) {
    return { value: value.stringValue, type: 'string' };
  }
  if (value.intValue !== undefined) {
    return { value: value.intValue, type: 'int' };
  }
  if (value.doubleValue !== undefined) {
    return { value: value.doubleValue, type: 'double' };
  }
  if (value.boolValue !== undefined) {
    return { value: value.boolValue, type: 'bool' };
  }
  if (value.arrayValue) {
    return { value: value.arrayValue.values, type: 'array' };
  }
  if (value.kvlistValue) {
    const obj: Record<string, unknown> = {};
    value.kvlistValue.values.forEach((attr) => {
      obj[attr.key] = extractAttributeValue(attr.value);
    });
    return { value: obj, type: 'kvlist' };
  }
  return { value: null, type: 'unknown' };
}

/**
 * Convert OTLP attributes array to flat key-value object
 */
function flattenAttributes(attributes: OTLPAttribute[], prefix = ''): Record<string, unknown> {
  const flattened: Record<string, unknown> = {};
  
  attributes.forEach((attr) => {
    const key = prefix ? `${prefix}.${attr.key}` : attr.key;
    flattened[key] = extractAttributeValue(attr.value);
  });
  
  return flattened;
}

/**
 * Convert OTLP attributes array to flat key-value object with type information
 */
function flattenTypedAttributes(attributes: OTLPAttribute[], prefix = ''): TypedTelemetryRecord {
  const flattened: TypedTelemetryRecord = {};
  
  attributes.forEach((attr) => {
    const key = prefix ? `${prefix}.${attr.key}` : attr.key;
    flattened[key] = extractTypedAttributeValue(attr.value);
  });
  
  return flattened;
}

/**
 * Parse OTLP trace spans into flat telemetry records
 */
export function parseOTLPTraces(data: OTLPTraceData): TelemetryRecord[] {
  const records: TelemetryRecord[] = [];
  
  if (!data.resourceSpans || data.resourceSpans.length === 0) {
    return records;
  }
  
  data.resourceSpans.forEach((resourceSpan) => {
    const resourceAttrs = flattenAttributes(resourceSpan.resource.attributes, 'resource');
    
    resourceSpan.scopeSpans.forEach((scopeSpan) => {
      const scopeAttrs = scopeSpan.scope.attributes
        ? flattenAttributes(scopeSpan.scope.attributes, 'scope')
        : {};
      
      scopeSpan.spans.forEach((span) => {
        const spanAttrs = flattenAttributes(span.attributes, 'span.attributes');
        
        const record: TelemetryRecord = {
          // Core span fields
          'trace.id': span.traceId,
          'span.id': span.spanId,
          'span.name': span.name,
          'span.kind': span.kind,
          'span.parent_span_id': span.parentSpanId || '',
          'span.start_time': span.startTimeUnixNano,
          'span.end_time': span.endTimeUnixNano,
          'span.status.code': span.status?.code,
          'span.status.message': span.status?.message || '',
          
          // Merge all attributes
          ...resourceAttrs,
          ...scopeAttrs,
          ...spanAttrs,
        };
        
        records.push(record);
      });
    });
  });
  
  return records;
}

/**
 * Detect if JSON is OTLP format
 */
export function isOTLPFormat(data: unknown): data is OTLPTraceData {
  if (typeof data !== 'object' || data === null) return false;
  const obj = data as Record<string, unknown>;
  return (
    Array.isArray(obj.resourceSpans) ||
    Array.isArray(obj.resourceLogs) ||
    Array.isArray(obj.resourceMetrics)
  );
}

/**
 * Sanitizes an object by recursively removing non-serializable values.
 * TelemetryRecord assumes JSON-serializable content (primitives, plain objects, arrays).
 * Removes functions, symbols, BigInts, and other non-serializable types.
 */
function sanitizeRecord(obj: unknown, seen = new WeakSet<object>()): unknown {
  if (obj === null || obj === undefined) {
    return obj;
  }
  
  const type = typeof obj;
  
  // Allow primitives (string, boolean, finite numbers)
  if (type === 'string' || type === 'boolean') {
    return obj;
  }
  if (type === 'number' && Number.isFinite(obj as number)) {
    return obj;
  }
  
  // Reject non-serializable types
  if (type === 'function' || type === 'symbol' || type === 'bigint') {
    return undefined;
  }
  
  // Handle arrays
  if (Array.isArray(obj)) {
    if (seen.has(obj)) return undefined;
    seen.add(obj);
    return obj.map(item => sanitizeRecord(item, seen)).filter(item => item !== undefined);
  }
  
  // Handle plain objects
  if (type === 'object') {
    if (seen.has(obj)) return undefined;
    seen.add(obj);
    const sanitized: Record<string, unknown> = {};
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        const value = sanitizeRecord((obj as Record<string, unknown>)[key], seen);
        if (value !== undefined) {
          sanitized[key] = value;
        }
      }
    }
    return sanitized;
  }
  
  return undefined;
}

/**
 * Infer type from a JavaScript value (for non-OTLP data)
 */
export function inferTypeFromValue(value: unknown): ValueType {
  if (value === null || value === undefined) return 'unknown';
  if (typeof value === 'string') return 'string';
  if (typeof value === 'boolean') return 'bool';
  if (typeof value === 'number') {
    return Number.isInteger(value) ? 'int' : 'double';
  }
  if (Array.isArray(value)) return 'array';
  if (typeof value === 'object') return 'kvlist';
  return 'unknown';
}

/**
 * Parse OTLP trace spans into flat telemetry records with type information
 */
export function parseOTLPTracesWithTypes(data: OTLPTraceData): TypedTelemetryRecord[] {
  const records: TypedTelemetryRecord[] = [];
  
  if (!data.resourceSpans || data.resourceSpans.length === 0) {
    return records;
  }
  
  data.resourceSpans.forEach((resourceSpan) => {
    const resourceAttrs = flattenTypedAttributes(resourceSpan.resource.attributes, 'resource');
    
    resourceSpan.scopeSpans.forEach((scopeSpan) => {
      const scopeAttrs = scopeSpan.scope.attributes
        ? flattenTypedAttributes(scopeSpan.scope.attributes, 'scope')
        : {};
      
      scopeSpan.spans.forEach((span) => {
        const spanAttrs = flattenTypedAttributes(span.attributes, 'span.attributes');
        
        const record: TypedTelemetryRecord = {
          // Core span fields with inferred types
          'trace.id': { value: span.traceId, type: 'string' },
          'span.id': { value: span.spanId, type: 'string' },
          'span.name': { value: span.name, type: 'string' },
          'span.kind': span.kind !== undefined && span.kind !== null
            ? { value: Number(span.kind), type: 'int' }
            : { value: '', type: 'string' },
          'span.parent_span_id': { value: span.parentSpanId || '', type: 'string' },
          'span.start_time': { value: span.startTimeUnixNano, type: 'string' },
          'span.end_time': { value: span.endTimeUnixNano, type: 'string' },
          'span.status.code': span.status?.code !== undefined && span.status?.code !== null
            ? { value: Number(span.status.code), type: 'int' }
            : { value: '', type: 'string' },
          'span.status.message': { value: span.status?.message || '', type: 'string' },
          
          // Merge all attributes
          ...resourceAttrs,
          ...scopeAttrs,
          ...spanAttrs,
        };
        
        records.push(record);
      });
    });
  });
  
  return records;
}

/**
 * Parse telemetry JSON (OTLP or generic format)
 * Returns an array of flat telemetry records
 */
export function parseTelemetryJSON(jsonString: string): TelemetryRecord[] {
  try {
    const parsed = JSON.parse(jsonString);
    
    // Try OTLP format first
    if (isOTLPFormat(parsed)) {
      // Currently only handle traces; logs/metrics could be added later
      if (parsed.resourceSpans) {
        return parseOTLPTraces(parsed);
      }
      // TODO: Add parsing for resourceLogs and resourceMetrics when needed
      console.warn('OTLP format detected but only resourceSpans is currently supported');
      return [];
    }
    
    // Check if it's an array of records
    if (Array.isArray(parsed)) {
      return parsed
        .map(item => sanitizeRecord(item))
        .filter((item): item is TelemetryRecord => 
          typeof item === 'object' && item !== null && !Array.isArray(item)
        );
    }
    
    // Single record - sanitize before casting to TelemetryRecord
    if (typeof parsed === 'object' && parsed !== null) {
      const sanitized = sanitizeRecord(parsed);
      if (typeof sanitized === 'object' && sanitized !== null && !Array.isArray(sanitized)) {
        return [sanitized as TelemetryRecord];
      }
    }
    
    return [];
  } catch (error) {
    console.error('Failed to parse telemetry JSON:', error);
    return [];
  }
}

/**
 * Parse telemetry JSON with type information (OTLP or generic format)
 * Returns an array of flat telemetry records with type metadata
 */
export function parseTelemetryJSONWithTypes(jsonString: string): TypedTelemetryRecord[] {
  try {
    const parsed = JSON.parse(jsonString);
    
    // Try OTLP format first
    if (isOTLPFormat(parsed)) {
      if (parsed.resourceSpans) {
        return parseOTLPTracesWithTypes(parsed);
      }
      console.warn('OTLP format detected but only resourceSpans is currently supported');
      return [];
    }
    
    // For non-OTLP data, infer types from JavaScript values
    const records = parseTelemetryJSON(jsonString);
    return records.map((record) => {
      const typedRecord: TypedTelemetryRecord = {};
      Object.entries(record).forEach(([key, value]) => {
        typedRecord[key] = {
          value,
          type: inferTypeFromValue(value),
        };
      });
      return typedRecord;
    });
  } catch (error) {
    console.error('Failed to parse telemetry JSON with types:', error);
    return [];
  }
}
