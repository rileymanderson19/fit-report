"use client";

import { useState } from 'react';

interface Client {
  name: string;
  email: string;
}

export default function ClientsPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [clients] = useState<Client[]>([
    { name: 'Joshua Mbitu', email: 'joshmwangi@gmail.com' },
    { name: 'Lindsay Sollers', email: 'Lsollers22@gmail.com' },
    { name: 'Steve Hornick', email: 'stevehornick@hotmail.com' },
  ]);

  const handleSync = () => {
    // Handle sync functionality
  };

  return (
    <div className="p-8 space-y-4">
      {/* Search and Actions Bar */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex-1">
          <input
            type="text"
            placeholder="Search clients..."
            className="input input-bordered w-full"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <button className="btn btn-outline">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM6.293 6.707a1 1 0 010-1.414l3-3a1 1 0 011.414 0l3 3a1 1 0 01-1.414 1.414L11 5.414V13a1 1 0 11-2 0V5.414L7.707 6.707a1 1 0 01-1.414 0z" clipRule="evenodd"/>
          </svg>
          Import Clients
        </button>
        <button className="btn btn-primary" onClick={handleSync}>
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd"/>
          </svg>
          Sync All Clients
        </button>
      </div>

      {/* Clients Table */}
      <div className="card bg-base-100 shadow-xl">
        <div className="card-body">
          <h2 className="text-xl font-bold mb-4">Your Clients</h2>
          <p className="text-base-content/60 mb-6">Showing {clients.length} clients from Trainerize</p>
          
          <div className="overflow-x-auto">
            <table className="table w-full">
              <thead>
                <tr>
                  <th>
                    <label>
                      <input type="checkbox" className="checkbox" />
                    </label>
                  </th>
                  <th>Name</th>
                  <th>Email</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {clients.map((client, index) => (
                  <tr key={index}>
                    <td>
                      <label>
                        <input type="checkbox" className="checkbox" />
                      </label>
                    </td>
                    <td>{client.name}</td>
                    <td>{client.email}</td>
                    <td>
                      <button className="btn btn-ghost btn-sm">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd"/>
                        </svg>
                      </button>
                    </td>
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
    </div>
  );
} 