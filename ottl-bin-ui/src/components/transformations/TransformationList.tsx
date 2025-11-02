import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import type { DragEndEvent } from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { TransformationCard } from './TransformationCard';
import type { TransformationCardProps } from './TransformationCard';

export type TransformationSignal = 'trace' | 'metric' | 'log';

interface SortableTransformationProps extends TransformationCardProps {
  id: string;
}

function SortableTransformation(props: SortableTransformationProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: props.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <TransformationCard {...props} isDragging={isDragging} />
    </div>
  );
}

export interface Transformation {
  id: string;
  title: string;
  description?: string;
  category: 'attribute' | 'parsing' | 'privacy' | 'filtering' | 'deletion' | 'metric' | 'formatting' | 'advanced';
  isEnabled?: boolean;
  recordsAffected?: string;
  sizeChange?: string;
  config?: Record<string, unknown>;
  signal?: TransformationSignal;
  compatibleSignals?: TransformationSignal[]; // Which signals this transformation works with
}

interface TransformationListProps {
  transformations: Transformation[];
  onReorder?: (transformations: Transformation[]) => void;
  onToggle?: (id: string, enabled: boolean) => void;
  onEdit?: (id: string) => void;
  onDelete?: (id: string) => void;
}

/**
 * TransformationList - Sortable list of transformation cards
 * Supports drag-and-drop reordering with @dnd-kit
 */
export function TransformationList({
  transformations,
  onReorder,
  onToggle,
  onEdit,
  onDelete,
}: TransformationListProps) {
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = transformations.findIndex((t) => t.id === active.id);
      const newIndex = transformations.findIndex((t) => t.id === over.id);

      const reordered = arrayMove(transformations, oldIndex, newIndex);
      onReorder?.(reordered);
    }
  };

  if (transformations.length === 0) {
    return (
      <div className="text-center py-12 text-text-secondary">
        <p>No transformations yet.</p>
        <p className="text-sm mt-2 text-text-secondary/80">Click "Add Transformation" to get started</p>
      </div>
    );
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <SortableContext
        items={transformations.map((t) => t.id)}
        strategy={verticalListSortingStrategy}
      >
        <div className="space-y-3">
          {transformations.map((transformation, index) => (
            <SortableTransformation
              key={transformation.id}
              id={transformation.id}
              stepNumber={index + 1}
              title={transformation.title}
              description={transformation.description}
              category={transformation.category}
              isEnabled={transformation.isEnabled}
              recordsAffected={transformation.recordsAffected}
              sizeChange={transformation.sizeChange}
              onToggle={onToggle}
              onEdit={onEdit}
              onDelete={onDelete}
              compatibleSignals={transformation.compatibleSignals}
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}
