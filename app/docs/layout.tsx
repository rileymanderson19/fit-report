import Link from 'next/link';
import React from 'react';

export default function DocsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const navigation = [
    {
      category: 'Report Management',
      links: [
        { href: '/docs/report-storage-limits', title: 'Report Storage Limits' },
        { href: '/docs/client-search-functionality', title: 'Client Search' },
      ],
    },
    {
      category: 'Advanced Features',
      links: [
        { href: '/docs/scheduled-reports-prd', title: 'Scheduled Reports' },
        { href: '/docs/datafast-setup', title: 'DataFast Setup' },
      ],
    },
    {
      category: 'Technical',
      links: [
        { href: '/docs/open-graph-fix', title: 'Open Graph Fix' },
      ],
    },
  ];

  return (
    <div className="min-h-screen bg-base-100">
      <div className="navbar bg-base-200 border-b">
        <div className="container mx-auto">
          <div className="navbar-start">
            <Link href="/docs" className="btn btn-ghost text-xl">
              📚 FitReport Docs
            </Link>
          </div>
          <div className="navbar-end">
            <Link href="/dashboard" className="btn btn-outline btn-sm">
              Dashboard
            </Link>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Sidebar Navigation */}
          <div className="lg:w-64 shrink-0">
            <div className="sticky top-8">
              <nav className="space-y-6">
                {navigation.map((section) => (
                  <div key={section.category}>
                    <h3 className="font-semibold text-sm uppercase tracking-wide text-base-content/60 mb-3">
                      {section.category}
                    </h3>
                    <ul className="space-y-2">
                      {section.links.map((link) => (
                        <li key={link.href}>
                          <Link
                            href={link.href}
                            className="block text-sm text-base-content/80 hover:text-primary hover:bg-base-200 rounded px-3 py-2 transition-colors"
                          >
                            {link.title}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </nav>
            </div>
          </div>

          {/* Main Content */}
          <div className="flex-1 min-w-0">
            <div className="prose prose-lg max-w-none">
              {children}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 