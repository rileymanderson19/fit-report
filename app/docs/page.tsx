import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Documentation | FitReport',
  description: 'FitReport documentation and guides for trainers',
};

export default function DocsPage() {
  const documentationSections = [
    {
      title: 'Report Management',
      description: 'Learn how to manage and optimize your client reports',
      docs: [
        {
          title: 'Report Storage Limits',
          description: 'Understand how FitReport manages report storage and automatic cleanup',
          href: '/docs/report-storage-limits',
        },
        {
          title: 'Client Search Functionality',
          description: 'Guide to using the client search and filtering features',
          href: '/docs/client-search-functionality',
        },
      ],
    },
    {
      title: 'Advanced Features',
      description: 'Explore advanced FitReport features and integrations',
      docs: [
        {
          title: 'DataFast Setup',
          description: 'Connect FitReport with DataFast for enhanced analytics',
          href: '/docs/datafast-setup',
        },
      ],
    },
    {
      title: 'Technical Guides',
      description: 'Technical documentation and troubleshooting',
      docs: [
        {
          title: 'Open Graph Fix',
          description: 'Technical guide for fixing social media previews',
          href: '/docs/open-graph-fix',
        },
      ],
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-bg-primary via-bg-secondary to-black">
      {/* Header */}
      <div className="bg-gradient-to-r from-primary-start via-accent-purple to-accent-indigo">
        <div className="container mx-auto px-4 py-16">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-4xl md:text-5xl font-bold mb-4 font-display gradient-text-light">
              FitReport Documentation
            </h1>
            <p className="text-xl md:text-2xl text-gray-200">
              Everything you need to know about using FitReport effectively
            </p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-6xl mx-auto">
          {/* Quick Start */}
          <div className="mb-16">
            <h2 className="text-3xl font-bold mb-8 text-white font-display">Quick Start</h2>
            <div className="grid md:grid-cols-3 gap-6">
              <div className="card-elevated">
                <div className="card-body">
                  <h3 className="card-title gradient-text">1. Connect Trainerize</h3>
                  <p className="text-gray-300">Link your Trainerize account to start importing client data and generating reports.</p>
                </div>
              </div>
              <div className="card-elevated">
                <div className="card-body">
                  <h3 className="card-title gradient-text">2. Generate Reports</h3>
                  <p className="text-gray-300">Create comprehensive fitness reports with workout data, nutrition, and progress tracking.</p>
                </div>
              </div>
              <div className="card-elevated">
                <div className="card-body">
                  <h3 className="card-title gradient-text">3. Share with Clients</h3>
                  <p className="text-gray-300">Send reports directly to clients via Trainerize messages or download as images.</p>
                </div>
              </div>
            </div>
          </div>

          {/* Documentation Sections */}
          <div className="space-y-12">
            {documentationSections.map((section, index) => (
              <div key={index}>
                <div className="mb-6">
                  <h2 className="text-3xl font-bold mb-2 text-white font-display">{section.title}</h2>
                  <p className="text-lg text-gray-400">{section.description}</p>
                </div>
                
                <div className="grid md:grid-cols-2 gap-6">
                  {section.docs.map((doc, docIndex) => (
                    <a
                      key={docIndex}
                      href={doc.href}
                      className="card-elevated hover:scale-105 transition-transform duration-200"
                    >
                      <div className="card-body">
                        <h3 className="card-title text-white">{doc.title}</h3>
                        <p className="text-gray-300">{doc.description}</p>
                        <div className="card-actions justify-end">
                          <span className="gradient-text font-semibold">Read more →</span>
                        </div>
                      </div>
                    </a>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Help Section */}
          <div className="mt-16 glass border border-purple-500/30 bg-purple-500/10 rounded-2xl p-8">
            <div className="text-center">
              <h2 className="text-2xl font-bold mb-4 text-white">Need More Help?</h2>
                             <p className="text-lg mb-6 text-gray-300">
                 Can&apos;t find what you&apos;re looking for? We&apos;re here to help!
               </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <a
                  href="mailto:riley@rileymanderson.com"
                  className="btn-gradient"
                >
                  Contact Support
                </a>
                <a
                  href="/dashboard"
                  className="glass border border-white/10 hover:border-accent-purple/50 text-white px-4 py-2 rounded-lg transition-all"
                >
                  Back to Dashboard
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 