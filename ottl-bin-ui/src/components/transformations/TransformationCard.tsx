import type { ReactNode } from 'react';
import {
  Card,
  CardHeader,
  CardBody,
  CardFooter,
  Button,
  Checkbox,
  Chip,
} from '@heroui/react';
import { GripVertical, Settings, X, Activity, BarChart3, FileText } from 'lucide-react';

export interface TransformationCardProps {
  id: string;
  stepNumber: number;
  title: string;
  description?: string;
  category: string;
  isEnabled?: boolean;
  recordsAffected?: string;
  sizeChange?: string;
  children?: ReactNode;
  onToggle?: (id: string, enabled: boolean) => void;
  onEdit?: (id: string) => void;
  onDelete?: (id: string) => void;
  isDragging?: boolean;
  compatibleSignals?: string[];
}

const categoryCheckboxColors = {
  attribute: 'success',
  parsing: 'secondary',
  privacy: 'warning',
  filtering: 'warning',
  deletion: 'danger',
  metric: 'default',
  formatting: 'secondary',
  advanced: 'primary',
} as const;

const categoryChipStyles: Record<TransformationCardProps['category'], string> = {
  attribute: 'bg-success/80 text-success-foreground border border-success/70 shadow-sm',
  parsing: 'bg-secondary/80 text-secondary-foreground border border-secondary/70 shadow-sm',
  privacy: 'bg-warning/85 text-black border border-warning/70 shadow-sm',
  filtering: 'bg-primary/80 text-primary-foreground border border-primary/70 shadow-sm',
  deletion: 'bg-danger/80 text-danger-foreground border border-danger/70 shadow-sm',
  metric: 'bg-background-soft/90 text-text-primary border border-border/70 shadow-sm',
  formatting: 'bg-secondary/70 text-secondary-foreground border border-secondary/60 shadow-sm',
  advanced: 'bg-primary/90 text-primary-foreground border border-primary/80 shadow-sm',
};

const SIGNAL_ICONS: Record<string, React.ReactNode> = {
  trace: <Activity size={12} />,
  metric: <BarChart3 size={12} />,
  log: <FileText size={12} />,
};

const SIGNAL_COLORS: Record<string, 'primary' | 'success' | 'warning'> = {
  trace: 'primary',
  metric: 'success',
  log: 'warning',
};

/**
 * TransformationCard - Individual transformation step
 * Displays transformation details with drag handle, toggle, and actions
 */
export function TransformationCard({
  id,
  title,
  description,
  category,
  isEnabled = true,
  recordsAffected,
  sizeChange,
  children,
  onToggle,
  onEdit,
  onDelete,
  isDragging = false,
  compatibleSignals,
}: TransformationCardProps) {
  const handleToggle = (checked: boolean) => {
    onToggle?.(id, checked);
  };

  const checkboxColor = categoryCheckboxColors[category as keyof typeof categoryCheckboxColors] || 'default';
  const categoryChipClass = categoryChipStyles[category];

  return (
    <Card
      shadow="sm"
      radius="lg"
      className={`
        bg-surface-soft/90 border border-border/60 text-text-primary transition-all duration-200 backdrop-blur-sm
        ${isDragging ? 'opacity-50 scale-95 ring-1 ring-primary/40 shadow-lg/40' : 'hover:border-primary/40 hover:shadow-lg/30'}
        ${!isEnabled ? 'opacity-50' : ''}
      `}
    >
      <CardHeader className="flex items-center gap-3 px-4 py-3">
        {/* Drag Handle */}
        <div className="cursor-grab active:cursor-grabbing text-text-secondary/70 hover:text-primary">
          <GripVertical size={20} />
        </div>

        {/* Enable/Disable Checkbox */}
        <Checkbox
          isSelected={isEnabled}
          onValueChange={handleToggle}
          color={checkboxColor}
          size="sm"
        />

        {/* Step Number and Title */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            {compatibleSignals && compatibleSignals.length > 0 && (
              <div className="flex items-center gap-1">
                {compatibleSignals.map((sig) => (
                  <Chip
                    key={sig}
                    size="sm"
                    variant="flat"
                    color={SIGNAL_COLORS[sig]}
                    startContent={SIGNAL_ICONS[sig]}
                    className="text-xs"
                  >
                    {sig}
                  </Chip>
                ))}
              </div>
            )}
            <span className="font-semibold text-sm truncate text-text-primary">{title}</span>
            <Chip size="sm" variant="flat" color="default" className={`ml-2 capitalize px-2 py-1 text-[11px] ${categoryChipClass}`}>
              {category}
            </Chip>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-1">
          <Button
            isIconOnly
            size="sm"
            variant="light"
            className="bg-background-soft/70 text-text-secondary border border-border/50"
            onPress={() => onEdit?.(id)}
            aria-label="Edit transformation"
          >
            <Settings size={16} />
          </Button>
          <Button
            isIconOnly
            size="sm"
            variant="light"
            color="danger"
            className="bg-danger/10 border border-danger/30 text-danger"
            onPress={() => onDelete?.(id)}
            aria-label="Delete transformation"
          >
            <X size={16} />
          </Button>
        </div>
      </CardHeader>

      {/* Collapsed View - Summary */}
      {(description || children) && (
        <CardBody className="px-4 py-3 pt-0 space-y-3">
          {description && <p className="text-sm text-text-secondary/80">{description}</p>}
          {children}
        </CardBody>
      )}

      {/* Footer - Metrics */}
      {(recordsAffected || sizeChange) && (
        <CardFooter className="px-4 py-2 gap-2 border-t border-border/60">
          {recordsAffected && (
            <Chip size="sm" variant="flat" className="border border-border/50 bg-background-soft/70 text-text-secondary">
              {recordsAffected}
            </Chip>
          )}
          {sizeChange && (
            <Chip
              size="sm"
              variant="flat"
              color={sizeChange.startsWith('-') ? 'success' : 'secondary'}
              className={sizeChange.startsWith('-')
                ? 'border border-success/40 bg-success/20 text-success-foreground'
                : 'border border-secondary/40 bg-secondary/20 text-secondary-foreground'}
            >
              {sizeChange}
            </Chip>
          )}
        </CardFooter>
      )}
    </Card>
  );
}
