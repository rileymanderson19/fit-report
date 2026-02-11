"use client";

import { useState, useEffect } from 'react';
import { createClient } from '@/libs/supabase/client';
import { toast } from 'sonner';
import { Copy, RotateCcw } from 'lucide-react';

interface Client {
  id: string;
  first_name: string;
  last_name: string;
  goal: 'fat_loss' | 'maintenance' | 'muscle_gain' | null;
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

  const [clientQueue, setClientQueue] = useState<Client[]>([]);
  const [currentClientIndex, setCurrentClientIndex] = useState(0);
  const [currentResult, setCurrentResult] = useState<any>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [completedClients, setCompletedClients] = useState<CompletedClient[]>([]);
  const [isWorkflowActive, setIsWorkflowActive] = useState(false);

  const [combinedDocument, setCombinedDocument] = useState<string | null>(null);
  const [isGeneratingCombined, setIsGeneratingCombined] = useState(false);
  const [generationProgress, setGenerationProgress] = useState({ current: 0, total: 0 });

  useEffect(() => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(0, 0, 0, 0);

    const twoWeeksAgo = new Date(yesterday);
    twoWeeksAgo.setDate(yesterday.getDate() - 13);
    twoWeeksAgo.setHours(0, 0, 0, 0);

    setDateFrom(twoWeeksAgo.toISOString().split('T')[0]);
    setDateTo(yesterday.toISOString().split('T')[0]);
  }, []);

  useEffect(() => {
    const loadClients = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        let result = await supabase
          .from('clients')
          .select('id, first_name, last_name, goal')
          .eq('trainer_id', user.id)
          .eq('active', true)
          .order('first_name', { ascending: true });

        let data: Client[] | null = result.data;
        let error = result.error;

        if (error) {
          const fallbackResult = await supabase
            .from('clients')
            .select('id, first_name, last_name')
            .eq('trainer_id', user.id)
            .eq('active', true)
            .order('first_name', { ascending: true });

          data = fallbackResult.data?.map(client => ({ ...client, goal: null as Client['goal'] })) || null;
          error = fallbackResult.error;
        }

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

  const toggleClientSelection = (clientId: string) => {
    const newSelected = new Set(selectedClientIds);
    if (newSelected.has(clientId)) {
      newSelected.delete(clientId);
    } else {
      newSelected.add(clientId);
    }
    setSelectedClientIds(newSelected);
  };

  const toggleSelectAll = () => {
    if (selectedClientIds.size === filteredClients.length &&
        filteredClients.every(c => selectedClientIds.has(c.id))) {
      const newSelected = new Set(selectedClientIds);
      filteredClients.forEach(c => newSelected.delete(c.id));
      setSelectedClientIds(newSelected);
    } else {
      const newSelected = new Set(selectedClientIds);
      filteredClients.forEach(c => newSelected.add(c.id));
      setSelectedClientIds(newSelected);
    }
  };

  const getClientGoal = (client: Client): 'fat loss' | 'maintenance' | 'muscle gain' => {
    if (!client.goal) return 'fat loss';
    switch (client.goal) {
      case 'fat_loss': return 'fat loss';
      case 'muscle_gain': return 'muscle gain';
      case 'maintenance': return 'maintenance';
      default: return 'fat loss';
    }
  };

  const generateReportForClient = async (client: Client) => {
    const response = await fetch('/api/reports/generate-text', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        clientId: client.id,
        dateRange: {
          from: new Date(dateFrom).toISOString(),
          to: new Date(dateTo).toISOString()
        },
        template,
        weightUnit,
        goal: getClientGoal(client)
      }),
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Failed to generate text report');
    return data;
  };

  const handleStartWorkflow = async () => {
    if (selectedClientIds.size === 0) { toast.error('Please select at least one client'); return; }
    if (!dateFrom || !dateTo) { toast.error('Please set date range'); return; }

    const queue = clients.filter(c => selectedClientIds.has(c.id));
    setClientQueue(queue);
    setCurrentClientIndex(0);
    setCompletedClients([]);
    setIsWorkflowActive(true);
    setCurrentResult(null);

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

  const handleDone = async () => {
    const currentClient = clientQueue[currentClientIndex];
    setCompletedClients(prev => [...prev, {
      id: currentClient.id,
      name: `${currentClient.first_name} ${currentClient.last_name}`,
      completedAt: new Date()
    }]);

    if (currentClientIndex < clientQueue.length - 1) {
      const nextIndex = currentClientIndex + 1;
      setCurrentClientIndex(nextIndex);
      setCurrentResult(null);
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
      setIsWorkflowActive(false);
      toast.success('All clients completed!');
    }
  };

  const handleReset = () => {
    setIsWorkflowActive(false);
    setClientQueue([]);
    setCurrentClientIndex(0);
    setCurrentResult(null);
    setCompletedClients([]);
  };

  const handleGenerateCombined = async () => {
    if (selectedClientIds.size === 0) { toast.error('Please select at least one client'); return; }
    if (!dateFrom || !dateTo) { toast.error('Please set date range'); return; }

    const selectedClients = clients.filter(c => selectedClientIds.has(c.id));
    setIsGeneratingCombined(true);
    setGenerationProgress({ current: 0, total: selectedClients.length });
    setCombinedDocument(null);

    try {
      const reportPromises = selectedClients.map(async (client) => {
        const result = await generateReportForClient(client);
        setGenerationProgress(prev => ({ ...prev, current: prev.current + 1 }));
        return { client, report: result.text, metadata: result.metadata };
      });

      const reportResults = await Promise.all(reportPromises);

      const combinedLines: string[] = [];
      reportResults.forEach((result, index) => {
        const clientName = `${result.client.first_name} ${result.client.last_name}`;
        if (index > 0) { combinedLines.push(''); combinedLines.push(''); }
        combinedLines.push(`=== ${clientName.toUpperCase()} ===`);
        combinedLines.push('');
        combinedLines.push(result.report);
      });

      setCombinedDocument(combinedLines.join('\n'));
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
    <div className="max-w-4xl">
      <div className="mb-6">
        <h1 className="text-2xl font-display font-bold text-gray-900">Client Check-In Reports</h1>
        <p className="text-gray-500 text-sm mt-1">Generate text-based check-in reports for your clients</p>
      </div>

      {!isWorkflowActive ? (
        <>
          {/* Configuration */}
          <div className="card p-6 mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Configuration</h2>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Template</label>
                <select className="input-field text-sm" value={template} onChange={(e) => setTemplate(e.target.value as any)}>
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="enhanced">Enhanced</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Weight Unit</label>
                <select className="input-field text-sm" value={weightUnit} onChange={(e) => setWeightUnit(e.target.value as any)}>
                  <option value="lbs">Pounds (lbs)</option>
                  <option value="kg">Kilograms (kg)</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Start</label>
                  <input type="date" className="input-field text-sm" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">End</label>
                  <input type="date" className="input-field text-sm" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
                </div>
              </div>
            </div>

            {/* Client Selection */}
            <div className="mb-4">
              <div className="flex justify-between items-center mb-2">
                <label className="text-sm font-medium text-gray-700">
                  Select Clients <span className="text-gray-400 font-normal">({selectedCount} selected)</span>
                </label>
                <button className="btn-ghost text-xs px-2 py-1" onClick={toggleSelectAll}>
                  {allFilteredSelected ? 'Deselect All' : 'Select All'}
                </button>
              </div>

              <input
                type="text"
                className="input-field text-sm mb-3"
                placeholder="Search clients..."
                value={clientSearchQuery}
                onChange={(e) => setClientSearchQuery(e.target.value)}
              />

              <div className="border border-gray-200 rounded-lg max-h-72 overflow-y-auto">
                {filteredClients.length === 0 ? (
                  <div className="text-center py-6 text-gray-400 text-sm">No clients found</div>
                ) : (
                  filteredClients.map((client) => {
                    const clientName = `${client.first_name} ${client.last_name}`;
                    const isSelected = selectedClientIds.has(client.id);
                    return (
                      <label
                        key={client.id}
                        className={`flex items-center gap-3 px-4 py-2.5 cursor-pointer transition-colors ${isSelected ? 'bg-blue-50' : 'hover:bg-gray-50'}`}
                      >
                        <input
                          type="checkbox"
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          checked={isSelected}
                          onChange={() => toggleClientSelection(client.id)}
                        />
                        <span className="text-sm text-gray-900">{clientName}</span>
                      </label>
                    );
                  })
                )}
              </div>
            </div>

            <button
              className="btn-primary w-full py-3 rounded-lg font-medium"
              onClick={handleGenerateCombined}
              disabled={selectedCount === 0 || isGeneratingCombined}
            >
              {isGeneratingCombined ? (
                <span className="inline-flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Generating... ({generationProgress.current}/{generationProgress.total})
                </span>
              ) : (
                `Create Text Report (${selectedCount})`
              )}
            </button>
          </div>

          {/* Combined Document Display */}
          {combinedDocument && (
            <div className="card p-6 mb-6">
              <div className="flex justify-between items-center mb-4">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">Combined Document</h2>
                  <p className="text-sm text-gray-500">
                    {selectedCount} client{selectedCount !== 1 ? 's' : ''} &middot; {combinedDocument.length.toLocaleString()} characters
                  </p>
                </div>
                <button
                  className="btn-primary text-sm inline-flex items-center gap-2"
                  onClick={() => copyToClipboard(combinedDocument)}
                >
                  <Copy className="w-4 h-4" />
                  Copy Document
                </button>
              </div>

              <div className="bg-gray-50 border border-gray-200 p-4 rounded-lg max-h-[600px] overflow-y-auto">
                <pre className="text-sm text-gray-800 whitespace-pre-wrap font-mono">{combinedDocument}</pre>
              </div>
            </div>
          )}
        </>
      ) : (
        // Workflow View
        <>
          {/* Progress Bar */}
          <div className="card p-6 mb-6">
            <div className="flex justify-between items-center mb-3">
              <h2 className="text-lg font-semibold text-gray-900">
                Client {currentClientIndex + 1} of {clientQueue.length}
              </h2>
              <button className="btn-ghost text-sm inline-flex items-center gap-1.5" onClick={handleReset}>
                <RotateCcw className="w-3.5 h-3.5" />
                Reset
              </button>
            </div>
            <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden mb-2">
              <div
                className="h-full bg-blue-600 rounded-full transition-all duration-500"
                style={{ width: `${((currentClientIndex + 1) / clientQueue.length) * 100}%` }}
              />
            </div>
            <p className="text-sm text-gray-500">
              {currentClient?.first_name} {currentClient?.last_name}
            </p>
          </div>

          {/* Current Report */}
          {isGenerating ? (
            <div className="card p-12 text-center">
              <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="mt-4 text-gray-500">Generating report...</p>
            </div>
          ) : currentResult ? (
            <div className="card p-6 mb-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold text-gray-900">Report</h2>
                <button
                  className="btn-secondary text-sm inline-flex items-center gap-2"
                  onClick={() => copyToClipboard(currentResult.text)}
                >
                  <Copy className="w-4 h-4" />
                  Copy Text
                </button>
              </div>

              <div className="bg-gray-50 border border-gray-200 p-4 rounded-lg max-h-96 overflow-y-auto mb-4">
                <pre className="text-sm text-gray-800 whitespace-pre-wrap font-mono">{currentResult.text}</pre>
              </div>

              <button className="btn-primary w-full py-3 rounded-lg font-medium" onClick={handleDone}>
                {currentClientIndex < clientQueue.length - 1 ? 'Done - Next Client' : 'Done - Complete'}
              </button>
            </div>
          ) : null}

          {/* Completed Clients */}
          {completedClients.length > 0 && (
            <div className="card p-6">
              <h3 className="font-semibold text-gray-900 mb-3">Completed ({completedClients.length})</h3>
              <div className="space-y-2">
                {completedClients.map((client) => (
                  <div key={client.id} className="flex justify-between items-center px-3 py-2 bg-gray-50 rounded-lg">
                    <span className="text-sm text-gray-900">{client.name}</span>
                    <span className="text-xs text-green-600 font-medium">Completed</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
