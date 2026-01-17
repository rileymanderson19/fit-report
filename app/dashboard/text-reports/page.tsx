"use client";

import { useState, useEffect } from 'react';
import { createClient } from '@/libs/supabase/client';
import { toast } from 'sonner';

interface Client {
  id: string;
  first_name: string;
  last_name: string;
}

interface CompletedClient {
  id: string;
  name: string;
  completedAt: Date;
}

export default function TestTextReportPage() {
  const supabase = createClient();
  const [clients, setClients] = useState<Client[]>([]);
  const [selectedClientIds, setSelectedClientIds] = useState<Set<string>>(new Set());
  const [clientSearchQuery, setClientSearchQuery] = useState('');
  const [filteredClients, setFilteredClients] = useState<Client[]>([]);
  
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [template, setTemplate] = useState<'daily' | 'weekly' | 'enhanced'>('enhanced');
  const [weightUnit, setWeightUnit] = useState<'lbs' | 'kg'>('lbs');
  const [goal, setGoal] = useState<'fat loss' | 'maintenance' | 'muscle gain'>('fat loss');
  
  // Workflow state
  const [clientQueue, setClientQueue] = useState<Client[]>([]);
  const [currentClientIndex, setCurrentClientIndex] = useState(0);
  const [currentResult, setCurrentResult] = useState<any>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [completedClients, setCompletedClients] = useState<CompletedClient[]>([]);
  const [isWorkflowActive, setIsWorkflowActive] = useState(false);
  
  // Combined document state
  const [combinedDocument, setCombinedDocument] = useState<string | null>(null);
  const [isGeneratingCombined, setIsGeneratingCombined] = useState(false);
  const [generationProgress, setGenerationProgress] = useState({ current: 0, total: 0 });

  // Set default date range (last 2 weeks ending yesterday)
  useEffect(() => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(0, 0, 0, 0);
    
    const twoWeeksAgo = new Date(yesterday);
    twoWeeksAgo.setDate(yesterday.getDate() - 13); // 14 days total (including yesterday)
    twoWeeksAgo.setHours(0, 0, 0, 0);
    
    setDateFrom(twoWeeksAgo.toISOString().split('T')[0]);
    setDateTo(yesterday.toISOString().split('T')[0]);
  }, []);

  // Load clients on mount
  useEffect(() => {
    const loadClients = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data, error } = await supabase
          .from('clients')
          .select('id, first_name, last_name')
          .eq('trainer_id', user.id)
          .eq('active', true)
          .order('first_name', { ascending: true });

        if (error) throw error;
        setClients(data || []);
        setFilteredClients(data || []);
      } catch (error) {
        console.error('Error loading clients:', error);
        toast.error('Failed to load clients');
      }
    };

    loadClients();
  }, [supabase]);

  // Filter clients based on search query
  useEffect(() => {
    if (!clientSearchQuery.trim()) {
      setFilteredClients(clients);
      return;
    }

    const searchTerms = clientSearchQuery.toLowerCase().split(' ').filter(term => term.length > 0);
    const filtered = clients.filter(client => {
      const fullName = `${client.first_name} ${client.last_name}`.toLowerCase();
      return searchTerms.every(term => 
        fullName.includes(term) ||
        client.first_name.toLowerCase().includes(term) ||
        client.last_name.toLowerCase().includes(term)
      );
    });

    setFilteredClients(filtered);
  }, [clientSearchQuery, clients]);

  // Toggle client selection
  const toggleClientSelection = (clientId: string) => {
    const newSelected = new Set(selectedClientIds);
    if (newSelected.has(clientId)) {
      newSelected.delete(clientId);
    } else {
      newSelected.add(clientId);
    }
    setSelectedClientIds(newSelected);
  };

  // Select/Deselect all filtered clients
  const toggleSelectAll = () => {
    if (selectedClientIds.size === filteredClients.length && 
        filteredClients.every(c => selectedClientIds.has(c.id))) {
      // Deselect all filtered clients
      const newSelected = new Set(selectedClientIds);
      filteredClients.forEach(c => newSelected.delete(c.id));
      setSelectedClientIds(newSelected);
    } else {
      // Select all filtered clients
      const newSelected = new Set(selectedClientIds);
      filteredClients.forEach(c => newSelected.add(c.id));
      setSelectedClientIds(newSelected);
    }
  };

  // Generate report for a specific client
  const generateReportForClient = async (client: Client) => {
    try {
      const response = await fetch('/api/reports/generate-text', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          clientId: client.id,
          dateRange: {
            from: new Date(dateFrom).toISOString(),
            to: new Date(dateTo).toISOString()
          },
          template,
          weightUnit,
          goal
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate text report');
      }

      return data;
    } catch (error) {
      console.error('Error generating report:', error);
      throw error;
    }
  };

  // Start workflow
  const handleStartWorkflow = async () => {
    if (selectedClientIds.size === 0) {
      toast.error('Please select at least one client');
      return;
    }

    if (!dateFrom || !dateTo) {
      toast.error('Please set date range');
      return;
    }

    // Build client queue from selected clients
    const queue = clients.filter(c => selectedClientIds.has(c.id));
    setClientQueue(queue);
    setCurrentClientIndex(0);
    setCompletedClients([]);
    setIsWorkflowActive(true);
    setCurrentResult(null);

    // Generate first client's report
    setIsGenerating(true);
    try {
      const result = await generateReportForClient(queue[0]);
      setCurrentResult(result);
      toast.success(`Report generated for ${queue[0].first_name} ${queue[0].last_name}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to generate report');
      setIsWorkflowActive(false);
    } finally {
      setIsGenerating(false);
    }
  };

  // Handle Done button - move to next client
  const handleDone = async () => {
    const currentClient = clientQueue[currentClientIndex];
    
    // Mark current client as completed
    setCompletedClients(prev => [...prev, {
      id: currentClient.id,
      name: `${currentClient.first_name} ${currentClient.last_name}`,
      completedAt: new Date()
    }]);

    // Check if there are more clients
    if (currentClientIndex < clientQueue.length - 1) {
      const nextIndex = currentClientIndex + 1;
      setCurrentClientIndex(nextIndex);
      setCurrentResult(null);
      
      // Generate next client's report
      setIsGenerating(true);
      try {
        const nextClient = clientQueue[nextIndex];
        const result = await generateReportForClient(nextClient);
        setCurrentResult(result);
        toast.success(`Report generated for ${nextClient.first_name} ${nextClient.last_name}`);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Failed to generate report');
      } finally {
        setIsGenerating(false);
      }
    } else {
      // All clients completed
      setIsWorkflowActive(false);
      toast.success('All clients completed!');
    }
  };

  // Reset workflow
  const handleReset = () => {
    setIsWorkflowActive(false);
    setClientQueue([]);
    setCurrentClientIndex(0);
    setCurrentResult(null);
    setCompletedClients([]);
  };

  // Generate combined document
  const handleGenerateCombined = async () => {
    if (selectedClientIds.size === 0) {
      toast.error('Please select at least one client');
      return;
    }

    if (!dateFrom || !dateTo) {
      toast.error('Please set date range');
      return;
    }

    const selectedClients = clients.filter(c => selectedClientIds.has(c.id));
    setIsGeneratingCombined(true);
    setGenerationProgress({ current: 0, total: selectedClients.length });
    setCombinedDocument(null);

    try {
      // Generate all reports in parallel
      const reportPromises = selectedClients.map(async (client) => {
        const result = await generateReportForClient(client);
        setGenerationProgress(prev => ({ ...prev, current: prev.current + 1 }));
        return {
          client,
          report: result.text,
          metadata: result.metadata
        };
      });

      const reportResults = await Promise.all(reportPromises);

      // Combine reports with delimiters
      const combinedLines: string[] = [];
      
      reportResults.forEach((result, index) => {
        const clientName = `${result.client.first_name} ${result.client.last_name}`;
        
        // Add delimiter before each report (except first)
        if (index > 0) {
          combinedLines.push('');
          combinedLines.push('');
        }
        
        combinedLines.push(`=== ${clientName.toUpperCase()} ===`);
        combinedLines.push('');
        combinedLines.push(result.report);
      });

      const combinedText = combinedLines.join('\n');
      setCombinedDocument(combinedText);
      toast.success(`Combined document generated for ${selectedClients.length} client(s)`);
    } catch (error) {
      console.error('Error generating combined document:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to generate combined document');
    } finally {
      setIsGeneratingCombined(false);
      setGenerationProgress({ current: 0, total: 0 });
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard!');
  };

  const currentClient = clientQueue[currentClientIndex];
  const selectedCount = selectedClientIds.size;
  const allFilteredSelected = filteredClients.length > 0 && 
    filteredClients.every(c => selectedClientIds.has(c.id));

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <h1 className="text-3xl font-bold mb-6 gradient-text font-display">Client Check-In Reports</h1>

      {!isWorkflowActive ? (
        // Configuration View
        <>
          <div className="card-elevated mb-6">
            <div className="card-body">
              <h2 className="card-title mb-4 text-white">Configuration</h2>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                {/* Template Selection */}
                <div className="form-control">
                  <label className="label">
                    <span className="text-gray-300">Template</span>
                  </label>
                  <select
                    className="bg-bg-secondary border border-white/10 text-white focus:outline-none focus:border-accent-purple rounded-lg px-4 py-2"
                    value={template}
                    onChange={(e) => setTemplate(e.target.value as any)}
                  >
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                    <option value="enhanced">Enhanced</option>
                  </select>
                </div>

                {/* Weight Unit */}
                <div className="form-control">
                  <label className="label">
                    <span className="text-gray-300">Weight Unit</span>
                  </label>
                  <select
                    className="bg-bg-secondary border border-white/10 text-white focus:outline-none focus:border-accent-purple rounded-lg px-4 py-2"
                    value={weightUnit}
                    onChange={(e) => setWeightUnit(e.target.value as any)}
                  >
                    <option value="lbs">Pounds (lbs)</option>
                    <option value="kg">Kilograms (kg)</option>
                  </select>
                </div>

                {/* Goal Selection */}
                <div className="form-control">
                  <label className="label">
                    <span className="text-gray-300">Goal</span>
                  </label>
                  <select
                    className="bg-bg-secondary border border-white/10 text-white focus:outline-none focus:border-accent-purple rounded-lg px-4 py-2"
                    value={goal}
                    onChange={(e) => setGoal(e.target.value as any)}
                  >
                    <option value="fat loss">Fat Loss</option>
                    <option value="maintenance">Maintenance</option>
                    <option value="muscle gain">Muscle Gain</option>
                  </select>
                </div>
              </div>

              {/* Date Range */}
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="form-control">
                  <label className="label">
                    <span className="text-gray-300">Start Date</span>
                  </label>
                  <input
                    type="date"
                    className="bg-bg-secondary border border-white/10 text-white focus:outline-none focus:border-accent-purple rounded-lg px-4 py-2"
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                  />
                </div>
                <div className="form-control">
                  <label className="label">
                    <span className="text-gray-300">End Date</span>
                  </label>
                  <input
                    type="date"
                    className="bg-bg-secondary border border-white/10 text-white focus:outline-none focus:border-accent-purple rounded-lg px-4 py-2"
                    value={dateTo}
                    onChange={(e) => setDateTo(e.target.value)}
                  />
                </div>
              </div>

              {/* Client Selection */}
              <div className="form-control mb-4">
                <div className="flex justify-between items-center mb-2">
                  <label className="label">
                    <span className="text-gray-300 font-semibold">Select Clients</span>
                    <span className="text-gray-400 text-xs">({selectedCount} selected)</span>
                  </label>
                  <button
                    className="glass border border-white/10 hover:border-accent-purple/50 text-white px-3 py-1.5 rounded-lg text-sm transition-all"
                    onClick={toggleSelectAll}
                  >
                    {allFilteredSelected ? 'Deselect All' : 'Select All'}
                  </button>
                </div>
                
                {/* Search */}
                <input
                  type="text"
                  className="bg-bg-secondary border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-accent-purple rounded-lg px-4 py-2 mb-3"
                  placeholder="Search clients..."
                  value={clientSearchQuery}
                  onChange={(e) => setClientSearchQuery(e.target.value)}
                />

                {/* Client List with Checkboxes */}
                <div className="border border-white/10 rounded-lg max-h-96 overflow-y-auto">
                  <div className="p-2">
                    {filteredClients.length === 0 ? (
                      <div className="text-center py-4 text-gray-400">
                        No clients found
                      </div>
                    ) : (
                      filteredClients.map((client) => {
                        const clientName = `${client.first_name} ${client.last_name}`;
                        const isSelected = selectedClientIds.has(client.id);
                        return (
                          <label
                            key={client.id}
                            className="flex items-center gap-3 p-3 hover:bg-white/5 rounded cursor-pointer"
                          >
                            <input
                              type="checkbox"
                              className="checkbox border-white/20 [--chkbg:theme(colors.accent-purple)] [--chkfg:white] checked:border-accent-purple"
                              checked={isSelected}
                              onChange={() => toggleClientSelection(client.id)}
                            />
                            <span className="flex-1 text-white">{clientName}</span>
                          </label>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>

              <div className="flex gap-4 mt-4">
                <button
                  className="btn-gradient px-6 py-3 rounded-lg font-medium flex-1"
                  onClick={handleStartWorkflow}
                  disabled={selectedCount === 0}
                >
                  Start Workflow ({selectedCount} client{selectedCount !== 1 ? 's' : ''})
                </button>
                <button
                  className="glass border border-white/10 hover:border-accent-purple/50 text-white px-4 py-2 rounded-lg transition-all flex-1"
                  onClick={handleGenerateCombined}
                  disabled={selectedCount === 0 || isGeneratingCombined}
                >
                  {isGeneratingCombined ? (
                    <>
                      <span className="loading loading-spinner text-accent-purple"></span>
                      Generating... ({generationProgress.current}/{generationProgress.total})
                    </>
                  ) : (
                    `Generate Combined Document (${selectedCount})`
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Combined Document Display */}
          {combinedDocument && (
            <div className="card-elevated mb-6">
              <div className="card-body">
                <div className="flex justify-between items-center mb-4">
                  <div>
                    <h2 className="card-title text-white">Combined Document</h2>
                    <p className="text-sm text-gray-400">
                      {selectedCount} client{selectedCount !== 1 ? 's' : ''} • {combinedDocument.length.toLocaleString()} characters
                    </p>
                  </div>
                  <button
                    className="btn-gradient text-sm"
                    onClick={() => copyToClipboard(combinedDocument)}
                  >
                    Copy Document
                  </button>
                </div>

                <div className="bg-bg-secondary p-4 rounded max-h-[600px] overflow-y-auto">
                  <pre className="text-sm whitespace-pre-wrap">{combinedDocument}</pre>
                </div>
              </div>
            </div>
          )}
        </>
      ) : (
        // Workflow View
        <>
          {/* Progress Bar */}
          <div className="card-elevated mb-6">
            <div className="card-body">
              <div className="flex justify-between items-center mb-2">
                <h2 className="card-title text-white">
                  Client {currentClientIndex + 1} of {clientQueue.length}
                </h2>
                <button
                  className="glass border border-white/10 hover:border-red-500/50 text-white px-3 py-1.5 rounded-lg text-sm transition-all"
                  onClick={handleReset}
                >
                  Reset
                </button>
              </div>
              <progress
                className="[&::-webkit-progress-bar]:bg-bg-secondary [&::-webkit-progress-value]:bg-gradient-to-r [&::-webkit-progress-value]:from-primary-start [&::-webkit-progress-value]:to-accent-purple [&::-moz-progress-bar]:bg-gradient-to-r [&::-moz-progress-bar]:from-primary-start [&::-moz-progress-bar]:to-accent-purple w-full h-3 rounded-full bg-bg-secondary"
                value={currentClientIndex + 1}
                max={clientQueue.length}
              ></progress>
              <p className="text-sm text-gray-300">
                {currentClient?.first_name} {currentClient?.last_name}
              </p>
            </div>
          </div>

          {/* Current Report */}
          {isGenerating ? (
            <div className="card-elevated">
              <div className="card-body text-center py-12">
                <span className="loading loading-spinner loading-lg text-accent-purple"></span>
                <p className="mt-4 text-gray-300">Generating report...</p>
              </div>
            </div>
          ) : currentResult ? (
            <div className="card-elevated mb-6">
              <div className="card-body">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="card-title text-white">Report</h2>
                  <button
                    className="glass border border-white/10 hover:border-accent-purple/50 text-white px-3 py-1.5 rounded-lg text-sm transition-all"
                    onClick={() => copyToClipboard(currentResult.text)}
                  >
                    Copy Text
                  </button>
                </div>

                {/* Text Output */}
                <div className="mb-4">
                  <div className="bg-bg-secondary p-4 rounded max-h-96 overflow-y-auto">
                    <pre className="text-sm whitespace-pre-wrap">{currentResult.text}</pre>
                  </div>
                </div>

                {/* Done Button */}
                <button
                  className="btn-gradient w-full mt-4"
                  onClick={handleDone}
                >
                  {currentClientIndex < clientQueue.length - 1 ? 'Done - Next Client' : 'Done - Complete'}
                </button>
              </div>
            </div>
          ) : null}

          {/* Completed Clients History */}
          {completedClients.length > 0 && (
            <div className="card-elevated">
              <div className="card-body">
                <h3 className="font-semibold mb-4 text-white">Completed ({completedClients.length})</h3>
                <div className="space-y-2">
                  {completedClients.map((client) => (
                    <div key={client.id} className="flex justify-between items-center p-2 bg-bg-secondary rounded">
                      <span className="text-white">{client.name}</span>
                      <span className="text-sm text-green-400">
                        ✓ Completed
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

