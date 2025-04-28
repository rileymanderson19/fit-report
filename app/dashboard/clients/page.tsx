"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/libs/supabase/client';
import toast from 'react-hot-toast';
import Link from 'next/link';

interface TrainerizeClient {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
}

interface ImportedClient {
  id: string;
  trainerize_id: number;
  first_name: string;
  last_name: string;
  email: string;
  active: boolean;
}

export default function ClientsPage() {
  const supabase = createClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [clients, setClients] = useState<TrainerizeClient[]>([]);
  const [importedClients, setImportedClients] = useState<ImportedClient[]>([]);
  const [selectedClients, setSelectedClients] = useState<number[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [clientToDelete, setClientToDelete] = useState<ImportedClient | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  
  // Add pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 25;

  // Add handler for search query changes
  const handleSearchQueryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    setCurrentPage(1); // Reset to first page when search query changes
  };

  // Fetch imported clients from Supabase
  const fetchImportedClients = useCallback(async () => {
    try {
      console.log('Fetching imported clients...');
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Supabase error:', error);
        throw error;
      }

      console.log('Imported clients data:', data);
      setImportedClients(data || []);
    } catch (error) {
      console.error('Error fetching imported clients:', error);
      toast.error('Failed to fetch imported clients');
    }
  }, [supabase]);

  // Call fetchImportedClients when the component mounts
  useEffect(() => {
    fetchImportedClients();
  }, [fetchImportedClients]);

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
      setIsModalOpen(true); // Open the modal after successful fetch
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
      setIsModalOpen(false); // Close the modal after successful import
      // Refresh the imported clients list
      await fetchImportedClients();
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

  // Add pagination logic
  const totalPages = Math.ceil(filteredClients.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentClients = filteredClients.slice(startIndex, endIndex);

  // Filter imported clients based on search query
  const filteredImportedClients = importedClients.filter(client =>
    `${client.first_name} ${client.last_name}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
    client.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Add pagination logic for imported clients
  const totalImportedPages = Math.ceil(filteredImportedClients.length / itemsPerPage);
  const startImportedIndex = (currentPage - 1) * itemsPerPage;
  const endImportedIndex = startImportedIndex + itemsPerPage;
  const currentImportedClients = filteredImportedClients.slice(startImportedIndex, endImportedIndex);

  // Add pagination controls component
  const PaginationControls = ({ totalPages, currentPage, onPageChange }: { totalPages: number; currentPage: number; onPageChange: (page: number) => void }) => {
    return (
      <div className="flex justify-center items-center gap-2 mt-4">
        <button
          className="btn btn-sm"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
        >
          Previous
        </button>
        <span className="text-sm">
          Page {currentPage} of {totalPages}
        </span>
        <button
          className="btn btn-sm"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
        >
          Next
        </button>
      </div>
    );
  };

  const handleDeleteClient = async (client: ImportedClient) => {
    setClientToDelete(client);
    (document.getElementById('delete-client-modal') as HTMLDialogElement)?.showModal();
  };

  const confirmDelete = async () => {
    if (!clientToDelete) return;

    setIsDeleting(true);
    try {
      const response = await fetch(`/api/clients/delete?id=${clientToDelete.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete client');
      }

      // Remove the client from the state
      setImportedClients(importedClients.filter(c => c.id !== clientToDelete.id));
      toast.success('Client deleted successfully');
    } catch (error) {
      console.error('Error deleting client:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to delete client');
    } finally {
      setIsDeleting(false);
      setClientToDelete(null);
      (document.getElementById('delete-client-modal') as HTMLDialogElement)?.close();
    }
  };

  const cancelDelete = () => {
    setClientToDelete(null);
    (document.getElementById('delete-client-modal') as HTMLDialogElement)?.close();
  };

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
            onChange={handleSearchQueryChange}
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
      </div>

      {/* Update Imported Clients Table */}
      <div className="card bg-base-100 shadow-xl">
        <div className="card-body">
          <h2 className="text-xl font-bold mb-4">Imported Clients</h2>
          <p className="text-base-content/60 mb-6">
            Showing {startImportedIndex + 1}-{Math.min(endImportedIndex, filteredImportedClients.length)} of {filteredImportedClients.length} imported clients
          </p>
          
          <div className="overflow-x-auto">
            <table className="table w-full">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {currentImportedClients.map((client) => (
                  <tr key={client.id} className="hover">
                    <td>{`${client.first_name} ${client.last_name}`}</td>
                    <td>{client.email}</td>
                    <td>
                      <span className={`badge ${client.active ? 'badge-success' : 'badge-error'}`}>
                        {client.active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td>
                      <div className="flex items-center gap-2">
                        <Link
                          href={`/dashboard/clients/${client.id}/reports`}
                          className="btn btn-sm btn-outline"
                        >
                          View Reports
                        </Link>
                        <button
                          className="btn btn-sm btn-error btn-outline"
                          onClick={() => handleDeleteClient(client)}
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filteredImportedClients.length === 0 && (
                  <tr>
                    <td colSpan={4} className="text-center py-4">
                      No imported clients found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {filteredImportedClients.length > itemsPerPage && (
            <PaginationControls
              totalPages={totalImportedPages}
              currentPage={currentPage}
              onPageChange={setCurrentPage}
            />
          )}
        </div>
      </div>

      {/* Update Trainerize Clients Modal */}
      <dialog id="trainerize_modal" className={`modal ${isModalOpen ? 'modal-open' : ''}`}>
        <div className="modal-box w-11/12 max-w-5xl">
          <h3 className="font-bold text-lg mb-4">Import Clients from Trainerize</h3>
          
          {/* Search Bar */}
          <div className="form-control mb-6">
            <input
              type="text"
              placeholder="Search clients by name or email..."
              className="input input-bordered w-full"
              value={searchQuery}
              onChange={handleSearchQueryChange}
            />
            <label className="label">
              <span className="label-text-alt text-base-content/60">
                Showing {startIndex + 1}-{Math.min(endIndex, filteredClients.length)} of {filteredClients.length} clients
              </span>
            </label>
          </div>
          
          <div className="overflow-x-auto">
            <table className="table w-full">
              <thead>
                <tr>
                  <th>
                    <label>
                      <input
                        type="checkbox"
                        className="checkbox"
                        checked={selectedClients.length === currentClients.length && currentClients.length > 0}
                        onChange={toggleSelectAll}
                      />
                    </label>
                  </th>
                  <th>Name</th>
                  <th>Email</th>
                </tr>
              </thead>
              <tbody>
                {currentClients.map((client) => (
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
                      No clients found
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

          {filteredClients.length > itemsPerPage && (
            <PaginationControls
              totalPages={totalPages}
              currentPage={currentPage}
              onPageChange={setCurrentPage}
            />
          )}

          <div className="modal-action">
            <button 
              className={`btn btn-primary ${isImporting ? 'loading' : ''}`}
              onClick={handleImport}
              disabled={isImporting || selectedClients.length === 0}
            >
              Import Selected ({selectedClients.length})
            </button>
            <button 
              className="btn"
              onClick={() => {
                setIsModalOpen(false);
                setSelectedClients([]);
              }}
            >
              Close
            </button>
          </div>
        </div>
        <form method="dialog" className="modal-backdrop">
          <button onClick={() => setIsModalOpen(false)}>close</button>
        </form>
      </dialog>

      {/* Delete Client Confirmation Modal */}
      <dialog id="delete-client-modal" className="modal modal-bottom sm:modal-middle">
        <div className="modal-box">
          <h3 className="font-bold text-lg">Confirm Delete</h3>
          <p className="py-4">
            Are you sure you want to delete {clientToDelete?.first_name} {clientToDelete?.last_name}? This will also delete all their reports. This action cannot be undone.
          </p>
          <div className="modal-action">
            <button className="btn btn-ghost" onClick={cancelDelete} disabled={isDeleting}>
              Cancel
            </button>
            <button
              className="btn btn-error"
              onClick={confirmDelete}
              disabled={isDeleting}
            >
              {isDeleting ? (
                <span className="loading loading-spinner loading-sm" />
              ) : (
                'Delete'
              )}
            </button>
          </div>
        </div>
        <form method="dialog" className="modal-backdrop">
          <button>close</button>
        </form>
      </dialog>
    </div>
  );
} 