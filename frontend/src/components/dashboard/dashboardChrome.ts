/** Header and sidebar styles shared with the admin dashboard. */
export const dashboardChrome = {
  header:
    'nexus-header z-20 flex min-h-20 shrink-0 items-center justify-between gap-3 px-4 sm:px-7',
  headerActions: 'flex shrink-0 items-center gap-4',
  menuButton:
    'rounded-lg p-2 text-primary hover:bg-blue-50 focus-visible:outline-2 focus-visible:outline-primary lg:hidden',
  sidebar:
    'fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-line bg-white transition-transform duration-200 ease-out lg:translate-x-0',
  sidebarBrand: 'flex h-20 shrink-0 items-center gap-3 border-b border-slate-100 px-6',
  sidebarLabel: 'mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-muted',
  navItem:
    'group flex min-h-11 items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-[background-color,color,box-shadow] duration-150 focus-visible:outline-2 focus-visible:outline-primary',
  navActive: 'bg-blue-50 text-primary shadow-[inset_3px_0_0_var(--color-primary)]',
  navIdle: 'text-muted hover:bg-slate-50 hover:text-ink',
  sidebarBackdrop: 'fixed inset-0 z-30 bg-slate-900/40 lg:hidden',
  accountButton:
    'flex items-center gap-3 rounded-xl p-2 transition-colors hover:bg-blue-50 focus-visible:outline-2 focus-visible:outline-primary',
  avatar:
    'flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary text-xs font-bold text-white',
  accountMenu: 'nexus-popover absolute right-0 top-full mt-2 w-64 max-w-[calc(100vw-2rem)] p-2',
  notificationButton:
    'relative grid place-items-center rounded-lg border-0 bg-transparent p-2 text-slate-500 hover:bg-blue-50 hover:text-blue-600',
} as const;
