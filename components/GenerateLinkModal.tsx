'use client';

import React, { useState, useEffect } from 'react';
import { toast } from 'sonner';
import DraggableModal from './DraggableModal';

interface Report {
  id: string;
  client_id: string;
  report_data: any;
  created_at: string;
}

interface Client {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  trainerize_id: number;
}

interface LinkData {
  url: string;
  expiresAt: string;
  isExisting: boolean;
}

interface GenerateLinkModalProps {
  isOpen: boolean;
  onClose: () => void;
  report: Report | null;
  client: Client | null;
  onSuccess?: (linkData: LinkData) => void;
}

export default function GenerateLinkModal({ 
  isOpen, 
  onClose, 
  report, 
  client,
  onSuccess 
}: GenerateLinkModalProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [linkData, setLinkData] = useState<LinkData | null>(null);
  const [isCopying, setIsCopying] = useState(false);
  const [comment, setComment] = useState('');

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setLinkData(null);
      setIsGenerating(false);
      setIsCopying(false);
      setComment('');
    }
  }, [isOpen]);

  // Auto-generate link when modal opens
  useEffect(() => {
    if (isOpen && report && client && !linkData && !isGenerating) {
      handleGenerateLink();
    }
  }, [isOpen, report, client, linkData, isGenerating]);

  const handleGenerateLink = async () => {
    if (!report || !client) {
      toast.error('Report or client data is missing');
      return;
    }

    setIsGenerating(true);
    try {
      const response = await fetch('/api/reports/generate-link', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          clientId: client.id,
          reportId: report.id,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate link');
      }

      setLinkData(data.linkData);
      
      if (data.linkData.isExisting) {
        toast.success('Existing link retrieved successfully!');
      } else {
        toast.success('New report link generated successfully!');
      }
      
      onSuccess?.(data.linkData);

    } catch (error) {
      console.error('Error generating link:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to generate link');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopyLink = async () => {
    if (!linkData?.url) return;

    setIsCopying(true);
    try {
      let textToCopy = linkData.url;
      if (comment.trim()) {
        textToCopy = `${comment.trim()}\n\n${linkData.url}`;
      }
      
      await navigator.clipboard.writeText(textToCopy);
      toast.success('Link copied to clipboard!');
    } catch (error) {
      console.error('Failed to copy link:', error);
      toast.error('Failed to copy link');
    } finally {
      setIsCopying(false);
    }
  };

  const handleClose = () => {
    if (!isGenerating) {
      onClose();
    }
  };

  const formatExpiryDate = (expiresAt: string) => {
    const date = new Date(expiresAt);
    return date.toLocaleDateString() + ' at ' + date.toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  return (
    <DraggableModal
      isOpen={isOpen}
      onClose={handleClose}
      title="Generate Shareable Link"
      storageKey="generate-link-modal"
      initialPosition={{ x: typeof window !== 'undefined' ? Math.max(100, window.innerWidth - 500) : 100, y: 100 }}
      width="w-[480px]"
    >
      {client && (
        <div className="mb-4">
          <p className="text-sm text-base-content/70">
            Report for: <span className="font-medium">{client.first_name} {client.last_name}</span>
          </p>
        </div>
      )}

      {isGenerating && (
        <div className="flex flex-col items-center py-8">
          <span className="loading loading-spinner loading-lg mb-4"></span>
          <p className="text-base-content/70">Generating shareable link...</p>
        </div>
      )}

      {linkData && !isGenerating && (
        <div className="space-y-4">
          <div className="alert alert-success">
            <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>
              {linkData.isExisting 
                ? 'Existing link retrieved successfully!' 
                : 'New shareable link generated!'
              }
            </span>
          </div>

          <div className="form-control">
            <label className="label">
              <span className="label-text font-medium">Comment (Optional)</span>
            </label>
            <textarea
              className="textarea textarea-bordered"
              placeholder="Add a comment to include with the link..."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={3}
            />
          </div>

          <div className="form-control">
            <label className="label">
              <span className="label-text font-medium">Shareable URL</span>
            </label>
            <div className="join">
              <input
                type="text"
                value={linkData.url}
                className="input input-bordered join-item flex-1 text-sm"
                readOnly
              />
              <button
                className={`btn btn-primary join-item ${isCopying ? 'loading' : ''}`}
                onClick={handleCopyLink}
                disabled={isCopying}
              >
                {isCopying ? '' : (
                  <>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                    Copy
                  </>
                )}
              </button>
            </div>
          </div>

          <div className="bg-base-200 p-4 rounded-lg">
            <div className="flex items-center gap-2 text-sm">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-warning" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-base-content/70">
                Expires: <span className="font-medium">{formatExpiryDate(linkData.expiresAt)}</span>
              </span>
            </div>
            <p className="text-xs text-base-content/60 mt-2">
              This link will be valid for 7 days from generation. Anyone with this link can view the report.
            </p>
          </div>
        </div>
      )}

      <div className="flex justify-end gap-2 mt-6">
        <button
          className="btn btn-ghost"
          onClick={handleClose}
          disabled={isGenerating}
        >
          Close
        </button>
        {linkData && (
          <button
            className="btn btn-primary"
            onClick={handleCopyLink}
            disabled={isCopying}
          >
            {isCopying ? (
              <span className="loading loading-spinner loading-sm" />
            ) : (
              <>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                {comment.trim() ? 'Copy Comment & Link' : 'Copy Link'}
              </>
            )}
          </button>
        )}
      </div>
    </DraggableModal>
  );
} 