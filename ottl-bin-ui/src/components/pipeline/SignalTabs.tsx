import { Tabs, Tab, Chip } from '@heroui/react';
import { Activity, BarChart3, FileText } from 'lucide-react';
import type { TransformationSignal } from '../transformations/TransformationList';

interface SignalTabsProps {
  activeSignal: TransformationSignal;
  onSignalChange: (signal: TransformationSignal) => void;
  tracesCount: number;
  metricsCount: number;
  logsCount: number;
  compact?: boolean;
}

/**
 * SignalTabs - Tab navigation for multi-signal pipeline configuration
 * Allows switching between Traces, Metrics, and Logs pipelines
 */
export function SignalTabs({
  activeSignal,
  onSignalChange,
  tracesCount,
  metricsCount,
  logsCount,
  compact = false,
}: SignalTabsProps) {
  const signals: { key: TransformationSignal; label: string; icon: React.ReactNode; count: number; color: string }[] = [
    { key: 'trace', label: 'Traces', icon: <Activity size={compact ? 14 : 16} />, count: tracesCount, color: 'text-purple-400' },
    { key: 'metric', label: 'Metrics', icon: <BarChart3 size={compact ? 14 : 16} />, count: metricsCount, color: 'text-green-400' },
    { key: 'log', label: 'Logs', icon: <FileText size={compact ? 14 : 16} />, count: logsCount, color: 'text-blue-400' },
  ];

  return (
    <Tabs
      selectedKey={activeSignal}
      onSelectionChange={(key) => onSignalChange(key as TransformationSignal)}
      variant="underlined"
      size={compact ? 'sm' : 'md'}
      classNames={{
        tabList: 'gap-4 border-b border-border/40 pb-0',
        cursor: 'bg-primary',
        tab: 'px-0 h-10',
        tabContent: 'group-data-[selected=true]:text-primary',
      }}
    >
      {signals.map((signal) => (
        <Tab
          key={signal.key}
          title={
            <div className="flex items-center gap-2">
              <span className={signal.key === activeSignal ? signal.color : 'text-text-secondary'}>
                {signal.icon}
              </span>
              <span className={compact ? 'text-xs' : 'text-sm'}>{signal.label}</span>
              {signal.count > 0 && (
                <Chip
                  size="sm"
                  variant="flat"
                  className={`h-5 min-w-5 px-1.5 text-[10px] ${
                    signal.key === activeSignal
                      ? 'bg-primary/20 text-primary'
                      : 'bg-background-soft/70 text-text-secondary'
                  }`}
                >
                  {signal.count}
                </Chip>
              )}
            </div>
          }
        />
      ))}
    </Tabs>
  );
}

export default SignalTabs;
