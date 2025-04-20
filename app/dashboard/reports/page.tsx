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
  trainerize_id: string;
}

export default function ReportsPage() {
  const supabase = createClient();
  const [selectedClients, setSelectedClients] = useState<string[]>([]);
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [clients, setClients] = useState<Client[]>([]);
  const [reportData, setReportData] = useState<Record<string, any>>({});
  const [generatingProgress, setGeneratingProgress] = useState<Record<string, boolean>>({});
  const [minReps, setMinReps] = useState<number>(6);
  const [maxReps, setMaxReps] = useState<number>(10);

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
                // Filter out any undefined reps
                const validReps = exercise.stats.filter((stat: any) => typeof stat.reps === 'number');
                
                if (validReps.length > 0) {
                  // Check if all sets are near the top of the rep range
                  const highReps = validReps.every((stat: any) => stat.reps >= maxReps - 1);
                  const lowReps = validReps.some((stat: any) => stat.reps < minReps);
                  
                  // Generate automatic note
                  if (highReps) {
                    exercise.notes = "Increase weight next session";
                  } else if (!lowReps) {
                    exercise.notes = "Focus on adding reps";
                  }
                }
              }
              return exercise;
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
          reportData: clientReportData,
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
  };

  const filteredClients = clients.filter(client =>
    `${client.first_name} ${client.last_name}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
    client.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-6">Generate Reports</h1>
      
      <div className="bg-base-100 p-6 rounded-lg shadow-xl border border-base-300 space-y-6">
        {/* Client Selection */}
        <div className="card bg-base-100 shadow-xl">
          <div className="card-body">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold">Select Clients</h2>
              <div className="text-sm text-base-content/70">
                {selectedClients.length} client{selectedClients.length !== 1 ? 's' : ''} selected
              </div>
            </div>
            
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
                    <th>Trainerize ID</th>
                    <th>Status</th>
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
                      <td>
                        {generatingProgress[client.id] ? (
                          <span className="loading loading-spinner loading-xs"></span>
                        ) : reportData[client.id] ? (
                          <span className="text-success">Complete</span>
                        ) : selectedClients.includes(client.id) ? (
                          <span className="text-base-content/50">Pending</span>
                        ) : null}
                      </td>
                    </tr>
                  ))}
                  {filteredClients.length === 0 && (
                    <tr>
                      <td colSpan={5} className="text-center py-4">
                        {clients.length === 0 ? 'No clients imported yet' : 'No clients found matching your search'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Rep Range Selection */}
        <div className="card bg-base-100 shadow-xl">
          <div className="card-body">
            <h2 className="text-xl font-bold mb-4">Progressive Overload Settings</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="form-control w-full">
                <label className="label">
                  <span className="label-text font-semibold">Minimum Reps</span>
                  <span className="label-text-alt">Sets below this will not trigger notes</span>
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
                  <span className="label-text-alt">Sets at or above (max-1) will suggest increasing weight</span>
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
            <div className="mt-2 text-sm text-base-content/70">
              <p>Notes will be automatically generated based on these ranges:</p>
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>If all sets are {maxReps-1}+ reps: "Increase weight next session"</li>
                <li>If sets are within range: "Focus on adding reps"</li>
                <li>If any sets are below {minReps} reps: No note will be added</li>
              </ul>
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
            {isLoading ? 'Generating Reports...' : 'Generate Reports'}
          </button>
        </div>
      </div>

      {/* Report Results Section */}
      {Object.keys(reportData).length > 0 && (
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
      
      {!isLoading && selectedClients.length > 0 && Object.keys(reportData).length === 0 && (
        <div className="mt-8 bg-base-100 p-6 rounded-lg shadow-xl border border-base-300">
          <div className="alert alert-info">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="stroke-current shrink-0 w-6 h-6">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
            </svg>
            <span>Select a date range and click Generate Reports to create reports for the selected clients</span>
          </div>
        </div>
      )}
    </div>
  );
} 