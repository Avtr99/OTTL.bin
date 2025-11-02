import { useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  Card,
  CardHeader,
  CardBody,
  Button,
  Chip,
  Tabs,
  Tab,
  Spinner,
  Tooltip,
} from '@heroui/react';
import {
  ChevronLeft,
  ChevronRight,
  Play,
  Sparkles,
  Wand2,
  ShieldCheck,
  AlertTriangle,
  PencilLine,
} from 'lucide-react';

type PreviewRecord = Record<string, unknown> | null;

export interface LivePreviewPanelProps {
  currentStep: number;
  totalSteps: number;
  currentSample: number;
  totalSamples: number;
  before: PreviewRecord;
  after: PreviewRecord;
  onSampleChange?: (sample: number) => void;
  onReplayAll?: () => void;
  onFieldAction?: (field: string, value: unknown) => void;
  availableActions?: LivePreviewQuickAction[];
  onQuickAction?: (actionId: string, entry: DiffEntry) => void;
  isLoading?: boolean;
  errorMessage?: string;
}

export interface LivePreviewQuickAction {
  id: string;
  label: string;
  description: string;
  tone?: 'primary' | 'secondary' | 'success' | 'warning' | 'danger';
  icon?: ReactNode;
}

export type LivePreviewDiffEntry = DiffEntry;

interface FlattenedEntry {
  key: string;
  value: unknown;
}

interface DiffEntry extends FlattenedEntry {
  status: 'added' | 'removed' | 'modified' | 'unchanged';
  previous?: unknown;
}

const flattenRecord = (record: PreviewRecord, prefix = ''): FlattenedEntry[] => {
  if (!record) return [];

  return Object.entries(record).flatMap(([key, value]) => {
    const path = prefix ? `${prefix}.${key}` : key;
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      return flattenRecord(value as Record<string, unknown>, path);
    }
    return [{ key: path, value }];
  });
};

const buildDiff = (before: PreviewRecord, after: PreviewRecord): DiffEntry[] => {
  const beforeEntries = flattenRecord(before);
  const afterEntries = flattenRecord(after);

  const beforeMap = new Map(beforeEntries.map((entry) => [entry.key, entry.value]));
  const afterMap = new Map(afterEntries.map((entry) => [entry.key, entry.value]));

  const keys = new Set([...beforeMap.keys(), ...afterMap.keys()]);

  return Array.from(keys).map((key) => {
    const prev = beforeMap.get(key);
    const next = afterMap.get(key);

    if (prev === undefined && next !== undefined) {
      return { key, value: next, status: 'added' } satisfies DiffEntry;
    }

    if (prev !== undefined && next === undefined) {
      return { key, value: prev, status: 'removed' } satisfies DiffEntry;
    }

    if (JSON.stringify(prev) !== JSON.stringify(next)) {
      return { key, value: next, previous: prev, status: 'modified' } satisfies DiffEntry;
    }

    return { key, value: next, status: 'unchanged' } satisfies DiffEntry;
  });
};

const statusStyles: Record<DiffEntry['status'], string> = {
  added: 'border-success/50 bg-success/10 text-success',
  removed: 'border-danger/50 bg-danger/10 text-danger',
  modified: 'border-warning/50 bg-warning/10 text-warning',
  unchanged: 'border-border/60 bg-surface-soft/80 text-text-secondary',
};

const statusLabel: Record<DiffEntry['status'], string> = {
  added: 'Added',
  removed: 'Removed',
  modified: 'Modified',
  unchanged: 'Unchanged',
};

