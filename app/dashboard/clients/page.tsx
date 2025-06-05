"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/libs/supabase/client';
import { toast } from 'sonner';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
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
}

interface TrainerizeClient {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
}

export default function ClientsPage() {
  const router = useRouter();
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

  // Report-specific state
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [reportData, setReportData] = useState<Record<string, any>>({});
  const [generatingProgress, setGeneratingProgress] = useState<Record<string, boolean>>({});
  const [minReps, setMinReps] = useState<number>(6);
  const [maxReps, setMaxReps] = useState<number>(10);
  const [reportTemplate, setReportTemplate] = useState<'daily' | 'weekly'>('daily');
  const [activeTab, setActiveTab] = useState<'clients' | 'reports'>('clients');

  // Handle URL parameters
  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const selectedClient = searchParams.get('selectedClient');
    const tab = searchParams.get('tab');

    if (selectedClient) {
      setSelectedClients([selectedClient]);
    }

    if (tab === 'reports') {
      setActiveTab('reports');
    }

    // Set default date range when coming from "New Report"
    if (selectedClient && tab === 'reports') {
      const today = new Date();
      const sevenDaysAgo = new Date(today);
      sevenDaysAgo.setDate(today.getDate() - 7);
      
      setStartDate(sevenDaysAgo);
      setEndDate(today);
    }

    // Clean up URL parameters after handling them
    if (selectedClient || tab) {
      const newUrl = window.location.pathname;
      window.history.replaceState({}, '', newUrl);
    }
  }, []);

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

  const generateReportForClient = async (client: Client) => {
    try {
      if (!client?.trainerize_id) {
        throw new Error('Client does not have a Trainerize ID');
      }

      // Fetch workout data first to analyze
      const workoutDataResponse = await fetch('/api/trainerize/workouts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userID: client.trainerize_id,
          startDate: startDate!.toISOString().split('T')[0],
          endDate: endDate!.toISOString().split('T')[0],
          repRange: {
            min: minReps,
            max: maxReps
          }
        }),
      });

      // Fetch other data in parallel
      const [workoutData, bodyStatsData, healthData, nutritionData] = await Promise.all([
        workoutDataResponse.json(),
        fetch('/api/trainerize/bodystats', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userID: client.trainerize_id,
            startDate: startDate!.toISOString().split('T')[0],
            endDate: endDate!.toISOString().split('T')[0],
            unitBodystats: 'inches',
            unitWeight: 'lbs',
          }),
        }).then(res => res.json()),
        fetch('/api/trainerize/health-data', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userID: client.trainerize_id,
            type: 'step',
            startDate: startDate!.toISOString().split('T')[0],
            endDate: endDate!.toISOString().split('T')[0],
          }),
        }).then(res => res.json()),
        fetch('/api/trainerize/nutrition', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userID: client.trainerize_id,
            startDate: startDate!.toISOString().split('T')[0],
            endDate: endDate!.toISOString().split('T')[0],
          }),
        }).then(res => res.json()),
      ]);

      // Process workout data to add automatic notes
      if (workoutData.workouts) {
        workoutData.workouts = workoutData.workouts.map((workout: any) => {
          if (workout.exercises) {
            workout.exercises = workout.exercises.map((exercise: any) => {
              if (exercise.stats && exercise.stats.length > 0) {
                const validReps = exercise.stats.filter((stat: any) => typeof stat.reps === 'number');
                
                if (validReps.length > 0) {
                  const isBodyweightMovement = validReps.every((stat: any) => 
                    typeof stat.reps === 'number' && 
                    (!stat.weight || stat.weight === 0)
                  );

                  const allSetsAtTopRange = validReps.every((stat: any) => stat.reps >= maxReps - 1);
                  
                  if (isBodyweightMovement) {
                    exercise.notes = allSetsAtTopRange 
                      ? "Focus on increasing the number of reps next session"
                      : "Focus on adding reps";
                  } else {
                    exercise.notes = allSetsAtTopRange 
                      ? "Increase weight next session"
                      : "Focus on adding reps";
                  }
                }
              }
              
              return {
                name: exercise.name,
                sets: exercise.sets,
                stats: exercise.stats,
                notes: exercise.notes || "Focus on adding reps"
              };
            });
          }
          return workout;
        });
      }

      const clientReportData = {
        bodyStats: bodyStatsData,
        healthData,
        nutritionData,
        workoutData,
      };

      // Store the report in the database
      await fetch('/api/reports/store', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId: client.id,
          reportData: {
            ...clientReportData,
            template: reportTemplate
          },
          dateRange: {
            from: startDate!.toISOString(),
            to: endDate!.toISOString(),
          },
          repRange: {
            min: minReps,
            max: maxReps
          }
        }),
      });

      return clientReportData;
    } catch (error) {
      console.error(`Error generating report for ${client.first_name} ${client.last_name}:`, error);
      throw error;
    }
  };

  const generateReport = async () => {
    if (selectedClients.length === 0 || !startDate || !endDate) {
      toast.error('Please select at least one client and date range');
      return;
    }

    setIsLoading(true);
    setReportData({});

    const selectedClientObjects = clients.filter(c => selectedClients.includes(c.id));
    const newReportData: Record<string, any> = {};
    const progress: Record<string, boolean> = {};

    for (const client of selectedClientObjects) {
      try {
        progress[client.id] = true;
        setGeneratingProgress({...progress});
        
        const clientReport = await generateReportForClient(client);
        newReportData[client.id] = clientReport;
        
        toast.success(`Report generated for ${client.first_name} ${client.last_name}`);
      } catch (error) {
        toast.error(`Failed to generate report for ${client.first_name} ${client.last_name}`);
      } finally {
        progress[client.id] = false;
        setGeneratingProgress({...progress});
      }
    }

    setReportData(newReportData);
    setIsLoading(false);

    // Redirect if only one client's report was generated successfully
    if (selectedClients.length === 1 && Object.keys(newReportData).length === 1) {
      router.push(`/dashboard/clients/${selectedClients[0]}/reports`);
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

  // Add filteredTrainerizeClients computation
  const filteredTrainerizeClients = trainerizeClients.filter(client =>
    `${client.first_name} ${client.last_name}`.toLowerCase().includes(importSearchQuery.toLowerCase()) ||
    client.email.toLowerCase().includes(importSearchQuery.toLowerCase())
  );

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Clients</h1>
        <div className="tabs tabs-boxed">
          <button 
            className={`tab ${activeTab === 'clients' ? 'tab-active' : ''}`}
            onClick={() => setActiveTab('clients')}
          >
            Clients
          </button>
          <button 
            className={`tab ${activeTab === 'reports' ? 'tab-active' : ''}`}
            onClick={() => setActiveTab('reports')}
          >
            Generate Reports
          </button>
        </div>
      </div>

      <div className="space-y-6">
        {/* Client Management Section */}
        {activeTab === 'clients' && (
          <div className="card bg-base-100 shadow-xl">
            <div className="card-body">
              <div className="flex items-center justify-between gap-4 mb-6">
                <div className="flex-1">
                  <input
                    type="text"
                    placeholder="Search clients..."
                    className="input input-bordered w-full"
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
                      className="btn btn-error btn-outline"
                      onClick={handleDeleteSelected}
                    >
                      Delete Selected ({selectedClients.length})
                    </button>
                  )}
                  <button 
                    className={`btn btn-outline ${isLoading ? 'loading' : ''}`}
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
                      <th>
                        <label>
                          <input 
                            type="checkbox" 
                            className="checkbox"
                            checked={currentClients.length > 0 && currentClients.every(client => selectedClients.includes(client.id))}
                            onChange={handleSelectAll}
                          />
                        </label>
                      </th>
                      <th>Name</th>
                      <th>Reports</th>
                    </tr>
                  </thead>
                  <tbody>
                    {currentClients.map((client) => (
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
                        <td>
                          <Link
                            href={`/dashboard/clients/${client.id}/reports`}
                            className="btn btn-sm btn-outline"
                          >
                            View Reports
                          </Link>
                        </td>
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

              {filteredClients.length > itemsPerPage && (
                <PaginationControls
                  totalPages={totalPages}
                  currentPage={currentPage}
                  onPageChange={setCurrentPage}
                />
              )}
            </div>
          </div>
        )}

        {/* Report Generation Section */}
        {activeTab === 'reports' && (
          <div className="space-y-6">
            {selectedClients.length > 0 && (
              <div className="alert alert-info">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="stroke-current shrink-0 w-6 h-6">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                </svg>
                <span>
                  {selectedClients.length} client{selectedClients.length !== 1 ? 's' : ''} selected: {' '}
                  {clients.filter(c => selectedClients.includes(c.id)).map(c => `${c.first_name} ${c.last_name}`).join(', ')}
                </span>
              </div>
            )}

            <div className="card bg-base-100 shadow-xl">
              <div className="card-body">
                <h2 className="text-xl font-bold mb-4">Report Template</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="form-control">
                    <label className="label cursor-pointer">
                      <span className="label-text">
                        <div className="font-semibold">Daily Data</div>
                        <div className="text-sm text-base-content/60">Day-by-day breakdown with detailed workout information</div>
                      </span>
                      <input 
                        type="radio" 
                        name="reportTemplate" 
                        value="daily"
                        className="radio radio-primary" 
                        checked={reportTemplate === 'daily'}
                        onChange={() => setReportTemplate('daily')}
                      />
                    </label>
                  </div>
                  
                  <div className="form-control">
                    <label className="label cursor-pointer">
                      <span className="label-text">
                        <div className="font-semibold">Weekly Summary</div>
                        <div className="text-sm text-base-content/60">Weekly averages and progress trends</div>
                      </span>
                      <input 
                        type="radio" 
                        name="reportTemplate" 
                        value="weekly"
                        className="radio radio-primary" 
                        checked={reportTemplate === 'weekly'}
                        onChange={() => setReportTemplate('weekly')}
                      />
                    </label>
                  </div>
                </div>
              </div>
            </div>

            <div className="card bg-base-100 shadow-xl">
              <div className="card-body">
                <h2 className="text-xl font-bold mb-4">Progressive Overload Settings</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="form-control w-full">
                    <label className="label">
                      <span className="label-text font-semibold">Minimum Reps</span>
                    </label>
                    <input 
                      type="number" 
                      className="input input-bordered w-full"
                      value={minReps}
                      onChange={(e) => setMinReps(Math.max(1, parseInt(e.target.value) || 1))}
                      min="1"
                    />
                  </div>
                  
                  <div className="form-control w-full">
                    <label className="label">
                      <span className="label-text font-semibold">Maximum Reps</span>
                    </label>
                    <input 
                      type="number" 
                      className="input input-bordered w-full"
                      value={maxReps}
                      onChange={(e) => setMaxReps(Math.max(minReps + 1, parseInt(e.target.value) || minReps + 1))}
                      min={minReps + 1}
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="card bg-base-100 shadow-xl">
              <div className="card-body">
                <h2 className="text-xl font-bold mb-4">Timeframe Selection</h2>
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
              </div>
            </div>

            <div className="flex justify-end mt-6">
              <button 
                className={`btn btn-primary ${isLoading ? 'loading' : ''}`}
                onClick={generateReport}
                disabled={selectedClients.length === 0 || !startDate || !endDate || isLoading}
              >
                {isLoading ? 'Generating Reports...' : 'Generate Reports'}
              </button>
            </div>

            {/* Report Results */}
            {Object.keys(reportData).length === 1 && (
              <div className="mt-8 space-y-6">
                {Object.entries(reportData).map(([clientId, data]) => {
                  const client = clients.find(c => c.id === clientId);
                  return (
                    <div key={clientId} className="bg-base-100 p-6 rounded-lg shadow-xl border border-base-300">
                      <h2 className="text-xl font-semibold mb-4">
                        Report for {client?.first_name} {client?.last_name}
                      </h2>
                      <pre className="whitespace-pre-wrap">{JSON.stringify(data, null, 2)}</pre>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Delete Client Modal */}
      <dialog id="delete-client-modal" className="modal modal-bottom sm:modal-middle">
        <div className="modal-box">
          <h3 className="font-bold text-lg">Confirm Delete</h3>
          <p className="py-4">
            Are you sure you want to delete {selectedClients.length} client(s)? This will also delete all their reports. This action cannot be undone.
          </p>
          <div className="modal-action">
            <button 
              className="btn btn-ghost" 
              onClick={() => {
                (document.getElementById('delete-client-modal') as HTMLDialogElement)?.close();
              }} 
              disabled={isDeleting}
            >
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

      {/* Import Clients Modal */}
      <dialog id="trainerize_modal" className={`modal ${isModalOpen ? 'modal-open' : ''}`}>
        <div className="modal-box w-11/12 max-w-5xl">
          <h3 className="font-bold text-lg mb-4">Import Clients from Trainerize</h3>
          
          <div className="form-control mb-6">
            <input
              type="text"
              placeholder="Search Trainerize clients..."
              className="input input-bordered w-full"
              value={importSearchQuery}
              onChange={(e) => setImportSearchQuery(e.target.value)}
            />
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
                  <th>Name</th>
                  <th>Email</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredTrainerizeClients.map((client) => (
                  <tr key={client.id}>
                    <td>
                      <label>
                        <input
                          type="checkbox"
                          className="checkbox"
                          checked={selectedImportIds.includes(client.id)}
                          onChange={() => handleImportClientSelect(client.id)}
                        />
                      </label>
                    </td>
                    <td>{client.first_name} {client.last_name}</td>
                    <td>{client.email}</td>
                    <td>
                      {clients.some(c => c.trainerize_id === parseInt(client.id)) ? (
                        <span className="text-success">Imported</span>
                      ) : (
                        <span className="text-base-content/60">Not Imported</span>
                      )}
                    </td>
                  </tr>
                ))}
                {filteredTrainerizeClients.length === 0 && !isLoading && (
                  <tr>
                    <td colSpan={4} className="text-center py-4">
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

          <div className="modal-action">
            <button 
              className={`btn btn-primary ${isImporting ? 'loading' : ''}`}
              onClick={handleImportClients}
              disabled={isImporting || selectedImportIds.length === 0}
            >
              Import Selected ({selectedImportIds.filter(id => 
                trainerizeClients.some(c => c.id === id) && 
                !clients.some(c => c.trainerize_id === parseInt(id))
              ).length})
            </button>
            <button 
              className="btn"
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
    </div>
  );
} 