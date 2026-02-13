'use client';

import { useEffect, useState } from 'react';
import { Client } from '@/types/client';

interface ClientSelectorProps {
  value: string | null;
  onChange: (_clientId: string | null) => void;
}

export function ClientSelector({ value, onChange }: ClientSelectorProps) {
  const [clients, setClients] = useState<Client[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchClients = async () => {
      try {
        const response = await fetch('/api/clients');
        const data = await response.json();
        setClients(data.clients);
      } catch (error) {
        console.error('Error fetching clients:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchClients();
  }, []);

  if (isLoading) {
    return (
      <select className="input-field w-full" disabled>
        <option>Loading clients...</option>
      </select>
    );
  }

  return (
    <select
      className="input-field w-full"
      value={value || ''}
      onChange={(e) => onChange(e.target.value || null)}
    >
      <option value="">Select a client</option>
      {clients.map((client) => (
        <option key={client.id} value={client.id}>
          {client.first_name} {client.last_name}
        </option>
      ))}
    </select>
  );
}