export function LivePreviewPanel({
  currentStep,
  totalSteps,
  currentSample,
  totalSamples,
  before,
  after,
  onSampleChange,
  onReplayAll,
  onFieldAction,
  availableActions,
  onQuickAction,
  isLoading = false,
  errorMessage,
}: LivePreviewPanelProps) {
  const hasData = Boolean(before || after);
  const hasError = Boolean(errorMessage);
  const diffEntries = useMemo(() => {
    const order = { modified: 0, added: 1, removed: 2, unchanged: 3 } as const;
    return buildDiff(before, after).sort((a, b) => order[a.status] - order[b.status]);
  }, [before, after]);

  const [selectedEntry, setSelectedEntry] = useState<DiffEntry | null>(null);

  useEffect(() => {
    if (!selectedEntry) return;
    const stillExists = diffEntries.some((entry) => entry.key === selectedEntry.key);
    if (!stillExists) {
      setSelectedEntry(null);
    }
  }, [diffEntries, selectedEntry]);

  const handlePrevSample = () => {
    if (currentSample > 1) {
      onSampleChange?.(currentSample - 1);
    }
  };

  const handleNextSample = () => {
    if (currentSample < totalSamples) {
      onSampleChange?.(currentSample + 1);
    }
  };

  const changedCount = diffEntries.filter((entry) => entry.status === 'modified').length;
  const addedCount = diffEntries.filter((entry) => entry.status === 'added').length;
  const removedCount = diffEntries.filter((entry) => entry.status === 'removed').length;

  return (
    <Card
      shadow="md"
      radius="lg"
      className="bg-surface border border-border/60 text-text-primary h-full"
    >
      <CardHeader className="flex flex-col gap-3 px-4 py-4 border-b border-border/60">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Chip size="sm" color="secondary" variant="flat">
              Step {Math.max(currentStep, 1)} of {Math.max(totalSteps, 1)}
            </Chip>
            <Tabs
              size="sm"
              selectedKey="before-after"
              aria-label="Preview mode"
              classNames={{
                tabList: 'bg-background-soft/70 border border-border/60 rounded-lg p-1',
                tab: 'px-3 text-xs text-text-secondary',
                tabContent: 'w-full flex items-center justify-center gap-2',
                cursor: 'bg-primary/20',
              }}
            >
              <Tab
                key="before-after"
                title={
                  <div className="flex items-center gap-2">
                    <Sparkles size={14} />
                    Diff Explorer
                  </div>
                }
              />
            </Tabs>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs uppercase tracking-wide text-text-secondary/80">
              Sample {currentSample} / {Math.max(totalSamples, 1)}
            </span>
            <div className="flex gap-2">
              <Button
                isIconOnly
                size="sm"
                variant="bordered"
                onPress={handlePrevSample}
                isDisabled={currentSample <= 1}
                className="border-border/60 text-text-secondary"
                aria-label="Previous sample"
              >
                <ChevronLeft size={16} />
              </Button>
              <Button
                isIconOnly
                size="sm"
                variant="bordered"
                onPress={handleNextSample}
                isDisabled={currentSample >= totalSamples}
                className="border-border/60 text-text-secondary"
                aria-label="Next sample"
              >
                <ChevronRight size={16} />
              </Button>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs text-text-secondary/80">
          <span className="flex items-center gap-1">
            <Wand2 size={12} /> {changedCount} modified
          </span>
          <span className="flex items-center gap-1">
            <ShieldCheck size={12} /> {addedCount} added
          </span>
          <span className="flex items-center gap-1">
            <ShieldCheck size={12} /> {removedCount} removed
          </span>
        </div>
      </CardHeader>

      <CardBody className="px-4 py-4">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3 text-text-secondary">
            <Spinner color="secondary" label="Processing telemetry sample..." labelColor="secondary" />
            <p className="text-xs text-text-secondary/80">Hang tight while we flatten OTLP payloads.</p>
          </div>
        ) : !hasData ? (
          <div className="text-center py-12 text-text-secondary">
            {hasError ? (
              <div className="mx-auto max-w-sm space-y-3">
                <div className="flex justify-center">
                  <AlertTriangle className="text-warning" size={28} />
                </div>
                <p className="text-sm font-semibold text-text-primary">We could not read this sample.</p>
                <p className="text-xs leading-relaxed text-text-secondary/80">
                  {errorMessage}
                </p>
              </div>
            ) : (
              <>
                <p className="text-sm">Upload sample telemetry to activate the live preview.</p>
                <p className="text-xs mt-2 text-text-secondary/80">
                  Support for JSON / JSONL samples. Only the first 250 records are shown.
                </p>
              </>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-semibold text-text-primary">Before</h4>
                <Chip size="sm" variant="flat" className="border border-border/60 bg-background-soft/70 text-text-secondary">
                  {(before && Object.keys(before).length) || 0} attributes
                </Chip>
              </div>
              <div className="rounded-xl border border-border/60 bg-background-soft/80 shadow-inner max-h-96 overflow-auto">
                <ul className="divide-y divide-border/60">
                  {flattenRecord(before).map((entry) => (
                    <li
                      key={entry.key}
                      className="flex items-start justify-between gap-3 px-4 py-2 text-xs text-text-secondary"
                    >
                      <span className="font-mono text-text-secondary/80">{entry.key}</span>
                      <span className="text-text-primary/90">{String(entry.value)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-semibold text-text-primary">After</h4>
                <Chip size="sm" variant="flat" color="primary" className="border border-primary/40">
                  {(after && Object.keys(after).length) || 0} attributes
                </Chip>
              </div>

              <div className="rounded-xl border border-border/60 bg-background-soft/80 shadow-inner max-h-96 overflow-auto">
                <ul className="divide-y divide-border/60">
                  {diffEntries.map((entry) => {
                    const isSelected = selectedEntry?.key === entry.key;
                    return (
                      <li
                        key={entry.key}
                        className={`group flex flex-col gap-1 px-4 py-3 text-xs cursor-pointer border-l-2 ${statusStyles[entry.status]} hover:border-primary hover:bg-primary/20 transition ${
                          isSelected ? 'ring-2 ring-primary/60 border-primary bg-primary/15' : ''
                        }`}
                        onClick={() => {
                          setSelectedEntry(entry);
                          onFieldAction?.(entry.key, entry.value);
                        }}
                      >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-mono text-text-primary/90">{entry.key}</span>
                        <div className="flex items-center gap-2">
                          {entry.status === 'modified' && (
                            <Tooltip content="Edit this attribute manually" placement="top" className="text-xs">
                              <Button
                                size="sm"
                                isIconOnly
                                variant="light"
                                className="opacity-0 group-hover:opacity-100 transition-opacity border border-border/60 text-text-secondary bg-background-soft/90"
                                startContent={<PencilLine size={14} />}
                                onClick={(event) => {
                                  event.stopPropagation();
                                  onFieldAction?.(entry.key, entry.value);
                                  setSelectedEntry(entry);
                                }}
                                aria-label={`Edit ${entry.key}`}
                              />
                            </Tooltip>
                          )}
                          <Chip size="sm" variant="flat" className="border border-border/50 bg-background-soft/70 text-text-secondary">
                            {statusLabel[entry.status]}
                          </Chip>
                        </div>
                      </div>
                      <div className="flex flex-col gap-1 text-text-primary">
                        <span className="font-semibold text-text-primary">{String(entry.value)}</span>
                        {entry.status === 'modified' && (
                          <span className="text-[11px] text-text-secondary/80">
                            previously {String(entry.previous)}
                          </span>
                        )}
                      </div>
                    </li>
                    );
                  })}
                </ul>
              </div>
            </div>
          </div>
        )}

        {hasData && totalSteps > 0 && (
          <div className="mt-5 flex flex-col gap-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  size="sm"
                  variant="bordered"
                  className="border-border/60 text-text-secondary"
                  onPress={onReplayAll}
                  startContent={<Play size={14} />}
                >
                  Replay Pipeline
                </Button>
                {selectedEntry && availableActions && availableActions.length > 0 && (
                  <div className="flex flex-wrap items-center gap-2">
                    <Chip size="sm" variant="flat" className="border border-border/60 bg-background-soft/70 text-text-secondary">
                      {selectedEntry.key}
                    </Chip>
                    <div className="flex gap-2">
                      {availableActions.map((action) => (
                        <Tooltip
                          key={action.id}
                          content={action.description}
                          placement="top"
                          className="max-w-xs text-xs"
                        >
                          <Button
                            size="sm"
                            variant="flat"
                            color={action.tone ?? 'primary'}
                            startContent={action.icon}
                            className="border border-border/60 bg-background-soft/90"
                            onPress={() => {
                              onQuickAction?.(action.id, selectedEntry);
                              setSelectedEntry(null);
                            }}
                          >
                            {action.label}
                          </Button>
                        </Tooltip>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              <div className="flex gap-2 text-xs text-text-secondary/80">
                <span>Click any attribute to add a transformation</span>
              </div>
            </div>
            {selectedEntry && availableActions && availableActions.length > 0 && (
              <div className="flex flex-wrap items-center gap-3 text-xs text-text-secondary/80">
                <div className="rounded-lg border border-border/60 bg-background-soft/90 px-3 py-2">
                  <p className="text-[11px] uppercase tracking-wide text-text-secondary/70">Current value</p>
                  <code className="text-sm text-text-primary/90">{String(selectedEntry.value)}</code>
                </div>
                {selectedEntry.status === 'modified' && (
                  <div className="rounded-lg border border-border/60 bg-background-soft/90 px-3 py-2">
                    <p className="text-[11px] uppercase tracking-wide text-text-secondary/70">Previous value</p>
                    <code className="text-sm text-text-secondary/90">{String(selectedEntry.previous)}</code>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </CardBody>
    </Card>
  );
}
