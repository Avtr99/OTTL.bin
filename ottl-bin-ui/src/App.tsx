import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AppShell } from './components/layout/AppShell';
import { HeaderBar } from './components/layout/HeaderBar';
import { TransformationList } from './components/transformations/TransformationList';
import type { Transformation, TransformationSignal } from './components/transformations/TransformationList';
import { LivePreviewPanel } from './components/preview/LivePreviewPanel';
import type { LivePreviewQuickAction, LivePreviewDiffEntry } from './components/preview/LivePreviewPanel';
import { SuggestionPanel } from './components/suggestions/SuggestionPanel';
import type { Suggestion } from './components/suggestions/SuggestionPanel';
import { CostImpactPanel } from './components/impact/CostImpactPanel';
import type { ImpactMetrics } from './components/impact/CostImpactPanel';
import { AddTransformationModal, defaultTransformations } from './components/modals/AddTransformationModal';
import type { TransformationType } from './components/modals/AddTransformationModal';
import { TemplateLibraryModal } from './components/modals/TemplateLibraryModal';
import type { TransformationTemplate } from './components/modals/TemplateLibraryModal';
import { RawOttlEditorModal } from './components/ottl/RawOttlEditorModal';
import {
  Card,
  CardBody,
  CardHeader,
  Button,
  Chip,
  Select,
  SelectItem,
} from '@heroui/react';
import type { Selection } from '@heroui/react';
import { Plus, Upload, PencilLine, FileDown, EyeOff, Trash2, Fingerprint } from 'lucide-react';
import { toast } from 'sonner';

type TelemetryRecord = Record<string, unknown>;

const makeTransformationId = (prefix: string) => `${prefix}-${Date.now()}`;

const advancedTemplates: TransformationTemplate[] = [
  {
    id: 'template-pii-essentials',
    name: 'PII Protection Essentials',
    category: 'Security & Privacy',
    description: 'Mask emails, hash identifiers, and redact secrets from telemetry streams.',
    transformations: ['mask-with-pattern', 'hash-attributes', 'redact-with-wildcards'],
    estimatedImpact: {
      storageReduction: 8,
      monthlySavings: 110,
      recordsAffected: 180,
      totalRecords: 250,
    },
  },
  {
    id: 'template-cost-control',
    name: 'Cost Control Starter',
    category: 'Cost Optimization',
    description: 'Trim high-cardinality attributes and sample noisy traffic to cut storage.',
    transformations: ['sample-telemetry', 'limit-attribute-count', 'truncate-values'],
    estimatedImpact: {
      storageReduction: 18,
      monthlySavings: 240,
      recordsAffected: 220,
      totalRecords: 250,
    },
  },
  {
    id: 'template-http-cleanup',
    name: 'HTTP Telemetry Cleanup',
    category: 'Operations',
    description: 'Parse JSON payloads, remove noisy attributes, and keep request context tidy.',
    transformations: ['parse-json-body', 'remove-by-pattern', 'delete-specific-attributes'],
    estimatedImpact: {
      storageReduction: 12,
      monthlySavings: 150,
      recordsAffected: 160,
      totalRecords: 250,
    },
  },
];

type StatementContext = 'span' | 'spanevent' | 'resource' | 'scope' | 'metric' | 'datapoint' | 'log';

interface BuiltStatement {
  statement: string;
  context: StatementContext;
}

interface StatementDetails extends BuiltStatement {
  signal: TransformationSignal;
  transformation: Transformation;
}

const buildTraceStatement = (transformation: Transformation): BuiltStatement => {
  switch (transformation.title) {
    case 'Mask Passwords':
      return {
        context: 'span',
        statement:
          'replace_pattern(span.attributes["process.command_line"], "password=([^\\s]+)", "password=********")',
      };
    case 'Hash Email Addresses':
      return {
        context: 'span',
        statement: 'set(span.attributes["user.email"], sha256(span.attributes["user.email"]))',
      };
    case 'Sample High-Volume Traces':
      return {
        context: 'span',
        statement:
          'set(span.attributes["telemetry.sample.keep"], true) where span.attributes["service.name"] in ["health-check", "cron"]',
      };
    default:
      if (transformation.category === 'privacy') {
        return {
          context: 'span',
          statement:
            'replace_pattern(span.attributes["user.password"], "(?i)(password=)([^&\\"\\s]+)", "$${1}********")',
        };
      }
      if (transformation.category === 'filtering') {
        return {
          context: 'span',
          statement: 'keep_keys(span.attributes, ["service.name", "telemetry.priority"])',
        };
      }
      return { context: 'span', statement: 'noop()' };
  }
};

