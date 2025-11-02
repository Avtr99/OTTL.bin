import { useMemo, useState } from 'react';
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
  Input,
  Tabs,
  Tab,
  Card,
  CardBody,
  Chip,
} from '@heroui/react';
import { Search, Plus, Check } from 'lucide-react';
import { toast } from 'sonner';
import type { TransformationSignal } from '../transformations/TransformationList';

export interface TransformationType {
  id: string;
  name: string;
  description: string;
  category:
    | 'attribute'
    | 'parsing'
    | 'privacy'
    | 'filtering'
    | 'deletion'
    | 'metric'
    | 'formatting'
    | 'advanced';
  icon?: string;
  signal?: TransformationSignal;
  compatibleSignals?: TransformationSignal[]; // Which signals this transformation works with
}

interface AddTransformationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (transformationType: TransformationType) => void;
  transformationTypes?: TransformationType[];
}

export const defaultTransformations: TransformationType[] = [
  // Attribute Operations
  {
    id: 'add-static-attribute',
    name: 'Add Static Attribute',
    description: 'Add a new key/value pair to the payload.',
    category: 'attribute',
  },
  {
    id: 'derive-from-substring',
    name: 'Derive from Substring',
    description: 'Extract characters by index range from an attribute.',
    category: 'attribute',
  },
  {
    id: 'concatenate-multiple',
    name: 'Concatenate Multiple',
    description: 'Join attributes together with separators.',
    category: 'attribute',
  },
  {
    id: 'split-and-extract',
    name: 'Split & Extract',
    description: 'Split values by delimiter and pull specific parts.',
    category: 'attribute',
  },
  {
    id: 'case-conversion',
    name: 'Case Conversion',
    description: 'Convert attribute values to snake_case, camelCase, etc.',
    category: 'attribute',
  },
  {
    id: 'copy-between-scopes',
    name: 'Copy Between Scopes',
    description: 'Move attributes across resource, span, log, or datapoint scopes.',
    category: 'attribute',
  },

  // Parsing & Extraction
  {
    id: 'parse-json-body',
    name: 'Parse JSON Body',
    description: 'Extract structured data from JSON payloads.',
    category: 'parsing',
  },
  {
    id: 'parse-xml',
    name: 'Parse XML',
    description: 'Use XPath-style selectors to read XML content.',
    category: 'parsing',
  },
  {
    id: 'extract-regex-pattern',
    name: 'Extract Regex Patterns',
    description: 'Capture named groups from regex matches.',
    category: 'parsing',
  },
  {
    id: 'parse-user-agent',
    name: 'Parse User Agent',
    description: 'Break user agent strings into browser, OS, and device fields.',
    category: 'parsing',
  },

  // Privacy & Masking
  {
    id: 'mask-with-pattern',
    name: 'Mask with Pattern',
    description: 'Use regex replacements to redact secrets.',
    category: 'privacy',
  },
  {
    id: 'hash-attributes',
    name: 'Hash Attributes',
    description: 'Hash values using SHA256, Murmur3, or MD5.',
    category: 'privacy',
  },
  {
    id: 'mask-sensitive-data',
    name: 'Mask Sensitive Data',
    description: 'Replace sensitive values like passwords or tokens with asterisks.',
    category: 'privacy',
    compatibleSignals: ['trace', 'log'],
  },
  {
    id: 'hash-pii',
    name: 'Hash PII',
    description: 'Hash personally identifiable information using SHA-256.',
    category: 'privacy',
    compatibleSignals: ['trace', 'metric', 'log'],
  },
  {
    id: 'redact-with-wildcards',
    name: 'Redact with Wildcards',
    description: 'Normalize IDs and URLs using wildcard masks.',
    category: 'privacy',
  },
  {
    id: 'partial-masking',
    name: 'Partial Masking',
    description: 'Reveal only the first/last characters of sensitive strings.',
    category: 'privacy',
  },

  // Filtering & Cost Control
  {
    id: 'drop-by-condition',
    name: 'Drop by Condition',
    description: 'Filter records using query builder rules.',
    category: 'filtering',
  },
  {
    id: 'sample-telemetry',
    name: 'Sample Telemetry',
    description: 'Reduce volume with smart or deterministic sampling.',
    category: 'filtering',
  },
  {
    id: 'limit-attribute-count',
    name: 'Limit Attribute Count',
    description: 'Keep the most important attributes and drop the rest.',
    category: 'filtering',
  },
  {
    id: 'truncate-values',
    name: 'Truncate Values',
    description: 'Enforce max string length with ellipsis previews.',
    category: 'filtering',
  },

  // Deletion
  {
    id: 'delete-specific-attributes',
    name: 'Delete Specific Attributes',
    description: 'Remove selected attributes from telemetry.',
    category: 'deletion',
  },
  {
    id: 'keep-only-listed',
    name: 'Keep Only Listed',
    description: 'Whitelist attributes and drop everything else.',
    category: 'deletion',
  },
  {
    id: 'remove-by-pattern',
    name: 'Remove by Pattern',
    description: 'Use regex patterns to drop groups of attributes.',
    category: 'deletion',
  },

  // Metric-Specific
  {
    id: 'convert-metric-type',
    name: 'Convert Metric Type',
    description: 'Convert between sum, gauge, and histogram signals.',
    category: 'metric',
    signal: 'metric',
    compatibleSignals: ['metric'],
  },
  {
    id: 'set-metric-metadata',
    name: 'Set Metric Metadata',
    description: 'Update metric descriptions, units, and display types.',
    category: 'metric',
    signal: 'metric',
    compatibleSignals: ['metric'],
  },
  {
    id: 'datapoint-operations',
    name: 'Datapoint Operations',
    description: 'Adjust datapoint values or attributes per sample.',
    category: 'metric',
    signal: 'metric',
    compatibleSignals: ['metric'],
  },
  {
    id: 'scale-values',
    name: 'Scale Values',
    description: 'Multiply or divide metric values to convert units.',
    category: 'metric',
    signal: 'metric',
    compatibleSignals: ['metric'],
  },
  {
    id: 'convert-sum-to-gauge',
    name: 'Convert Sum to Gauge',
    description: 'Use convert_sum_to_gauge() to turn sum metrics into gauges.',
    category: 'metric',
    signal: 'metric',
    compatibleSignals: ['metric'],
  },
  {
    id: 'extract-count-metric',
    name: 'Extract Count Metric',
    description: 'Create a new metric from histogram or summary counts.',
    category: 'metric',
    signal: 'metric',
    compatibleSignals: ['metric'],
  },
  {
    id: 'extract-sum-metric',
    name: 'Extract Sum Metric',
    description: 'Create a new metric from histogram or summary sums.',
    category: 'metric',
    signal: 'metric',
    compatibleSignals: ['metric'],
  },
  {
    id: 'convert-summary-count-to-sum',
    name: 'Summary Count to Sum',
    description: 'Use convert_summary_count_val_to_sum() for summary datapoints.',
    category: 'metric',
    signal: 'metric',
    compatibleSignals: ['metric'],
  },
  {
    id: 'summary-quantile-to-gauge',
    name: 'Summary Quantile to Gauge',
    description: 'Convert summary quantiles into gauge metrics.',
    category: 'metric',
    signal: 'metric',
    compatibleSignals: ['metric'],
  },
  {
    id: 'convert-summary-sum-to-sum',
    name: 'Summary Sum to Sum',
    description: 'Normalize summary sums using convert_summary_sum_val_to_sum().',
    category: 'metric',
    signal: 'metric',
    compatibleSignals: ['metric'],
  },
  {
    id: 'copy-metric',
    name: 'Copy Metric',
    description: 'Duplicate metric streams with copy_metric().',
    category: 'metric',
    signal: 'metric',
    compatibleSignals: ['metric'],
  },
  {
    id: 'aggregate-on-attributes',
    name: 'Aggregate on Attributes',
    description: 'Roll up datapoints grouped by selected attributes.',
    category: 'metric',
    signal: 'metric',
    compatibleSignals: ['metric'],
  },
  {
    id: 'convert-exp-histogram',
    name: 'Convert Exponential Histogram',
    description: 'Convert exponential histograms to standard histograms.',
    category: 'metric',
    signal: 'metric',
    compatibleSignals: ['metric'],
  },
  {
    id: 'aggregate-on-attribute-value',
    name: 'Aggregate on Attribute Value',
    description: 'Roll up datapoints grouped by a specific attribute value.',
    category: 'metric',
    signal: 'metric',
    compatibleSignals: ['metric'],
  },
  {
    id: 'merge-histogram-buckets',
    name: 'Merge Histogram Buckets',
    description: 'Combine histogram buckets into aggregated buckets.',
    category: 'metric',
    signal: 'metric',
    compatibleSignals: ['metric'],
  },

  // Formatting & Presentation
  {
    id: 'format-strings',
    name: 'Format Strings',
    description: 'Use templates and placeholders to reshape strings.',
    category: 'formatting',
  },
  {
    id: 'format-timestamps',
    name: 'Format Timestamps',
    description: 'Convert timestamps into readable formats.',
    category: 'formatting',
  },
  {
    id: 'normalize-units',
    name: 'Normalize Units',
    description: 'Convert between ms↔s, bytes↔MB, and more.',
    category: 'formatting',
  },
  {
    id: 'sort-arrays',
    name: 'Sort Arrays',
    description: 'Sort array attributes ascending or descending.',
    category: 'formatting',
  },

  // Advanced Operations
  {
    id: 'type-conversion',
    name: 'Type Conversion',
    description: 'Cast values to integers, doubles, durations, and more.',
    category: 'advanced',
  },
  {
    id: 'body-remapping',
    name: 'Body Remapping',
    description: 'Move values between log.body and attributes.',
    category: 'advanced',
  },
  {
    id: 'severity-adjustment',
    name: 'Severity Adjustment',
    description: 'Normalize log severity levels or map custom levels.',
    category: 'advanced',
  },
  {
    id: 'cache-variables',
    name: 'Cache Variables',
    description: 'Store reusable values for later transformation steps.',
    category: 'advanced',
  },
  {
    id: 'custom-ottl',
    name: 'Custom OTTL',
    description: 'Write raw OTTL statements for advanced scenarios.',
    category: 'advanced',
  },
];

