"use client";

import { useState } from 'react';
import toast from 'react-hot-toast';

interface TrainerizeClient {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
}

export default function ClientsPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [clients, setClients] = useState<TrainerizeClient[]>([]);
  const [selectedClients, setSelectedClients] = useState<number[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

  // Fetch clients from Trainerize
  const fetchClients = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/trainerize/fetch-clients');
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch clients');
      }

      // Map the response to only include the fields we need
      const mappedClients = data.users.map((user: { id: number; firstName: string; lastName: string; email: string }) => ({
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email
      }));

      setClients(mappedClients);
    } catch (error) {
      console.error('Error fetching clients:', error);
      toast.error('Failed to fetch clients from Trainerize');
    } finally {
      setIsLoading(false);
    }
  };

  const handleImport = async () => {
    if (selectedClients.length === 0) {
      toast.error('Please select at least one client to import');
      return;
    }

    setIsImporting(true);
    try {
      // Get the selected clients' data
      const clientsToImport = clients.filter(client => 
        selectedClients.includes(client.id)
      );

      // Send the clients to our import endpoint
      const response = await fetch('/api/clients/import', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ clients: clientsToImport }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to import clients');
      }

      toast.success(`Successfully imported ${selectedClients.length} clients`);
      setSelectedClients([]); // Reset selection after import
    } catch (error) {
      console.error('Error importing clients:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to import selected clients');
    } finally {
      setIsImporting(false);
    }
  };

  const toggleSelectAll = () => {
    if (selectedClients.length === clients.length) {
      setSelectedClients([]);
    } else {
      setSelectedClients(clients.map(client => client.id));
    }
  };

  const toggleSelectClient = (clientId: number) => {
    if (selectedClients.includes(clientId)) {
      setSelectedClients(selectedClients.filter(id => id !== clientId));
    } else {
      setSelectedClients([...selectedClients, clientId]);
    }
  };

  // Filter clients based on search query
  const filteredClients = clients.filter(client => 
    `${client.firstName} ${client.lastName}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
    client.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-6">Clients</h1>
      
      {/* Search and Actions Bar */}
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
        <button 
          className={`btn btn-outline ${isLoading ? 'loading' : ''}`}
          onClick={fetchClients}
          disabled={isLoading}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM6.293 6.707a1 1 0 010-1.414l3-3a1 1 0 011.414 0l3 3a1 1 0 01-1.414 1.414L11 5.414V13a1 1 0 11-2 0V5.414L7.707 6.707a1 1 0 01-1.414 0z" clipRule="evenodd"/>
          </svg>
          {isLoading ? 'Loading...' : 'Load Clients'}
        </button>
        <button 
          className={`btn btn-primary ${isImporting ? 'loading' : ''}`}
          onClick={handleImport}
          disabled={isImporting || selectedClients.length === 0}
        >
          Import Selected ({selectedClients.length})
        </button>
      </div>

      {/* Clients Table */}
      <div className="card bg-base-100 shadow-xl">
        <div className="card-body">
          <h2 className="text-xl font-bold mb-4">Your Clients</h2>
          <p className="text-base-content/60 mb-6">
            Showing {filteredClients.length} clients from Trainerize
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
                        checked={selectedClients.length === clients.length}
                        onChange={toggleSelectAll}
                      />
                    </label>
                  </th>
                  <th>Name</th>
                  <th>Email</th>
                </tr>
              </thead>
              <tbody>
                {filteredClients.map((client) => (
                  <tr key={client.id} className="hover">
                    <td>
                      <label>
                        <input
                          type="checkbox"
                          className="checkbox"
                          checked={selectedClients.includes(client.id)}
                          onChange={() => toggleSelectClient(client.id)}
                        />
                      </label>
                    </td>
                    <td>{`${client.firstName} ${client.lastName}`}</td>
                    <td>{client.email}</td>
                  </tr>
                ))}
                {filteredClients.length === 0 && !isLoading && (
                  <tr>
                    <td colSpan={3} className="text-center py-4">
                      {clients.length === 0 ? 'Click "Load Clients" to fetch your clients from Trainerize' : 'No clients found'}
                    </td>
                  </tr>
                )}
                {isLoading && (
                  <tr>
                    <td colSpan={3} className="text-center py-4">
                      <span className="loading loading-spinner loading-md"></span>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
} 