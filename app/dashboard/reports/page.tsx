'use client';

import React, { useState } from 'react';

interface Client {
  name: string;
  email: string;
}

export default function ReportsPage() {
  const [selectedClients, setSelectedClients] = useState<string[]>([]);
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [clients] = useState<Client[]>([
    { name: 'Joshua Mbitu', email: 'joshmwangi@gmail.com' },
    { name: 'Lindsay Sollers', email: 'Lsollers22@gmail.com' },
    { name: 'Steve Hornick', email: 'stevehornick@hotmail.com' },
  ]);

  const handleRunReport = async () => {
    setIsLoading(true);
    // TODO: Implement report generation logic
    setTimeout(() => setIsLoading(false), 1000);
  };

  const handleClientSelect = (clientName: string) => {
    setSelectedClients(prev => 
      prev.includes(clientName)
        ? prev.filter(name => name !== clientName)
        : [...prev, clientName]
    );
  };

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedClients(filteredClients.map(client => client.name));
    } else {
      setSelectedClients([]);
    }
  };

  const filteredClients = clients.filter(client =>
    client.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
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

            <p className="text-base-content/60 mb-6">Showing {filteredClients.length} clients</p>
            
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
                  {filteredClients.map((client, index) => (
                    <tr key={index} className={selectedClients.includes(client.name) ? 'bg-base-200' : ''}>
                      <td>
                        <label>
                          <input 
                            type="checkbox" 
                            className="checkbox"
                            checked={selectedClients.includes(client.name)}
                            onChange={() => handleClientSelect(client.name)}
                          />
                        </label>
                      </td>
                      <td>{client.name}</td>
                      <td>{client.email}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="flex justify-center mt-4 gap-2">
              <button className="btn btn-ghost btn-sm">Previous</button>
              <button className="btn btn-ghost btn-sm bg-base-200">1</button>
              <button className="btn btn-ghost btn-sm">Next</button>
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