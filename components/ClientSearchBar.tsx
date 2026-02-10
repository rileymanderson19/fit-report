'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createClient } from '@/libs/supabase/client';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

interface Client {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  active: boolean;
}

interface ClientSearchBarProps {
  currentClientId?: string;
  placeholder?: string;
  className?: string;
}

export default function ClientSearchBar({
  currentClientId,
  placeholder = "Search clients to navigate...",
  className = ""
}: ClientSearchBarProps) {
  const router = useRouter();
  const supabase = createClient();

  // State management
  const [searchQuery, setSearchQuery] = useState('');
  const [clients, setClients] = useState<Client[]>([]);
  const [filteredClients, setFilteredClients] = useState<Client[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [isLoading, setIsLoading] = useState(false);
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  // Refs
  const searchInputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  // Fetch clients from Supabase
  const fetchClients = useCallback(async () => {
    if (!isInitialLoad) return; // Only fetch once unless forced

    try {
      setIsLoading(true);
      const { data: profile } = await supabase.auth.getUser();
      if (!profile.user) {
        throw new Error('No user found');
      }

      const { data, error } = await supabase
        .from('clients')
        .select('id, first_name, last_name, email, active')
        .eq('active', true)
        .order('first_name', { ascending: true });

      if (error) throw error;

      setClients(data || []);
      setIsInitialLoad(false);
    } catch (error) {
      console.error('Error fetching clients:', error);
      toast.error('Failed to load clients for search');
    } finally {
      setIsLoading(false);
    }
  }, [supabase, isInitialLoad]);

  // Load clients on component mount
  useEffect(() => {
    fetchClients();
  }, [fetchClients]);

  // Filter clients based on search query
  const filterClients = useCallback((query: string, clientList: Client[]) => {
    if (!query.trim()) return [];

    const searchTerms = query.toLowerCase().split(' ').filter(term => term.length > 0);

    return clientList.filter(client => {
      // Exclude current client from results
      if (currentClientId && client.id === currentClientId) return false;

      const fullName = `${client.first_name} ${client.last_name}`.toLowerCase();
      const email = client.email.toLowerCase();

      return searchTerms.every(term =>
        fullName.includes(term) ||
        email.includes(term) ||
        client.first_name.toLowerCase().includes(term) ||
        client.last_name.toLowerCase().includes(term)
      );
    }).slice(0, 8); // Limit to 8 results for performance
  }, [currentClientId]);

  // Debounced search effect
  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(() => {
      const filtered = filterClients(searchQuery, clients);
      setFilteredClients(filtered);
      setSelectedIndex(-1);
      setIsOpen(searchQuery.trim().length > 0 && filtered.length > 0);
    }, 300);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [searchQuery, clients, filterClients]);

  // Handle search input change
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen || filteredClients.length === 0) {
      if (e.key === 'Escape') {
        setSearchQuery('');
        setIsOpen(false);
        setSelectedIndex(-1);
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev =>
          prev < filteredClients.length - 1 ? prev + 1 : 0
        );
        break;

      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev =>
          prev > 0 ? prev - 1 : filteredClients.length - 1
        );
        break;

      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0 && selectedIndex < filteredClients.length) {
          navigateToClient(filteredClients[selectedIndex]);
        }
        break;

      case 'Escape':
        e.preventDefault();
        setIsOpen(false);
        setSelectedIndex(-1);
        setSearchQuery('');
        searchInputRef.current?.blur();
        break;
    }
  };

  // Navigate to client reports
  const navigateToClient = (client: Client) => {
    router.push(`/dashboard/clients/${client.id}/reports`);
    setSearchQuery('');
    setIsOpen(false);
    setSelectedIndex(-1);
    searchInputRef.current?.blur();
  };

  // Handle click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        searchInputRef.current &&
        !searchInputRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
        setSelectedIndex(-1);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Handle input focus
  const handleFocus = () => {
    if (searchQuery.trim() && filteredClients.length > 0) {
      setIsOpen(true);
    }
  };

  return (
    <div className={`relative w-full ${className}`}>
      {/* Search Input */}
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <svg
            className="h-5 w-5 text-gray-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
        </div>

        <input
          ref={searchInputRef}
          type="text"
          className="bg-bg-secondary border border-gray-200 text-gray-900 placeholder-gray-500 focus:outline-none focus:border-blue-600 rounded-lg px-4 py-2 pl-10 w-full"
          placeholder={placeholder}
          value={searchQuery}
          onChange={handleSearchChange}
          onKeyDown={handleKeyDown}
          onFocus={handleFocus}
          disabled={isLoading}
        />

        {isLoading && (
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
            <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
          </div>
        )}
      </div>

      {/* Search Results Dropdown */}
      {isOpen && (
        <div
          ref={dropdownRef}
          className="absolute z-50 w-full mt-1 card border border-gray-200 rounded-lg shadow-xl max-h-80 overflow-y-auto"
        >
          {filteredClients.length > 0 ? (
            <div className="py-1">
              {filteredClients.map((client, index) => (
                <div
                  key={client.id}
                  className={`px-4 py-3 cursor-pointer transition-colors ${
                    index === selectedIndex ? 'bg-blue-600/20 text-gray-900 border-l-2 border-blue-600' : 'text-gray-600 hover:bg-gray-50'
                  }`}
                  onClick={() => navigateToClient(client)}
                  onMouseEnter={() => setSelectedIndex(index)}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className={`font-medium ${
                        index === selectedIndex ? 'text-gray-900' : 'text-gray-800'
                      }`}>
                        {client.first_name} {client.last_name}
                      </div>
                      <div className={`text-sm ${
                        index === selectedIndex ? 'text-gray-600' : 'text-gray-500'
                      }`}>
                        {client.email}
                      </div>
                    </div>
                    <div className={`text-xs ${
                      index === selectedIndex ? 'text-blue-600' : 'text-gray-500'
                    }`}>
                      View Reports →
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : searchQuery.trim() && (
            <div className="px-4 py-3 text-gray-500 text-center">
               No clients found matching &ldquo;{searchQuery}&rdquo;
             </div>
          )}
        </div>
      )}
    </div>
  );
}
