import { useState } from 'react';
import { Card, CardHeader, CardBody, Chip, Progress, Button } from '@heroui/react';
import { TrendingDown, DollarSign, Database, Zap, ChevronDown, ChevronUp } from 'lucide-react';

export interface ImpactMetrics {
  storageReduction?: number; // percentage
  monthlySavings?: number; // dollars
  recordsAffected?: number;
  totalRecords?: number;
  attributeReduction?: number; // count
  sizeReduction?: string; // e.g., "2.3 MB"
  removedAttributes?: string[];
  averageRecordSizeBefore?: number; // bytes
  averageRecordSizeAfter?: number; // bytes
  estimatedMonthlyCostBefore?: number; // dollars
  estimatedMonthlyCostAfter?: number; // dollars
  recordsPerHour?: number;
  sourceName?: string;
}

interface CostImpactPanelProps {
  metrics?: ImpactMetrics;
  isLoading?: boolean;
}

/**
 * CostImpactPanel - Cost and impact analysis
 * Shows storage reduction, cost savings, and affected records (FR-9)
 */
export function CostImpactPanel({ metrics, isLoading = false }: CostImpactPanelProps) {
  if (!metrics) {
    return (
      <Card shadow="sm" radius="lg" className="bg-surface/95 border border-border/60">
        <CardHeader className="px-4 py-3 border-b border-border/60">
          <h3 className="text-lg font-semibold text-text-primary">Cost & Impact</h3>
        </CardHeader>
        <CardBody className="px-4 py-6">
          <div className="text-center text-text-secondary">
            <Database className="mx-auto mb-3 text-text-secondary/60" size={32} />
            <p className="text-sm">No data to analyze</p>
            <p className="text-xs mt-1 text-text-secondary/80">
              Add transformations to see impact
            </p>
          </div>
        </CardBody>
      </Card>
    );
  }

  const {
    storageReduction = 0,
    monthlySavings,
    recordsAffected = 0,
    totalRecords = 0,
    attributeReduction = 0,
    sizeReduction,
    removedAttributes = [],
    averageRecordSizeBefore,
    averageRecordSizeAfter,
    estimatedMonthlyCostBefore,
    estimatedMonthlyCostAfter,
    recordsPerHour,
    sourceName,
  } = metrics;

  const recordsPercentage = totalRecords > 0 
    ? Math.round((recordsAffected / totalRecords) * 100)
    : 0;

  const [showRemovedAttributes, setShowRemovedAttributes] = useState(false);

  const averageBeforeKb = typeof averageRecordSizeBefore === 'number'
    ? averageRecordSizeBefore / 1024
    : undefined;
  const averageAfterKb = typeof averageRecordSizeAfter === 'number'
    ? averageRecordSizeAfter / 1024
    : undefined;

  const costBefore = typeof estimatedMonthlyCostBefore === 'number' ? estimatedMonthlyCostBefore : undefined;
  const costAfter = typeof estimatedMonthlyCostAfter === 'number' ? estimatedMonthlyCostAfter : undefined;
  const computedMonthlySavings = typeof monthlySavings === 'number'
    ? monthlySavings
    : costBefore !== undefined && costAfter !== undefined
    ? Math.max(0, costBefore - costAfter)
    : 0;

  const formattedSavings = computedMonthlySavings > 0
    ? `$${computedMonthlySavings.toLocaleString(undefined, { maximumFractionDigits: 0 })}`
    : null;

  return (
    <Card shadow="md" radius="lg" className="bg-surface/95 border border-border/60 text-text-primary">
      <CardHeader className="px-4 py-3 border-b border-border/60">
        <div className="flex flex-wrap items-center gap-2">
          <Zap className="text-secondary" size={20} />
          <h3 className="text-lg font-semibold">Cost & Impact Analysis</h3>
          {sourceName && (
            <Chip size="sm" variant="flat" className="bg-background-soft/70 border border-border/60 text-text-secondary">
              {sourceName}
            </Chip>
          )}
        </div>
      </CardHeader>

      <CardBody className="px-4 py-4 space-y-4">
        {/* Storage Reduction */}
        {storageReduction > 0 && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-text-secondary">Storage Reduction</span>
              <Chip
                color="success"
                variant="flat"
                startContent={<TrendingDown size={14} />}
                size="sm"
              >
                -{storageReduction}%
              </Chip>
            </div>
            <Progress
              value={storageReduction}
              color="success"
              size="sm"
              aria-label="Storage reduction"
              classNames={{
                indicator: 'bg-success',
                track: 'bg-surface-soft/80',
              }}
            />
            {sizeReduction && (
              <p className="text-xs text-text-secondary/80 mt-1">
                Saves approximately {sizeReduction}
              </p>
            )}
          </div>
        )}

        {/* Monthly Savings */}
        {formattedSavings && (
          <div className="p-4 bg-success/10 rounded-xl border border-success/40">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-success">
                <DollarSign size={18} />
                <span className="text-sm font-medium text-success">Monthly Savings</span>
              </div>
              <span className="text-lg font-bold text-success">
                {formattedSavings}
              </span>
            </div>
            <p className="text-xs text-success/80 mt-1">
              Estimated based on current usage patterns
            </p>
          </div>
        )}

        {/* Cost Comparison */}
        {costBefore !== undefined && costAfter !== undefined && (
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-border/60 bg-background-soft/70 p-3">
              <p className="text-xs uppercase tracking-wide text-text-secondary/70">Monthly Cost (Before)</p>
              <p className="text-lg font-semibold text-text-primary mt-1">
                ${costBefore.toLocaleString(undefined, { maximumFractionDigits: 0 })}
              </p>
              {recordsPerHour && (
                <p className="text-xs text-text-secondary/70 mt-1">
                  {recordsPerHour.toLocaleString()} records/hour baseline
                </p>
              )}
            </div>
            <div className="rounded-xl border border-success/50 bg-success/10 p-3">
              <p className="text-xs uppercase tracking-wide text-success/80">Monthly Cost (After)</p>
              <p className="text-lg font-semibold text-success mt-1">
                ${costAfter.toLocaleString(undefined, { maximumFractionDigits: 0 })}
              </p>
              {formattedSavings && (
                <p className="text-xs text-success/70 mt-1">Savings: {formattedSavings}</p>
              )}
            </div>
          </div>
        )}

        {/* Average Record Size */}
        {(averageBeforeKb !== undefined || averageAfterKb !== undefined) && (
          <div className="grid gap-3 sm:grid-cols-2">
            {averageBeforeKb !== undefined && (
              <div className="rounded-xl border border-border/60 bg-background-soft/70 p-3">
                <p className="text-xs uppercase tracking-wide text-text-secondary/70">Avg. Record Size (Before)</p>
                <p className="text-lg font-semibold text-text-primary mt-1">
                  {averageBeforeKb.toFixed(2)} KB
                </p>
              </div>
            )}
            {averageAfterKb !== undefined && (
              <div className="rounded-xl border border-secondary/50 bg-secondary/10 p-3">
                <p className="text-xs uppercase tracking-wide text-text-secondary/70">Avg. Record Size (After)</p>
                <p className="text-lg font-semibold text-text-primary mt-1">
                  {averageAfterKb.toFixed(2)} KB
                </p>
              </div>
            )}
          </div>
        )}

        {/* Records Affected */}
        {totalRecords > 0 && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-text-secondary">Records Affected</span>
              <span className="text-sm font-semibold text-text-primary">
                {recordsAffected.toLocaleString()} / {totalRecords.toLocaleString()}
              </span>
            </div>
            <Progress
              value={recordsPercentage}
              color={recordsPercentage > 80 ? 'warning' : 'secondary'}
              size="sm"
              aria-label="Records affected"
              classNames={{
                indicator: recordsPercentage > 80 ? 'bg-warning' : 'bg-secondary',
                track: 'bg-surface-soft/80',
              }}
            />
            <p className="text-xs text-text-secondary/80 mt-1">
              {recordsPercentage}% of total records
            </p>
          </div>
        )}

        {/* Attribute Reduction */}
        {attributeReduction > 0 && (
          <div className="p-3 bg-surface-soft/80 rounded-lg border border-border/60 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-text-secondary">Attributes Removed</span>
                <Chip color="secondary" variant="flat" size="sm" className="border border-secondary/40">
                  {attributeReduction}
                </Chip>
              </div>
              <Button
                size="sm"
                variant="light"
                className="bg-background-soft/70 text-text-secondary"
                endContent={showRemovedAttributes ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                onPress={() => setShowRemovedAttributes((prev) => !prev)}
              >
                {showRemovedAttributes ? 'Hide details' : 'View removed attributes'}
              </Button>
            </div>
            {showRemovedAttributes && (
              <div className="rounded-lg border border-border/50 bg-surface/90">
                {removedAttributes.length > 0 ? (
                  <ul className="divide-y divide-border/60 text-xs text-text-secondary">
                    {removedAttributes.map((attribute) => (
                      <li key={attribute} className="px-3 py-2 font-mono text-text-primary/90">
                        {attribute}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="px-3 py-2 text-xs text-text-secondary/80">
                    Specific attributes will appear here once impact analysis is connected to live telemetry.
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        {/* Loading State */}
        {isLoading && (
          <div className="text-center py-4">
            <Progress
              size="sm"
              isIndeterminate
              aria-label="Calculating impact..."
              className="max-w-md mx-auto"
              classNames={{
                indicator: 'bg-primary',
                track: 'bg-surface-soft/80',
              }}
            />
            <p className="text-xs text-text-secondary/80 mt-2">Calculating impact...</p>
          </div>
        )}
      </CardBody>
    </Card>
  );
}
