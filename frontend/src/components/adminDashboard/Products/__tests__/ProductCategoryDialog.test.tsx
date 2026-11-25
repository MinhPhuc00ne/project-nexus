import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useAuth } from '../../../../contexts/AuthContext';
import i18n from '../../../../i18n';
import {
  createCategory,
  getCategoryTree,
  updateAdminProductCategory,
} from '../../../../services/admin';
import { getStoredToken } from '../../../../services/auth';
import type { AdminProduct } from '../../../../types/admin-product.types';
import type { CategoryTreeItem } from '../../../../types/category.types';
import ProductCategoryDialog from '../ProductCategoryDialog';

vi.mock('../../../../services/admin', () => ({
  getCategoryTree: vi.fn(),
  createCategory: vi.fn(),
  updateAdminProductCategory: vi.fn(),
}));

vi.mock('../../../../services/auth', () => ({
  getStoredToken: vi.fn(),
}));

vi.mock('../../../../contexts/AuthContext', () => ({
  useAuth: vi.fn(),
}));

const rootCategory: CategoryTreeItem = {
  id: 'root',
  name: 'Root',
  slug: 'root',
  parentId: null,
  level: 1,
};

const baseProduct = {
  id: 'product-1',
  title: 'Watch',
  category: { id: 'root', name: 'Root' },
} as AdminProduct;

describe('ProductCategoryDialog', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    await i18n.changeLanguage('vi');
    vi.mocked(getStoredToken).mockReturnValue('session');
    vi.mocked(useAuth).mockReturnValue({ token: 'session' } as never);
    vi.mocked(getCategoryTree).mockResolvedValue([rootCategory]);
    vi.mocked(createCategory).mockImplementation(async (dto) => ({
      id: 'new',
      name: dto.name,
      slug: 'new',
      parentId: dto.parentId ?? null,
      level: dto.parentId ? 2 : 1,
    }));
    vi.mocked(updateAdminProductCategory).mockResolvedValue({
      success: true,
      message: 'Updated',
    } as never);
  });

  it('allows selecting and saving a backend category for an uncategorized product', async () => {
    const onSaved = vi.fn();
    const uncategorized = { ...baseProduct, category: null } as unknown as AdminProduct;

    render(
      <I18nextProvider i18n={i18n}>
        <ProductCategoryDialog
          product={uncategorized}
          onClose={vi.fn()}
          onSaved={onSaved}
          onCategoriesChanged={vi.fn()}
        />
      </I18nextProvider>,
    );

    expect(
      screen.getByRole('heading', { name: i18n.t('admin:management.assignProductCategory') }),
    ).toBeInTheDocument();

    const categorySelect = await screen.findByLabelText(i18n.t('admin:management.productCategory'));
    await waitFor(() => {
      expect(categorySelect).toBeEnabled();
    });

    fireEvent.change(categorySelect, { target: { value: 'root' } });
    fireEvent.submit(document.querySelector('form')!);

    await waitFor(() => {
      expect(updateAdminProductCategory).toHaveBeenCalledWith('product-1', {
        categoryId: 'root',
        reason: undefined,
      });
      expect(onSaved).toHaveBeenCalledWith('Updated');
    });
  });

  it('selects a newly created child category and retries assignment without recreating on failure', async () => {
    let attempts = 0;
    vi.mocked(updateAdminProductCategory).mockImplementation(async () => {
      attempts += 1;
      if (attempts === 1) throw new Error('Backend rejected assignment');
      return { success: true, message: 'Updated' } as never;
    });

    const onSaved = vi.fn();
    const onCategoriesChanged = vi.fn();

    render(
      <I18nextProvider i18n={i18n}>
        <ProductCategoryDialog
          product={baseProduct}
          onClose={vi.fn()}
          onSaved={onSaved}
          onCategoriesChanged={onCategoriesChanged}
        />
      </I18nextProvider>,
    );

    await waitFor(() => {
      expect(screen.getByLabelText(i18n.t('admin:management.productCategory'))).toBeEnabled();
    });

    fireEvent.click(screen.getByRole('button', { name: i18n.t('admin:management.addCategory') }));
    fireEvent.change(screen.getByLabelText(i18n.t('admin:management.newCategoryName')), {
      target: { value: 'New child' },
    });
    fireEvent.change(screen.getByLabelText(i18n.t('admin:management.parentCategory')), {
      target: { value: 'root' },
    });
    fireEvent.click(
      screen.getByRole('button', { name: i18n.t('admin:management.createAndSelect') }),
    );

    await waitFor(() => {
      expect(createCategory).toHaveBeenCalledWith({ name: 'New child', parentId: 'root' });
      expect(onCategoriesChanged).toHaveBeenCalledTimes(1);
    });

    const categorySelect = screen.getByLabelText(
      i18n.t('admin:management.productCategory'),
    ) as HTMLSelectElement;
    expect(categorySelect.value).toBe('new');
    expect(screen.getByRole('option', { name: 'Root / New child' })).toBeInTheDocument();
    expect(attempts).toBe(0);

    fireEvent.submit(document.querySelector('form')!);
    expect(await screen.findByRole('alert')).toHaveTextContent('Backend rejected assignment');
    expect(onSaved).not.toHaveBeenCalled();

    fireEvent.submit(document.querySelector('form')!);
    await waitFor(() => {
      expect(attempts).toBe(2);
      expect(createCategory).toHaveBeenCalledTimes(1);
      expect(onSaved).toHaveBeenCalledWith('Updated');
    });
  });
});