const buildMetricStatement = (transformation: Transformation): BuiltStatement => {
  switch (transformation.title) {
    case 'Convert Metric Type':
      return {
        context: 'metric',
        statement: 'convert_gauge_to_sum("cumulative", false) where metric.type == "Gauge"',
      };
    case 'Set Metric Metadata':
      return {
        context: 'metric',
        statement: 'set(metric.description, "Updated description")',
      };
    case 'Datapoint Operations':
      return { context: 'metric', statement: 'scale_metric(1.0)' };
    case 'Scale Values':
      return { context: 'metric', statement: 'scale_metric(0.1, "kWh")' };
    default:
      return { context: 'metric', statement: 'noop()' };
  }
};

const buildLogStatement = (transformation: Transformation): BuiltStatement => {
  switch (transformation.title) {
    case 'Mask Passwords':
      return {
        context: 'log',
        statement: 'replace_pattern(log.body, "(?i)(password=)([^&\\"\\s]+)", "$${1}********")',
      };
    case 'Hash Email Addresses':
      return {
        context: 'log',
        statement: 'set(log.attributes["user.email"], sha256(log.attributes["user.email"]))',
      };
    default:
      if (transformation.category === 'privacy') {
        return {
          context: 'log',
          statement: 'replace_pattern(log.body, "(?i)(token=)([^&\\"\\s]+)", "$${1}********")',
        };
      }
      if (transformation.category === 'filtering') {
        return {
          context: 'log',
          statement: 'set(log.severity_text, "INFO") where log.severity_number < 9',
        };
      }
      return { context: 'log', statement: 'noop()' };
  }
};

