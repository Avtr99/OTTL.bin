import { Button, Tooltip } from '@heroui/react';
import { 
  Trash2, 
  EyeOff, 
  Fingerprint, 
  Edit3, 
  Replace,
  ArrowRightLeft,
  Plus
} from 'lucide-react';

export type AttributeContextAction = 
  | 'delete'
  | 'mask'
  | 'hash'
  | 'rename'
  | 'replace'
  | 'move-to-resource'
  | 'move-to-span'
  | 'add-attribute';

export interface AttributeContextMenuProps {
  attributeKey?: string;
  attributeValue?: unknown;
  context: 'attribute-row' | 'attribute-key' | 'attribute-value' | 'list-header';
  onAction: (action: AttributeContextAction) => void;
  className?: string;
}

interface ActionConfig {
  id: AttributeContextAction;
  label: string;
  icon: typeof Trash2;
  tooltip: string;
  color?: 'default' | 'primary' | 'secondary' | 'success' | 'warning' | 'danger';
}

// Simplified color scheme: default for most, danger only for destructive actions
const attributeRowActions: ActionConfig[] = [
  {
    id: 'delete',
    label: 'Delete',
    icon: Trash2,
    tooltip: 'Remove this attribute from telemetry',
    color: 'danger',
  },
  {
    id: 'move-to-resource',
    label: 'Move to Resource',
    icon: ArrowRightLeft,
    tooltip: 'Move this attribute to resource scope',
    color: 'default',
  },
  {
    id: 'move-to-span',
    label: 'Move to Span',
    icon: ArrowRightLeft,
    tooltip: 'Move this attribute to span scope',
    color: 'default',
  },
];

const attributeKeyActions: ActionConfig[] = [
  {
    id: 'rename',
    label: 'Rename',
    icon: Edit3,
    tooltip: 'Rename this attribute key',
    color: 'default',
  },
];

const attributeValueActions: ActionConfig[] = [
  {
    id: 'mask',
    label: 'Mask',
    icon: EyeOff,
    tooltip: 'Replace value with asterisks',
    color: 'default',
  },
  {
    id: 'hash',
    label: 'Hash',
    icon: Fingerprint,
    tooltip: 'Hash the value using SHA-256',
    color: 'default',
  },
  {
    id: 'replace',
    label: 'Replace',
    icon: Replace,
    tooltip: 'Replace with a different value',
    color: 'default',
  },
];

const listHeaderActions: ActionConfig[] = [
  {
    id: 'add-attribute',
    label: 'Add Attribute',
    icon: Plus,
    tooltip: 'Add a new attribute to this telemetry',
    color: 'default',
  },
];

const getActionsForContext = (context: AttributeContextMenuProps['context']): ActionConfig[] => {
  switch (context) {
    case 'attribute-row':
      return attributeRowActions;
    case 'attribute-key':
      return attributeKeyActions;
    case 'attribute-value':
      return attributeValueActions;
    case 'list-header':
      return listHeaderActions;
    default:
      return [];
  }
};

export function AttributeContextMenu({
  context,
  onAction,
  className = '',
}: AttributeContextMenuProps) {
  const actions = getActionsForContext(context);

  if (actions.length === 0) return null;

  return (
    <div className={`flex items-center gap-1 ${className}`}>
      {actions.map((action) => {
        const Icon = action.icon;
        return (
          <Tooltip
            key={action.id}
            content={action.tooltip}
            placement="top"
            className="text-xs max-w-xs"
          >
            <Button
              size="sm"
              isIconOnly
              variant="flat"
              color={action.color}
              className="min-w-unit-7 w-7 h-7 opacity-0 group-hover:opacity-100 transition-opacity"
              onPress={() => onAction(action.id)}
              aria-label={action.label}
            >
              <Icon size={14} />
            </Button>
          </Tooltip>
        );
      })}
    </div>
  );
}

/**
 * Detect smart actions based on attribute characteristics
 */
export function detectSmartActions(key: string, value: unknown): AttributeContextAction[] {
  const smartActions: AttributeContextAction[] = [];
  const keyLower = key.toLowerCase();
  const valueStr = String(value).toLowerCase();

  // Detect sensitive data patterns
  if (
    keyLower.includes('password') ||
    keyLower.includes('secret') ||
    keyLower.includes('token') ||
    keyLower.includes('auth') ||
    keyLower.includes('key') ||
    valueStr.includes('password=') ||
    valueStr.includes('token=')
  ) {
    smartActions.push('mask', 'hash');
  }

  // Detect email patterns
  if (
    keyLower.includes('email') ||
    (typeof value === 'string' && /\S+@\S+\.\S+/.test(value))
  ) {
    smartActions.push('hash', 'mask');
  }

  // Detect IDs and UUIDs
  if (
    keyLower.includes('id') ||
    keyLower.includes('uid') ||
    keyLower.includes('guid') ||
    (typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value))
  ) {
    smartActions.push('hash');
  }

  // Always offer delete as an option
  smartActions.push('delete');

  // Remove duplicates
  return Array.from(new Set(smartActions));
}
