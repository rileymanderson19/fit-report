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
          title: 'Scheduled Reports (Coming Soon)',
          description: 'Automate report generation with scheduled reports',
          href: '/docs/scheduled-reports-prd',
        },
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
    <div className="min-h-screen bg-base-100">
      {/* Header */}
      <div className="bg-primary text-primary-content">
        <div className="container mx-auto px-4 py-16">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              FitReport Documentation
            </h1>
            <p className="text-xl md:text-2xl opacity-90">
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
            <h2 className="text-3xl font-bold mb-8">Quick Start</h2>
            <div className="grid md:grid-cols-3 gap-6">
              <div className="card bg-base-200 shadow-lg">
                <div className="card-body">
                  <h3 className="card-title text-primary">1. Connect Trainerize</h3>
                  <p>Link your Trainerize account to start importing client data and generating reports.</p>
                </div>
              </div>
              <div className="card bg-base-200 shadow-lg">
                <div className="card-body">
                  <h3 className="card-title text-primary">2. Generate Reports</h3>
                  <p>Create comprehensive fitness reports with workout data, nutrition, and progress tracking.</p>
                </div>
              </div>
              <div className="card bg-base-200 shadow-lg">
                <div className="card-body">
                  <h3 className="card-title text-primary">3. Share with Clients</h3>
                  <p>Send reports directly to clients via Trainerize messages or download as images.</p>
                </div>
              </div>
            </div>
          </div>

          {/* Documentation Sections */}
          <div className="space-y-12">
            {documentationSections.map((section, index) => (
              <div key={index}>
                <div className="mb-6">
                  <h2 className="text-3xl font-bold mb-2">{section.title}</h2>
                  <p className="text-lg text-base-content/70">{section.description}</p>
                </div>
                
                <div className="grid md:grid-cols-2 gap-6">
                  {section.docs.map((doc, docIndex) => (
                    <a
                      key={docIndex}
                      href={doc.href}
                      className="card bg-base-200 shadow-lg hover:shadow-xl transition-shadow duration-200 hover:bg-base-300"
                    >
                      <div className="card-body">
                        <h3 className="card-title text-primary">{doc.title}</h3>
                        <p className="text-base-content/70">{doc.description}</p>
                        <div className="card-actions justify-end">
                          <span className="text-primary font-semibold">Read more →</span>
                        </div>
                      </div>
                    </a>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Help Section */}
          <div className="mt-16 bg-primary/10 rounded-2xl p-8">
            <div className="text-center">
              <h2 className="text-2xl font-bold mb-4">Need More Help?</h2>
                             <p className="text-lg mb-6">
                 Can&apos;t find what you&apos;re looking for? We&apos;re here to help!
               </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <a
                  href="mailto:riley@rileymanderson.com"
                  className="btn btn-primary"
                >
                  Contact Support
                </a>
                <a
                  href="/dashboard"
                  className="btn btn-outline"
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