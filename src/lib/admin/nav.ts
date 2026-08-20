/** Admin sidebar navigation — grouped, matching the app's one-panel model. */
export type AdminNavItem = { href: string; label: string; icon: string; badge?: number }
export type AdminNavGroup = { group: string; items: AdminNavItem[] }

export const adminNav: AdminNavGroup[] = [
  {
    group: 'Overview',
    items: [
      { href: '/admin', label: 'Dashboard', icon: 'LayoutDashboard' },
      { href: '/admin/reports', label: 'Reports', icon: 'BarChart3' },
    ],
  },
  {
    group: 'Shop',
    items: [
      { href: '/admin/orders', label: 'Orders', icon: 'ShoppingBag' },
      { href: '/admin/products', label: 'Products', icon: 'Package' },
      { href: '/admin/categories', label: 'Categories', icon: 'FolderTree' },
      { href: '/admin/downloads', label: 'Downloads', icon: 'Download' },
    ],
  },
  {
    group: 'Tuition',
    items: [
      { href: '/admin/groups', label: 'Groups', icon: 'Users' },
      { href: '/admin/children', label: 'Children', icon: 'GraduationCap' },
      { href: '/admin/homework', label: 'Homework', icon: 'FileText' },
      { href: '/admin/feedback', label: 'Feedback', icon: 'MessageSquare' },
      { href: '/admin/reviews', label: 'Reviews', icon: 'MessageSquareQuote' },
    ],
  },
  {
    group: 'People',
    items: [
      { href: '/admin/customers', label: 'Customers', icon: 'UserRound' },
      { href: '/admin/subscribers', label: 'Subscribers', icon: 'Mail' },
      { href: '/admin/enquiries', label: 'Enquiries', icon: 'Inbox' },
    ],
  },
  {
    group: 'Setup',
    items: [{ href: '/admin/settings', label: 'Settings', icon: 'Settings' }],
  },
]
