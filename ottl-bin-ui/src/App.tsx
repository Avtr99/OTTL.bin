import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AppShell } from './components/layout/AppShell';
import { HeaderBar } from './components/layout/HeaderBar';
import { TransformationList } from './components/transformations/TransformationList';
import type { Transformation, TransformationSignal } from './components/transformations/TransformationList';
import { LivePreviewPanel } from './components/preview/LivePreviewPanel';
import type { LivePreviewQuickAction, LivePreviewDiffEntry } from './components/preview/LivePreviewPanel';
// Removed per UX feedback - Smart Suggestions take too much real estate
// import { SuggestionPanel } from './components/suggestions/SuggestionPanel';
// import type { Suggestion } from './components/suggestions/SuggestionPanel';
// Removed per UX feedback - Cost estimates not realistic for multi-transformation pipelines
// import { CostImpactPanel } from './components/impact/CostImpactPanel';
// import type { ImpactMetrics } from './components/impact/CostImpactPanel';
import { AddTransformationModal, defaultTransformations } from './components/modals/AddTransformationModal';
import type { TransformationType } from './components/modals/AddTransformationModal';
import { RawOttlEditorModal } from './components/ottl/RawOttlEditorModal';
import { SignalTabs } from './components/pipeline/SignalTabs';
import {
  Card,
  CardBody,
  CardHeader,
  Button,
  Chip,
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
} from '@heroui/react';
import {
  Plus,
  Upload,
  PencilLine,
  EyeOff,
  Trash2,
  Fingerprint,
  Maximize2,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import { parseTelemetryJSON } from './utils/otlpParser';
import { autoDetectTransformations, getDetectionSummary } from './utils/autoDetectTransformations';
import { applyRawOttl } from './utils/ottlInterpreter';

type TelemetryRecord = Record<string, unknown>;

const makeTransformationId = (prefix: string) => `${prefix}-${Date.now()}`;

/**
 * Infer operation type from transformation title (fallback when explicit operation is not provided)
 */
const inferOperationFromTitle = (title: string): string | undefined => {
  if (title.includes('Sample Health Check')) {
    return 'sample';
  }
  if (title.includes('Limit Attribute Count')) {
    return 'limit';
  }
  if (title.includes('Mask') || title.includes('Token')) {
    return 'mask';
  }
  if (title.includes('Hash')) {
    return 'hash';
  }
  if (title.includes('Drop') || title.includes('Delete')) {
    return 'drop';
  }
  if (title.includes('Truncate')) {
    return 'truncate';
  }
  return undefined;
};


type StatementContext = 'span' | 'spanevent' | 'resource' | 'scope' | 'metric' | 'datapoint' | 'log';

interface BuiltStatement {
  statement: string;
  context: StatementContext;
}

interface StatementDetails extends BuiltStatement {
  signal: TransformationSignal;
  transformation: Transformation;
}

const maskCommandLineSecrets = (value: unknown): unknown => {
  if (typeof value !== 'string') return value;
  return value.replace(/password=([^\s]+)/gi, 'password=********');
};

const hashEmail = (value: unknown): unknown => {
  if (typeof value !== 'string') return value;
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(i);
    hash |= 0;
  }
  return `h_${Math.abs(hash).toString(16).padStart(8, '0')}`;
};

const applyTransformations = (
  record: TelemetryRecord,
  transformations: Transformation[],
): TelemetryRecord => {
  const cloned = JSON.parse(JSON.stringify(record)) as TelemetryRecord;

  transformations
    .filter((transformation) => transformation.isEnabled !== false)
    .forEach((transformation) => {
      // Handle auto-detected transformations
      if (transformation.config?.autoDetected && transformation.config?.fields) {
        const rawFields = transformation.config.fields;
        if (!Array.isArray(rawFields) || !rawFields.every(field => typeof field === 'string')) {
          console.warn('Invalid fields configuration for auto-detected transformation:', transformation.title, rawFields);
          return; // skip this transformation
        }
        const fields = rawFields as string[];
        
        // Determine operation: prefer explicit config.operation, fallback to title parsing
        const operation = transformation.config.operation as string | undefined;
        const inferredOperation = operation || inferOperationFromTitle(transformation.title);
        
        // Handle special operations first (sample, limit)
        switch (inferredOperation) {
          case 'sample':
            // Mark for sampling (in real OTTL, this would use probabilistic sampling)
            cloned['_sampled'] = 'health-check-sampled';
            return;
          
          case 'limit':
            // Keep only the most important attributes (simplified for preview)
            const importantKeys = ['trace.id', 'span.id', 'span.name', 'resource.service.name'];
            Object.keys(cloned).forEach((key) => {
              if (!importantKeys.includes(key) && !key.startsWith('span.attributes.http')) {
                delete cloned[key];
              }
            });
            return;
        }
        
        // Handle field-based operations
        fields.forEach((field) => {
          if (!(field in cloned)) {
            return; // skip if field not present
          }
          
          switch (inferredOperation) {
            case 'mask':
              cloned[field] = '********';
              break;
            
            case 'hash':
              // Only hash if value is present (not null/undefined)
              if (cloned[field] != null) {
                cloned[field] = hashEmail(cloned[field]);
              }
              break;
            
            case 'drop':
              delete cloned[field];
              break;
            
            case 'truncate':
              // Only truncate strings
              if (typeof cloned[field] === 'string') {
                cloned[field] = (cloned[field] as string).substring(0, 100) + '...';
              }
              break;
            
            default:
              // Unknown operation, skip
              console.warn('Unknown operation for auto-detected transformation:', inferredOperation, transformation.title);
          }
        });
        return;
      }
      
      // Handle catalog transformations with config.type
      const config = transformation.config as Record<string, unknown> | undefined;
      const configType = config?.type as string | undefined;
      const field = config?.field as string | undefined;
      
      if (configType) {
        switch (configType) {
          case 'mask': {
            // Mask sensitive values - apply to specified field or find sensitive fields
            if (field && cloned[field] !== undefined) {
              cloned[field] = '********';
            } else {
              // Find and mask common sensitive fields
              Object.keys(cloned).forEach((key) => {
                if (key.includes('password') || key.includes('secret') || 
                    key.includes('token') || key.includes('api.key')) {
                  cloned[key] = '********';
                }
              });
            }
            break;
          }
          case 'hash': {
            // Hash PII - apply to specified field or find PII fields
            if (field && typeof cloned[field] === 'string') {
              cloned[field] = hashEmail(cloned[field]);
            } else {
              Object.keys(cloned).forEach((key) => {
                if ((key.includes('email') || key.includes('user.id') || key.includes('uid')) 
                    && typeof cloned[key] === 'string') {
                  cloned[key] = hashEmail(cloned[key]);
                }
              });
            }
            break;
          }
          case 'delete': {
            // Delete specific attribute
            if (field) {
              delete cloned[field];
            }
            break;
          }
          case 'keep': {
            // Keep only specified attributes
            const keepFields = config?.fields as string[] | undefined;
            if (keepFields && keepFields.length > 0) {
              Object.keys(cloned).forEach((key) => {
                if (!keepFields.some(f => key.includes(f))) {
                  delete cloned[key];
                }
              });
            }
            break;
          }
          case 'add': {
            // Add new attribute
            const newField = config?.newField as string | undefined;
            const value = config?.value as string | undefined;
            if (newField) {
              cloned[newField] = value || 'default_value';
            }
            break;
          }
          case 'move': {
            // Move between scopes
            const from = config?.from as string | undefined;
            const to = config?.to as string | undefined;
            if (field && from && to) {
              const sourceKey = `${from}.${field}`;
              const targetKey = `${to}.${field}`;
              if (cloned[sourceKey] !== undefined) {
                cloned[targetKey] = cloned[sourceKey];
                delete cloned[sourceKey];
              }
            }
            break;
          }
          case 'drop': {
            // Mark record as dropped
            cloned['_dropped'] = true;
            break;
          }
          case 'sample': {
            // Mark for sampling
            cloned['_sampled'] = true;
            break;
          }
          case 'truncate': {
            // Truncate long values
            const maxLength = (config?.maxLength as number) || 256;
            Object.keys(cloned).forEach((key) => {
              if (typeof cloned[key] === 'string' && (cloned[key] as string).length > maxLength) {
                cloned[key] = (cloned[key] as string).substring(0, maxLength) + '...';
              }
            });
            break;
          }
          case 'parseJson': {
            // Parse JSON from a field
            if (field && typeof cloned[field] === 'string') {
              try {
                const parsed = JSON.parse(cloned[field] as string);
                Object.entries(parsed).forEach(([k, v]) => {
                  cloned[`${field}.${k}`] = v;
                });
              } catch {
                // Invalid JSON, skip
              }
            }
            break;
          }
          case 'scale': {
            // Scale metric values
            const factor = (config?.factor as number) || 1;
            if (field && typeof cloned[field] === 'number') {
              cloned[field] = (cloned[field] as number) * factor;
            }
            break;
          }
          default:
            // Unknown type, skip
            break;
        }
        return;
      }
      
      // Handle legacy manual transformations (fallback)
      switch (transformation.title) {
        case 'Mask Passwords': {
          if (typeof cloned['process.command_line'] === 'string') {
            cloned['process.command_line'] = maskCommandLineSecrets(cloned['process.command_line']);
          }
          if (typeof cloned['resource.dash0.auth.token'] === 'string') {
            cloned['resource.dash0.auth.token'] = '********';
          }
          break;
        }
        case 'Hash Email Addresses': {
          if (typeof cloned['user.email'] === 'string') {
            cloned['user.email'] = hashEmail(cloned['user.email']);
          }
          break;
        }
        default:
          break;
      }
    });

  return cloned;
};

