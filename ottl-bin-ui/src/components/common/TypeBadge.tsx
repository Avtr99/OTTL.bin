import { Chip } from '@heroui/react';
import { Hash, Type, ToggleLeft, ListOrdered, Braces } from 'lucide-react';

export type ValueType = 'string' | 'number' | 'boolean' | 'array' | 'object' | 'null' | 'undefined';

interface TypeBadgeProps {
  type: ValueType;
  size?: 'sm' | 'md';
  showIcon?: boolean;
}

// Muted color palette - subtle differentiation without visual noise
const typeConfig: Record<ValueType, { label: string; icon: typeof Hash; color: string }> = {
  string: {
    label: 'str',
    icon: Type,
    color: 'text-slate-400',
  },
  number: {
    label: 'num',
    icon: Hash,
    color: 'text-slate-400',
  },
  boolean: {
    label: 'bool',
    icon: ToggleLeft,
    color: 'text-slate-400',
  },
  array: {
    label: 'arr',
    icon: ListOrdered,
    color: 'text-slate-400',
  },
  object: {
    label: 'obj',
    icon: Braces,
    color: 'text-slate-400',
  },
  null: {
    label: 'null',
    icon: Type,
    color: 'text-slate-500',
  },
  undefined: {
    label: 'undef',
    icon: Type,
    color: 'text-slate-500',
  },
};

export function TypeBadge({ type, size = 'sm', showIcon = true }: TypeBadgeProps) {
  const config = typeConfig[type];
  const Icon = config.icon;

  return (
    <Chip
      size={size}
      variant="flat"
      className="border border-border/40 bg-background-soft/60 text-text-secondary font-mono"
      startContent={showIcon ? <Icon size={12} className={config.color} /> : undefined}
    >
      {config.label}
    </Chip>
  );
}

/**
 * Infer the type of a value for display purposes
 */
export function inferValueType(value: unknown): ValueType {
  if (value === null) return 'null';
  if (value === undefined) return 'undefined';
  if (Array.isArray(value)) return 'array';
  
  const type = typeof value;
  if (type === 'string') return 'string';
  if (type === 'number') return 'number';
  if (type === 'boolean') return 'boolean';
  if (type === 'object') return 'object';
  
  return 'string'; // fallback
}
