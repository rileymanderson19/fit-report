"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/libs/supabase/client';
import { toast } from 'sonner';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { DateRangePicker } from '@/components/DateRangePicker';

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

export default function ReportsPage() {
  const router = useRouter();
  const supabase = createClient();
  
  // State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedClients, setSelectedClients] = useState<string[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [reportData, setReportData] = useState<Record<string, any>>({});
  const [generatingProgress, setGeneratingProgress] = useState<Record<string, boolean>>({});
  const [minReps, setMinReps] = useState<number>(6);
  const [maxReps, setMaxReps] = useState<number>(10);
  const [reportTemplate, setReportTemplate] = useState<'daily' | 'enhanced'>('enhanced');

  // Handle URL parameters for pre-selected clients
  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const selectedClient = searchParams.get('selectedClient');

    if (selectedClient) {
      setSelectedClients([selectedClient]);
      
      // Set default date range
      const today = new Date();
      const sevenDaysAgo = new Date(today);
      sevenDaysAgo.setDate(today.getDate() - 7);
      
      setStartDate(sevenDaysAgo);
      setEndDate(today);
    }

    // Clean up URL parameters after handling them
    if (selectedClient) {
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
      const [workoutData, bodyStatsData, healthData, nutritionData, sleepData] = await Promise.all([
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
        fetch('/api/trainerize/sleep-data', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userID: client.trainerize_id,
            startDate: startDate!.toISOString().split('T')[0],
            endDate: endDate!.toISOString().split('T')[0],
          }),
        }).then(res => res.json()),
      ]);

      // Fetch trainer's excluded workout names
      const { data: { user } } = await supabase.auth.getUser();
      let excludedWorkoutNames: string[] = [];
      
      if (user) {
        const { data: reportConfig } = await supabase
          .from('report_configurations')
          .select('excluded_workout_names')
          .eq('trainer_id', user.id)
          .single();
        
        if (reportConfig?.excluded_workout_names) {
          excludedWorkoutNames = reportConfig.excluded_workout_names;
        }
      }

      // Filter out excluded workouts (case-insensitive matching)
      if (workoutData.workouts && excludedWorkoutNames.length > 0) {
        workoutData.workouts = workoutData.workouts.filter((workout: any) => {
          const workoutTitle = workout.title?.toLowerCase() || '';
          return !excludedWorkoutNames.some(excluded => 
            excluded.toLowerCase() === workoutTitle
          );
        });
      }

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
        sleepData,
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
      // Select all filtered clients (across all pages)
      const newSelectedClients = new Set([...selectedClients]);
      filteredClients.forEach(client => newSelectedClients.add(client.id));
      setSelectedClients(Array.from(newSelectedClients));
    } else {
      // Deselect all filtered clients (across all pages)
      const filteredClientIds = new Set(filteredClients.map(client => client.id));
      setSelectedClients(selectedClients.filter(id => !filteredClientIds.has(id)));
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

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Generate Reports</h1>
          <p className="text-base-content/80 mt-2">
            Create fitness reports for your clients
          </p>
        </div>
        <Link 
          href="/dashboard/clients" 
          className="btn btn-outline"
        >
          Manage Clients
        </Link>
      </div>

      <div className="space-y-6">
        {/* Client Selection */}
        <div className="card bg-base-100 shadow-xl">
          <div className="card-body">
            <h2 className="text-xl font-bold mb-4">Select Clients</h2>
            
            {selectedClients.length > 0 && (
              <div className="alert alert-info mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="stroke-current shrink-0 w-6 h-6">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                </svg>
                <span>
                  <strong>{selectedClients.length}</strong> client{selectedClients.length !== 1 ? 's' : ''} selected for report generation
                </span>
              </div>
            )}

            <div className="form-control mb-4">
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

            <div className="overflow-x-auto">
              <table className="table w-full">
                <thead>
                  <tr>
                    <th>
                      <label className="cursor-pointer flex items-center gap-2">
                        <input 
                          type="checkbox" 
                          className="checkbox"
                          checked={filteredClients.length > 0 && filteredClients.every(client => selectedClients.includes(client.id))}
                          ref={(input) => {
                            if (input) {
                              const selectedFilteredClients = filteredClients.filter(client => selectedClients.includes(client.id));
                              const allSelected = selectedFilteredClients.length === filteredClients.length && filteredClients.length > 0;
                              const someSelected = selectedFilteredClients.length > 0 && selectedFilteredClients.length < filteredClients.length;
                              input.indeterminate = someSelected;
                              input.checked = allSelected;
                            }
                          }}
                          onChange={handleSelectAll}
                        />
                        <span className="text-xs text-base-content/70">
                          {searchQuery ? `All ${filteredClients.length} filtered` : `All ${filteredClients.length}`}
                        </span>
                      </label>
                    </th>
                    <th>Name</th>
                    <th>Actions</th>
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
                        {clients.length === 0 ? (
                          <div>
                            No clients found. {' '}
                            <Link href="/dashboard/clients" className="link link-primary">
                              Import clients first
                            </Link>
                          </div>
                        ) : (
                          'No clients found matching your search'
                        )}
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

        {/* Report Template */}
        <div className="card bg-base-100 shadow-xl">
          <div className="card-body">
            <h2 className="text-xl font-bold mb-6">Report Template</h2>
            <div className="space-y-4">
              {/* Progress Report Template */}
              <div 
                className={`card cursor-pointer transition-all duration-200 border-2 ${
                  reportTemplate === 'enhanced' 
                    ? 'border-primary bg-primary/10 shadow-lg' 
                    : 'border-base-300 hover:border-primary/50 hover:shadow-md'
                }`}
                onClick={() => setReportTemplate('enhanced')}
              >
                <div className="card-body p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold text-lg">Progress Report</h3>
                      <p className="text-sm text-base-content/70">AI insights, goal tracking, and coaching suggestions</p>
                    </div>
                    <input 
                      type="radio" 
                      name="reportTemplate" 
                      value="enhanced"
                      className="radio radio-primary" 
                      checked={reportTemplate === 'enhanced'}
                      onChange={() => setReportTemplate('enhanced')}
                    />
                  </div>
                  {reportTemplate === 'enhanced' && (
                    <div className="mt-3 p-3 bg-primary/20 rounded-lg">
                      <div className="text-sm text-primary font-medium">✓ Complete analysis with automated insights, goal tracking, and trainer coaching suggestions</div>
                    </div>
                  )}
                </div>
              </div>

              {/* Daily Data Template */}
              <div 
                className={`card cursor-pointer transition-all duration-200 border-2 ${
                  reportTemplate === 'daily' 
                    ? 'border-primary bg-primary/10 shadow-lg' 
                    : 'border-base-300 hover:border-primary/50 hover:shadow-md'
                }`}
                onClick={() => setReportTemplate('daily')}
              >
                <div className="card-body p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold text-lg">Daily Data</h3>
                      <p className="text-sm text-base-content/70">Day-by-day breakdown with detailed workout information</p>
                    </div>
                    <input 
                      type="radio" 
                      name="reportTemplate" 
                      value="daily"
                      className="radio radio-primary" 
                      checked={reportTemplate === 'daily'}
                      onChange={() => setReportTemplate('daily')}
                    />
                  </div>
                  {reportTemplate === 'daily' && (
                    <div className="mt-3 p-3 bg-primary/20 rounded-lg">
                      <div className="text-sm text-primary font-medium">✓ Perfect for single week analysis and detailed workout review</div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Progressive Overload Settings */}
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

        {/* Timeframe Selection */}
        <div className="card bg-base-100 shadow-xl">
          <div className="card-body">
            <h2 className="text-xl font-bold mb-4">Timeframe Selection</h2>
            <DateRangePicker
              from={startDate || undefined}
              to={endDate || undefined}
              onSelect={(range) => {
                setStartDate(range.from || null);
                setEndDate(range.to || null);
              }}
              showPresets={true}
            />
          </div>
        </div>

        {/* Generate Button */}
        <div className="flex justify-end">
          <button 
            className={`btn btn-primary btn-lg ${isLoading ? 'loading' : ''}`}
            onClick={generateReport}
            disabled={selectedClients.length === 0 || !startDate || !endDate || isLoading}
          >
            {isLoading ? 'Generating Reports...' : `Generate Reports (${selectedClients.length})`}
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
    </div>
  );
} 