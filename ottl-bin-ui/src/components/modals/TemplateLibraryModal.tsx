import { useEffect, useMemo, useState } from 'react';
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
  Tooltip,
} from '@heroui/react';
import { Check, Search, Sparkles } from 'lucide-react';

import type { TransformationType } from './AddTransformationModal';
import { defaultTransformations } from './AddTransformationModal';

export interface TemplateEstimatedImpact {
  storageReduction?: number;
  monthlySavings?: number;
  recordsAffected?: number;
  totalRecords?: number;
  attributeReduction?: number;
}

export interface TransformationTemplate {
  id: string;
  name: string;
  category: string;
  description: string;
  transformations: string[];
  estimatedImpact?: TemplateEstimatedImpact;
}

interface TemplateLibraryModalProps {
  isOpen: boolean;
  onClose: () => void;
  templates: TransformationTemplate[];
  onApplyTemplate: (template: TransformationTemplate) => void;
  transformationCatalog?: TransformationType[];
}

const formatImpactChips = (impact?: TemplateEstimatedImpact) => {
  if (!impact) return [] as string[];

  const chips: string[] = [];

  if (typeof impact.storageReduction === 'number') {
    chips.push(`-${impact.storageReduction}% storage`);
  }

  if (typeof impact.monthlySavings === 'number') {
    chips.push(`$${impact.monthlySavings.toLocaleString()} / mo`);
  }

  if (typeof impact.recordsAffected === 'number') {
    const total = typeof impact.totalRecords === 'number' ? impact.totalRecords : undefined;
    if (total && total > 0) {
      const pct = Math.round((impact.recordsAffected / total) * 100);
      chips.push(`${impact.recordsAffected.toLocaleString()} records (${pct}%)`);
    } else {
      chips.push(`${impact.recordsAffected.toLocaleString()} records`);
    }
  }

  if (typeof impact.attributeReduction === 'number') {
    chips.push(`${impact.attributeReduction} attrs trimmed`);
  }

  return chips;
};

