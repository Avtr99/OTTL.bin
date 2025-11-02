import { Card, CardHeader, CardBody, Chip, Progress } from '@heroui/react';
import { TrendingDown, DollarSign, Database, Zap, Activity } from 'lucide-react';

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
  sourceName?: string;
}

interface CostImpactPanelProps {
  metrics?: ImpactMetrics;
}

/**
 * CostImpactPanel - Cost and impact analysis
 * Shows storage reduction, cost savings, and affected records (FR-9)
 */
export function CostImpactPanel({ metrics }: CostImpactPanelProps) {
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
    sourceName,
  } = metrics;

  const recordsPercentage = totalRecords > 0 
    ? Math.round((recordsAffected / totalRecords) * 100)
    : 0;

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

  const formattedSavings = computedMonthlySavings !== null && computedMonthlySavings !== undefined
    ? `$${computedMonthlySavings.toLocaleString(undefined, { maximumFractionDigits: 0 })}`
    : null;

  return (
    <Card shadow="md" radius="lg" className="bg-surface/95 border border-border/60 text-text-primary">
      <CardHeader className="px-4 py-3 border-b border-border/60">
        <div className="flex flex-wrap items-center gap-2">
          <Zap className="text-secondary" size={20} />
          <h3 className="text-lg font-semibold">Cost & Impact</h3>
          {sourceName && (
            <Chip size="sm" variant="flat" className="bg-background-soft/70 border border-border/60 text-text-secondary">
              {sourceName}
            </Chip>
          )}
        </div>
      </CardHeader>

      <CardBody className="px-4 py-4 space-y-4">
        <div className="grid gap-4 lg:grid-cols-4">
          <MetricCard
            icon={<TrendingDown size={16} />}
            label="Storage Reduction"
            primary={{
              value:
                storageReduction !== null && storageReduction !== undefined
                  ? `-${storageReduction}%`
                  : '—',
              hint: sizeReduction ? `~${sizeReduction} saved` : undefined,
            }}
          />
          <MetricCard
            icon={<DollarSign size={16} />}
            label="Monthly Savings"
            primary={{ value: formattedSavings ?? '—' }}
            secondary={
              costBefore !== undefined && costAfter !== undefined
                ? {
                    label: 'Before → After',
                    value: `$${costBefore.toLocaleString()} → $${costAfter.toLocaleString()}`,
                  }
                : undefined
            }
          />
          <MetricCard
            icon={<Activity size={16} />}
            label="Records Impacted"
            primary={{
              value: totalRecords > 0 ? `${recordsAffected.toLocaleString()} / ${totalRecords.toLocaleString()}` : '—',
              hint: totalRecords > 0 ? `${recordsPercentage}% of total` : undefined,
            }}
          />
          <MetricCard
            icon={<Database size={16} />}
            label="Attribute Reduction"
            primary={{
              value:
                attributeReduction !== null && attributeReduction !== undefined
                  ? attributeReduction.toString()
                  : '—',
            }}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {averageBeforeKb !== undefined && (
            <CompactStat label="Avg. Record Size (Before)" value={`${averageBeforeKb.toFixed(2)} KB`} />
          )}
          {averageAfterKb !== undefined && (
            <CompactStat label="Avg. Record Size (After)" value={`${averageAfterKb.toFixed(2)} KB`} />
          )}
        </div>

        {storageReduction > 0 && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-text-secondary uppercase tracking-wide">Storage Impact</span>
              <Chip size="sm" color="success" variant="flat" startContent={<TrendingDown size={12} />}>
                -{storageReduction}%
              </Chip>
            </div>
            <Progress
              value={storageReduction}
              color="success"
              size="sm"
              aria-label="Storage reduction"
              classNames={{ indicator: 'bg-success', track: 'bg-surface-soft/80' }}
            />
          </div>
        )}

        {totalRecords > 0 && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-text-secondary uppercase tracking-wide">Records Affected</span>
              <span className="text-sm font-semibold text-text-primary">
                {recordsAffected.toLocaleString()} / {totalRecords.toLocaleString()}
              </span>
            </div>
            <Progress
              value={recordsPercentage}
              size="sm"
              aria-label="Records affected"
              color={recordsPercentage > 80 ? 'warning' : 'secondary'}
              classNames={{ indicator: recordsPercentage > 80 ? 'bg-warning' : 'bg-secondary', track: 'bg-surface-soft/80' }}
            />
          </div>
        )}

        {removedAttributes.length > 0 && (
          <div className="rounded-lg border border-border/60 bg-background-soft/80 p-3">
            <p className="text-xs font-medium text-text-secondary uppercase tracking-wide mb-2">Removed Attributes</p>
            <div className="flex flex-wrap gap-2">
              {removedAttributes.slice(0, 6).map((attribute) => (
                <Chip key={attribute} size="sm" variant="flat" className="border border-border/60 bg-surface/80 font-mono text-xs">
                  {attribute}
                </Chip>
              ))}
              {removedAttributes.length > 6 && (
                <Chip size="sm" variant="flat" className="border border-border/60 bg-surface/80">
                  +{removedAttributes.length - 6} more
                </Chip>
              )}
            </div>
          </div>
        )}
      </CardBody>
    </Card>
  );
}

interface MetricCardProps {
  icon: React.ReactNode;
  label: string;
  primary: {
    value: string;
    hint?: string;
  };
  secondary?: {
    label: string;
    value: string;
  };
}

function MetricCard({ icon, label, primary, secondary }: MetricCardProps) {
  return (
    <div className="rounded-xl border border-border/60 bg-background-soft/80 p-3 flex flex-col gap-2">
      <div className="flex items-center gap-2 text-text-secondary text-xs uppercase tracking-wide">
        <span className="inline-flex h-6 w-6 items-center justify-center rounded-md bg-background-soft/90 border border-border/60 text-text-secondary">
          {icon}
        </span>
        {label}
      </div>
      <span className="text-lg font-semibold text-text-primary">{primary.value}</span>
      {primary.hint && <span className="text-xs text-text-secondary/80">{primary.hint}</span>}
      {secondary && (
        <div className="text-xs text-text-secondary/80">
          <span className="font-medium text-text-secondary/70">{secondary.label}: </span>
          {secondary.value}
        </div>
      )}
    </div>
  );
}

interface CompactStatProps {
  label: string;
  value: string;
}

function CompactStat({ label, value }: CompactStatProps) {
  return (
    <div className="rounded-lg border border-border/60 bg-background-soft/70 p-3">
      <p className="text-xs uppercase tracking-wide text-text-secondary/70">{label}</p>
      <p className="text-lg font-semibold text-text-primary mt-1">{value}</p>
    </div>
  );
}