const categoryChipStyles: Record<TransformationType['category'], string> = {
  attribute: 'bg-success/90 text-success-foreground border border-success/70 shadow-sm',
  parsing: 'bg-secondary/90 text-secondary-foreground border border-secondary/70 shadow-sm',
  privacy: 'bg-warning/90 text-black border border-warning/70 shadow-sm',
  filtering: 'bg-primary/85 text-primary-foreground border border-primary/70 shadow-sm',
  deletion: 'bg-danger/85 text-danger-foreground border border-danger/70 shadow-sm',
  metric: 'bg-background-soft/80 text-text-primary border border-border/70 shadow-sm',
  formatting: 'bg-secondary/80 text-secondary-foreground border border-secondary/60 shadow-sm',
  advanced: 'bg-primary/90 text-primary-foreground border border-primary/80 shadow-sm',
};

/**
 * AddTransformationModal - Transformation catalog
 * Browse and select transformations to add to pipeline
 */
export function AddTransformationModal({
  isOpen,
  onClose,
  onAdd,
  transformationTypes = defaultTransformations,
}: AddTransformationModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [recentlyAdded, setRecentlyAdded] = useState<Set<string>>(new Set());

  const categories = [
    { key: 'all', label: 'All' },
    { key: 'attribute', label: '🟢 Attribute' },
    { key: 'parsing', label: '🟣 Parsing' },
    { key: 'privacy', label: '🟡 Privacy' },
    { key: 'filtering', label: '🟠 Filtering' },
    { key: 'deletion', label: '🔴 Deletion' },
    { key: 'metric', label: '⚙️ Metric' },
    { key: 'formatting', label: '🎨 Formatting' },
    { key: 'advanced', label: '🔧 Advanced' },
  ];

  const filteredTransformations = useMemo(() => {
    return transformationTypes.filter((t) => {
      const matchesSearch =
        searchQuery === '' ||
        t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.description.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesCategory =
        selectedCategory === 'all' || t.category === selectedCategory;

      return matchesSearch && matchesCategory;
    });
  }, [searchQuery, selectedCategory, transformationTypes]);

  const handleAdd = (transformation: TransformationType) => {
    onAdd(transformation);
    setRecentlyAdded((prev) => new Set(prev).add(transformation.id));
    toast.success(`${transformation.name} added to pipeline`);
  };

  const handleClearFilters = () => {
    setSearchQuery('');
    setSelectedCategory('all');
  };

  const isRecentlyAdded = (id: string) => recentlyAdded.has(id);

  if (!isOpen && recentlyAdded.size > 0) {
    setRecentlyAdded(new Set());
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="3xl"
      scrollBehavior="inside"
      classNames={{
        base: 'max-h-[90vh]',
      }}
    >
      <ModalContent>
        <ModalHeader className="flex flex-col gap-1 bg-surface-soft/80">
          <h2 className="text-xl font-semibold text-text-primary">Add Transformation</h2>
          <p className="text-sm font-normal text-text-secondary">
            Choose a transformation to add to your pipeline
          </p>
        </ModalHeader>

        <ModalBody className="py-4 bg-surface/95 text-text-primary">
          {/* Search */}
          <Input
            placeholder="Search transformations..."
            value={searchQuery}
            onValueChange={setSearchQuery}
            startContent={<Search size={18} className="text-text-secondary/70" />}
            variant="bordered"
            size="lg"
            classNames={{
              input: 'text-sm text-text-primary',
              inputWrapper: 'bg-background-soft/80 border-border/60',
            }}
          />

          {/* Category Tabs */}
          <Tabs
            selectedKey={selectedCategory}
            onSelectionChange={(key) => setSelectedCategory(key as string)}
            variant="underlined"
            classNames={{
              tabList: 'gap-6 text-text-secondary',
              cursor: 'bg-primary/20',
            }}
          >
            {categories.map((category) => (
              <Tab key={category.key} title={category.label} />
            ))}
          </Tabs>

          {/* Transformation Grid */}
          <div className="grid grid-cols-2 gap-3 mt-2">
            {filteredTransformations.length === 0 ? (
              <div className="col-span-2 text-center py-12 text-text-secondary">
                <p>No transformations found</p>
                <p className="text-sm mt-1 text-text-secondary/80">Try a different search or category</p>
              </div>
            ) : (
              filteredTransformations.map((transformation) => {
                const added = isRecentlyAdded(transformation.id);
                return (
                  <Card
                    key={transformation.id}
                    isPressable={!added}
                    onPress={() => !added && handleAdd(transformation)}
                    shadow="sm"
                    className={`bg-surface-soft/90 border border-border/60 hover:border-primary/40 hover:shadow-lg/30 transition-shadow ${
                      added ? 'border-success/60 ring-1 ring-success/30 bg-success/5' : ''
                    }`}
                  >
                    <CardBody className="p-4">
                      <div className="flex items-start justify-between mb-2">
                        <h3 className="font-semibold text-sm text-text-primary">
                          {transformation.name}
                        </h3>
                        <Chip
                          size="sm"
                          variant="flat"
                          className={`capitalize px-2 py-1 text-[11px] ${categoryChipStyles[transformation.category]}`}
                        >
                          {transformation.category}
                        </Chip>
                      </div>
                      <p className="text-xs text-text-secondary line-clamp-2">
                        {transformation.description}
                      </p>
                      <div className="mt-3 flex justify-end">
                        <Button
                          size="sm"
                          color={added ? 'success' : 'primary'}
                          variant={added ? 'solid' : 'flat'}
                          startContent={added ? <Check size={14} /> : <Plus size={14} />}
                          className={`border border-primary/40 transition ${added ? 'bg-success/30 text-white' : ''}`}
                          onPress={() => handleAdd(transformation)}
                          isDisabled={added}
                        >
                          {added ? 'Added' : 'Add'}
                        </Button>
                      </div>
                    </CardBody>
                  </Card>
                );
              })
            )}
          </div>
        </ModalBody>

        <ModalFooter className="bg-surface-soft/80 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap gap-2">
            <Button
              variant="flat"
              className="bg-background-soft/70 text-text-secondary"
              onPress={handleClearFilters}
            >
              Clear filters
            </Button>
            <Button
              variant="flat"
              className="bg-background-soft/70 text-text-secondary"
              onPress={onClose}
            >
              Close
            </Button>
          </div>
          <Button variant="light" className="bg-background-soft/70 text-text-secondary" onPress={onClose}>
            Cancel
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
