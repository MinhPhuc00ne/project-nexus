import { useTranslation } from 'react-i18next';
import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react';
import { Check, ChevronDown } from 'lucide-react';

type CategoryOption = { id: string; label: string };

function searchText(value: string) {
  return value
    .toLocaleLowerCase('vi-VN')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd');
}

export default function SellerCategoryPicker({
  options,
  value,
  onChange,
  disabled,
  loading,
}: {
  options: CategoryOption[];
  value: string;
  onChange: (id: string) => void;
  disabled?: boolean;
  loading?: boolean;
}) {
  const { t } = useTranslation('seller');
  const id = useId();
  const container = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const highlighted = useRef<HTMLLIElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState<string | null>(null);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [invalid, setInvalid] = useState(false);
  const selected = options.find((option) => option.id === value);
  const terms = searchText(query ?? '')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  const matches = options.filter((option) =>
    terms.every((term) => searchText(option.label).includes(term)),
  );
  const expanded = open && !disabled;
  const active = expanded ? matches[activeIndex] : undefined;

  function close() {
    setOpen(false);
    setQuery(null);
    setActiveIndex(-1);
  }
  function choose(option: CategoryOption) {
    onChange(option.id);
    setInvalid(false);
    close();
  }
  function reveal() {
    if (disabled) return;
    setOpen(true);
    setQuery(null);
    setActiveIndex(-1);
  }

  useEffect(() => {
    input.current?.setCustomValidity(selected ? '' : t('categoryPicker.categoryFromList'));
  }, [selected, t]);
  useEffect(() => {
    if (active) highlighted.current?.scrollIntoView({ block: 'nearest' });
  }, [active]);
  useEffect(() => {
    if (!expanded) return;
    const outside = (event: PointerEvent) => {
      if (event.target instanceof Node && !container.current?.contains(event.target)) close();
    };
    document.addEventListener('pointerdown', outside);
    return () => document.removeEventListener('pointerdown', outside);
  }, [expanded]);

  function keyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      if (!expanded) {
        reveal();
        setActiveIndex(event.key === 'ArrowDown' ? 0 : matches.length - 1);
      } else
        setActiveIndex((current) => {
          if (!matches.length) return -1;
          const movingDown = event.key === 'ArrowDown';
          if (current < 0) return movingDown ? 0 : matches.length - 1;
          const direction = movingDown ? 1 : -1;
          return (current + direction + matches.length) % matches.length;
        });
    } else if (event.key === 'Enter' && expanded) {
      event.preventDefault();
      if (active) choose(active);
    } else if (event.key === 'Escape' && expanded) {
      event.preventDefault();
      event.stopPropagation();
      close();
    } else if (event.key === 'Tab') close();
  }

  const errorDescription = invalid ? ` ${id}-error` : '';
  return (
    <div
      ref={container}
      className="space-y-2"
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) close();
      }}
    >
      <label htmlFor={id} className="block text-sm font-medium text-slate-700">
        {t('categoryPicker.productCategory')} <span className="text-red-500">*</span>
      </label>
      <div className="relative">
        <input
          ref={input}
          id={id}
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={expanded}
          aria-controls={`${id}-options`}
          aria-activedescendant={active ? `${id}-option-${activeIndex}` : undefined}
          aria-invalid={invalid || undefined}
          aria-describedby={`${id}-hint${errorDescription}`}
          required
          disabled={disabled}
          autoComplete="off"
          value={expanded ? (query ?? selected?.label ?? '') : (selected?.label ?? '')}
          placeholder={
            loading ? t('categoryPicker.loadingCategories') : t('categoryPicker.searchCategory')
          }
          onFocus={(event) => {
            reveal();
            event.currentTarget.select();
          }}
          onClick={() => {
            if (!expanded) reveal();
          }}
          onChange={(event) => {
            setQuery(event.target.value);
            setOpen(true);
            setActiveIndex(0);
          }}
          onKeyDown={keyDown}
          onInvalid={(event) => {
            event.preventDefault();
            setInvalid(true);
            reveal();
            input.current?.focus();
          }}
          className="w-full rounded-lg border border-slate-200 bg-white py-2.5 pl-3 pr-10 text-sm text-slate-800 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-50 disabled:text-slate-500"
        />
        <button
          type="button"
          disabled={disabled}
          tabIndex={-1}
          aria-label={
            expanded ? t('categoryPicker.closeCategories') : t('categoryPicker.openCategories')
          }
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => {
            if (expanded) close();
            else {
              input.current?.focus();
              reveal();
            }
          }}
          className="absolute inset-y-0 right-0 rounded-r-lg px-3 text-slate-500 disabled:cursor-not-allowed"
        >
          <ChevronDown size={16} aria-hidden="true" className={expanded ? 'rotate-180' : ''} />
        </button>
        {expanded && (
          <div className="absolute inset-x-0 top-full z-20 mt-1 rounded-lg border border-slate-200 bg-white shadow-lg">
            <ul
              id={`${id}-options`}
              role="listbox"
              aria-label={t('categoryPicker.productCategory')}
              className="max-h-64 overflow-y-auto py-1"
            >
              {matches.map((option, index) => (
                <li
                  key={option.id}
                  id={`${id}-option-${index}`}
                  role="option"
                  aria-selected={option.id === value}
                  ref={index === activeIndex ? highlighted : undefined}
                  onMouseDown={(event) => event.preventDefault()}
                  onMouseEnter={() => setActiveIndex(index)}
                  onClick={() => choose(option)}
                  className={`flex cursor-pointer items-start gap-2 px-3 py-2.5 text-sm ${index === activeIndex ? 'bg-blue-50 text-blue-800' : 'text-slate-700'} ${option.id === value ? 'font-semibold' : ''}`}
                >
                  <span className="min-w-0 flex-1 break-words">{option.label}</span>
                  {option.id === value && (
                    <Check size={16} className="mt-0.5 shrink-0 text-blue-600" aria-hidden="true" />
                  )}
                </li>
              ))}
            </ul>
            {!matches.length && (
              <p role="status" className="px-3 py-4 text-sm text-slate-500">
                {t('categoryPicker.noCategoryMatch')}
              </p>
            )}
          </div>
        )}
      </div>
      <p id={`${id}-hint`} className="text-xs text-slate-500">
        {expanded && selected
          ? t('categoryPicker.selectedCategory', { value1: selected.label })
          : ''}
        {t('categoryPicker.categorySearchHint')}
      </p>
      {invalid && (
        <p id={`${id}-error`} role="alert" className="text-xs text-red-600">
          {t('categoryPicker.categoryFromList')}
        </p>
      )}
    </div>
  );
}
