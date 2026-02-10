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
    <div className="bg-gradient-to-b from-bg-primary via-bg-secondary to-black text-white min-h-screen">
      <div className="glass border-b border-white/10 backdrop-blur-sm">
        <div className="container mx-auto">
          <div className="navbar-start">
            <Link href="/docs" className="text-white hover:text-accent-purple transition-colors font-display text-xl">
              📚 FitReport Docs
            </Link>
          </div>
          <div className="navbar-end">
            <Link href="/dashboard" className="glass border border-white/10 hover:border-accent-purple/50 text-white px-4 py-2 rounded-lg text-sm transition-all">
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
                    <h3 className="font-semibold text-sm uppercase tracking-wide text-gray-400 font-display mb-3">
                      {section.category}
                    </h3>
                    <ul className="space-y-2">
                      {section.links.map((link) => (
                        <li key={link.href}>
                          <Link
                            href={link.href}
                            className="block text-sm text-gray-300 hover:text-white hover:bg-white/5 hover:border-l-2 hover:border-accent-purple rounded px-3 py-2 transition-colors"
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
            <div className="prose prose-lg prose-invert max-w-none [&>*]:text-gray-300 [&>h1]:text-white [&>h2]:text-white [&>h3]:text-white [&>a]:text-accent-purple [&>a]:hover:text-accent-violet [&>code]:text-accent-purple [&>code]:bg-bg-secondary">
              {children}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 