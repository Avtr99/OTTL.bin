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

// Simplified transformation list - plain language, common use cases first
export const defaultTransformations: TransformationType[] = [
  // Most Common - Privacy & Security (what users typically need first)
  {
    id: 'mask-sensitive-data',
    name: 'Mask Passwords & Secrets',
    description: 'Replace sensitive values with asterisks (e.g., password=***)',
    category: 'privacy',
    compatibleSignals: ['trace', 'log'],
  },
  {
    id: 'hash-pii',
    name: 'Hash Email & PII',
    description: 'One-way hash for emails, user IDs, etc. (keeps analytics, hides data)',
    category: 'privacy',
    compatibleSignals: ['trace', 'metric', 'log'],
  },

  // Common - Cleanup & Deletion
  {
    id: 'delete-specific-attributes',
    name: 'Delete Attribute',
    description: 'Remove an attribute you don\'t need',
    category: 'deletion',
  },
  {
    id: 'keep-only-listed',
    name: 'Keep Only These',
    description: 'Keep specific attributes, delete everything else',
    category: 'deletion',
  },

  // Common - Modify
  {
    id: 'add-static-attribute',
    name: 'Add Attribute',
    description: 'Add a new attribute with a fixed value',
    category: 'attribute',
  },
  {
    id: 'copy-between-scopes',
    name: 'Move Attribute',
    description: 'Move between resource, span, or log scopes',
    category: 'attribute',
  },

  // Filtering
  {
    id: 'drop-by-condition',
    name: 'Drop Records',
    description: 'Remove entire records that match a condition',
    category: 'filtering',
  },
  {
    id: 'sample-telemetry',
    name: 'Sample Traffic',
    description: 'Keep only a percentage of records to reduce volume',
    category: 'filtering',
  },

  // Advanced - Parsing
  {
    id: 'extract-regex-pattern',
    name: 'Extract with Regex',
    description: 'Pull values from text using patterns',
    category: 'parsing',
  },
  {
    id: 'parse-json-body',
    name: 'Parse JSON',
    description: 'Extract fields from JSON strings',
    category: 'parsing',
  },

  // Advanced - Formatting
  {
    id: 'truncate-values',
    name: 'Truncate Long Values',
    description: 'Shorten strings that exceed a max length',
    category: 'formatting',
  },

  // Metric-Specific (shown only when relevant)
  {
    id: 'convert-metric-type',
    name: 'Convert Metric Type',
    description: 'Change between sum, gauge, and histogram',
    category: 'metric',
    signal: 'metric',
    compatibleSignals: ['metric'],
  },
  {
    id: 'scale-values',
    name: 'Scale Metric Values',
    description: 'Multiply or divide values (e.g., bytes to KB)',
    category: 'metric',
    signal: 'metric',
    compatibleSignals: ['metric'],
  },
];

// Muted category styles - consistent, subtle differentiation
const categoryChipStyles: Record<TransformationType['category'], string> = {
  attribute: 'bg-slate-700/50 text-slate-200 border border-slate-600/50',
  parsing: 'bg-slate-700/50 text-slate-200 border border-slate-600/50',
  privacy: 'bg-slate-700/50 text-slate-200 border border-slate-600/50',
  filtering: 'bg-slate-700/50 text-slate-200 border border-slate-600/50',
  deletion: 'bg-danger/20 text-danger border border-danger/30',
  metric: 'bg-slate-700/50 text-slate-200 border border-slate-600/50',
  formatting: 'bg-slate-700/50 text-slate-200 border border-slate-600/50',
  advanced: 'bg-slate-700/50 text-slate-200 border border-slate-600/50',
};

/**
 * AddTransformationModal - Transformation catalog
 * Browse and select transformations to add to pipeline
 */
const categoryMeta: Record<
  TransformationType['category'] | 'all',
  { label: string; short: string; icon: string }
> = {
  all: { label: 'All', short: 'ALL', icon: '★' },
  attribute: { label: 'Attribute', short: 'ATTR', icon: '🧩' },
  parsing: { label: 'Parsing', short: 'PARSE', icon: '🛠️' },
  privacy: { label: 'Privacy', short: 'PRIV', icon: '🔒' },
  filtering: { label: 'Filtering', short: 'FILTER', icon: '⏳' },
  deletion: { label: 'Deletion', short: 'DEL', icon: '🗑️' },
  metric: { label: 'Metric', short: 'METRIC', icon: '📈' },
  formatting: { label: 'Formatting', short: 'FMT', icon: '🎨' },
  advanced: { label: 'Advanced', short: 'ADV', icon: '🔧' },
};

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
    { key: 'all', label: `${categoryMeta.all.icon} ${categoryMeta.all.label}` },
    { key: 'attribute', label: `${categoryMeta.attribute.icon} ${categoryMeta.attribute.label} (${categoryMeta.attribute.short})` },
    { key: 'parsing', label: `${categoryMeta.parsing.icon} ${categoryMeta.parsing.label} (${categoryMeta.parsing.short})` },
    { key: 'privacy', label: `${categoryMeta.privacy.icon} ${categoryMeta.privacy.label} (${categoryMeta.privacy.short})` },
    { key: 'filtering', label: `${categoryMeta.filtering.icon} ${categoryMeta.filtering.label} (${categoryMeta.filtering.short})` },
    { key: 'deletion', label: `${categoryMeta.deletion.icon} ${categoryMeta.deletion.label} (${categoryMeta.deletion.short})` },
    { key: 'metric', label: `${categoryMeta.metric.icon} ${categoryMeta.metric.label} (${categoryMeta.metric.short})` },
    { key: 'formatting', label: `${categoryMeta.formatting.icon} ${categoryMeta.formatting.label} (${categoryMeta.formatting.short})` },
    { key: 'advanced', label: `${categoryMeta.advanced.icon} ${categoryMeta.advanced.label} (${categoryMeta.advanced.short})` },
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
            className="w-full"
            classNames={{
              tabList: 'flex-nowrap gap-6 text-text-secondary overflow-x-auto no-scrollbar',
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