const buildStatement = (transformation: Transformation): StatementDetails => {
  const signal = transformation.signal ?? 'trace';

  if (signal === 'metric') {
    const built = buildMetricStatement(transformation);
    return { ...built, signal, transformation };
  }

  if (signal === 'log') {
    const built = buildLogStatement(transformation);
    return { ...built, signal, transformation };
  }

  const built = buildTraceStatement(transformation);
  return { ...built, signal: 'trace', transformation };
};

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
      switch (transformation.title) {
        case 'Mask Passwords': {
          if (typeof cloned['process.command_line'] === 'string') {
            cloned['process.command_line'] = maskCommandLineSecrets(
              cloned['process.command_line'],
            );
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
  const [transformations, setTransformations] = useState<Transformation[]>([
    {
      id: '1',
      title: 'Mask Passwords',
      description: 'Pattern: password=VALUE in process.command_line',
      category: 'privacy',
      isEnabled: true,
      recordsAffected: '23/250 records',
      sizeChange: '<1%',
      signal: 'trace',
      compatibleSignals: ['trace', 'log'],
    },
    {
      id: '2',
      title: 'Hash Email Addresses',
      description: 'SHA256 hash for user.email attribute',
      category: 'privacy',
      isEnabled: true,
      recordsAffected: '250/250 records',
      sizeChange: '+2%',
      signal: 'trace',
      compatibleSignals: ['trace', 'metric', 'log'],
    },
    {
      id: '3',
      title: 'Sample High-Volume Traces',
      description: 'Keep 10% of health check traces',
      category: 'filtering',
      isEnabled: false,
      recordsAffected: '180/250 records',
      sizeChange: '-45%',
      signal: 'trace',
      compatibleSignals: ['trace'],
    },
  ]);

  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [impactMetrics, setImpactMetrics] = useState<ImpactMetrics>();

  const defaultSample: TelemetryRecord = {
    'trace.id': 'abc123',
    'user.email': 'user@example.com',
    'process.command_line': 'app --password=secret123',
    'http.status_code': 200,
  };

  const [samples, setSamples] = useState<TelemetryRecord[]>([defaultSample]);
  const [currentSampleIndex, setCurrentSampleIndex] = useState(0);
  const [isProcessingSample, setIsProcessingSample] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const previewSectionRef = useRef<HTMLDivElement>(null);
  const [sampleError, setSampleError] = useState<string | null>(null);
  const [rawOttl, setRawOttl] = useState('');
  const [hasCustomRawOttl, setHasCustomRawOttl] = useState(false);
  const [isRawEditorOpen, setIsRawEditorOpen] = useState(false);

  const telemetrySources = useMemo(
    () => [
      {
        id: 'anz-payments-prod',
        name: 'ANZ Payments • Production',
        environment: 'prod-ap-southeast-2',
        recordsPerHour: 48000,
        activeSamples: 250,
        description: 'Real-time banking spans across payment gateways and fraud detection services.',
        lastSynced: '2 minutes ago',
        costBefore: 7200,
        costAfter: 2100,
        avgRecordSizeBefore: 1820,
        avgRecordSizeAfter: 980,
        storageReduction: 46,
        attributeReduction: 14,
        sizeReduction: '3.1 MB',
        removedAttributes: [
          'resource.attributes.aws.lambda.memory_limit',
          'span.attributes.net.peer.name',
          'span.attributes.http.request.body',
          'span.attributes.db.statement',
          'span.attributes.telemetry.sdk.version',
        ],
        suggestionInsights: {
          sensitiveCount: 23,
          highAttributeCount: 67,
          largeValueCount: 12,
          missingTraceIds: 9,
          errorSpikeRate: 8,
          unsampledRate: 32,
        },
      },
      {
        id: 'anz-analytics-dev',
        name: 'ANZ Analytics • Staging',
        environment: 'staging-ap-southeast-2',
        recordsPerHour: 8200,
        activeSamples: 120,
        description: 'Synthetic telemetry used for integration testing of data science pipelines.',
        lastSynced: '12 minutes ago',
        costBefore: 1850,
        costAfter: 950,
        avgRecordSizeBefore: 1120,
        avgRecordSizeAfter: 760,
        storageReduction: 31,
        attributeReduction: 7,
        sizeReduction: '1.2 MB',
        removedAttributes: ['span.attributes.debug.payload', 'span.attributes.temp.trace_id'],
        suggestionInsights: {
          sensitiveCount: 3,
          highAttributeCount: 29,
          largeValueCount: 7,
          missingTraceIds: 0,
          errorSpikeRate: 2,
          unsampledRate: 18,
        },
      },
      {
        id: 'anz-observability-shared',
        name: 'Observability Shared Cluster',
        environment: 'prod-us-east-1',
        recordsPerHour: 109000,
        activeSamples: 250,
        description: 'Central collector for platform services spanning multiple product teams.',
        lastSynced: '45 seconds ago',
        costBefore: 9200,
        costAfter: 4100,
        avgRecordSizeBefore: 2050,
        avgRecordSizeAfter: 1430,
        storageReduction: 39,
        attributeReduction: 18,
        sizeReduction: '4.6 MB',
        removedAttributes: [
          'span.attributes.debug.raw_sql',
          'log.attributes.stacktrace',
          'resource.attributes.k8s.pod.annotations',
        ],
        suggestionInsights: {
          sensitiveCount: 11,
          highAttributeCount: 84,
          largeValueCount: 26,
          missingTraceIds: 14,
          errorSpikeRate: 17,
          unsampledRate: 46,
        },
      },
    ],
    [],
  );

  const [selectedTelemetrySourceId, setSelectedTelemetrySourceId] = useState(
    telemetrySources[0]?.id ?? 'default-telemetry-source',
  );

  const selectedTelemetrySource = useMemo(
    () =>
      telemetrySources.find((source) => source.id === selectedTelemetrySourceId) ?? telemetrySources[0],
    [telemetrySources, selectedTelemetrySourceId],
  );

  useEffect(() => {
    if (!selectedTelemetrySource) return;

    const {
      costBefore,
      costAfter,
      avgRecordSizeBefore,
      avgRecordSizeAfter,
      storageReduction,
      attributeReduction,
      sizeReduction,
      removedAttributes,
      recordsPerHour,
      activeSamples,
      suggestionInsights,
      name,
    } = selectedTelemetrySource;

    setImpactMetrics({
      storageReduction,
      attributeReduction,
      sizeReduction,
      removedAttributes,
      estimatedMonthlyCostBefore: costBefore,
      estimatedMonthlyCostAfter: costAfter,
      monthlySavings: costBefore - costAfter,
      averageRecordSizeBefore: avgRecordSizeBefore,
      averageRecordSizeAfter: avgRecordSizeAfter,
      recordsAffected: Math.round(activeSamples * (storageReduction / 100)),
      totalRecords: activeSamples,
      recordsPerHour,
      sourceName: name,
    });

    if (suggestionInsights) {
      const nextSuggestions: Suggestion[] = [];

      if (suggestionInsights.sensitiveCount > 0) {
        nextSuggestions.push({
          id: 'suggestion-sensitive',
          type: 'sensitive-data',
          title: 'Sensitive Data Detected',
          description: `Found ${suggestionInsights.sensitiveCount} spans containing secrets or passwords.`,
          guidance:
            'Use masking or hashing so secrets never leave your environment. Dash0 applies redaction before shipping telemetry.',
          recommendation: 'Apply the PII Protection Essentials template or run the Mask Passwords transformation.',
          severity: 'warning',
          count: suggestionInsights.sensitiveCount,
          onAutoFix: () => toast.success('Masking transformation applied for detected secrets.'),
        });
      }

      if (suggestionInsights.highAttributeCount > 40) {
        nextSuggestions.push({
          id: 'suggestion-attributes',
          type: 'high-attributes',
          title: 'Attribute Volume Exceeds Target',
          description: `Average attribute count is ~${suggestionInsights.highAttributeCount}. Aim for fewer than 40 per record.`,
          guidance:
            'Large attribute payloads slow down dashboards and increase storage costs. Trimming to critical fields improves performance.',
          recommendation: 'Use Limit Attribute Count or Drop by Condition to focus on key fields.',
          severity: 'info',
          onAutoFix: () => toast.success('Added Limit Attribute Count transformation.'),
        });
      }

      if (suggestionInsights.largeValueCount > 0) {
        nextSuggestions.push({
          id: 'suggestion-large-values',
          type: 'large-values',
          title: 'Oversized attribute values',
          description: `${suggestionInsights.largeValueCount} attributes exceed recommended payload size.`,
          guidance:
            'Large payloads often include verbose request bodies. Truncating or parsing improves search speed.',
          recommendation: 'Consider Truncate Values or Split & Extract to slim these attributes.',
          severity: 'info',
        });
      }

      if (suggestionInsights.unsampledRate > 30) {
        nextSuggestions.push({
          id: 'suggestion-unsampled',
          type: 'unsampled-traffic',
          title: 'High Unsampled Traffic',
          description: `${suggestionInsights.unsampledRate}% of spans are always kept.`,
          guidance:
            'Sampling low-value traffic keeps costs predictable while preserving critical signals.',
          recommendation: 'Introduce Sample Telemetry for health checks, cron jobs, and synthetic probes.',
          severity: 'warning',
        });
      }

      if (suggestionInsights.missingTraceIds > 0) {
        nextSuggestions.push({
          id: 'suggestion-trace-id',
          type: 'missing-trace-ids',
          title: 'Trace IDs Missing',
          description: `${suggestionInsights.missingTraceIds} spans lack trace identifiers.`,
          guidance:
            'Missing trace IDs break end-to-end correlation. Ensure ingestion pipelines set trace context before export.',
          recommendation: 'Use Type Conversion or Add Static Attribute to backfill trace.id when available.',
          severity: 'warning',
        });
      }

      if (suggestionInsights.errorSpikeRate > 10) {
        nextSuggestions.push({
          id: 'suggestion-error-spike',
          type: 'error-spikes',
          title: 'Error spike detected',
          description: `Error logs grew by ${suggestionInsights.errorSpikeRate}% hour-over-hour.`,
          guidance:
            'Spikes often correlate with rapid rollouts. Capture deployment metadata and ensure errors contain actionable context.',
          recommendation: 'Enable Release Observability template or add Severity Adjustment to normalize levels.',
          severity: 'warning',
        });
      }

      setSuggestions(nextSuggestions);
    }
  }, [selectedTelemetrySource]);

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);

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
    switch (transformation.title) {
      case 'Mask Passwords':
        return {
          context: 'span',
          statement:
            'replace_pattern(span.attributes["process.command_line"], "password=([^\\s]+)", "password=********")',
        };
      case 'Hash Email Addresses':
        return {
          context: 'span',
          statement: 'set(span.attributes["user.email"], sha256(span.attributes["user.email"]))',
        };
      case 'Sample High-Volume Traces':
        return {
          context: 'span',
          statement:
            'set(span.attributes["telemetry.sample.keep"], true) where span.attributes["service.name"] in ["health-check", "cron"]',
        };
      default:
        if (transformation.category === 'privacy') {
          return {
            context: 'span',
            statement:
              'replace_pattern(span.attributes["user.password"], "(?i)(password=)([^&\\"\\s]+)", "$${1}********")',
          };
        }
        if (transformation.category === 'filtering') {
          return {
            context: 'span',
            statement: 'keep_keys(span.attributes, ["service.name", "telemetry.priority"])',
          };
        }
        return { context: 'span', statement: 'noop()' };
    }
  };

  const buildMetricStatement = (transformation: Transformation): BuiltStatement => {
    switch (transformation.title) {
      case 'Convert Metric Type':
        return {
          context: 'metric',
          statement: 'convert_gauge_to_sum("cumulative", false) where metric.type == "Gauge"',
        };
      case 'Set Metric Metadata':
        return {
          context: 'metric',
          statement: 'set(metric.description, "Updated description")',
        };
      case 'Datapoint Operations':
        return { context: 'metric', statement: 'scale_metric(1.0)' };
      case 'Scale Values':
        return { context: 'metric', statement: 'scale_metric(0.1, "kWh")' };
      default:
        return { context: 'metric', statement: 'noop()' };
    }
  };

  const buildLogStatement = (transformation: Transformation): BuiltStatement => {
    switch (transformation.title) {
      case 'Mask Passwords':
        return {
          context: 'log',
          statement: 'replace_pattern(log.body, "(?i)(password=)([^&\\"\\s]+)", "$${1}********")',
        };
      case 'Hash Email Addresses':
        return {
          context: 'log',
          statement: 'set(log.attributes["user.email"], sha256(log.attributes["user.email"]))',
        };
      default:
        if (transformation.category === 'privacy') {
          return {
            context: 'log',
            statement: 'replace_pattern(log.body, "(?i)(token=)([^&\\"\\s]+)", "$${1}********")',
          };
        }
        if (transformation.category === 'filtering') {
          return {
            context: 'log',
            statement: 'set(log.severity_text, "INFO") where log.severity_number < 9',
          };
        }
        return { context: 'log', statement: 'noop()' };
    }
  };

  const buildStatement = (transformation: Transformation): StatementDetails => {
    const signal = transformation.signal ?? 'trace';

    if (signal === 'metric') {
      const built = buildMetricStatement(transformation);
      return { ...built, signal, transformation };
    }

    if (signal === 'log') {
      const built = buildLogStatement(transformation);
      return { ...built, signal, transformation };
    }

    const built = buildTraceStatement(transformation);
    return { ...built, signal: 'trace', transformation };
  };

  const generateDefaultOttl = useCallback((): string => {
    const enabledTransformations = transformations.filter((transformation) => transformation.isEnabled !== false);

    const lines: string[] = [
      '# Generated OTTL configuration',
      selectedTelemetrySource
        ? `# Source: ${selectedTelemetrySource.name} (${selectedTelemetrySource.environment})`
        : '# Source: Active telemetry selection',
      'transform:',
      '  error_mode: ignore',
    ];

    if (enabledTransformations.length === 0) {
      lines.push('  trace_statements:', '    - noop()');
      return lines.join('\n');
    }

    const statementGroups = enabledTransformations
      .map(buildStatement)
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

    (['trace', 'metric', 'log'] as TransformationSignal[]).forEach((signal) => {
      const contexts = statementGroups[signal];
      const orderedContexts = [
        ...contextOrderBySignal[signal].filter((context) => contexts[context]?.length),
        ...Object.keys(contexts).filter((context) => !contextOrderBySignal[signal].includes(context as StatementContext)),
      ];

      if (orderedContexts.length === 0) {
        return;
      }

      lines.push(`  ${signal}_statements:`);

      orderedContexts.forEach((contextKey) => {
        const context = contextKey as StatementContext;
        const entries = contexts[context] ?? [];
        if (!entries || entries.length === 0) {
          return;
        }

        lines.push(`    - context: ${context}`);
        lines.push('      statements:');

        entries.forEach(({ transformation, statement }: StatementDetails) => {
          const comments = [
            transformation.title ? `        # ${transformation.title}` : undefined,
            transformation.description ? `        # ${transformation.description}` : undefined,
          ].filter(Boolean) as string[];

          lines.push(...comments, `        - ${statement}`);
        });
      });
    });

    return lines.join('\n');
  }, [selectedTelemetrySource, transformations, buildStatement]);

  useEffect(() => {
    if (!hasCustomRawOttl) {
      setRawOttl(generateDefaultOttl());
    }
  }, [generateDefaultOttl, hasCustomRawOttl]);

  const handleTelemetrySelectionChange = (keys: Selection) => {
    const next = Array.from(keys)[0];
    if (typeof next === 'string') {
      setSelectedTelemetrySourceId(next);
      if (!hasCustomRawOttl) {
        setRawOttl(generateDefaultOttl());
      }
    }
  };

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

  const handleExportOttl = async () => {
    const ottl = hasCustomRawOttl ? rawOttl : generateDefaultOttl();
    try {
      await navigator.clipboard.writeText(ottl);
      toast.success('OTTL copied to clipboard');
    } catch (error) {
      toast.error('Unable to copy to clipboard. Please copy manually.');
    }
  };

  const handleExportWorkspace = () => {
    toast.success('Workspace export prepared (YAML + metadata)');
  };

  const handleReorder = (reordered: Transformation[]) => {
    setTransformations(reordered);
    toast('Transformations reordered');
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
    const newTransformation: Transformation = {
      id: makeTransformationId(type.id),
      title: type.name,
      description: type.description,
      category: type.category,
      isEnabled: true,
      signal: type.signal,
      compatibleSignals: type.compatibleSignals,
    };
    setTransformations((prev) => [...prev, newTransformation]);
    toast.success(`Added: ${type.name}`);
    if (!hasCustomRawOttl) {
      setRawOttl(generateDefaultOttl());
    }
  };

  const handleFileSelection = (fileList: FileList | null) => {
    const file = fileList?.[0];
    if (!file) return;

    setSampleError(null);
    setSamples([]);
    setCurrentSampleIndex(0);
    setIsProcessingSample(true);
    const toastId = toast.loading('Loading telemetry sample...');
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result;
      if (typeof content !== 'string') {
        toast.error('Unable to read file contents', { id: toastId });
        setSampleError('We could not read the uploaded file. Please try another sample or re-export the data.');
        setIsProcessingSample(false);
        return;
      }

      try {
        const parsed = parseTelemetryText(content).slice(0, 250);
        if (parsed.length === 0) {
          toast.error('No valid telemetry records found in file', { id: toastId });
          setSampleError('We could not detect valid telemetry entries. Provide JSON, JSONL, or key=value lines exported from your telemetry platform.');
          return;
        }

        setSamples(parsed);
        setCurrentSampleIndex(0);
        setSampleError(null);
        toast.success(`Loaded ${parsed.length} sample records`, { id: toastId });
      } catch (error) {
        toast.error('Failed to parse sample data. Ensure valid JSON or JSONL format.', { id: toastId });
        setSampleError('Dash0 could not parse this file. Confirm the export is valid JSON, JSONL, or plain key=value pairs.');
        setSamples([]);
      } finally {
        setIsProcessingSample(false);
      }
    };

    reader.onerror = () => {
      toast.error('Unable to read file contents', { id: toastId });
      setSampleError('We hit a read error while opening the file. Please retry the upload.');
      setIsProcessingSample(false);
    };

    reader.readAsText(file);
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

  const activeSample = samples[currentSampleIndex] ?? null;
  const transformedSample = useMemo(
    () => (activeSample ? applyTransformations(activeSample, transformations) : null),
    [activeSample, transformations],
  );

  const totalSamples = samples.length;

  return (
    <AppShell>
      <HeaderBar
        onTemplateClick={() => setIsTemplateModalOpen(true)}
        onWorkspaceExport={handleExportWorkspace}
        userName="Demo User"
      />

      <div className="container mx-auto px-4 py-6 max-w-7xl pb-36 text-text-primary">
        <input
          type="file"
          accept=".json,.jsonl,.txt"
          ref={fileInputRef}
          className="hidden"
          onChange={(event) => {
            handleFileSelection(event.target.files);
            if (event.target) {
              event.target.value = '';
            }
          }}
        />
        {/* Pipeline Header */}
        <Card shadow="sm" radius="lg" className="mb-6 bg-surface/95 border border-border/60 shadow-lg/30">
          <CardBody className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex-1 w-full">
              <h2 className="text-xl font-semibold text-text-primary tracking-tight">
                My Transformation Pipeline
              </h2>
              <div className="flex gap-2 mt-2 flex-wrap">
                <Chip size="sm" color="primary" variant="flat" className="border border-primary/40 bg-primary/15 text-primary-foreground font-semibold">
                  Telemetry Signals
                </Chip>
                <Chip size="sm" variant="flat" className="border border-border/60 bg-surface-soft/80 text-text-secondary">
                  {transformations.length} transformations
                </Chip>
              </div>
              {selectedTelemetrySource && (
                <div className="mt-3 flex flex-wrap gap-2 text-xs text-text-secondary/80">
                  <Chip size="sm" variant="flat" className="border border-border/60 bg-background-soft/70 text-text-secondary">
                    {selectedTelemetrySource.environment}
                  </Chip>
                  <Chip size="sm" variant="flat" className="border border-border/60 bg-background-soft/70 text-text-secondary">
                    {selectedTelemetrySource.recordsPerHour.toLocaleString()} spans/hour
                  </Chip>
                  <Chip size="sm" variant="flat" className="border border-border/60 bg-background-soft/70 text-text-secondary">
                    {selectedTelemetrySource.lastSynced} • {selectedTelemetrySource.activeSamples} samples
                  </Chip>
                </div>
              )}
            </div>
            <div className="w-full lg:w-72">
              <Select
                aria-label="Select telemetry source"
                selectedKeys={new Set([selectedTelemetrySourceId])}
                onSelectionChange={handleTelemetrySelectionChange}
                variant="bordered"
                classNames={{
                  listbox: 'text-text-primary max-h-64',
                  trigger: 'bg-background-soft/80 border-border/60 text-sm',
                }}
              >
                {telemetrySources.map((source) => (
                  <SelectItem key={source.id} textValue={source.name}>
                    <div className="flex flex-col">
                      <span className="text-sm font-medium text-text-primary">{source.name}</span>
                      <span className="text-xs text-text-secondary/70">{source.description}</span>
                    </div>
                  </SelectItem>
                ))}
              </Select>
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="bordered"
                className="border border-border/60 text-text-primary hover:bg-secondary/20"
                startContent={<Upload size={16} />}
                isDisabled={isProcessingSample}
                isLoading={isProcessingSample}
                onPress={() => fileInputRef.current?.click()}
              >
                Upload Sample
              </Button>
              <Button
                variant="flat"
                color="primary"
                startContent={<PencilLine size={16} />}
                className="bg-primary/15 border border-primary/40 text-text-primary"
                onPress={handleOpenRawEditor}
              >
                Edit Raw OTTL
              </Button>
              <Button
                variant="bordered"
                color="secondary"
                startContent={<FileDown size={16} />}
                className="border-secondary/50 text-text-primary hover:bg-secondary/15"
                onPress={handleExportOttl}
              >
                Export OTTL
              </Button>
            </div>
          </CardBody>
        </Card>

        {/* Smart Suggestions */}
        <Card shadow="md" radius="lg" className="mb-6 w-full bg-surface/95 border border-border/60">
          <CardHeader className="px-4 py-3 border-b border-border/60 flex items-center gap-2">
            <span className="text-lg font-semibold text-text-primary">Smart Suggestions</span>
            <Chip size="sm" variant="flat" className="border border-border/60 bg-background-soft/70 text-text-secondary">
              Real-time insights
            </Chip>
          </CardHeader>
          <CardBody className="px-4 py-4">
            {suggestions.length > 0 ? (
              <SuggestionPanel suggestions={suggestions} />
            ) : (
              <p className="text-sm text-text-secondary">
                All clear! We will surface optimization opportunities here once telemetry is loaded.
              </p>
            )}
          </CardBody>
        </Card>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-7 xl:grid-cols-12 gap-6 text-text-primary">
          {/* Transformations Column */}
          <div className="lg:col-span-4 xl:col-span-5 space-y-6">
            <Card shadow="md" radius="lg" className="bg-surface/95 border border-border/60">
              <CardHeader className="flex justify-between items-center px-4 py-3">
                <h3 className="text-lg font-semibold text-text-primary">Transformations</h3>
                <Button
                  size="sm"
                  color="primary"
                  startContent={<Plus size={16} />}
                  onPress={() => setIsAddModalOpen(true)}
                >
                  Add Transformation
                </Button>
              </CardHeader>
              <CardBody className="px-4 py-4">
                <TransformationList
                  transformations={transformations}
                  onReorder={handleReorder}
                  onToggle={handleToggle}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                />
              </CardBody>
            </Card>
          </div>

          {/* Right Column - Preview & Impact */}
          <div className="lg:col-span-3 xl:col-span-7" ref={previewSectionRef}>
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
              isLoading={isProcessingSample}
              errorMessage={sampleError ?? undefined}
            />
          </div>
        </div>

        {/* Cost & Impact Analysis */}
        <div className="mt-6">
          <CostImpactPanel metrics={impactMetrics} />
        </div>
      </div>

      {/* Bottom Action Bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-surface/95/98 backdrop-blur border-t border-border/70 shadow-2xl/40 z-50">
        <div className="container mx-auto px-4 py-5 max-w-7xl">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between text-text-secondary text-sm">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-semibold text-text-primary">{transformations.length}</span>
              <span>transformations</span>
              <span className="text-text-secondary/60">•</span>
              <span>
                <span className="font-semibold text-text-primary">
                  {transformations.filter((t) => t.isEnabled).length}
                </span>{' '}
                enabled
              </span>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <Button
                variant="light"
                className="bg-background-soft/70 text-text-primary hover:bg-secondary/15"
                onPress={() => {
                  previewSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                  toast('Preview refreshes the before/after panel above with your latest transformations.');
                }}
              >
                Preview
              </Button>
              <Button
                variant="bordered"
                color="primary"
                onPress={handleExportOttl}
              >
                Export OTTL
              </Button>
              <Button
                variant="bordered"
                className="border-secondary/60 text-text-primary hover:bg-secondary/20"
                startContent={<PencilLine size={16} />}
                onPress={handleOpenRawEditor}
              >
                Edit Raw OTTL
              </Button>
              <Button color="success" onPress={() => toast.success('Deploying to Dash0...')}>
                Deploy
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Add Transformation Modal */}
      <TemplateLibraryModal
        isOpen={isTemplateModalOpen}
        onClose={() => setIsTemplateModalOpen(false)}
        templates={advancedTemplates}
        transformationCatalog={defaultTransformations}
        onApplyTemplate={(template) => {
          const lookup = new Map(defaultTransformations.map((type) => [type.id, type]));
          const templateTypes = template.transformations
            .map((identifier) => lookup.get(identifier))
            .filter((type): type is TransformationType => Boolean(type));
          templateTypes.forEach((type) => handleAddTransformation(type));
          toast.success(`Applied template: ${template.name}`);
        }}
      />
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
