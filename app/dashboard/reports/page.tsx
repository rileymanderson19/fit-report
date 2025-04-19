'use client';

import React, { useState, useEffect } from 'react';
import { createClient } from '@/libs/supabase/client';
import toast from 'react-hot-toast';

interface Client {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  active: boolean;
}

export default function ReportsPage() {
  const supabase = createClient();
  const [selectedClients, setSelectedClients] = useState<string[]>([]);
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [clients, setClients] = useState<Client[]>([]);

  // Fetch clients from Supabase
  const fetchClients = async () => {
    try {
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
  };

  // Fetch clients when component mounts
  useEffect(() => {
    fetchClients();
  }, []);

  const handleRunReport = async () => {
    setIsLoading(true);
    // TODO: Implement report generation logic
    setTimeout(() => setIsLoading(false), 1000);
  };

  const handleClientSelect = (clientId: string) => {
    setSelectedClients(prev => 
      prev.includes(clientId)
        ? prev.filter(id => id !== clientId)
        : [...prev, clientId]
    );
  };

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedClients(filteredClients.map(client => client.id));
    } else {
      setSelectedClients([]);
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
            <h2 className="text-xl font-bold mb-4">Select Clients</h2>
            
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
                          checked={selectedClients.length === filteredClients.length && filteredClients.length > 0}
                          onChange={handleSelectAll}
                        />
                      </label>
                    </th>
                    <th>Name</th>
                    <th>Email</th>
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
                    </tr>
                  ))}
                  {filteredClients.length === 0 && (
                    <tr>
                      <td colSpan={3} className="text-center py-4">
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
            onClick={handleRunReport}
            disabled={!selectedClients.length || !startDate || !endDate || isLoading}
          >
            {isLoading ? 'Generating Report...' : 'Generate Report'}
          </button>
        </div>
      </div>

      {/* Report Results Section */}
      <div className="mt-8 bg-base-100 p-6 rounded-lg shadow-xl border border-base-300">
        <h2 className="text-xl font-semibold mb-4">Report Results</h2>
        <div className="alert alert-info">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="stroke-current shrink-0 w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
          <span>Select clients and a timeframe above to generate a report</span>
        </div>
      </div>
    </div>
  );
} 