export function TemplateLibraryModal({
  isOpen,
  onClose,
  templates,
  onApplyTemplate,
  transformationCatalog = defaultTransformations,
}: TemplateLibraryModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [appliedTemplates, setAppliedTemplates] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!isOpen) {
      setSearchQuery('');
      setSelectedCategory('all');
      setAppliedTemplates(new Set());
    }
  }, [isOpen]);

  const categories = useMemo(() => {
    const unique = new Set<string>();
    templates.forEach((template) => unique.add(template.category));
    return ['all', ...Array.from(unique)];
  }, [templates]);

  const catalogLookup = useMemo(() => {
    const lookup = new Map<string, TransformationType>();
    transformationCatalog.forEach((type) => {
      lookup.set(type.id, type);
    });
    return lookup;
  }, [transformationCatalog]);

  const filteredTemplates = useMemo(() => {
    const trimmedQuery = searchQuery.trim().toLowerCase();
    return templates.filter((template) => {
      const matchesSearch =
        trimmedQuery.length === 0 ||
        template.name.toLowerCase().includes(trimmedQuery) ||
        template.description.toLowerCase().includes(trimmedQuery);
      const matchesCategory =
        selectedCategory === 'all' || template.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [templates, searchQuery, selectedCategory]);

  const isApplied = (id: string) => appliedTemplates.has(id);

  const handleApply = (template: TransformationTemplate) => {
    onApplyTemplate(template);
    setAppliedTemplates((prev) => {
      const next = new Set(prev);
      next.add(template.id);
      return next;
    });
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="3xl"
      scrollBehavior="inside"
      classNames={{ base: 'max-h-[90vh]' }}
    >
      <ModalContent className="bg-surface/95 border border-border/70 text-text-primary">
        <ModalHeader className="flex flex-col gap-1 bg-surface-soft/80">
          <div className="flex items-center gap-2">
            <Sparkles className="text-secondary" size={18} />
            <h2 className="text-xl font-semibold">Template Library</h2>
          </div>
          <p className="text-sm text-text-secondary">
            Jump-start your pipeline with curated collections of transformations.
          </p>
        </ModalHeader>

        <ModalBody className="space-y-5">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <Input
              size="sm"
              value={searchQuery}
              onValueChange={setSearchQuery}
              startContent={<Search size={16} className="text-text-secondary/70" />}
              placeholder="Search templates..."
              classNames={{
                inputWrapper: 'bg-background-soft/80 border border-border/60',
                input: 'text-sm text-text-primary',
              }}
            />
            <Tabs
              selectedKey={selectedCategory}
              onSelectionChange={(key) => setSelectedCategory(String(key))}
              variant="bordered"
              className="max-w-full"
            >
              {categories.map((category) => (
                <Tab key={category} title={category === 'all' ? 'All' : category} />
              ))}
            </Tabs>
          </div>

          {filteredTemplates.length === 0 ? (
            <div className="rounded-xl border border-border/60 bg-background-soft/80 py-12 text-center text-text-secondary">
              <p className="text-sm">No templates found.</p>
              <p className="text-xs mt-1 text-text-secondary/70">
                Adjust your search or pick a different category.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {filteredTemplates.map((template) => {
                const applied = isApplied(template.id);
                const impact = template.estimatedImpact;
                const impactChips = formatImpactChips(impact);
                return (
                  <Card
                    key={template.id}
                    shadow="sm"
                    className={`border transition-shadow bg-surface-soft/90 ${
                      applied
                        ? 'border-success/70 ring-1 ring-success/30'
                        : 'border-border/60 hover:border-primary/50 hover:shadow-lg/25'
                    }`}
                  >
                    <CardBody className="p-4 flex flex-col gap-3">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-xs uppercase tracking-wide text-text-secondary/60">
                            {template.category}
                          </p>
                          <h3 className="text-sm font-semibold text-text-primary">
                            {template.name}
                          </h3>
                        </div>
                        <Chip
                          size="sm"
                          variant="flat"
                          className="bg-background-soft/80 border border-border/60 text-text-secondary"
                        >
                          {template.transformations.length} steps
                        </Chip>
                      </div>

                      <p className="text-xs leading-relaxed text-text-secondary/90">
                        {template.description}
                      </p>

                      <div className="flex flex-wrap gap-2">
                        {template.transformations.map((transformationId) => {
                          const transformation = catalogLookup.get(transformationId);
                          const label = transformation?.name ?? transformationId;
                          return (
                            <Chip
                              key={`${template.id}-${transformationId}`}
                              size="sm"
                              variant="flat"
                              className="bg-background-soft/85 border border-border/60 text-text-secondary"
                            >
                              {label}
                            </Chip>
                          );
                        })}
                      </div>

                      {impactChips.length > 0 && (
                        <div className="flex flex-wrap gap-2 text-xs">
                          {impactChips.map((chip, index) => (
                            <Chip
                              key={`${template.id}-impact-${index}`}
                              size="sm"
                              variant="flat"
                              className="bg-background-soft/85 border border-border/50 text-text-secondary"
                            >
                              {chip}
                            </Chip>
                          ))}
                        </div>
                      )}

                      <div className="flex justify-end">
                        <Tooltip
                          content={
                            applied
                              ? 'Template already applied to pipeline'
                              : 'Apply all transformations in this template'
                          }
                          placement="top"
                        >
                          <Button
                            size="sm"
                            color={applied ? 'success' : 'primary'}
                            variant={applied ? 'solid' : 'flat'}
                            startContent={applied ? <Check size={14} /> : <Sparkles size={14} />}
                            onPress={() => handleApply(template)}
                            isDisabled={applied}
                            className={applied ? 'text-white' : ''}
                          >
                            {applied ? 'Applied' : 'Apply template'}
                          </Button>
                        </Tooltip>
                      </div>
                    </CardBody>
                  </Card>
                );
              })}
            </div>
          )}
        </ModalBody>

        <ModalFooter className="bg-surface-soft/80 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap gap-2">
            <Button
              variant="flat"
              className="bg-background-soft/70 text-text-secondary"
              onPress={() => {
                setSearchQuery('');
                setSelectedCategory('all');
              }}
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
            Done
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
