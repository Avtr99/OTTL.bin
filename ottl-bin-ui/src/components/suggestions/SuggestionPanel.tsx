import { useEffect, useMemo, useState } from 'react';
import {
  Card,
  CardBody,
  Button,
  Chip,
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
} from '@heroui/react';
import { AlertTriangle, TrendingUp, Database, X } from 'lucide-react';
import { toast } from 'sonner';

export interface Suggestion {
  id: string;
  type:
    | 'sensitive-data'
    | 'high-attributes'
    | 'large-values'
    | 'cost-optimization'
    | 'unsampled-traffic'
    | 'missing-trace-ids'
    | 'error-spikes';
  title: string;
  description: string;
  guidance?: string;
  recommendation?: string;
  severity: 'warning' | 'info' | 'success';
  count?: number;
  onAutoFix?: () => void;
  onUndoAutoFix?: () => void;
  onConfigure?: () => void;
  onDismiss?: () => void;
}

interface SuggestionPanelProps {
  suggestions: Suggestion[];
  onDismiss?: (id: string) => void;
}

const suggestionIcons: Record<Suggestion['type'], typeof AlertTriangle> = {
  'sensitive-data': AlertTriangle,
  'high-attributes': TrendingUp,
  'large-values': Database,
  'cost-optimization': TrendingUp,
  'unsampled-traffic': TrendingUp,
  'missing-trace-ids': AlertTriangle,
  'error-spikes': AlertTriangle,
};

const cardStyles = {
  warning: 'border-warning/40 hover:border-warning/70 shadow-lg/10',
  info: 'border-primary/40 hover:border-primary/70 shadow-lg/10',
  success: 'border-success/40 hover:border-success/70 shadow-lg/10',
} as const;

const accentStyles = {
  warning: 'bg-warning/15 border-warning/40 text-warning',
  info: 'bg-primary/15 border-primary/40 text-primary',
  success: 'bg-success/15 border-success/40 text-success',
} as const;

const actionButtonStyles = {
  warning: 'border-warning/50 text-warning hover:bg-warning/10',
  info: 'border-primary/50 text-primary hover:bg-primary/10',
  success: 'border-success/50 text-success hover:bg-success/10',
} as const;

/**
 * SuggestionPanel - Smart detection and suggestions
 * Shows actionable alerts based on data analysis (FR-10)
 */
