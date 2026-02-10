import { Metadata } from 'next';
import { BookOpen, FileText, Settings, Wrench, ChevronRight, Mail } from 'lucide-react';

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
          icon: FileText,
        },
        {
          title: 'Client Search Functionality',
          description: 'Guide to using the client search and filtering features',
          href: '/docs/client-search-functionality',
          icon: Settings,
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
          icon: Wrench,
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
          icon: BookOpen,
        },
      ],
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-blue-600">
        <div className="container mx-auto px-4 py-16">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-4xl md:text-5xl font-bold mb-4 font-display text-white">
              FitReport Documentation
            </h1>
            <p className="text-xl md:text-2xl text-blue-100">
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
            <h2 className="text-3xl font-bold mb-8 text-gray-900 font-display">Quick Start</h2>
            <div className="grid md:grid-cols-3 gap-6">
              <div className="card p-6">
                <h3 className="text-lg font-semibold text-blue-600 mb-2">1. Connect Trainerize</h3>
                <p className="text-gray-600">Link your Trainerize account to start importing client data and generating reports.</p>
              </div>
              <div className="card p-6">
                <h3 className="text-lg font-semibold text-blue-600 mb-2">2. Generate Reports</h3>
                <p className="text-gray-600">Create comprehensive fitness reports with workout data, nutrition, and progress tracking.</p>
              </div>
              <div className="card p-6">
                <h3 className="text-lg font-semibold text-blue-600 mb-2">3. Share with Clients</h3>
                <p className="text-gray-600">Send reports directly to clients via Trainerize messages or download as images.</p>
              </div>
            </div>
          </div>

          {/* Documentation Sections */}
          <div className="space-y-12">
            {documentationSections.map((section, index) => (
              <div key={index}>
                <div className="mb-6">
                  <h2 className="text-3xl font-bold mb-2 text-gray-900 font-display">{section.title}</h2>
                  <p className="text-lg text-gray-500">{section.description}</p>
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                  {section.docs.map((doc, docIndex) => (
                    <a
                      key={docIndex}
                      href={doc.href}
                      className="card-hover p-6 hover:-translate-y-1 transition-all duration-200 group"
                    >
                      <div className="flex items-start gap-4">
                        <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
                          <doc.icon className="w-5 h-5 text-blue-600" />
                        </div>
                        <div className="flex-1">
                          <h3 className="text-lg font-semibold text-gray-900 mb-1">{doc.title}</h3>
                          <p className="text-gray-600 mb-3">{doc.description}</p>
                          <span className="text-blue-600 font-medium inline-flex items-center gap-1 group-hover:gap-2 transition-all">
                            Read more
                            <ChevronRight className="w-4 h-4" />
                          </span>
                        </div>
                      </div>
                    </a>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Help Section */}
          <div className="mt-16 bg-blue-50 border border-blue-200 rounded-2xl p-8">
            <div className="text-center">
              <h2 className="text-2xl font-bold mb-4 text-gray-900">Need More Help?</h2>
              <p className="text-lg mb-6 text-gray-600">
                Can&apos;t find what you&apos;re looking for? We&apos;re here to help!
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <a
                  href="mailto:riley@rileymanderson.com"
                  className="btn-primary px-6 py-2.5 rounded-lg font-medium inline-flex items-center justify-center gap-2"
                >
                  <Mail className="w-4 h-4" />
                  Contact Support
                </a>
                <a
                  href="/dashboard"
                  className="btn-secondary px-6 py-2.5 rounded-lg font-medium inline-flex items-center justify-center"
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
