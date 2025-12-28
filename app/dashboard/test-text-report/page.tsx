"use client";

import { useState, useEffect } from 'react';
import { createClient } from '@/libs/supabase/client';
import { toast } from 'sonner';

export default function TestTextReportPage() {
  const supabase = createClient();
  const [clientId, setClientId] = useState('');
  const [reportId, setReportId] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [template, setTemplate] = useState<'daily' | 'weekly' | 'enhanced'>('enhanced');
  const [weightUnit, setWeightUnit] = useState<'lbs' | 'kg'>('lbs');
  const [goal, setGoal] = useState<'fat loss' | 'maintenance' | 'muscle gain'>('fat loss');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [clients, setClients] = useState<any[]>([]);
  const [reports, setReports] = useState<any[]>([]);
  const [clientSearchQuery, setClientSearchQuery] = useState('');
  const [filteredClients, setFilteredClients] = useState<any[]>([]);
  const [showClientDropdown, setShowClientDropdown] = useState(false);
  const [selectedClientName, setSelectedClientName] = useState('');

  // Set default date range (last 2 weeks ending yesterday)
  useEffect(() => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(0, 0, 0, 0);
    
    const twoWeeksAgo = new Date(yesterday);
    twoWeeksAgo.setDate(yesterday.getDate() - 13); // 14 days total (including yesterday)
    twoWeeksAgo.setHours(0, 0, 0, 0);
    
    setDateFrom(twoWeeksAgo.toISOString().split('T')[0]);
    setDateTo(yesterday.toISOString().split('T')[0]);
  }, []);

  // Load clients on mount
  useEffect(() => {
    const loadClients = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data, error } = await supabase
          .from('clients')
          .select('id, first_name, last_name')
          .eq('trainer_id', user.id)
          .eq('active', true)
          .order('first_name', { ascending: true });

        if (error) throw error;
        setClients(data || []);
      } catch (error) {
        console.error('Error loading clients:', error);
      }
    };

    loadClients();
  }, [supabase]);

  // Filter clients based on search query
  useEffect(() => {
    if (!clientSearchQuery.trim()) {
      setFilteredClients([]);
      setShowClientDropdown(false);
      return;
    }

    const searchTerms = clientSearchQuery.toLowerCase().split(' ').filter(term => term.length > 0);
    const filtered = clients.filter(client => {
      const fullName = `${client.first_name} ${client.last_name}`.toLowerCase();
      return searchTerms.every(term => 
        fullName.includes(term) ||
        client.first_name.toLowerCase().includes(term) ||
        client.last_name.toLowerCase().includes(term)
      );
    }).slice(0, 8);

    setFilteredClients(filtered);
    setShowClientDropdown(filtered.length > 0);
  }, [clientSearchQuery, clients]);

  // Load reports on mount
  useEffect(() => {
    const loadReports = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data, error } = await supabase
          .from('reports')
          .select('id, date_range_start, date_range_end, clients(first_name, last_name)')
          .eq('trainer_id', user.id)
          .order('created_at', { ascending: false })
          .limit(10);

        if (error) throw error;
        setReports(data || []);
      } catch (error) {
        console.error('Error loading reports:', error);
      }
    };

    loadReports();
  }, [supabase]);

  const handleTest = async () => {
    if (!reportId && (!clientId || !dateFrom || !dateTo)) {
      toast.error('Please provide either a Report ID or Client ID with date range');
      return;
    }

    setIsLoading(true);
    setResult(null);

    try {
      const body: any = {
        template,
        weightUnit,
        goal
      };

      if (reportId) {
        body.reportId = reportId;
      } else {
        body.clientId = clientId;
        body.dateRange = {
          from: new Date(dateFrom).toISOString(),
          to: new Date(dateTo).toISOString()
        };
      }

      const response = await fetch('/api/reports/generate-text', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate text report');
      }

      setResult(data);
      toast.success('Text report generated successfully!');
    } catch (error) {
      console.error('Error testing text report:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to generate text report');
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard!');
  };

  // Handle click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('.relative')) {
        setShowClientDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <h1 className="text-3xl font-bold mb-6">Test Text Report API</h1>

      <div className="card bg-base-200 shadow-xl mb-6">
        <div className="card-body">
          <h2 className="card-title mb-4">Test Configuration</h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Template Selection */}
            <div className="form-control">
              <label className="label">
                <span className="label-text">Template</span>
              </label>
              <select
                className="select select-bordered"
                value={template}
                onChange={(e) => setTemplate(e.target.value as any)}
              >
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="enhanced">Enhanced</option>
              </select>
            </div>

            {/* Weight Unit */}
            <div className="form-control">
              <label className="label">
                <span className="label-text">Weight Unit</span>
              </label>
              <select
                className="select select-bordered"
                value={weightUnit}
                onChange={(e) => setWeightUnit(e.target.value as any)}
              >
                <option value="lbs">Pounds (lbs)</option>
                <option value="kg">Kilograms (kg)</option>
              </select>
            </div>

            {/* Goal Selection */}
            <div className="form-control">
              <label className="label">
                <span className="label-text">Goal</span>
              </label>
              <select
                className="select select-bordered"
                value={goal}
                onChange={(e) => setGoal(e.target.value as any)}
              >
                <option value="fat loss">Fat Loss</option>
                <option value="maintenance">Maintenance</option>
                <option value="muscle gain">Muscle Gain</option>
              </select>
            </div>
          </div>

          <div className="divider">OR</div>

          {/* Option 1: Use Report ID */}
          <div className="form-control mb-4">
            <label className="label">
              <span className="label-text font-semibold">Option 1: Use Existing Report</span>
            </label>
            <select
              className="select select-bordered"
              value={reportId}
              onChange={(e) => setReportId(e.target.value)}
            >
              <option value="">Select a report...</option>
              {reports.map((report) => {
                const client = Array.isArray(report.clients) ? report.clients[0] : report.clients;
                const clientName = client ? `${client.first_name} ${client.last_name}` : 'Unknown';
                const startDate = new Date(report.date_range_start).toLocaleDateString();
                const endDate = new Date(report.date_range_end).toLocaleDateString();
                return (
                  <option key={report.id} value={report.id}>
                    {clientName} - {startDate} to {endDate}
                  </option>
                );
              })}
            </select>
            {reportId && (
              <input
                type="text"
                className="input input-bordered mt-2"
                placeholder="Or enter report ID manually"
                value={reportId}
                onChange={(e) => setReportId(e.target.value)}
              />
            )}
          </div>

          {/* Option 2: Use Client ID + Date Range */}
          <div className="form-control mb-4">
            <label className="label">
              <span className="label-text font-semibold">Option 2: Generate On-the-Fly</span>
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg 
                  className="h-5 w-5 text-base-content/60" 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    strokeWidth={2} 
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" 
                  />
                </svg>
              </div>
              <input
                type="text"
                className="input input-bordered w-full pl-10"
                placeholder="Search for a client..."
                value={clientSearchQuery}
                onChange={(e) => {
                  setClientSearchQuery(e.target.value);
                  if (!e.target.value) {
                    setClientId('');
                    setSelectedClientName('');
                  }
                }}
                onFocus={() => {
                  if (filteredClients.length > 0) {
                    setShowClientDropdown(true);
                  }
                }}
              />
              {selectedClientName && (
                <div className="mt-2 text-sm text-base-content/70">
                  Selected: <span className="font-medium">{selectedClientName}</span>
                  <button
                    className="ml-2 text-error hover:underline"
                    onClick={() => {
                      setClientId('');
                      setSelectedClientName('');
                      setClientSearchQuery('');
                    }}
                  >
                    Clear
                  </button>
                </div>
              )}
              {showClientDropdown && filteredClients.length > 0 && (
                <div className="absolute z-50 w-full mt-1 bg-base-100 border border-base-300 rounded-lg shadow-xl max-h-60 overflow-y-auto">
                  <div className="py-1">
                    {filteredClients.map((client) => (
                      <div
                        key={client.id}
                        className="px-4 py-3 cursor-pointer transition-colors hover:bg-base-200 text-base-content"
                        onClick={() => {
                          setClientId(client.id);
                          setSelectedClientName(`${client.first_name} ${client.last_name}`);
                          setClientSearchQuery(`${client.first_name} ${client.last_name}`);
                          setShowClientDropdown(false);
                        }}
                      >
                        <div className="font-medium">
                          {client.first_name} {client.last_name}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            {clientId && (
              <input
                type="text"
                className="input input-bordered mt-2"
                placeholder="Or enter client ID manually"
                value={clientId}
                onChange={(e) => setClientId(e.target.value)}
              />
            )}
            <div className="grid grid-cols-2 gap-2 mt-2">
              <input
                type="date"
                className="input input-bordered"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                placeholder="Start Date"
              />
              <input
                type="date"
                className="input input-bordered"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                placeholder="End Date"
              />
            </div>
          </div>

          <button
            className="btn btn-primary mt-4"
            onClick={handleTest}
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <span className="loading loading-spinner"></span>
                Generating...
              </>
            ) : (
              'Generate Text Report'
            )}
          </button>
        </div>
      </div>

      {/* Results */}
      {result && (
        <div className="card bg-base-200 shadow-xl">
          <div className="card-body">
            <h2 className="card-title mb-4">Results</h2>

            {/* Metadata */}
            <div className="mb-4">
              <h3 className="font-semibold mb-2">Metadata:</h3>
              <div className="bg-base-300 p-4 rounded">
                <pre className="text-sm overflow-x-auto">
                  {JSON.stringify(result.metadata, null, 2)}
                </pre>
              </div>
            </div>

            {/* Text Output */}
            <div className="mb-4">
              <div className="flex justify-between items-center mb-2">
                <h3 className="font-semibold">Generated Text ({result.text.length} characters):</h3>
                <button
                  className="btn btn-sm btn-outline"
                  onClick={() => copyToClipboard(result.text)}
                >
                  Copy Text
                </button>
              </div>
              <div className="bg-base-300 p-4 rounded max-h-96 overflow-y-auto">
                <pre className="text-sm whitespace-pre-wrap">{result.text}</pre>
              </div>
            </div>

            {/* Preview in Discord-style */}
            <div className="mb-4">
              <h3 className="font-semibold mb-2">Discord Preview:</h3>
              <div className="bg-gray-900 text-gray-100 p-4 rounded max-h-96 overflow-y-auto">
                <div className="prose prose-invert max-w-none">
                  {result.text.split('\n').map((line: string, idx: number) => {
                    // Simple markdown rendering for preview
                    let rendered = line;
                    rendered = rendered.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
                    rendered = rendered.replace(/#{3}\s+(.*)/g, '<h3>$1</h3>');
                    rendered = rendered.replace(/#{2}\s+(.*)/g, '<h2>$1</h2>');
                    rendered = rendered.replace(/#{1}\s+(.*)/g, '<h1>$1</h1>');
                    return <div key={idx} dangerouslySetInnerHTML={{ __html: rendered }} />;
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

