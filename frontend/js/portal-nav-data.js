/* Sidebar nav sections for every gated (non-marketing) page. Pure data —
   portal-shell.js turns this into DOM. `icon` keys map to the glyphs in
   portal-widgets.js's ICONS table. */
window.EemmicPortalNav = (function () {
  const FRAMEWORK_SUBPAGES = {
    evaluation: [
      { title: 'My Evaluation', slug: 'status', icon: 'pulse' },
      { title: 'Reports', slug: 'reports', icon: 'table' }
    ],
    management: [
      { title: 'Operations', slug: 'operations', icon: 'pulse' },
      { title: 'Projects', slug: 'projects', icon: 'table' }
    ],
    marketplace: [
      { title: 'Market', slug: 'market', icon: 'pulse' },
      { title: 'Listings', slug: 'listings', icon: 'table' }
    ],
    investment: [
      { title: 'Documents', slug: 'documents', icon: 'table' }
    ]
  };

  const FRAMEWORK_LABELS = {
    evaluation: 'EVALUATION PORTAL',
    management: 'MANAGEMENT PORTAL',
    marketplace: 'MARKETPLACE PORTAL',
    investment: 'INVESTMENT PORTAL'
  };

  const admin = [
    {
      label: 'ADMINISTRATION',
      items: [
        { title: 'Overview', href: '/dashboard', icon: 'home' },
        { title: 'Client Enquiries', href: '/admin-enquiries', icon: 'inbox' },
        { title: 'Client Portal Accounts', href: '/admin-clients', icon: 'users' },
        { title: 'Portal Dashboards', href: '/admin-portals', icon: 'grid' },
        { title: 'Enquiry Categories', href: '/admin-categories', icon: 'tag' }
      ]
    }
  ];

  const manager = [
    {
      label: 'OPERATIONS',
      items: [
        { title: 'Dashboard', href: '/manager', icon: 'home' },
        { title: 'Approvals', href: '/manager-approvals', icon: 'inbox' },
        { title: 'Team Tasks', href: '/manager-tasks', icon: 'table' },
        { title: 'Reports', href: '/manager-reports', icon: 'grid' },
        { title: 'Settings', href: '/manager-settings', icon: 'gear' }
      ]
    }
  ];

  const investor = [
    {
      label: 'INVESTOR PORTAL',
      items: [
        { title: 'Dashboard', href: '/investor', icon: 'home' },
        { title: 'Portfolio', href: '/investor-portfolio', icon: 'pulse' },
        { title: 'Investments', href: '/investor-investments', icon: 'grid' },
        { title: 'Analytics', href: '/investor-analytics', icon: 'table' },
        { title: 'Messages', href: '/investor-messages', icon: 'mail' }
      ]
    }
  ];

  function client(portalType) {
    const sections = [
      {
        label: 'CLIENT PORTAL',
        items: [{ title: 'My Services', href: '/my-dashboard', icon: 'home' }]
      }
    ];

    if (portalType && FRAMEWORK_SUBPAGES[portalType]) {
      const base = '/portal-' + portalType;
      const items = [{ title: 'Dashboard', href: base, icon: 'home' }];
      FRAMEWORK_SUBPAGES[portalType].forEach(function (sub) {
        items.push({ title: sub.title, href: base + '-' + sub.slug, icon: sub.icon });
      });
      items.push({ title: 'Messages', href: base + '-messages', icon: 'mail' });
      items.push({ title: 'Settings', href: base + '-settings', icon: 'gear' });
      sections.push({ label: FRAMEWORK_LABELS[portalType], items: items });
    }

    return sections;
  }

  return { admin: admin, manager: manager, investor: investor, client: client };
})();