export function SuggestionPanel({ suggestions, onDismiss }: SuggestionPanelProps) {
  const [selectedSuggestion, setSelectedSuggestion] = useState<Suggestion | null>(null);
  const [autoFixedIds, setAutoFixedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (suggestions.length === 0) {
      setSelectedSuggestion(null);
      setAutoFixedIds(new Set());
    } else {
      setAutoFixedIds((prev) => {
        const next = new Set<string>();
        suggestions.forEach((suggestion) => {
          if (prev.has(suggestion.id)) {
            next.add(suggestion.id);
          }
        });
        return next;
      });
    }
  }, [suggestions]);

  const suggestionsWithAutoFix = useMemo(
    () => suggestions.filter((suggestion) => suggestion.onAutoFix),
    [suggestions],
  );

  if (suggestions.length === 0) {
    return null;
  }

  const handleAutoFix = (suggestion: Suggestion) => {
    if (autoFixedIds.has(suggestion.id)) return;
    suggestion.onAutoFix?.();
    setAutoFixedIds((prev) => {
      const next = new Set(prev);
      next.add(suggestion.id);
      return next;
    });
  };

  const handleUndoAutoFix = (suggestion: Suggestion) => {
    if (autoFixedIds.has(suggestion.id)) {
      suggestion.onUndoAutoFix?.();
      setAutoFixedIds((prev) => {
        const next = new Set(prev);
        next.delete(suggestion.id);
        return next;
      });
    }
  };

  const handleApplyAllAutoFix = () => {
    const appliedIds: string[] = [];
    suggestionsWithAutoFix.forEach((suggestion) => {
      if (!autoFixedIds.has(suggestion.id)) {
        suggestion.onAutoFix?.();
        appliedIds.push(suggestion.id);
      }
    });
    if (appliedIds.length > 0) {
      setAutoFixedIds((prev) => new Set([...prev, ...appliedIds]));
    }
  };

  const handleUndoAllAutoFix = () => {
    suggestionsWithAutoFix.forEach((suggestion) => {
      if (autoFixedIds.has(suggestion.id)) {
        suggestion.onUndoAutoFix?.();
      }
    });
    setAutoFixedIds(new Set());
    toast.info('Auto-fix actions reverted');
  };

  return (
    <div className="space-y-3">
      {suggestionsWithAutoFix.length > 1 && (
        <div className="flex justify-end gap-2">
          <Button
            size="sm"
            color="primary"
            variant="flat"
            className="border border-primary/40"
            onPress={handleApplyAllAutoFix}
          >
            Apply All Auto-Fix
          </Button>
          {autoFixedIds.size > 0 && (
            <Button
              size="sm"
              variant="light"
              className="border border-border/50 text-text-secondary"
              onPress={handleUndoAllAutoFix}
            >
              Undo All
            </Button>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
        {suggestions.map((suggestion) => {
          const Icon = suggestionIcons[suggestion.type];
          const accent = accentStyles[suggestion.severity];
          const cardAccent = cardStyles[suggestion.severity];
          const actionAccent = actionButtonStyles[suggestion.severity];
          const applied = autoFixedIds.has(suggestion.id);
          const hasDetail = Boolean(suggestion.guidance || suggestion.recommendation);

          const dismissSuggestion = () => {
            suggestion.onDismiss?.();
            onDismiss?.(suggestion.id);
          };

          return (
            <Card
              key={suggestion.id}
              shadow="sm"
              className={`bg-surface border text-text-primary transition-shadow hover:shadow-lg/30 ${cardAccent}`}
            >
              <CardBody className="p-3 space-y-2">
                <div className="flex items-start gap-3">
                  <div className={`flex h-8 w-8 items-center justify-center rounded-md ${accent}`}>
                    <Icon size={15} />
                  </div>

                  <div className="flex-1 min-w-0 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 space-y-1">
                        <h4 className="font-semibold text-sm text-text-primary leading-tight truncate">
                          {suggestion.title}
                        </h4>
                        <p
                          className="text-xs text-text-secondary leading-snug line-clamp-2"
                        >
                          {suggestion.description}
                          {suggestion.count && (
                            <Chip
                              size="sm"
                              variant="flat"
                              className="ml-2 border border-border/60 bg-background-soft/60 text-text-secondary"
                            >
                              {suggestion.count}
                            </Chip>
                          )}
                        </p>
                      </div>

                      {suggestion.onDismiss && (
                        <Button
                          isIconOnly
                          size="sm"
                          variant="light"
                          className="bg-background-soft/60 border border-border/50 text-text-secondary"
                          onClick={(event) => {
                            event.stopPropagation();
                            dismissSuggestion();
                          }}
                          aria-label="Dismiss suggestion"
                        >
                          <X size={14} />
                        </Button>
                      )}
                    </div>

                    <div className="flex flex-wrap gap-2 pt-1">
                      {suggestion.onAutoFix && !applied && (
                        <Button
                          size="sm"
                          color={suggestion.severity === 'info' ? 'primary' : suggestion.severity}
                          variant="flat"
                          className={actionAccent}
                          onClick={(event) => {
                            event.stopPropagation();
                            handleAutoFix(suggestion);
                          }}
                        >
                          Auto-Fix
                        </Button>
                      )}
                      {suggestion.onAutoFix && applied && (
                        <Button
                          size="sm"
                          variant="light"
                          className="border border-border/60 text-text-secondary"
                          onClick={(event) => {
                            event.stopPropagation();
                            handleUndoAutoFix(suggestion);
                          }}
                        >
                          Undo
                        </Button>
                      )}
                      {suggestion.onConfigure && (
                        <Button
                          size="sm"
                          variant="bordered"
                          className="border border-border/60 text-text-primary"
                          onClick={(event) => {
                            event.stopPropagation();
                            suggestion.onConfigure?.();
                          }}
                        >
                          Configure
                        </Button>
                      )}
                      {suggestion.onDismiss && (
                        <Button
                          size="sm"
                          variant="light"
                          className="bg-background-soft/50 text-text-secondary"
                          onClick={(event) => {
                            event.stopPropagation();
                            dismissSuggestion();
                          }}
                        >
                          Ignore
                        </Button>
                      )}
                      {hasDetail && (
                        <Button
                          size="sm"
                          variant="bordered"
                          className="border border-border/60 text-text-primary"
                          onClick={(event) => {
                            event.stopPropagation();
                            setSelectedSuggestion(suggestion);
                          }}
                        >
                          View guidance
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </CardBody>
            </Card>
          );
        })}
      </div>

      <Modal
        isOpen={Boolean(selectedSuggestion)}
        onClose={() => setSelectedSuggestion(null)}
        size="md"
        scrollBehavior="inside"
      >
        {selectedSuggestion && (
          <ModalContent className="bg-surface/95 border border-border/60 text-text-primary">
            <ModalHeader className="flex flex-col gap-1 bg-surface-soft/80">
              <div className="flex items-center gap-2">
                <div className={`flex h-8 w-8 items-center justify-center rounded-md ${accentStyles[selectedSuggestion.severity]}`}>
                  {(() => {
                    const Icon = suggestionIcons[selectedSuggestion.type];
                    return <Icon size={16} />;
                  })()}
                </div>
                <div>
                  <h3 className="text-md font-semibold leading-tight">{selectedSuggestion.title}</h3>
                  <p className="text-xs text-text-secondary/80">
                    {selectedSuggestion.description}
                  </p>
                </div>
              </div>
            </ModalHeader>
            <ModalBody className="space-y-3">
              {selectedSuggestion.count !== undefined && (
                <Chip size="sm" variant="flat" className="self-start border border-border/60 bg-background-soft/70">
                  {selectedSuggestion.count} occurrences
                </Chip>
              )}
              {selectedSuggestion.guidance && (
                <div>
                  <h4 className="text-xs font-semibold uppercase tracking-wide text-text-secondary/70">Why this matters</h4>
                  <p className="text-sm text-text-secondary mt-1 leading-relaxed">
                    {selectedSuggestion.guidance}
                  </p>
                </div>
              )}
              {selectedSuggestion.recommendation && (
                <div className="rounded-lg border border-border/60 bg-background-soft/70 px-3 py-2">
                  <h5 className="text-xs font-semibold uppercase tracking-wide text-text-secondary/70">
                    Suggested next step
                  </h5>
                  <p className="text-sm text-text-secondary mt-1 leading-relaxed">
                    {selectedSuggestion.recommendation}
                  </p>
                </div>
              )}
            </ModalBody>
            <ModalFooter className="bg-surface-soft/80 flex flex-wrap gap-2 justify-between">
              <div className="flex gap-2">
                {selectedSuggestion.onAutoFix && !autoFixedIds.has(selectedSuggestion.id) && (
                  <Button
                    size="sm"
                    color={selectedSuggestion.severity === 'info' ? 'primary' : selectedSuggestion.severity}
                    variant="flat"
                    className={actionButtonStyles[selectedSuggestion.severity]}
                    onPress={() => {
                      handleAutoFix(selectedSuggestion);
                    }}
                  >
                    Auto-Fix
                  </Button>
                )}
                {selectedSuggestion.onAutoFix && autoFixedIds.has(selectedSuggestion.id) && (
                  <Button
                    size="sm"
                    variant="light"
                    className="border border-border/60 text-text-secondary"
                    onPress={() => {
                      handleUndoAutoFix(selectedSuggestion);
                    }}
                  >
                    Undo
                  </Button>
                )}
                {selectedSuggestion.onConfigure && (
                  <Button
                    size="sm"
                    variant="bordered"
                    className="border border-border/60 text-text-primary"
                    onPress={() => selectedSuggestion.onConfigure?.()}
                  >
                    Configure
                  </Button>
                )}
              </div>
              <Button size="sm" variant="light" className="bg-background-soft/70 text-text-secondary" onPress={() => setSelectedSuggestion(null)}>
                Close
              </Button>
            </ModalFooter>
          </ModalContent>
        )}
      </Modal>
    </div>
  );
}
