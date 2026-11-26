import { useRef, useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { createCategory, deleteCategory, updateCategory } from '@/features/admin/services/admin';
import { categoryMoveError, flattenCategories } from '../../../utils/category-tree';
import type { CategoryTreeItem } from '../../../types/category.types';
import Popup from '../../Popup';
import { Input } from '../../ui/input';
import { Button } from '../shared/AdminUI';
import { useToast } from '../../ToastNotification';

export type CategoryAction =
  | { kind: 'create'; parent: CategoryTreeItem | null }
  | { kind: 'edit'; category: CategoryTreeItem }
  | { kind: 'move'; category: CategoryTreeItem; parent: CategoryTreeItem | null }
  | { kind: 'delete'; category: CategoryTreeItem };

export default function CategoryDialogs({
  action,
  categories,
  onClose,
  onSuccess,
}: {
  action: CategoryAction;
  categories: CategoryTreeItem[];
  onClose: () => void;
  onSuccess: (message: string) => void;
}) {
  const { t } = useTranslation('admin');
  const toast = useToast();
  const [name, setName] = useState(action.kind === 'edit' ? action.category.name : '');
  const [slug, setSlug] = useState(action.kind === 'edit' ? action.category.slug : '');
  const [parentId, setParentId] = useState(
    action.kind === 'edit' ? (action.category.parentId ?? '') : '',
  );
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const inFlight = useRef(false);
  const isCreate = action.kind === 'create';
  const isEdit = action.kind === 'edit';
  const title = isCreate
    ? t('categories.dialogs.createTitle')
    : isEdit
      ? t('categories.dialogs.editTitle')
      : action.kind === 'move'
        ? t('categories.dialogs.moveTitle')
        : t('categories.dialogs.deleteTitle');
  const parentOptions = flattenCategories(categories);

  const close = () => {
    if (!inFlight.current) onClose();
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (inFlight.current) return;
    if ((isCreate || isEdit) && !name.trim()) {
      setError(t('categories.dialogs.nameRequiredErr'));
      return;
    }
    if (action.kind === 'edit' || action.kind === 'move') {
      const parent =
        action.kind === 'move'
          ? action.parent
          : (parentOptions.find((item) => item.category.id === parentId)?.category ?? null);
      if (action.kind === 'edit' && parentId && !parent) {
        setError(t('categories.dialogs.parentMissingErr'));
        return;
      }
      const moveError = categoryMoveError(action.category, parent);
      if (moveError) {
        setError(moveError);
        return;
      }
    }
    inFlight.current = true;
    setPending(true);
    setError('');
    try {
      if (action.kind === 'create') {
        const created = await createCategory({
          name: name.trim(),
          slug: slug.trim() || undefined,
          parentId: action.parent?.id,
        });
        onSuccess(t('categories.dialogs.createdToast', { name: created.name }));
      } else if (action.kind === 'edit') {
        const updated = await updateCategory(action.category.id, {
          name: name.trim(),
          slug: slug.trim() || undefined,
          parentId: parentId || null,
        });
        onSuccess(t('categories.dialogs.updatedToast', { name: updated.name }));
      } else if (action.kind === 'move') {
        await updateCategory(action.category.id, { parentId: action.parent?.id ?? null });
        onSuccess(
          action.parent
            ? t('categories.dialogs.movedToParentToast', {
                name: action.category.name,
                parent: action.parent.name,
              })
            : t('categories.dialogs.movedToRootToast', { name: action.category.name }),
        );
      } else {
        const result = await deleteCategory(action.category.id);
        onSuccess(result.message);
      }
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : t('categories.dialogs.updateErr');
      setError(message);
      toast.error(message);
    } finally {
      inFlight.current = false;
      setPending(false);
    }
  };

  return (
    <Popup
      isOpen
      title={title}
      onClose={close}
      size="md"
      closeOnEsc={!pending}
      closeOnOverlay={!pending}
    >
      <form onSubmit={submit} className="space-y-4">
        {action.kind === 'create' || action.kind === 'edit' ? (
          <>
            <p className="break-words rounded-lg bg-blue-50 p-3 text-sm text-slate-600">
              {action.kind === 'edit'
                ? t('categories.dialogs.editDesc')
                : action.parent
                  ? t('categories.dialogs.createChildDesc', {
                      level: action.parent.level + 1,
                      name: action.parent.name,
                    })
                  : t('categories.dialogs.createRootDesc')}
            </p>
            <label className="block text-sm font-medium">
              {t('categories.dialogs.nameLabel')}
              <Input
                autoFocus
                required
                maxLength={100}
                value={name}
                disabled={pending}
                onChange={(event) => setName(event.target.value)}
                className="mt-2"
              />
            </label>
            <label className="block text-sm font-medium">
              {t('categories.dialogs.slugLabel')}
              <Input
                value={slug}
                disabled={pending}
                onChange={(event) => setSlug(event.target.value)}
                placeholder={t('categories.dialogs.slugPlaceholder')}
                className="mt-2"
              />
            </label>
            {action.kind === 'edit' && (
              <label className="block text-sm font-medium">
                {t('categories.dialogs.parentLabel')}
                <select
                  value={parentId}
                  disabled={pending}
                  onChange={(event) => setParentId(event.target.value)}
                  className="mt-2 w-full rounded-lg border border-slate-200 bg-white p-3 text-sm"
                >
                  <option value="">{t('categories.dialogs.noParent')}</option>
                  {parentOptions
                    .filter(({ category }) => !categoryMoveError(action.category, category))
                    .map(({ category, path }) => (
                      <option key={category.id} value={category.id}>
                        {path}
                      </option>
                    ))}
                </select>
              </label>
            )}
          </>
        ) : action.kind === 'move' ? (
          <div className="space-y-3 text-sm text-slate-600">
            <p className="break-words">
              {t('categories.dialogs.movePrefix')}
              <strong>{action.category.name}</strong>
              {t('categories.dialogs.moveFrom')}
              <strong>
                {parentOptions.find((item) => item.category.id === action.category.parentId)
                  ?.path ?? t('categories.dialogs.rootLevel')}
              </strong>
              {t('categories.dialogs.moveTo')}
              <strong>
                {action.parent
                  ? parentOptions.find((item) => item.category.id === action.parent?.id)?.path
                  : t('categories.dialogs.rootLevel')}
              </strong>
              ?
            </p>
            <p>{t('categories.dialogs.moveNote')}</p>
          </div>
        ) : (
          <div className="space-y-3 text-sm text-slate-600">
            <p className="break-words">
              {t('categories.dialogs.deleteConfirmPrefix')}
              <strong>{action.category.name}</strong>?
            </p>
            <p>{t('categories.dialogs.deleteNote')}</p>
          </div>
        )}
        {error && (
          <p role="alert" className="text-sm text-red-700">
            {error}
          </p>
        )}
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" disabled={pending} onClick={close}>
            {t('categories.dialogs.cancel')}
          </Button>
          <Button
            type="submit"
            variant={action.kind === 'delete' ? 'danger' : 'primary'}
            disabled={pending}
          >
            {pending
              ? t('categories.dialogs.processing')
              : action.kind === 'move'
                ? t('categories.dialogs.confirmMove')
                : isEdit
                  ? t('categories.dialogs.saveChanges')
                  : title}
          </Button>
        </div>
      </form>
    </Popup>
  );
}
