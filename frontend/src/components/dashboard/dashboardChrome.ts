/** Header and sidebar styles shared with the admin dashboard. */
export const dashboardChrome = {
  header:
    'z-20 flex min-h-20 shrink-0 items-center justify-between gap-3 border-b border-slate-200 bg-white/95 px-4 backdrop-blur-md sm:px-7',
  headerActions: 'flex shrink-0 items-center gap-4',
  menuButton:
    'rounded-lg p-2 text-primary hover:bg-blue-50 focus-visible:outline-2 focus-visible:outline-primary lg:hidden',
  sidebar:
    'fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-slate-200 bg-white transition-transform lg:translate-x-0',
  sidebarBrand: 'flex h-20 shrink-0 items-center gap-3 border-b border-slate-100 px-6',
  sidebarLabel: 'mb-2 px-3 text-[10px] font-semibold tracking-wider text-slate-400',
  navItem:
    'flex items-center gap-3 rounded-lg px-3 py-3 text-xs font-medium transition-colors focus-visible:outline-2 focus-visible:outline-blue-600',
  navActive: 'bg-primary text-white shadow-md shadow-blue-900/10',
  navIdle: 'text-slate-600 hover:bg-blue-50 hover:text-primary',
  sidebarBackdrop: 'fixed inset-0 z-30 bg-slate-900/40 lg:hidden',
  accountButton:
    'flex items-center gap-3 rounded-xl p-2 transition-colors hover:bg-blue-50 focus-visible:outline-2 focus-visible:outline-primary',
  avatar:
    'flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary text-xs font-bold text-white',
  accountMenu:
    'absolute right-0 top-full mt-2 w-64 max-w-[calc(100vw-2rem)] rounded-xl border border-slate-200 bg-white p-2 shadow-lg',
  notificationButton:
    'relative grid place-items-center rounded-lg border-0 bg-transparent p-2 text-slate-500 hover:bg-blue-50 hover:text-blue-600',
} as const;
