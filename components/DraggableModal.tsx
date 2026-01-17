'use client';

import React, { useState, useRef, useEffect, ReactNode } from 'react';

interface DraggableModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  className?: string;
  width?: string;
  height?: string;
  initialPosition?: { x: number; y: number };
  storageKey?: string; // Key for localStorage position persistence
}

export default function DraggableModal({
  isOpen,
  onClose,
  title,
  children,
  className = '',
  width = 'max-w-lg',
  height = 'auto',
  initialPosition = { x: 100, y: 100 },
  storageKey
}: DraggableModalProps) {
  const [position, setPosition] = useState(initialPosition);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const modalRef = useRef<HTMLDivElement>(null);
  const dragHandleRef = useRef<HTMLDivElement>(null);

  // Load saved position from localStorage on mount
  useEffect(() => {
    if (storageKey && typeof window !== 'undefined') {
      const savedPosition = localStorage.getItem(`modal-position-${storageKey}`);
      if (savedPosition) {
        try {
          const parsedPosition = JSON.parse(savedPosition);
          setPosition(parsedPosition);
        } catch (error) {
          console.warn('Failed to parse saved modal position:', error);
        }
      }
    }
  }, [storageKey]);

  // Save position to localStorage when it changes
  useEffect(() => {
    if (storageKey && typeof window !== 'undefined') {
      localStorage.setItem(`modal-position-${storageKey}`, JSON.stringify(position));
    }
  }, [position, storageKey]);

  // Check if device supports dragging (non-touch device)
  const supportsDragging = typeof window !== 'undefined' && !('ontouchstart' in window);

  // Handle drag start
  const handleMouseDown = (e: React.MouseEvent) => {
    if (!modalRef.current || !supportsDragging) return;
    
    const rect = modalRef.current.getBoundingClientRect();
    setDragOffset({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    });
    setIsDragging(true);
  };

  // Handle drag move
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging || !modalRef.current) return;

      const newX = e.clientX - dragOffset.x;
      const newY = e.clientY - dragOffset.y;

      // Get viewport dimensions
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      const modalRect = modalRef.current.getBoundingClientRect();

      // Constrain to viewport bounds
      const constrainedX = Math.max(0, Math.min(newX, viewportWidth - modalRect.width));
      const constrainedY = Math.max(0, Math.min(newY, viewportHeight - modalRect.height));

      setPosition({ x: constrainedX, y: constrainedY });
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, dragOffset]);

  // Reset position if modal goes off-screen
  const resetPosition = () => {
    setPosition(initialPosition);
  };

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <>
      {/* Semi-transparent backdrop */}
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40" onClick={onClose} />

      {/* Draggable Modal */}
      <div
        ref={modalRef}
        className={`fixed z-50 card-elevated ${width} ${className} ${
          isDragging ? 'shadow-2xl cursor-grabbing' : ''
        }`}
        style={{
          left: `${position.x}px`,
          top: `${position.y}px`,
          height: height === 'auto' ? 'auto' : height,
          minWidth: '320px',
          maxWidth: '90vw',
          maxHeight: '90vh',
          overflow: 'hidden'
        }}
      >
        {/* Drag Handle Header */}
        <div
          ref={dragHandleRef}
          className={`flex justify-between items-center p-4 border-b border-white/10 bg-gradient-to-r from-accent-purple/10 to-accent-violet/10 rounded-t-lg ${
            supportsDragging
              ? (isDragging ? 'cursor-grabbing' : 'cursor-grab')
              : ''
          }`}
          onMouseDown={handleMouseDown}
        >
          <h3 className="font-bold text-lg select-none text-white">{title}</h3>
          <div className="flex items-center gap-2">
            {/* Reset Position Button */}
            <button
              className="glass border border-white/10 hover:border-accent-purple/50 text-gray-300 hover:text-white p-2 rounded-lg transition-all"
              onClick={resetPosition}
              title="Reset position"
              type="button"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
            {/* Close Button */}
            <button
              className="glass border border-white/10 hover:border-red-500/50 text-gray-300 hover:text-red-400 p-2 rounded-lg transition-all"
              onClick={onClose}
              type="button"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Modal Content */}
        <div className="p-6 overflow-y-auto bg-bg-secondary" style={{ maxHeight: 'calc(90vh - 60px)' }}>
          {children}
        </div>
      </div>
    </>
  );
} 