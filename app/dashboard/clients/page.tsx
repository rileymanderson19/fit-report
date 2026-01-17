"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/libs/supabase/client';
import { toast } from 'sonner';
import Link from 'next/link';
import { PaginationControls } from '../../components/PaginationControls';

interface Client {
  id: string;
  trainer_id: string;
  trainerize_id: number;
  first_name: string;
  last_name: string;
  email: string;
  created_at: string;
  updated_at: string;
  active: boolean;
  notes: string | null;
}

interface TrainerizeClient {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
}

export default function ClientsPage() {
  const supabase = createClient();
  
  // Shared state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedClients, setSelectedClients] = useState<string[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 25;

  // Import-specific state
  const [trainerizeClients, setTrainerizeClients] = useState<TrainerizeClient[]>([]);
  const [importSearchQuery, setImportSearchQuery] = useState('');
  const [selectedImportIds, setSelectedImportIds] = useState<string[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  
  // Notes editing state
  const [editingClientId, setEditingClientId] = useState<string | null>(null);
  const [editingNotes, setEditingNotes] = useState<string>('');
  const [isSavingNotes, setIsSavingNotes] = useState(false);

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

  useEffect(() => {
    fetchClients();
  }, [fetchClients]);

  // Fetch clients from Trainerize
  const fetchTrainerizeClients = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/trainerize/fetch-clients');
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch clients');
      }

      const mappedClients = data.users.map((user: any) => ({
        id: user.id,
        first_name: user.firstName,
        last_name: user.lastName,
        email: user.email
      }));

      setTrainerizeClients(mappedClients);
      setSelectedImportIds([]);
      setImportSearchQuery('');
      setIsModalOpen(true);
    } catch (error) {
      console.error('Error fetching clients:', error);
      toast.error('Failed to fetch clients from Trainerize');
    } finally {
      setIsLoading(false);
    }
  };

  const handleImportClients = async () => {
    setIsImporting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No user found');

      const selectedTrainerizeClients = trainerizeClients.filter(client => 
        selectedImportIds.includes(client.id) && 
        !clients.some(c => c.trainerize_id === parseInt(client.id))
      );

      if (selectedTrainerizeClients.length === 0) {
        throw new Error('No clients selected or all selected clients are already imported');
      }

      for (const client of selectedTrainerizeClients) {
        const { error } = await supabase
          .from('clients')
          .insert({
            trainer_id: user.id,
            first_name: client.first_name,
            last_name: client.last_name,
            email: client.email,
            trainerize_id: parseInt(client.id),
            active: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          });

        if (error) {
          console.error('Error importing client:', error);
          throw new Error(`Failed to import ${client.first_name} ${client.last_name}: ${error.message}`);
        }
      }

      toast.success('Clients imported successfully');
      fetchClients();
      setIsModalOpen(false);
      setSelectedImportIds([]);
    } catch (error) {
      console.error('Error importing clients:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to import clients');
    } finally {
      setIsImporting(false);
    }
  };

  // Handle import client selection
  const handleImportClientSelect = (clientId: string) => {
    setSelectedImportIds(prev => 
      prev.includes(clientId) 
        ? prev.filter(id => id !== clientId)
        : [...prev, clientId]
    );
  };

  // Handle import select all
  const handleImportSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      const newSelectedIds = new Set([...selectedImportIds]);
      filteredTrainerizeClients.forEach(client => newSelectedIds.add(client.id));
      setSelectedImportIds(Array.from(newSelectedIds));
    } else {
      const filteredIds = new Set(filteredTrainerizeClients.map(client => client.id));
      setSelectedImportIds(selectedImportIds.filter(id => !filteredIds.has(id)));
    }
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
      const newSelectedClients = new Set([...selectedClients]);
      filteredClients.forEach(client => newSelectedClients.add(client.id));
      setSelectedClients(Array.from(newSelectedClients));
    } else {
      const filteredClientIds = new Set(filteredClients.map(client => client.id));
      setSelectedClients(selectedClients.filter(id => !filteredClientIds.has(id)));
    }
  };

  const handleDeleteSelected = () => {
    if (selectedClients.length === 0) return;
    (document.getElementById('delete-client-modal') as HTMLDialogElement)?.showModal();
  };

  const confirmDelete = async () => {
    setIsDeleting(true);
    try {
      for (const clientId of selectedClients) {
        const response = await fetch(`/api/clients/delete?id=${clientId}`, {
          method: 'DELETE',
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || 'Failed to delete client');
        }
      }

      setClients(clients.filter(c => !selectedClients.includes(c.id)));
      setSelectedClients([]);
      toast.success(`Successfully deleted ${selectedClients.length} client(s)`);
    } catch (error) {
      console.error('Error deleting clients:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to delete clients');
    } finally {
      setIsDeleting(false);
      (document.getElementById('delete-client-modal') as HTMLDialogElement)?.close();
    }
  };

  const filteredClients = clients
    .filter(client =>
      `${client.first_name} ${client.last_name}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
      client.email.toLowerCase().includes(searchQuery.toLowerCase())
    )
    .sort((a, b) => a.first_name.localeCompare(b.first_name));

  const totalPages = Math.ceil(filteredClients.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentClients = filteredClients.slice(startIndex, endIndex);

  const PaginationControls = ({ totalPages, currentPage, onPageChange }: { totalPages: number; currentPage: number; onPageChange: (page: number) => void }) => {
    return (
      <div className="flex justify-center items-center gap-2 mt-4">
        <button
          className="glass border border-white/10 hover:border-accent-purple/50 px-4 py-2 rounded-lg text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
        >
          Previous
        </button>
        <span className="text-sm text-gray-300">
          Page {currentPage} of {totalPages}
        </span>
        <button
          className="glass border border-white/10 hover:border-accent-purple/50 px-4 py-2 rounded-lg text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
        >
          Next
        </button>
      </div>
    );
  };

  // Add filteredTrainerizeClients computation
  const filteredTrainerizeClients = trainerizeClients.filter(client =>
    `${client.first_name} ${client.last_name}`.toLowerCase().includes(importSearchQuery.toLowerCase()) ||
    client.email.toLowerCase().includes(importSearchQuery.toLowerCase())
  );

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-display font-bold gradient-text">Clients</h1>
          <p className="text-gray-400 mt-2">
            Manage your client list and import from Trainerize
          </p>
        </div>
        <Link
          href="/dashboard/reports"
          className="btn-gradient px-6 py-3 rounded-lg font-medium"
        >
          Generate Reports
        </Link>
      </div>

      <div className="space-y-6">
        {/* Client Management Section */}
        <div className="card-elevated">
          <div className="card-body">
            <div className="flex items-center justify-between gap-4 mb-6">
              <div className="flex-1">
                <input
                  type="text"
                  placeholder="Search clients..."
                  className="bg-bg-secondary border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-accent-purple rounded-lg px-4 py-2 w-full"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setCurrentPage(1);
                  }}
                />
              </div>
              <div className="flex gap-2">
                {selectedClients.length > 0 && (
                  <button
                    className="glass border border-red-500/50 hover:border-red-500 text-red-400 hover:text-red-300 px-4 py-2 rounded-lg transition-all"
                    onClick={handleDeleteSelected}
                  >
                    Delete Selected ({selectedClients.length})
                  </button>
                )}
                <button
                  className={`glass border border-white/10 hover:border-accent-purple/50 px-4 py-2 rounded-lg transition-all flex items-center gap-2 ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                  onClick={fetchTrainerizeClients}
                  disabled={isLoading}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM6.293 6.707a1 1 0 010-1.414l3-3a1 1 0 011.414 0l3 3a1 1 0 01-1.414 1.414L11 5.414V13a1 1 0 11-2 0V5.414L7.707 6.707a1 1 0 01-1.414 0z" clipRule="evenodd"/>
                  </svg>
                  {isLoading ? 'Loading...' : 'Import Clients'}
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="table w-full">
                <thead>
                  <tr>
                    <th className="text-gray-400">
                      <label>
                        <input
                          type="checkbox"
                          className="checkbox border-white/20 [--chkbg:theme(colors.accent-purple)] [--chkfg:white] checked:border-accent-purple"
                          checked={currentClients.length > 0 && currentClients.every(client => selectedClients.includes(client.id))}
                          onChange={handleSelectAll}
                        />
                      </label>
                    </th>
                    <th className="text-gray-400">Name</th>
                    <th className="text-gray-400">Notes</th>
                    <th className="text-gray-400">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {currentClients.map((client) => (
                    <tr key={client.id} className={selectedClients.includes(client.id) ? 'bg-white/5' : 'hover:bg-white/5'}>
                      <td>
                        <label>
                          <input
                            type="checkbox"
                            className="checkbox border-white/20 [--chkbg:theme(colors.accent-purple)] [--chkfg:white] checked:border-accent-purple"
                            checked={selectedClients.includes(client.id)}
                            onChange={() => handleClientSelect(client.id)}
                          />
                        </label>
                      </td>
                      <td className="text-white">{`${client.first_name} ${client.last_name}`}</td>
                      <td>
                        {client.notes ? (
                          <div className="flex items-center gap-2">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-accent-purple" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            <span className="text-sm text-gray-300 truncate max-w-xs" title={client.notes}>
                              {client.notes.length > 50 ? `${client.notes.substring(0, 50)}...` : client.notes}
                            </span>
                          </div>
                        ) : (
                          <span className="text-sm text-gray-500">No notes</span>
                        )}
                      </td>
                      <td>
                        <div className="flex gap-2">
                          <button
                            className="glass border border-white/10 hover:border-accent-purple/50 p-2 rounded-lg transition-all"
                            onClick={() => {
                              setEditingClientId(client.id);
                              setEditingNotes(client.notes || '');
                              (document.getElementById('edit-notes-modal') as HTMLDialogElement)?.showModal();
                            }}
                            title="Edit Notes"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                          <Link
                            href={`/dashboard/clients/${client.id}/reports`}
                            className="glass border border-white/10 hover:border-accent-purple/50 px-3 py-1.5 rounded-lg text-sm transition-all"
                          >
                            View Reports
                          </Link>
                          <Link
                            href={`/dashboard/reports?selectedClient=${client.id}`}
                            className="btn-gradient text-sm px-3 py-1.5 rounded-lg"
                          >
                            Generate Report
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filteredClients.length === 0 && (
                    <tr>
                      <td colSpan={4} className="text-center py-4 text-gray-400">
                        {clients.length === 0 ? 'No clients imported yet' : 'No clients found matching your search'}
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
          </div>
        </div>
      </div>

      {/* Delete Client Modal */}
      <dialog id="delete-client-modal" className="modal modal-bottom sm:modal-middle">
        <div className="card-elevated max-w-md">
          <h3 className="font-bold text-lg text-white mb-2">Confirm Delete</h3>
          <p className="py-4 text-gray-300">
            Are you sure you want to delete {selectedClients.length} client(s)? This will also delete all their reports. This action cannot be undone.
          </p>
          <div className="flex justify-end gap-2 mt-4">
            <button
              className="glass border border-white/10 hover:border-white/20 px-4 py-2 rounded-lg transition-all"
              onClick={() => {
                (document.getElementById('delete-client-modal') as HTMLDialogElement)?.close();
              }}
              disabled={isDeleting}
            >
              Cancel
            </button>
            <button
              className="glass border border-red-500/50 hover:border-red-500 bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-300 px-4 py-2 rounded-lg transition-all flex items-center gap-2"
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

      {/* Import Clients Modal */}
      <dialog id="trainerize_modal" className={`modal ${isModalOpen ? 'modal-open' : ''}`}>
        <div className="card-elevated w-11/12 max-w-5xl max-h-[90vh] flex flex-col">
          <div className="p-6">
            <h3 className="font-bold text-lg mb-4 text-white">Import Clients from Trainerize</h3>

            <div className="mb-6">
              <input
                type="text"
                placeholder="Search Trainerize clients..."
                className="bg-bg-secondary border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-accent-purple rounded-lg px-4 py-2 w-full"
                value={importSearchQuery}
                onChange={(e) => setImportSearchQuery(e.target.value)}
              />
            </div>
          </div>

          <div className="overflow-x-auto overflow-y-auto flex-1 px-6">
            <table className="table w-full">
              <thead>
                <tr>
                  <th className="text-gray-400">
                    <label>
                      <input
                        type="checkbox"
                        className="checkbox border-white/20 [--chkbg:theme(colors.accent-purple)] [--chkfg:white] checked:border-accent-purple"
                        checked={
                          filteredTrainerizeClients.length > 0 &&
                          filteredTrainerizeClients.every(client =>
                            selectedImportIds.includes(client.id)
                          )
                        }
                        onChange={handleImportSelectAll}
                      />
                    </label>
                  </th>
                  <th className="text-gray-400">Name</th>
                  <th className="text-gray-400">Email</th>
                  <th className="text-gray-400">Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredTrainerizeClients.map((client) => (
                  <tr key={client.id} className="hover:bg-white/5">
                    <td>
                      <label>
                        <input
                          type="checkbox"
                          className="checkbox border-white/20 [--chkbg:theme(colors.accent-purple)] [--chkfg:white] checked:border-accent-purple"
                          checked={selectedImportIds.includes(client.id)}
                          onChange={() => handleImportClientSelect(client.id)}
                        />
                      </label>
                    </td>
                    <td className="text-white">{client.first_name} {client.last_name}</td>
                    <td className="text-gray-300">{client.email}</td>
                    <td>
                      {clients.some(c => c.trainerize_id === parseInt(client.id)) ? (
                        <span className="text-green-400">Imported</span>
                      ) : (
                        <span className="text-gray-500">Not Imported</span>
                      )}
                    </td>
                  </tr>
                ))}
                {filteredTrainerizeClients.length === 0 && !isLoading && (
                  <tr>
                    <td colSpan={4} className="text-center py-4 text-gray-400">
                      No clients found
                    </td>
                  </tr>
                )}
                {isLoading && (
                  <tr>
                    <td colSpan={4} className="text-center py-4">
                      <span className="loading loading-spinner loading-md"></span>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="flex justify-end gap-2 p-6 border-t border-white/10">
            <button
              className={`btn-gradient px-6 py-3 rounded-lg font-medium ${isImporting ? 'opacity-50 cursor-not-allowed' : ''} flex items-center gap-2`}
              onClick={handleImportClients}
              disabled={isImporting || selectedImportIds.length === 0}
            >
              {isImporting && <span className="loading loading-spinner loading-sm" />}
              Import Selected ({selectedImportIds.filter(id =>
                trainerizeClients.some(c => c.id === id) &&
                !clients.some(c => c.trainerize_id === parseInt(id))
              ).length})
            </button>
            <button
              className="glass border border-white/10 hover:border-white/20 px-6 py-3 rounded-lg font-medium transition-all"
              onClick={() => {
                setIsModalOpen(false);
                setSelectedImportIds([]);
                setImportSearchQuery('');
              }}
            >
              Close
            </button>
          </div>
        </div>
        <form method="dialog" className="modal-backdrop">
          <button onClick={() => {
            setIsModalOpen(false);
            setSelectedImportIds([]);
            setImportSearchQuery('');
          }}>close</button>
        </form>
      </dialog>

      {/* Edit Notes Modal */}
      <dialog id="edit-notes-modal" className="modal">
        <div className="card-elevated max-w-2xl">
          <h3 className="font-bold text-lg mb-4 text-white">
            Edit Client Notes
          </h3>
          {editingClientId && (
            <p className="text-sm text-gray-300 mb-4">
              {clients.find(c => c.id === editingClientId)?.first_name} {clients.find(c => c.id === editingClientId)?.last_name}
            </p>
          )}
          <textarea
            className="bg-bg-secondary border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-accent-purple rounded-lg px-4 py-2 w-full min-h-[200px]"
            placeholder="Enter client notes/context here..."
            value={editingNotes}
            onChange={(e) => setEditingNotes(e.target.value)}
          />
          <div className="flex justify-end gap-2 mt-4">
            <button
              className={`btn-gradient ${isSavingNotes ? 'opacity-50 cursor-not-allowed' : ''} flex items-center gap-2`}
              onClick={async () => {
                if (!editingClientId) return;
                setIsSavingNotes(true);
                try {
                  const response = await fetch('/api/clients/update-notes', {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                      clientId: editingClientId,
                      notes: editingNotes.trim() || null
                    }),
                  });

                  const data = await response.json();

                  if (!response.ok) {
                    throw new Error(data.error || 'Failed to update notes');
                  }

                  // Update local state
                  setClients(clients.map(c =>
                    c.id === editingClientId
                      ? { ...c, notes: editingNotes.trim() || null }
                      : c
                  ));

                  toast.success('Notes updated successfully');
                  (document.getElementById('edit-notes-modal') as HTMLDialogElement)?.close();
                  setEditingClientId(null);
                  setEditingNotes('');
                } catch (error) {
                  console.error('Error updating notes:', error);
                  toast.error(error instanceof Error ? error.message : 'Failed to update notes');
                } finally {
                  setIsSavingNotes(false);
                }
              }}
              disabled={isSavingNotes}
            >
              {isSavingNotes && <span className="loading loading-spinner loading-sm" />}
              Save
            </button>
            <button
              className="glass border border-white/10 hover:border-white/20 px-4 py-2 rounded-lg transition-all"
              onClick={() => {
                (document.getElementById('edit-notes-modal') as HTMLDialogElement)?.close();
                setEditingClientId(null);
                setEditingNotes('');
              }}
            >
              Cancel
            </button>
          </div>
        </div>
        <form method="dialog" className="modal-backdrop">
          <button onClick={() => {
            setEditingClientId(null);
            setEditingNotes('');
          }}>close</button>
        </form>
      </dialog>
    </div>
  );
} 