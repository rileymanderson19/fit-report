"use client";

import React, { useState, useEffect } from 'react';
import { createClient } from '@/libs/supabase/client';
import { toast } from 'sonner';

interface Client {
  id: string;
  trainer_id: string;
  trainerize_id: number;
  first_name: string;
  last_name: string;
  email: string;
  active: boolean;
}

interface TestResult {
  testType: string;
  success: boolean;
  data?: any;
  error?: string;
  timestamp: string;
}

export default function TestMessagingPage() {
  const supabase = createClient();
  const [clients, setClients] = useState<Client[]>([]);
  const [selectedClient, setSelectedClient] = useState<string>('');
  const [testType, setTestType] = useState<string>('basic');
  const [subject, setSubject] = useState<string>('');
  const [messageBody, setMessageBody] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [imageDataUrl, setImageDataUrl] = useState<string>('');
  const [uploadInvestigation, setUploadInvestigation] = useState<any>(null);
  const [isInvestigating, setIsInvestigating] = useState(false);
  const [debugResults, setDebugResults] = useState<any>(null);
  const [isDebugging, setIsDebugging] = useState(false);

  useEffect(() => {
    fetchClients();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchClients = async () => {
    try {
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .eq('active', true)
        .order('first_name', { ascending: true });

      if (error) throw error;
      setClients(data || []);
    } catch (error) {
      console.error('Error fetching clients:', error);
      toast.error('Failed to fetch clients');
    }
  };

  const generateSampleImage = () => {
    // Create a simple canvas with sample report content
    const canvas = document.createElement('canvas');
    canvas.width = 800;
    canvas.height = 600;
    const ctx = canvas.getContext('2d');

    if (ctx) {
      // White background
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, 800, 600);

      // Header
      ctx.fillStyle = '#2563eb';
      ctx.fillRect(0, 0, 800, 80);

      // Title
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 24px Arial';
      ctx.fillText('Fitness Report - Sample', 40, 45);

      // Sample content
      ctx.fillStyle = '#1a1a1a';
      ctx.font = '16px Arial';
      ctx.fillText('Client: Test Client', 40, 120);
      ctx.fillText('Date Range: Last 7 days', 40, 150);
      ctx.fillText('Workouts Completed: 3', 40, 180);
      ctx.fillText('Average Steps: 8,500', 40, 210);

      // Sample chart area
      ctx.strokeStyle = '#e2e8f0';
      ctx.lineWidth = 2;
      ctx.strokeRect(40, 250, 720, 200);

      ctx.fillStyle = '#64748b';
      ctx.font = '14px Arial';
      ctx.fillText('Sample Chart Area - Workout Progress', 60, 270);

      // Convert to data URL
      setImageDataUrl(canvas.toDataURL('image/png'));
      toast.success('Sample image generated');
    }
  };

  const runTest = async () => {
    if (!selectedClient) {
      toast.error('Please select a client');
      return;
    }

    setIsLoading(true);
    const startTime = new Date();

    try {
      const selectedClientObj = clients.find(c => c.id === selectedClient);
      if (!selectedClientObj) throw new Error('Client not found');

      const payload: any = {
        clientTrainerizeId: selectedClientObj.trainerize_id,
        testType,
        subject: subject || undefined,
        messageBody: messageBody || undefined
      };

             if ((testType === 'image_base64' || testType === 'image_url') && imageDataUrl) {
         payload.imageData = imageDataUrl;
       }

      const response = await fetch('/api/trainerize/send-message-test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const result = await response.json();

      const testResult: TestResult = {
        testType,
        success: response.ok,
        data: result,
        error: response.ok ? undefined : result.error,
        timestamp: startTime.toISOString()
      };

      setTestResults(prev => [testResult, ...prev]);

      if (response.ok) {
        toast.success(`${testType} test completed successfully!`);
      } else {
        toast.error(`${testType} test failed: ${result.error}`);
      }

    } catch (error) {
      const testResult: TestResult = {
        testType,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: startTime.toISOString()
      };

      setTestResults(prev => [testResult, ...prev]);
      toast.error('Test failed: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setIsLoading(false);
    }
  };

  const clearResults = () => {
    setTestResults([]);
    toast.success('Test results cleared');
  };

  const investigateUploadCapabilities = async () => {
    setIsInvestigating(true);
    try {
      const response = await fetch('/api/trainerize/investigate-upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      });

      const result = await response.json();

      if (response.ok) {
        setUploadInvestigation(result);
        toast.success('Upload investigation completed');
      } else {
        toast.error('Upload investigation failed: ' + result.error);
      }
    } catch (error) {
      toast.error('Investigation failed: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setIsInvestigating(false);
    }
  };

  const debugMessageFormat = async (messageType: string) => {
    if (!imageDataUrl && messageType !== 'url') {
      toast.error('Please generate a sample image first');
      return;
    }

    setIsDebugging(true);
    try {
      const response = await fetch('/api/trainerize/debug-message-format', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageData: imageDataUrl,
          messageType
        })
      });

      const result = await response.json();

      if (response.ok) {
        setDebugResults(result);
        toast.success('Debug analysis completed');
      } else {
        toast.error('Debug failed: ' + result.error);
      }
    } catch (error) {
      toast.error('Debug failed: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setIsDebugging(false);
    }
  };

  return (
    <div className="container mx-auto px-8 py-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Trainerize Messaging API Test</h1>
        <p className="text-gray-500">
          This tool helps us understand the capabilities and limitations of the Trainerize messaging API.
        </p>

        {/* Investigation and Debug Tools */}
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            className="btn-secondary px-3 py-1.5 rounded-lg text-sm font-medium"
            onClick={investigateUploadCapabilities}
            disabled={isInvestigating}
          >
            {isInvestigating ? (
              <>
                <div className="w-4 h-4 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin inline-block mr-2" />
                Investigating...
              </>
            ) : (
              'Investigate Upload Capabilities'
            )}
          </button>

          <button
            className="btn-secondary px-3 py-1.5 rounded-lg text-sm font-medium"
            onClick={() => debugMessageFormat('url')}
            disabled={isDebugging}
          >
            {isDebugging ? (
              <>
                <div className="w-4 h-4 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin inline-block mr-2" />
                Debugging...
              </>
            ) : (
              'Debug Image URL Format'
            )}
          </button>

          <button
            className="btn-secondary px-3 py-1.5 rounded-lg text-sm font-medium"
            onClick={() => debugMessageFormat('base64')}
            disabled={isDebugging}
          >
            Debug Base64 Format
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Test Configuration */}
        <div className="card bg-white shadow-xl">
          <div className="p-6">
            <h2 className="text-xl font-semibold text-gray-900">Test Configuration</h2>

            {/* Client Selection */}
            <div className="space-y-1.5">
              <label className="label">
                <span className="text-sm font-medium text-gray-700">Select Test Client</span>
              </label>
              <select
                className="input-field"
                value={selectedClient}
                onChange={(e) => setSelectedClient(e.target.value)}
              >
                <option value="">Choose a client...</option>
                {clients.map((client) => (
                  <option key={client.id} value={client.id}>
                    {client.first_name} {client.last_name} (ID: {client.trainerize_id})
                  </option>
                ))}
              </select>
            </div>

            {/* Test Type */}
            <div className="space-y-1.5">
              <label className="label">
                <span className="text-sm font-medium text-gray-700">Test Type</span>
              </label>
              <select
                className="input-field"
                value={testType}
                onChange={(e) => setTestType(e.target.value)}
              >
                <option value="basic">Basic Text Message</option>
                <option value="html">HTML Formatted Message</option>
                <option value="image_base64">Message with Base64 Image</option>
                <option value="image_url">Message with Image URL</option>
                <option value="appear_room">Appear Room Test</option>
              </select>
            </div>

            {/* Subject */}
            <div className="space-y-1.5">
              <label className="label">
                <span className="text-sm font-medium text-gray-700">Subject (optional)</span>
              </label>
              <input
                type="text"
                className="input-field"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Leave empty for default"
              />
            </div>

            {/* Message Body */}
            <div className="space-y-1.5">
              <label className="label">
                <span className="text-sm font-medium text-gray-700">Message Body (optional)</span>
              </label>
              <textarea
                className="input-field h-24"
                value={messageBody}
                onChange={(e) => setMessageBody(e.target.value)}
                placeholder="Leave empty for default test message"
              />
            </div>

            {/* Image Generation for Base64 and URL Tests */}
            {(testType === 'image_base64' || testType === 'image_url') && (
              <div className="space-y-1.5">
                <label className="label">
                  <span className="text-sm font-medium text-gray-700">Sample Image</span>
                </label>
                <div className="flex gap-2">
                  <button
                    className="btn-secondary px-3 py-1.5 rounded-lg text-sm font-medium"
                    onClick={generateSampleImage}
                  >
                    Generate Sample Report Image
                  </button>
                  {imageDataUrl && (
                    <span className="text-success text-sm self-center">Image ready</span>
                  )}
                </div>
              </div>
            )}

            {/* Run Test Button */}
            <div className="card-actions justify-end mt-4">
              <button
                className="btn-primary px-6 py-2.5 rounded-lg font-medium"
                onClick={runTest}
                disabled={isLoading || !selectedClient}
              >
                {isLoading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin inline-block mr-2" />
                    Running Test...
                  </>
                ) : (
                  'Run Test'
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Test Results */}
        <div className="card bg-white shadow-xl">
          <div className="p-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold text-gray-900">Test Results</h2>
              {testResults.length > 0 && (
                <button
                  className="btn-ghost px-3 py-1.5 rounded-lg text-sm font-medium"
                  onClick={clearResults}
                >
                  Clear Results
                </button>
              )}
            </div>

            <div className="space-y-4 max-h-96 overflow-y-auto">
              {testResults.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No test results yet. Run a test to see results here.
                </div>
              ) : (
                testResults.map((result, index) => (
                  <div key={index} className={`p-4 rounded-lg border ${
                    result.success ? 'bg-success/10 border-success' : 'bg-error/10 border-error'
                  }`}>
                    <div className="flex justify-between items-start mb-2">
                      <span className="font-semibold">{result.testType}</span>
                      <span className="text-sm text-gray-500">
                        {new Date(result.timestamp).toLocaleTimeString()}
                      </span>
                    </div>

                    <div className={`text-sm ${result.success ? 'text-success' : 'text-error'}`}>
                      {result.success ? 'Success' : 'Failed'}
                    </div>

                    {result.error && (
                      <div className="text-sm text-error mt-2">
                        Error: {result.error}
                      </div>
                    )}

                    {result.data && (
                      <details className="mt-2">
                        <summary className="text-sm cursor-pointer text-gray-600">
                          View Details
                        </summary>
                        <pre className="text-xs mt-2 p-2 bg-gray-100 rounded overflow-x-auto">
                          {JSON.stringify(result.data, null, 2)}
                        </pre>
                      </details>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

             {/* Debug Results */}
       {debugResults && (
         <div className="card bg-white shadow-xl mt-8">
           <div className="p-6">
             <h3 className="text-xl font-semibold text-gray-900">Debug Analysis Results</h3>

             {/* Recommendations */}
             <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
               <div>
                 <h4 className="font-semibold mb-2">Recommendations:</h4>
                 <ul className="list-disc list-inside space-y-1">
                   {debugResults.recommendations?.map((rec: string, index: number) => (
                     <li key={index} className="text-sm">{rec}</li>
                   ))}
                 </ul>
               </div>
             </div>

             {/* Detailed Results */}
             <div className="space-y-4">
               {debugResults.debug?.storageTest && (
                 <div className={`p-3 rounded border-l-4 ${
                   debugResults.debug.storageTest.success ? 'border-success bg-success/10' : 'border-error bg-error/10'
                 }`}>
                   <h5 className="font-semibold">Storage Test</h5>
                   <div className="text-sm">
                     Status: {debugResults.debug.storageTest.success ? 'Success' : 'Failed'}
                     {debugResults.debug.storageTest.error && (
                       <div className="text-error">Error: {debugResults.debug.storageTest.error}</div>
                     )}
                     <div>Available buckets: {debugResults.debug.storageTest.buckets?.join(', ') || 'None'}</div>
                     <div>Has temp-images bucket: {debugResults.debug.storageTest.hasTempImagesBucket ? 'Yes' : 'No'}</div>
                   </div>
                 </div>
               )}

               {debugResults.debug?.uploadTest && (
                 <div className={`p-3 rounded border-l-4 ${
                   debugResults.debug.uploadTest.success ? 'border-success bg-success/10' : 'border-error bg-error/10'
                 }`}>
                   <h5 className="font-semibold">Image Upload Test</h5>
                   <div className="text-sm">
                     Status: {debugResults.debug.uploadTest.success ? 'Success' : 'Failed'}
                     {debugResults.debug.uploadTest.error && (
                       <div className="text-error">Error: {debugResults.debug.uploadTest.error}</div>
                     )}
                     {debugResults.debug.uploadTest.publicUrl && (
                       <div>
                         <div>Public URL: <a href={debugResults.debug.uploadTest.publicUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline hover:text-blue-700">{debugResults.debug.uploadTest.publicUrl}</a></div>
                       </div>
                     )}
                   </div>
                 </div>
               )}

               {debugResults.debug?.messageFormat && (
                 <div className="p-3 rounded border border-gray-200 bg-gray-50">
                   <h5 className="font-semibold">Message Format Preview</h5>
                   <div className="text-sm space-y-2">
                     <div><strong>Subject:</strong> {debugResults.debug.messageFormat.subject}</div>
                     <div><strong>Body Length:</strong> {debugResults.debug.messageFormat.bodyLength} characters</div>
                     <div className="bg-gray-100 p-2 rounded">
                       <strong>Message Body:</strong>
                       <pre className="whitespace-pre-wrap text-xs mt-1">
                         {debugResults.debug.messageFormat.truncatedPreview || debugResults.debug.messageFormat.body}
                       </pre>
                     </div>
                   </div>
                 </div>
               )}
             </div>
           </div>
         </div>
       )}

       {/* Upload Investigation Results */}
       {uploadInvestigation && (
        <div className="card bg-white shadow-xl mt-8">
          <div className="p-6">
            <h3 className="text-xl font-semibold text-gray-900">Upload Capabilities Investigation</h3>

            <div className="stats stats-horizontal shadow mb-4">
              <div className="stat">
                <div className="stat-title">Endpoints Tested</div>
                <div className="stat-value text-sm">{uploadInvestigation.summary?.totalEndpointsTested || 0}</div>
              </div>
              <div className="stat">
                <div className="stat-title">Existing Endpoints</div>
                <div className="stat-value text-sm">{uploadInvestigation.summary?.existingEndpoints || 0}</div>
              </div>
              <div className="stat">
                <div className="stat-title">Working Endpoints</div>
                <div className="stat-value text-sm">{uploadInvestigation.summary?.workingEndpoints || 0}</div>
              </div>
            </div>

            <div className="space-y-2 max-h-64 overflow-y-auto">
              {uploadInvestigation.results?.map((result: any, index: number) => (
                <div key={index} className={`p-3 rounded border-l-4 text-sm ${
                  result.status && result.status < 400 ? 'border-success bg-success/10' :
                  result.status === 404 ? 'border-warning bg-warning/10' :
                  'border-error bg-error/10'
                }`}>
                  <div className="font-semibold">{result.endpoint} ({result.method})</div>
                  <div>Status: {result.status || 'Error'} {result.statusText}</div>
                  {result.error && <div className="text-error">Error: {result.error}</div>}
                  {result.data && (
                    <details className="mt-1">
                      <summary className="cursor-pointer">Response Data</summary>
                      <pre className="text-xs mt-1 p-1 bg-gray-100 rounded overflow-x-auto">
                        {result.data}
                      </pre>
                    </details>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Image Preview */}
      {imageDataUrl && (
        <div className="card bg-white shadow-xl mt-8">
          <div className="p-6">
            <h3 className="text-xl font-semibold text-gray-900">Generated Sample Image</h3>
            <img
              src={imageDataUrl}
              alt="Sample report"
              className="max-w-full h-auto rounded-lg border"
            />
          </div>
        </div>
      )}
    </div>
  );
}
