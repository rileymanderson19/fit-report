'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/libs/supabase/client';
import { toast } from 'sonner';

interface Client {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  active: boolean;
  trainerize_id: string;  // Add this field since we need it for the API calls
}

export default function ReportsPage() {
  const supabase = createClient();
  const [selectedClients, setSelectedClients] = useState<string[]>([]);
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [clients, setClients] = useState<Client[]>([]);
  const [reportData, setReportData] = useState<any>(null);

  // Fetch clients from Supabase
  const fetchClients = useCallback(async () => {
    try {
      const { data: profile } = await supabase.auth.getUser();
      if (!profile.user) {
        throw new Error('No user found');
      }

      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .eq('active', true)
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      setClients(data || []);
    } catch (error) {
      console.error('Error fetching clients:', error);
      toast.error('Failed to fetch clients');
    }
  }, [supabase]);

  // Fetch clients when component mounts
  useEffect(() => {
    fetchClients();
  }, [fetchClients]);

  const handleClientSelect = (clientId: string) => {
    // Since we're only allowing one client at a time for now
    setSelectedClients([clientId]);
  };

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      // For now, just select the first client if selecting all
      if (filteredClients.length > 0) {
        setSelectedClients([filteredClients[0].id]);
      }
    } else {
      setSelectedClients([]);
    }
  };

  const generateReport = async () => {
    if (selectedClients.length === 0 || !startDate || !endDate) {
      toast.error('Please select a client and date range');
      return;
    }

    const selectedClient = selectedClients[0]; // Get the first (and only) selected client
    const client = clients.find(c => c.id === selectedClient);
    
    if (!client?.trainerize_id) {
      toast.error('Selected client does not have a Trainerize ID');
      return;
    }

    setIsLoading(true);
    setReportData(null);

    try {
      console.log('Fetching body stats...');
      // Fetch body stats
      const bodyStatsResponse = await fetch('/api/trainerize/bodystats', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userID: client.trainerize_id,
          date: endDate.toISOString().split('T')[0],
          unitBodystats: 'inches',
          unitWeight: 'lbs',
        }),
      });

      if (!bodyStatsResponse.ok) {
        const error = await bodyStatsResponse.json();
        throw new Error(`Failed to fetch body stats: ${error.error}`);
      }

      console.log('Fetching health data...');
      // Fetch health data
      const healthDataResponse = await fetch('/api/trainerize/health-data', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userID: client.trainerize_id,
          type: 'step',
          startDate: startDate.toISOString().split('T')[0],
          endDate: endDate.toISOString().split('T')[0],
        }),
      });

      if (!healthDataResponse.ok) {
        const error = await healthDataResponse.json();
        throw new Error(`Failed to fetch health data: ${error.error}`);
      }

      console.log('Fetching nutrition data...');
      // Fetch nutrition data
      const nutritionDataResponse = await fetch('/api/trainerize/nutrition', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userID: client.trainerize_id,
          startDate: `${startDate.toISOString().split('T')[0]} 00:00:00`,
          endDate: `${endDate.toISOString().split('T')[0]} 23:59:59`,
        }),
      });

      if (!nutritionDataResponse.ok) {
        const error = await nutritionDataResponse.json();
        throw new Error(`Failed to fetch nutrition data: ${error.error}`);
      }

      console.log('Processing responses...');
      const [bodyStats, healthData, nutritionData] = await Promise.all([
        bodyStatsResponse.json(),
        healthDataResponse.json(),
        nutritionDataResponse.json(),
      ]);

      console.log('Setting report data...');
      const newReportData = {
        bodyStats,
        healthData,
        nutritionData,
      };
      
      setReportData(newReportData);

      console.log('Storing report...');
      // Store the report in the database
      const storeResponse = await fetch('/api/reports/store', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          clientId: selectedClient,
          reportData: newReportData,
          dateRange: {
            from: startDate.toISOString(),
            to: endDate.toISOString(),
          },
        }),
      });

      if (!storeResponse.ok) {
        const error = await storeResponse.json();
        throw new Error(`Failed to store report: ${error.error}`);
      }

      toast.success('Report generated successfully');
    } catch (error) {
      console.error('Error generating report:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to generate report');
      setReportData(null);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredClients = clients.filter(client =>
    `${client.first_name} ${client.last_name}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
    client.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-6">Generate Report</h1>
      
      <div className="bg-base-100 p-6 rounded-lg shadow-xl border border-base-300 space-y-6">
        {/* Client Selection */}
        <div className="card bg-base-100 shadow-xl">
          <div className="card-body">
            <h2 className="text-xl font-bold mb-4">Select Client</h2>
            
            {/* Search Bar */}
            <div className="flex items-center justify-between gap-4 mb-6">
              <div className="flex-1">
                <input
                  type="text"
                  placeholder="Search clients..."
                  className="input input-bordered w-full"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>

            <p className="text-base-content/60 mb-6">
              Showing {filteredClients.length} active clients
            </p>
            
            <div className="overflow-x-auto">
              <table className="table w-full">
                <thead>
                  <tr>
                    <th>
                      <label>
                        <input 
                          type="checkbox" 
                          className="checkbox"
                          checked={selectedClients.length === 1 && filteredClients.length > 0}
                          onChange={handleSelectAll}
                        />
                      </label>
                    </th>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Trainerize ID</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredClients.map((client) => (
                    <tr key={client.id} className={selectedClients.includes(client.id) ? 'bg-base-200' : ''}>
                      <td>
                        <label>
                          <input 
                            type="checkbox" 
                            className="checkbox"
                            checked={selectedClients.includes(client.id)}
                            onChange={() => handleClientSelect(client.id)}
                          />
                        </label>
                      </td>
                      <td>{`${client.first_name} ${client.last_name}`}</td>
                      <td>{client.email}</td>
                      <td>{client.trainerize_id || 'Not set'}</td>
                    </tr>
                  ))}
                  {filteredClients.length === 0 && (
                    <tr>
                      <td colSpan={4} className="text-center py-4">
                        {clients.length === 0 ? 'No clients imported yet' : 'No clients found matching your search'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Timeframe Selection */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="form-control w-full">
            <label className="label">
              <span className="label-text font-semibold">Start Date</span>
            </label>
            <input 
              type="date" 
              className="input input-bordered w-full"
              value={startDate?.toISOString().split('T')[0] || ''}
              onChange={(e) => setStartDate(new Date(e.target.value))}
            />
          </div>
          
          <div className="form-control w-full">
            <label className="label">
              <span className="label-text font-semibold">End Date</span>
            </label>
            <input 
              type="date" 
              className="input input-bordered w-full"
              value={endDate?.toISOString().split('T')[0] || ''}
              onChange={(e) => setEndDate(new Date(e.target.value))}
            />
          </div>
        </div>

        {/* Run Report Button */}
        <div className="flex justify-end mt-6">
          <button 
            className={`btn btn-primary ${isLoading ? 'loading' : ''}`}
            onClick={generateReport}
            disabled={selectedClients.length === 0 || !startDate || !endDate || isLoading}
          >
            {isLoading ? 'Generating Report...' : 'Generate Report'}
          </button>
        </div>
      </div>

      {/* Report Results Section */}
      {reportData ? (
        <div className="mt-8">
          <div className="bg-base-100 p-6 rounded-lg shadow-xl border border-base-300">
            <h2 className="text-xl font-semibold mb-4">Report Results</h2>
            <pre className="whitespace-pre-wrap">{JSON.stringify(reportData, null, 2)}</pre>
          </div>
        </div>
      ) : (
        <div className="mt-8 bg-base-100 p-6 rounded-lg shadow-xl border border-base-300">
          <h2 className="text-xl font-semibold mb-4">Report Results</h2>
          <div className="alert alert-info">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="stroke-current shrink-0 w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
            <span>Select a client and timeframe above to generate a report</span>
          </div>
        </div>
      )}
    </div>
  );
} 