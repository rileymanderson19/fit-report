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
    <div className="bg-white min-h-screen">
      <div className="bg-white border-b border-gray-200">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <Link href="/docs" className="text-gray-900 hover:text-blue-600 transition-colors font-display text-xl font-semibold">
            FitReport Docs
          </Link>
          <Link href="/dashboard" className="btn-secondary px-4 py-2 rounded-lg text-sm font-medium">
            Dashboard
          </Link>
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
                    <h3 className="font-semibold text-sm uppercase tracking-wide text-gray-500 font-display mb-3">
                      {section.category}
                    </h3>
                    <ul className="space-y-1">
                      {section.links.map((link) => (
                        <li key={link.href}>
                          <Link
                            href={link.href}
                            className="block text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-50 hover:border-l-2 hover:border-blue-500 rounded px-3 py-2 transition-colors"
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
            <div className="prose prose-lg max-w-none [&>*]:text-gray-600 [&>h1]:text-gray-900 [&>h2]:text-gray-900 [&>h3]:text-gray-900 [&>a]:text-blue-600 [&>a]:hover:text-blue-700 [&>code]:text-blue-600 [&>code]:bg-blue-50">
              {children}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