const parseTelemetryText = (text: string): TelemetryRecord[] => {
  const trimmed = text.trim().replace(/^\uFEFF/, '');
  if (!trimmed) {
    return [];
  }

  // Try OTLP JSON parser first
  const otlpRecords = parseTelemetryJSON(trimmed);
  if (otlpRecords.length > 0) {
    return otlpRecords;
  }

  // Fallback to JSONL and key=value parsing
  try {
    const data = JSON.parse(trimmed);
    if (Array.isArray(data)) {
      return data.filter((item): item is TelemetryRecord => typeof item === 'object' && item !== null);
    }
    if (typeof data === 'object' && data !== null) {
      return [data as TelemetryRecord];
    }
  } catch (error) {
    const lines = trimmed.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
    const records: TelemetryRecord[] = [];

    lines.forEach((line) => {
      const normalizedLine = line.replace(/,+$/, '');
      try {
        const item = JSON.parse(normalizedLine);
        if (typeof item === 'object' && item !== null && !Array.isArray(item)) {
          records.push(item as TelemetryRecord);
        }
        return;
      } catch (lineError) {
        const kvPairs = normalizedLine.split(/\s+/).reduce<TelemetryRecord>((acc, pair) => {
          const [rawKey, ...rawValueParts] = pair.split('=');
          if (!rawKey || rawValueParts.length === 0) {
            return acc;
          }
          const rawValue = rawValueParts.join('=');
          const key = rawKey.replace(/^['"]|['"]$/g, '');
          const value = rawValue.replace(/^['"]|['"]$/g, '');
          return { ...acc, [key]: value };
        }, {});

        if (Object.keys(kvPairs).length > 0) {
          records.push(kvPairs);
        }
      }
    });

    return records;
  }

  return [];
};

function App() {
  // Start with empty transformations - user builds their pipeline
  const [transformations, setTransformations] = useState<Transformation[]>([]);

  // Start with no samples - user uploads their telemetry
  const [samples, setSamples] = useState<TelemetryRecord[]>([]);
  const [currentSampleIndex, setCurrentSampleIndex] = useState(0);
  const [isProcessingSample, setIsProcessingSample] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const previewSectionRef = useRef<HTMLDivElement>(null);
  const [sampleError, setSampleError] = useState<string | null>(null);
  const [rawOttl, setRawOttl] = useState('');
  const [hasCustomRawOttl, setHasCustomRawOttl] = useState(false);
  const [isRawEditorOpen, setIsRawEditorOpen] = useState(false);
  const [isTransformationsModalOpen, setIsTransformationsModalOpen] = useState(false);
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // Track uploaded file name for display
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);

  // Multi-signal pipeline support
  const [activeSignal, setActiveSignal] = useState<'trace' | 'metric' | 'log'>('trace');

  // Helper to check if transformation applies to a signal
  const transformationMatchesSignal = (t: Transformation, signal: 'trace' | 'metric' | 'log'): boolean => {
    // Check compatibleSignals first (if defined), then fall back to signal property
    if (t.compatibleSignals && t.compatibleSignals.length > 0) {
      return t.compatibleSignals.includes(signal);
    }
    return (t.signal ?? 'trace') === signal;
  };

  // Count transformations by signal (a transformation can appear in multiple signals)
  const signalCounts = useMemo(() => ({
    trace: transformations.filter((t) => transformationMatchesSignal(t, 'trace')).length,
    metric: transformations.filter((t) => transformationMatchesSignal(t, 'metric')).length,
    log: transformations.filter((t) => transformationMatchesSignal(t, 'log')).length,
  }), [transformations]);

  // Filter transformations for active signal
  const filteredTransformations = useMemo(() => 
    transformations.filter((t) => transformationMatchesSignal(t, activeSignal)),
    [transformations, activeSignal]
  );

  const previewQuickActions = useMemo<LivePreviewQuickAction[]>(
    () => [
      {
        id: 'mask-value',
        label: 'Mask sensitive value',
        description: 'Replace secrets with asterisks while keeping the attribute available.',
        tone: 'warning',
        icon: <EyeOff size={16} />,
      },
      {
        id: 'hash-attribute',
        label: 'Hash attribute value',
        description: 'Hash the attribute so analytics remain possible without exposing raw data.',
        tone: 'secondary',
        icon: <Fingerprint size={16} />,
      },
      {
        id: 'drop-attribute',
        label: 'Drop attribute',
        description: 'Remove the attribute entirely to shrink payload size and cut costs.',
        tone: 'danger',
        icon: <Trash2 size={16} />,
      },
    ],
    [],
  );

  const buildTraceStatement = (transformation: Transformation): BuiltStatement => {
    const config = transformation.config as Record<string, unknown> | undefined;
    const field = config?.field as string | undefined;
    const fields = config?.fields as string[] | undefined;
    const attrPath = field?.startsWith('span.') || field?.startsWith('resource.') 
      ? field 
      : `span.attributes["${field}"]`;

    // Handle dynamically created transformations based on config.type
    if (config?.type) {
      switch (config.type) {
        case 'delete':
          return {
            context: 'span',
            statement: `delete_key(span.attributes, "${field}")`,
          };
        case 'mask':
          return {
            context: 'span',
            statement: `set(${attrPath}, "********")`,
          };
        case 'hash':
          return {
            context: 'span',
            statement: `set(${attrPath}, SHA256(${attrPath}))`,
          };
        case 'rename':
          const newName = config.newName as string || `${field}_renamed`;
          return {
            context: 'span',
            statement: `set(span.attributes["${newName}"], ${attrPath})`,
          };
        case 'replace':
          const newValue = config.newValue as string || 'REDACTED';
          return {
            context: 'span',
            statement: `set(${attrPath}, "${newValue}")`,
          };
        case 'move':
          const from = config.from as string;
          const to = config.to as string;
          if (from === 'span' && to === 'resource') {
            return {
              context: 'span',
              statement: `set(resource.attributes["${field}"], span.attributes["${field}"]) where span.attributes["${field}"] != nil`,
            };
          }
          return {
            context: 'resource',
            statement: `set(span.attributes["${field}"], resource.attributes["${field}"]) where resource.attributes["${field}"] != nil`,
          };
        case 'drop':
          return {
            context: 'span',
            statement: `delete_key(span.attributes, "${field}")`,
          };
        case 'add':
          const value = config.value as string || 'default_value';
          return {
            context: 'span',
            statement: `set(span.attributes["${field}"], "${value}")`,
          };
      }
    }

    // Handle auto-detected transformations (have config.autoDetected and config.fields)
    if (config?.autoDetected && fields && fields.length > 0) {
      const firstField = fields[0];
      
      switch (transformation.title) {
        case 'Mask Auth Tokens':
          return {
            context: 'span',
            statement: `set(span.attributes["${firstField}"], "********") where span.attributes["${firstField}"] != nil`,
          };
        case 'Hash UUIDs and GUIDs':
        case 'Hash Email Addresses':
          return {
            context: 'span',
            statement: `set(span.attributes["${firstField}"], SHA256(span.attributes["${firstField}"])) where span.attributes["${firstField}"] != nil`,
          };
        case 'Mask IP Addresses':
          return {
            context: 'span',
            statement: `replace_pattern(span.attributes["${firstField}"], "\\\\d{1,3}\\\\.\\\\d{1,3}\\\\.\\\\d{1,3}\\\\.\\\\d{1,3}", "xxx.xxx.xxx.xxx")`,
          };
        case 'Drop High-Cardinality Attributes':
        case 'Drop Verbose K8s Metadata':
        case 'Drop Duplicate Attributes':
          return {
            context: 'span',
            statement: `delete_key(span.attributes, "${firstField}")`,
          };
        case 'Truncate Large Values':
          return {
            context: 'span',
            statement: `truncate_all(span.attributes, 256)`,
          };
        case 'Sample Health Check Traffic':
          return {
            context: 'span',
            statement: `drop() where span.name == "health" or span.name == "ping"`,
          };
        case 'Limit Attribute Count':
          return {
            context: 'span',
            statement: `limit(span.attributes, 40, [])`,
          };
        case 'Clean Resource Attributes':
          // Generate statements for all detected resource fields
          const resourceStatements = fields.map(f => {
            const attrName = f.replace('resource.', '');
            return `delete_key(resource.attributes, "${attrName}")`;
          });
          return {
            context: 'resource',
            statement: resourceStatements[0] || `delete_key(resource.attributes, "${firstField}")`,
          };
        case 'Review Span Attributes':
          // Generate a keep_keys statement with the detected fields
          const attrList = fields.map(f => `"${f}"`).join(', ');
          return {
            context: 'span',
            statement: `keep_keys(span.attributes, [${attrList}])`,
          };
        default:
          // Generate statement based on category
          if (transformation.category === 'privacy') {
            return {
              context: 'span',
              statement: `set(span.attributes["${firstField}"], "********") where span.attributes["${firstField}"] != nil`,
            };
          }
          if (transformation.category === 'deletion') {
            // Check if it's a resource attribute
            if (firstField.startsWith('resource.')) {
              const attrName = firstField.replace('resource.', '');
              return {
                context: 'resource',
                statement: `delete_key(resource.attributes, "${attrName}")`,
              };
            }
            return {
              context: 'span',
              statement: `delete_key(span.attributes, "${firstField}")`,
            };
          }
          if (transformation.category === 'filtering') {
            return {
              context: 'span',
              statement: `delete_key(span.attributes, "${firstField}")`,
            };
          }
          if (transformation.category === 'attribute') {
            return {
              context: 'span',
              statement: `keep_keys(span.attributes, ["${firstField}"])`,
            };
          }
      }
    }

    // Handle transformations from the catalog by ID
    switch (transformation.id?.replace(/^(auto-|trans-)/, '').split('-')[0]) {
      case 'mask':
        return {
          context: 'span',
          statement: `replace_pattern(span.attributes["${transformation.title.split(' ').pop()}"], ".*", "********")`,
        };
      case 'hash':
        return {
          context: 'span',
          statement: `set(span.attributes["user.email"], SHA256(span.attributes["user.email"]))`,
        };
      case 'delete':
        return {
          context: 'span',
          statement: `delete_key(span.attributes, "${transformation.title.split(' ').pop()}")`,
        };
      case 'keep':
        return {
          context: 'span',
          statement: `keep_keys(span.attributes, ["service.name", "http.method", "http.status_code"])`,
        };
      case 'add':
        return {
          context: 'span',
          statement: `set(span.attributes["environment"], "production")`,
        };
      case 'copy':
        return {
          context: 'resource',
          statement: `set(span.attributes["service.name"], resource.attributes["service.name"])`,
        };
      case 'drop':
        return {
          context: 'span',
          statement: `drop() where span.attributes["http.target"] == "/health"`,
        };
      case 'sample':
        return {
          context: 'span',
          statement: `drop() where Int(SpanID().String()[14:]) % 10 > 0`,
        };
      case 'extract':
        return {
          context: 'span',
          statement: `replace_pattern(span.attributes["message"], "user_id=(?P<user_id>\\\\d+)", "")`,
        };
      case 'parse':
        return {
          context: 'span',
          statement: `merge_maps(span.attributes, ParseJSON(span.attributes["json_body"]), "upsert")`,
        };
      case 'truncate':
        return {
          context: 'span',
          statement: `truncate_all(span.attributes, 256)`,
        };
      default:
        // Generate a descriptive comment instead of noop
        return {
          context: 'span',
          statement: `# TODO: Configure ${transformation.title}`,
        };
    }
  };

  const buildMetricStatement = (transformation: Transformation): BuiltStatement => {
    const config = transformation.config as Record<string, unknown> | undefined;
    
    // Handle config-based transformations
    if (config?.type) {
      switch (config.type) {
        case 'scale':
          const factor = config.factor as number || 1.0;
          return {
            context: 'datapoint',
            statement: `set(datapoint.double_value, datapoint.double_value * ${factor})`,
          };
        case 'convert':
          return {
            context: 'metric',
            statement: `convert_gauge_to_sum("cumulative", false)`,
          };
      }
    }

    // Handle by transformation ID/title
    switch (transformation.id?.replace(/^(auto-|trans-)/, '').split('-')[0]) {
      case 'convert':
        return {
          context: 'metric',
          statement: 'convert_gauge_to_sum("cumulative", false)',
        };
      case 'scale':
        return {
          context: 'datapoint',
          statement: 'set(datapoint.double_value, datapoint.double_value * 0.001)',
        };
      default:
        // Generate descriptive comment
        return {
          context: 'metric',
          statement: `# TODO: Configure ${transformation.title}`,
        };
    }
  };

  const buildLogStatement = (transformation: Transformation): BuiltStatement => {
    const config = transformation.config as Record<string, unknown> | undefined;
    const field = config?.field as string | undefined;
    const attrPath = field?.startsWith('log.') ? field : `log.attributes["${field}"]`;

    // Handle dynamically created transformations based on config.type
    if (config?.type) {
      switch (config.type) {
        case 'delete':
          return {
            context: 'log',
            statement: `delete_key(log.attributes, "${field}")`,
          };
        case 'mask':
          return {
            context: 'log',
            statement: `set(${attrPath}, "********")`,
          };
        case 'hash':
          return {
            context: 'log',
            statement: `set(${attrPath}, SHA256(${attrPath}))`,
          };
        case 'replace':
          const newValue = config.newValue as string || 'REDACTED';
          return {
            context: 'log',
            statement: `set(${attrPath}, "${newValue}")`,
          };
      }
    }

    // Handle by transformation ID/category
    switch (transformation.id?.replace(/^(auto-|trans-)/, '').split('-')[0]) {
      case 'mask':
        return {
          context: 'log',
          statement: 'replace_pattern(log.body, "(?i)(password|secret|token)=([^&\\"\\s]+)", "$${1}=********")',
        };
      case 'hash':
        return {
          context: 'log',
          statement: 'set(log.attributes["user.email"], SHA256(log.attributes["user.email"]))',
        };
      case 'delete':
        return {
          context: 'log',
          statement: `delete_key(log.attributes, "${transformation.title.split(' ').pop()}")`,
        };
      case 'parse':
        return {
          context: 'log',
          statement: 'merge_maps(log.attributes, ParseJSON(log.body), "upsert") where IsString(log.body)',
        };
      case 'truncate':
        return {
          context: 'log',
          statement: 'truncate_all(log.attributes, 256)',
        };
      default:
        // Category-based fallback
        if (transformation.category === 'privacy') {
          return {
            context: 'log',
            statement: 'replace_pattern(log.body, "(?i)(password|secret|token|key)=([^&\\"\\s]+)", "$${1}=********")',
          };
        }
        if (transformation.category === 'filtering') {
          return {
            context: 'log',
            statement: 'drop() where log.severity_number < 9',
          };
        }
        if (transformation.category === 'deletion') {
          return {
            context: 'log',
            statement: `delete_key(log.attributes, "${transformation.title.split(' ').pop() || 'attribute'}")`,
          };
        }
        // Generate descriptive comment
        return {
          context: 'log',
          statement: `# TODO: Configure ${transformation.title}`,
        };
    }
  };

  const generateDefaultOttl = useCallback((): string => {
    const enabledTransformations = transformations.filter((transformation) => transformation.isEnabled !== false);

    // Build statement groups
    const statementGroups = enabledTransformations
      .map((transformation) => {
        const signal = transformation.signal ?? 'trace';
        const built =
          signal === 'metric'
            ? buildMetricStatement(transformation)
            : signal === 'log'
              ? buildLogStatement(transformation)
              : buildTraceStatement(transformation);
        return { ...built, signal, transformation } as StatementDetails;
      })
      .reduce<Record<TransformationSignal, Partial<Record<StatementContext, StatementDetails[]>>>>(
        (acc, detail) => {
          const { signal, context } = detail;
          const signalBucket = acc[signal] ?? (acc[signal] = {});
          const contextBucket = signalBucket[context] ?? (signalBucket[context] = []);
          contextBucket.push(detail);
          return acc;
        },
        { trace: {}, metric: {}, log: {} },
      );

    const contextOrderBySignal: Record<TransformationSignal, StatementContext[]> = {
      trace: ['span', 'spanevent', 'scope', 'resource'],
      metric: ['metric', 'datapoint', 'scope', 'resource'],
      log: ['log', 'scope', 'resource'],
    };

    // Build transform processor statements
    const transformStatements: string[] = [];
    
    (['trace', 'metric', 'log'] as TransformationSignal[]).forEach((signal) => {
      const contexts = statementGroups[signal];
      const orderedContexts = [
        ...contextOrderBySignal[signal].filter((context) => contexts[context]?.length),
        ...Object.keys(contexts).filter((context) => !contextOrderBySignal[signal].includes(context as StatementContext)),
      ];

      if (orderedContexts.length === 0) {
        return;
      }

      transformStatements.push(`      ${signal}_statements:`);

      orderedContexts.forEach((contextKey) => {
        const context = contextKey as StatementContext;
        const entries = contexts[context] ?? [];
        if (!entries || entries.length === 0) {
          return;
        }

        transformStatements.push(`        - context: ${context}`);
        transformStatements.push('          statements:');

        entries.forEach(({ transformation, statement }: StatementDetails) => {
          if (transformation.title) {
            transformStatements.push(`            # ${transformation.title}`);
          }
          transformStatements.push(`            - ${statement}`);
        });
      });
    });

    // Generate complete OpenTelemetry Collector configuration
    const lines: string[] = [
      '# OpenTelemetry Collector Configuration',
      '# Generated by OTTL.bin',
      uploadedFileName ? `# Source: ${uploadedFileName}` : '# Source: User-uploaded telemetry',
      `# Generated: ${new Date().toISOString()}`,
      '',
      '# Receivers - Configure your data sources',
      'receivers:',
      '  otlp:',
      '    protocols:',
      '      grpc:',
      '        endpoint: 0.0.0.0:4317',
      '      http:',
      '        endpoint: 0.0.0.0:4318',
      '',
      '# Processors - Transform your telemetry',
      'processors:',
      '  batch:',
      '    timeout: 1s',
      '    send_batch_size: 1024',
      '',
    ];

    if (enabledTransformations.length > 0) {
      lines.push('  transform:');
      lines.push('    error_mode: ignore');
      lines.push(...transformStatements);
    } else {
      lines.push('  # No transformations configured');
      lines.push('  # Add transformations in OTTL.bin to generate OTTL statements');
    }

    lines.push('');
    lines.push('# Exporters - Configure your destinations');
    lines.push('exporters:');
    lines.push('  otlp:');
    lines.push('    endpoint: "your-backend:4317"');
    lines.push('    tls:');
    lines.push('      insecure: false');
    lines.push('  debug:');
    lines.push('    verbosity: detailed');
    lines.push('');
    lines.push('# Service pipelines');
    lines.push('service:');
    lines.push('  pipelines:');
    
    // Add trace pipeline if we have trace transformations
    const hasTraceTransforms = Object.keys(statementGroups.trace).length > 0;
    lines.push('    traces:');
    lines.push('      receivers: [otlp]');
    lines.push(hasTraceTransforms ? '      processors: [batch, transform]' : '      processors: [batch]');
    lines.push('      exporters: [otlp, debug]');
    
    // Add metrics pipeline if we have metric transformations
    const hasMetricTransforms = Object.keys(statementGroups.metric).length > 0;
    lines.push('    metrics:');
    lines.push('      receivers: [otlp]');
    lines.push(hasMetricTransforms ? '      processors: [batch, transform]' : '      processors: [batch]');
    lines.push('      exporters: [otlp, debug]');
    
    // Add logs pipeline if we have log transformations
    const hasLogTransforms = Object.keys(statementGroups.log).length > 0;
    lines.push('    logs:');
    lines.push('      receivers: [otlp]');
    lines.push(hasLogTransforms ? '      processors: [batch, transform]' : '      processors: [batch]');
    lines.push('      exporters: [otlp, debug]');

    return lines.join('\n');
  }, [uploadedFileName, transformations]);

const canonicalStringify = (value: unknown): string => {
  const seen = new WeakSet();

  const sortValue = (input: unknown): unknown => {
    if (input === null || typeof input !== 'object') {
      return input;
    }

    if (seen.has(input as object)) {
      return null;
    }
    seen.add(input as object);

    if (Array.isArray(input)) {
      return input.map(sortValue);
    }

    const entries = Object.entries(input as Record<string, unknown>)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, val]) => [key, sortValue(val)] as const);
    return Object.fromEntries(entries);
  };

  return JSON.stringify(sortValue(value));
};

  useEffect(() => {
    if (!hasCustomRawOttl) {
      setRawOttl(generateDefaultOttl());
    }
  }, [generateDefaultOttl, hasCustomRawOttl]);

  const handleOpenRawEditor = () => setIsRawEditorOpen(true);
  const handleCloseRawEditor = () => setIsRawEditorOpen(false);
  const handleSaveRawOttl = (value: string) => {
    setRawOttl(value);
    setHasCustomRawOttl(true);
    toast.success('Raw OTTL saved. Export will now use your manual edits.');
    setIsRawEditorOpen(false);
  };
  const handleRevertRawOttl = () => {
    setRawOttl(generateDefaultOttl());
    setHasCustomRawOttl(false);
    toast('Raw OTTL is synced back to the visual pipeline.');
  };

  const handleExportOttl = () => {
    const ottl = hasCustomRawOttl ? rawOttl : generateDefaultOttl();
    const blob = new Blob([ottl], { type: 'text/yaml' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'transformations.ottl.yaml';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success('OTTL file saved');
  };


  const handleToggle = (id: string, enabled: boolean) => {
    setTransformations((prev) =>
      prev.map((t) => (t.id === id ? { ...t, isEnabled: enabled } : t))
    );
    if (enabled) {
      toast.success('Transformation enabled');
    } else {
      toast.warning('Transformation disabled');
    }
  };

  const handleEdit = (id: string) => {
    toast.info(`Editing transformation ${id}`);
  };

  const handleDelete = (id: string) => {
    setTransformations((prev) => prev.filter((t) => t.id !== id));
    toast.warning('Transformation removed from pipeline');
  };

  const handleAddTransformation = (type: TransformationType) => {
    // Map catalog IDs to config types for preview application
    const configTypeMap: Record<string, string> = {
      'mask-sensitive-data': 'mask',
      'hash-pii': 'hash',
      'delete-specific-attributes': 'delete',
      'keep-only-listed': 'keep',
      'add-static-attribute': 'add',
      'copy-between-scopes': 'move',
      'drop-by-condition': 'drop',
      'sample-telemetry': 'sample',
      'extract-regex-pattern': 'extract',
      'parse-json-body': 'parseJson',
      'truncate-values': 'truncate',
      'convert-metric-type': 'convertMetric',
      'scale-values': 'scale',
    };

    // Use active signal if compatible, otherwise use type's default signal
    const targetSignal = type.compatibleSignals?.includes(activeSignal) 
      ? activeSignal 
      : type.signal ?? 'trace';

    const newTransformation: Transformation = {
      id: makeTransformationId(type.id),
      title: type.name,
      description: type.description,
      category: type.category,
      isEnabled: true,
      signal: targetSignal,
      compatibleSignals: type.compatibleSignals,
      config: {
        type: configTypeMap[type.id] || type.id,
        catalogId: type.id,
      },
    };
    setTransformations((prev) => [...prev, newTransformation]);
    toast.success(`Added: ${type.name}`);
    if (!hasCustomRawOttl) {
      setRawOttl(generateDefaultOttl());
    }
  };

  const handleMultiFileSelection = async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;

    setSampleError(null);
    setSamples([]);
    setCurrentSampleIndex(0);
    setIsProcessingSample(true);
    
    const fileCount = fileList.length;
    setUploadedFileName(fileCount > 1 ? `${fileCount} files` : fileList[0].name);
    const toastId = toast.loading(`Loading ${fileCount} telemetry file${fileCount > 1 ? 's' : ''}...`);

    try {
      // Read all files in parallel
      const fileContents = await Promise.all(
        Array.from(fileList).map(file => 
          new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target?.result as string || '');
            reader.onerror = () => reject(new Error(`Failed to read ${file.name}`));
            reader.readAsText(file);
          })
        )
      );

      // Parse all files and combine records
      let allRecords: TelemetryRecord[] = [];
      for (const content of fileContents) {
        const parsed = parseTelemetryText(content);
        allRecords = [...allRecords, ...parsed];
      }

      // Limit to 500 records total
      allRecords = allRecords.slice(0, 500);

      if (allRecords.length === 0) {
        toast.error('No valid telemetry records found in files', { id: toastId });
        setSampleError('We could not detect valid telemetry entries. Provide JSON, JSONL, or key=value lines exported from your telemetry platform.');
        setIsProcessingSample(false);
        return;
      }

      setSamples(allRecords);
      setCurrentSampleIndex(0);
      setSampleError(null);
      
      // Auto-detect transformations
      const detected = autoDetectTransformations(allRecords);
      const summary = getDetectionSummary(allRecords);
        
        if (detected.length > 0) {
          // Deduplicate against existing transformations
          const existingKeys = new Set(
            transformations.map((t) => `${t.title}:${canonicalStringify(t.config)}`)
          );
          
          // Filter detected to only new ones, skipping duplicates within detected
          const detectedKeys = new Set<string>();
          const filteredDetected = detected.filter((t) => {
            const key = `${t.title}:${canonicalStringify(t.config)}`;
            if (existingKeys.has(key) || detectedKeys.has(key)) {
              return false;
            }
            detectedKeys.add(key);
            return true;
          });
          
          if (filteredDetected.length > 0) {
            // Add filtered detected transformations to the pipeline
            setTransformations((prev) => [...prev, ...filteredDetected]);
            
            toast.success(
              `Loaded ${allRecords.length} records from ${fileCount} file${fileCount > 1 ? 's' : ''}. Added ${filteredDetected.length} new transformations!`,
              { id: toastId, duration: 5000 }
            );
            
            // Show summary of what was detected
            setTimeout(() => {
              toast.info(
                `Found: ${summary.topIssues.map((i) => `${i.name} (${i.count} fields)`).join(', ')}`,
                { duration: 6000 }
              );
            }, 1000);
          } else {
            toast.success(`Loaded ${allRecords.length} records from ${fileCount} file${fileCount > 1 ? 's' : ''} (no new transformations detected)`, { id: toastId });
          }
        } else {
          toast.success(`Loaded ${allRecords.length} records from ${fileCount} file${fileCount > 1 ? 's' : ''}`, { id: toastId });
        }
    } catch (error) {
      toast.error('Failed to parse files. Ensure valid JSON or JSONL format.', { id: toastId });
      setSampleError('Could not parse the files. Confirm they contain valid JSON, JSONL, or key=value pairs.');
      setSamples([]);
    } finally {
      setIsProcessingSample(false);
    }
  };

  const handlePreviewQuickAction = (actionId: string, entry: LivePreviewDiffEntry) => {
    const attributePath = entry.key;
    if (!attributePath) {
      toast.error('Unable to determine attribute path for this value.');
      return;
    }

    const baseTransformation: Pick<Transformation, 'category' | 'isEnabled'> = {
      category: 'privacy',
      isEnabled: true,
    };

    let transformation: Transformation | null = null;

    if (actionId === 'mask-value') {
      transformation = {
        id: makeTransformationId('mask'),
        title: `Mask ${attributePath}`,
        description: `Mask sensitive data detected in ${attributePath}.`,
        ...baseTransformation,
        signal: 'trace',
        config: { type: 'mask', field: attributePath },
      };
      toast.warning(`Masking ${attributePath}. Adjust pattern if needed.`);
    } else if (actionId === 'hash-attribute') {
      transformation = {
        id: makeTransformationId('hash'),
        title: `Hash ${attributePath}`,
        description: `Hash the value of ${attributePath} using SHA-256.`,
        ...baseTransformation,
        signal: 'trace',
        config: { type: 'hash', field: attributePath, algorithm: 'sha256' },
      };
      toast.success(`Hash transformation added for ${attributePath}.`);
    } else if (actionId === 'drop-attribute') {
      transformation = {
        id: makeTransformationId('drop'),
        title: `Drop ${attributePath}`,
        description: `Remove ${attributePath} from telemetry payloads.`,
        category: 'deletion',
        isEnabled: true,
        signal: 'trace',
        config: { type: 'drop', field: attributePath },
      };
      toast.warning(`Dropping ${attributePath}. Verify downstream dashboards before deploying.`);
    }

    if (!transformation) {
      toast.error('Unsupported quick action.');
      return;
    }

    setTransformations((prev) => [...prev, transformation]);

    if (!hasCustomRawOttl) {
      setRawOttl(generateDefaultOttl());
    }
  };

  const handleAttributeAction = (action: string, key: string, value: unknown) => {
    let transformation: Transformation | null = null;

    switch (action) {
      case 'delete':
        transformation = {
          id: makeTransformationId('delete'),
          title: `Delete ${key}`,
          description: `Remove ${key} from telemetry`,
          category: 'deletion',
          isEnabled: true,
          signal: 'trace',
          compatibleSignals: ['trace', 'log'],
          config: { type: 'delete', field: key },
        };
        toast.success(`✓ Delete transformation added for ${key}`);
        break;

      case 'mask':
        transformation = {
          id: makeTransformationId('mask'),
          title: `Mask ${key}`,
          description: `Replace ${key} value with asterisks`,
          category: 'privacy',
          isEnabled: true,
          signal: 'trace',
          compatibleSignals: ['trace', 'log'],
          config: { type: 'mask', field: key },
        };
        toast.success(`✓ Mask transformation added for ${key}`);
        break;

      case 'hash':
        transformation = {
          id: makeTransformationId('hash'),
          title: `Hash ${key}`,
          description: `Hash ${key} using SHA-256`,
          category: 'privacy',
          isEnabled: true,
          signal: 'trace',
          compatibleSignals: ['trace', 'log'],
          config: { type: 'hash', field: key, algorithm: 'sha256' },
        };
        toast.success(`✓ Hash transformation added for ${key}`);
        break;

      case 'rename':
        transformation = {
          id: makeTransformationId('rename'),
          title: `Rename ${key}`,
          description: `Rename attribute key ${key}`,
          category: 'attribute',
          isEnabled: true,
          signal: 'trace',
          compatibleSignals: ['trace', 'metric', 'log'],
          config: { type: 'rename', field: key, newName: `${key}_renamed` },
        };
        toast.success(`✓ Rename transformation added for ${key}. Edit to set new name.`);
        break;

      case 'replace':
        transformation = {
          id: makeTransformationId('replace'),
          title: `Replace ${key} value`,
          description: `Replace value in ${key}`,
          category: 'formatting',
          isEnabled: true,
          signal: 'trace',
          compatibleSignals: ['trace', 'log'],
          config: { type: 'replace', field: key, oldValue: String(value), newValue: 'REDACTED' },
        };
        toast.success(`✓ Replace transformation added for ${key}. Edit to set new value.`);
        break;

      case 'move-to-resource':
        transformation = {
          id: makeTransformationId('move-resource'),
          title: `Move ${key} to Resource`,
          description: `Move ${key} from span to resource scope`,
          category: 'attribute',
          isEnabled: true,
          signal: 'trace',
          compatibleSignals: ['trace'],
          config: { type: 'move', field: key, from: 'span', to: 'resource' },
        };
        toast.success(`✓ Move transformation added for ${key}`);
        break;

      case 'move-to-span':
        transformation = {
          id: makeTransformationId('move-span'),
          title: `Move ${key} to Span`,
          description: `Move ${key} from resource to span scope`,
          category: 'attribute',
          isEnabled: true,
          signal: 'trace',
          compatibleSignals: ['trace'],
          config: { type: 'move', field: key, from: 'resource', to: 'span' },
        };
        toast.success(`✓ Move transformation added for ${key}`);
        break;

      case 'add-attribute':
        transformation = {
          id: makeTransformationId('add'),
          title: 'Add New Attribute',
          description: 'Add a new attribute to telemetry',
          category: 'attribute',
          isEnabled: true,
          signal: 'trace',
          compatibleSignals: ['trace', 'metric', 'log'],
          config: { type: 'add', field: 'new_attribute', value: 'default_value' },
        };
        toast.success('✓ Add attribute transformation created. Edit to configure.');
        break;

      default:
        toast.error(`Unsupported action: ${action}`);
        return;
    }

    if (transformation) {
      setTransformations((prev) => [...prev, transformation]);
      if (!hasCustomRawOttl) {
        setRawOttl(generateDefaultOttl());
      }
    }
  };

  const activeSample = samples[currentSampleIndex] ?? null;
  const transformedSample = useMemo(() => {
    if (!activeSample) return null;
    
    // If user has custom OTTL edits, apply the raw OTTL interpreter
    if (hasCustomRawOttl && rawOttl) {
      return applyRawOttl(activeSample, rawOttl);
    }
    
    // Otherwise, apply UI transformations
    return applyTransformations(activeSample, transformations);
  }, [activeSample, transformations, hasCustomRawOttl, rawOttl]);

  const totalSamples = samples.length;

  return (
    <AppShell>
      <HeaderBar 
        onExport={handleExportOttl}
        showExport={transformations.length > 0}
      />

      <div className="container mx-auto px-4 py-4 max-w-7xl pb-14 text-text-primary">
        <input
          type="file"
          accept=".json,.jsonl,.txt"
          multiple
          ref={fileInputRef}
          className="hidden"
          onChange={(event) => {
            handleMultiFileSelection(event.target.files);
            if (event.target) {
              event.target.value = '';
            }
          }}
        />
        {/* Compact Toolbar - Only show when samples exist */}
        {samples.length > 0 && (
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <Button
                size="sm"
                variant="bordered"
                className="border border-border/60 text-text-primary hover:bg-secondary/20"
                startContent={<Upload size={16} />}
                isDisabled={isProcessingSample}
                isLoading={isProcessingSample}
                onPress={() => fileInputRef.current?.click()}
              >
                Upload New Sample
              </Button>
              {uploadedFileName && (
                <span className="text-sm text-text-secondary">
                  <span className="font-medium text-text-primary">{uploadedFileName}</span>
                  <span className="ml-2 text-text-secondary/60">({samples.length} records)</span>
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              {transformations.length > 0 && (
                <Button
                  size="sm"
                  variant="light"
                  className="text-text-secondary hover:text-text-primary"
                  startContent={<PencilLine size={14} />}
                  onPress={handleOpenRawEditor}
                >
                  Edit Raw OTTL
                </Button>
              )}
            </div>
          </div>
        )}

        {/* Empty State - Show when no samples uploaded */}
        {samples.length === 0 && !isProcessingSample && (
          <div className="flex flex-col items-center justify-center py-16 px-8 text-center">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-6">
              <Upload size={32} className="text-primary" />
            </div>
            <h2 className="text-2xl font-semibold text-text-primary mb-3">
              Upload Your Telemetry
            </h2>
            <p className="text-text-secondary max-w-md mb-6">
              Upload a JSON or JSONL file containing your OTLP telemetry data. 
              We'll analyze it and suggest transformations to optimize your pipeline.
            </p>
            <Button
              size="lg"
              color="primary"
              startContent={<Upload size={20} />}
              onPress={() => fileInputRef.current?.click()}
            >
              Upload Telemetry Sample
            </Button>
            <p className="text-xs text-text-secondary/60 mt-4">
              Supports OTLP JSON, JSONL, and key=value formats
            </p>
          </div>
        )}

        {/* Main Content Grid - Show when samples exist */}
        {samples.length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-7 xl:grid-cols-12 gap-6 text-text-primary items-stretch">
            {/* Transformations Column */}
            <div className="lg:col-span-4 xl:col-span-5 flex">
              <Card
                shadow="md"
                radius="lg"
                className="bg-surface/95 border border-border/60 flex flex-col w-full min-h-[400px] max-h-[calc(100vh-10rem)]"
              >
                <CardHeader className="flex flex-col px-4 py-3 flex-shrink-0 gap-3">
                  <div className="flex justify-between items-center w-full">
                    <h3 className="text-lg font-semibold text-text-primary">Pipeline</h3>
                    <div className="flex items-center gap-2">
                      <Button
                        isIconOnly
                        size="sm"
                        variant="light"
                        className="text-text-secondary hover:text-text-primary"
                        onPress={() => setIsTransformationsModalOpen(true)}
                        aria-label="Expand transformations"
                      >
                        <Maximize2 size={16} />
                      </Button>
                      <Button
                        size="sm"
                        color="primary"
                        startContent={<Plus size={16} />}
                        onPress={() => setIsAddModalOpen(true)}
                      >
                        Add
                      </Button>
                    </div>
                  </div>
                  <SignalTabs
                    activeSignal={activeSignal}
                    onSignalChange={setActiveSignal}
                    tracesCount={signalCounts.trace}
                    metricsCount={signalCounts.metric}
                    logsCount={signalCounts.log}
                    compact
                  />
                </CardHeader>
                <CardBody className="px-4 pt-2 pb-6 overflow-y-auto flex-1 min-h-[280px]">
                  {filteredTransformations.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full min-h-[200px] text-center">
                      <p className="text-text-secondary text-sm mb-3">
                        No {activeSignal === 'trace' ? 'trace' : activeSignal === 'metric' ? 'metric' : 'log'} transformations yet
                      </p>
                      <Button
                        size="sm"
                        variant="flat"
                        color="primary"
                        startContent={<Plus size={14} />}
                        onPress={() => setIsAddModalOpen(true)}
                      >
                        Add Transformation
                      </Button>
                    </div>
                  ) : (
                    <TransformationList
                      transformations={filteredTransformations}
                      onReorder={(reordered) => {
                        // Merge reordered signal transformations back into full list
                        const otherSignals = transformations.filter((t) => (t.signal ?? 'trace') !== activeSignal);
                        setTransformations([...otherSignals, ...reordered]);
                      }}
                      onToggle={handleToggle}
                      onEdit={handleEdit}
                      onDelete={handleDelete}
                    />
                  )}
                </CardBody>
              </Card>
            </div>

            {/* Right Column - Preview & Impact */}
            <div className="lg:col-span-3 xl:col-span-7 flex" ref={previewSectionRef}>
              <LivePreviewPanel
                currentStep={Math.min(transformations.length, transformations.length)}
                totalSteps={transformations.length}
                currentSample={currentSampleIndex + 1}
                totalSamples={totalSamples}
                before={activeSample}
                after={transformedSample}
                onSampleChange={(sample) => {
                  const nextIndex = Math.min(Math.max(sample - 1, 0), totalSamples - 1);
                  setCurrentSampleIndex(nextIndex);
                }}
                onReplayAll={() => toast('Replaying the pipeline over uploaded samples...')}
                onFieldAction={(field) => toast.info(`Selected ${field} for quick actions.`)}
                availableActions={previewQuickActions}
                onQuickAction={handlePreviewQuickAction}
                onAttributeAction={handleAttributeAction}
                isLoading={isProcessingSample}
                errorMessage={sampleError ?? undefined}
                onExpandRequest={() => setIsPreviewModalOpen(true)}
              />
            </div>
          </div>
        )}

      </div>

      {/* Transformations Expanded Modal */}
      <Modal
        isOpen={isTransformationsModalOpen}
        onClose={() => setIsTransformationsModalOpen(false)}
        size="5xl"
        scrollBehavior="inside"
        hideCloseButton
        classNames={{ base: 'max-h-[90vh] max-w-[1220px] w-[96vw]', closeButton: 'hidden' }}
      >
        <ModalContent className="bg-surface/95 border border-border/60 text-text-primary">
          <ModalHeader className="flex flex-col gap-3">
            <div className="flex items-center justify-between w-full">
              <div>
                <h2 className="text-xl font-semibold">Pipeline Configuration</h2>
                <p className="text-sm text-text-secondary">Configure transformations for all signal types</p>
              </div>
              <Button
                isIconOnly
                variant="light"
                className="text-text-secondary hover:text-text-primary"
                onPress={() => setIsTransformationsModalOpen(false)}
                aria-label="Close transformations modal"
              >
                <X size={18} />
              </Button>
            </div>
            <SignalTabs
              activeSignal={activeSignal}
              onSignalChange={setActiveSignal}
              tracesCount={signalCounts.trace}
              metricsCount={signalCounts.metric}
              logsCount={signalCounts.log}
            />
          </ModalHeader>
          <ModalBody className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-text-secondary text-sm">
                <Chip size="sm" variant="flat" className="border border-border/60 bg-background-soft/70 text-xs">
                  {filteredTransformations.length} {activeSignal} transformations
                </Chip>
              </div>
              <Button
                size="sm"
                color="primary"
                startContent={<Plus size={16} />}
                onPress={() => {
                  setIsAddModalOpen(true);
                  setIsTransformationsModalOpen(false);
                }}
              >
                Add Transformation
              </Button>
            </div>
            {filteredTransformations.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <p className="text-text-secondary mb-3">
                  No {activeSignal} transformations configured
                </p>
                <Button
                  size="sm"
                  color="primary"
                  startContent={<Plus size={14} />}
                  onPress={() => {
                    setIsAddModalOpen(true);
                    setIsTransformationsModalOpen(false);
                  }}
                >
                  Add {activeSignal === 'trace' ? 'Trace' : activeSignal === 'metric' ? 'Metric' : 'Log'} Transformation
                </Button>
              </div>
            ) : (
              <TransformationList
                transformations={filteredTransformations}
                onReorder={(reordered) => {
                  const otherSignals = transformations.filter((t) => (t.signal ?? 'trace') !== activeSignal);
                  setTransformations([...otherSignals, ...reordered]);
                }}
                onToggle={handleToggle}
                onEdit={handleEdit}
                onDelete={handleDelete}
              />
            )}
          </ModalBody>
        </ModalContent>
      </Modal>

      {/* Live Preview Expanded Modal */}
      <Modal
        isOpen={isPreviewModalOpen}
        onClose={() => setIsPreviewModalOpen(false)}
        size="5xl"
        scrollBehavior="inside"
        hideCloseButton
        classNames={{ base: 'max-h-[95vh] max-w-[1280px] w-[97vw]', closeButton: 'hidden' }}
      >
        <ModalContent className="bg-surface/95 border border-border/60 text-text-primary">
          <ModalHeader className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-semibold">Live Preview</h2>
              <p className="text-sm text-text-secondary">Full-screen before/after comparison</p>
            </div>
            <Button
              isIconOnly
              variant="light"
              className="text-text-secondary hover:text-text-primary"
              onPress={() => setIsPreviewModalOpen(false)}
              aria-label="Close live preview modal"
            >
              <X size={18} />
            </Button>
          </ModalHeader>
          <ModalBody>
            <LivePreviewPanel
              currentStep={Math.min(transformations.length, transformations.length)}
              totalSteps={transformations.length}
              currentSample={currentSampleIndex + 1}
              totalSamples={totalSamples}
              before={activeSample}
              after={transformedSample}
              onSampleChange={(sample) => {
                const nextIndex = Math.min(Math.max(sample - 1, 0), totalSamples - 1);
                setCurrentSampleIndex(nextIndex);
              }}
              onReplayAll={() => toast('Replaying the pipeline over uploaded samples...')}
              onFieldAction={(field) => toast.info(`Selected ${field} for quick actions.`)}
              availableActions={previewQuickActions}
              onQuickAction={handlePreviewQuickAction}
              onAttributeAction={handleAttributeAction}
              isLoading={isProcessingSample}
              errorMessage={sampleError ?? undefined}
              variant="modal"
            />
          </ModalBody>
        </ModalContent>
      </Modal>


      {/* Signal Counts Footer */}
      {transformations.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 bg-surface/98 backdrop-blur-sm border-t border-border/50 z-50">
          <div className="container mx-auto px-4 py-2 max-w-7xl">
            <div className="flex items-center justify-start gap-6 text-xs">
              <span className="flex items-center gap-1.5 text-purple-400">
                <span className="w-2 h-2 rounded-full bg-purple-400" />
                <span className="font-semibold">{signalCounts.trace}</span> traces
              </span>
              <span className="flex items-center gap-1.5 text-green-400">
                <span className="w-2 h-2 rounded-full bg-green-400" />
                <span className="font-semibold">{signalCounts.metric}</span> metrics
              </span>
              <span className="flex items-center gap-1.5 text-blue-400">
                <span className="w-2 h-2 rounded-full bg-blue-400" />
                <span className="font-semibold">{signalCounts.log}</span> logs
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Add Transformation Modal */}
      <AddTransformationModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onAdd={handleAddTransformation}
        transformationTypes={defaultTransformations}
      />
      <RawOttlEditorModal
        isOpen={isRawEditorOpen}
        initialValue={hasCustomRawOttl ? rawOttl : generateDefaultOttl()}
        onSave={handleSaveRawOttl}
        onClose={handleCloseRawEditor}
        onRevert={handleRevertRawOttl}
        hasCustomEdits={hasCustomRawOttl}
        transformationCount={transformations.filter((t) => t.isEnabled !== false).length}
      />
    </AppShell>
  );
}

export default App;
