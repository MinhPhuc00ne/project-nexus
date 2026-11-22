import { useState, type DragEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { GripVertical, Pencil, Plus, Tag, Trash2 } from 'lucide-react';
import { categoryMoveError } from '../../../utils/category-tree';
import { Badge, Button } from '../shared/AdminUI';
import type { CategoryAction } from './CategoryDialogs';
import type { CategoryTreeItem } from '../../../types/category.types';

export default function CategoryNode({
  category,
  onAction,
  dragged,
  onDrag,
  onDropCategory,
}: {
  category: CategoryTreeItem;
  onAction: (action: CategoryAction) => void;
  dragged: CategoryTreeItem | null;
  onDrag: (category: CategoryTreeItem | null) => void;
  onDropCategory: (parent: CategoryTreeItem | null) => void;
}) {
  const { t } = useTranslation('admin');
  const [dragOver, setDragOver] = useState(false);
  const children = category.children ?? [];
  const canAddChild = category.level === 1 || category.level === 2;
  const moveError = dragged ? categoryMoveError(dragged, category) : null;
  const sameParent = dragged?.parentId === category.id;
  const canDrop = dragged && !sameParent && !moveError;
  const dropProps = {
    onDragOver: (event: DragEvent<HTMLElement>) => {
      event.stopPropagation();
      if (dragged) {
        event.preventDefault();
        event.dataTransfer.dropEffect = 'move';
        setDragOver(true);
      }
    },
    onDragLeave: (event: DragEvent<HTMLElement>) => {
      if (
        !(event.relatedTarget instanceof Element) ||
        event.relatedTarget.closest('li') !== event.currentTarget
      ) {
        setDragOver(false);
      }
    },
    onDrop: (event: DragEvent<HTMLElement>) => {
      event.preventDefault();
      event.stopPropagation();
      setDragOver(false);
      onDropCategory(category);
    },
  };
  const label = (
    <span className="inline-flex min-w-0 max-w-full flex-wrap items-center gap-2 align-middle">
      <Tag size={14} className="shrink-0 text-primary" aria-hidden="true" />
      <span className="break-words text-sm font-semibold text-slate-800">{category.name}</span>
      <Badge tone="gray">{t('categories.levelBadge', { level: category.level })}</Badge>
      <span className="break-all text-xs text-slate-500">{category.slug}</span>
      {dragged && dragOver && (
        <span className={`w-full text-xs ${canDrop ? 'text-blue-700' : 'text-red-700'}`}>
          {moveError ||
            (sameParent
              ? t('categories.alreadyInThisParent')
              : t('categories.dropToMoveHint', {
                  name: category.name,
                  level: category.level + 1,
                }))}
        </span>
      )}
    </span>
  );

  return (
    <li
      {...dropProps}
      className={`relative min-w-0 rounded-lg border bg-white ${dragged && dragOver ? (canDrop ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-200' : 'border-red-300 ring-2 ring-red-100') : 'border-slate-200'}`}
    >
      <div className="flex justify-end gap-1 px-2 pt-2 sm:absolute sm:right-2 sm:top-2 sm:z-10 sm:p-0">
        <Button
          type="button"
          variant="secondary"
          draggable
          aria-label={t('categories.dragAria', { name: category.name })}
          title={t('categories.dragTitle')}
          className="cursor-grab active:cursor-grabbing"
          onDragStart={(event) => {
            event.stopPropagation();
            event.dataTransfer.setData('text/plain', category.id);
            event.dataTransfer.effectAllowed = 'move';
            onDrag(category);
          }}
          onDragEnd={() => {
            onDrag(null);
            setDragOver(false);
          }}
        >
          <GripVertical size={16} aria-hidden="true" />
        </Button>
        <Button
          type="button"
          variant="secondary"
          aria-label={t('categories.editAria', { name: category.name })}
          title={t('categories.editTitle')}
          onClick={() => onAction({ kind: 'edit', category })}
        >
          <Pencil size={16} aria-hidden="true" />
        </Button>
        {canAddChild && (
          <Button
            type="button"
            variant="secondary"
            aria-label={t('categories.addChildAria', { name: category.name })}
            title={t('categories.addChildTitle')}
            onClick={() => onAction({ kind: 'create', parent: category })}
          >
            <Plus size={16} aria-hidden="true" />
          </Button>
        )}
        <Button
          type="button"
          variant="danger"
          aria-label={t('categories.deleteAria', { name: category.name })}
          title={
            children.length > 0 ? t('categories.deleteDisabledTitle') : t('categories.deleteTitle')
          }
          disabled={children.length > 0}
          onClick={() => onAction({ kind: 'delete', category })}
        >
          <Trash2 size={16} aria-hidden="true" />
        </Button>
      </div>
      {children.length > 0 ? (
        <details open>
          <summary className="min-h-14 cursor-pointer rounded-lg bg-slate-50 p-3 sm:pr-52 focus-visible:outline-blue-600">
            {label}
          </summary>
          <ul
            aria-label={t('categories.childrenListAria', { name: category.name })}
            className="m-3 ml-4 space-y-2 border-l border-blue-100 pl-3 sm:ml-6"
          >
            {children.map((child) => (
              <CategoryNode
                key={child.id}
                category={child}
                onAction={onAction}
                dragged={dragged}
                onDrag={onDrag}
                onDropCategory={onDropCategory}
              />
            ))}
          </ul>
        </details>
      ) : (
        <div className="min-h-14 p-3 sm:pr-52">{label}</div>
      )}
    </li>
  );
}
