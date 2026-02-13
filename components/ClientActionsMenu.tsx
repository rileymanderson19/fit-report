'use client';

import React from 'react';
import { Menu } from '@headlessui/react';
import { MoreVertical, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Client {
  id: string;
  first_name: string;
  last_name: string;
}

interface ClientActionsMenuProps {
  client: Client;
  onDelete: (_clientId: string) => void;
}

export default function ClientActionsMenu({ client, onDelete }: ClientActionsMenuProps) {
  return (
    <Menu as="div" className="relative inline-block text-left">
      <Menu.Button className="bg-white border border-gray-200 hover:border-blue-600/50 p-2 rounded-lg transition-all">
        <MoreVertical className="h-4 w-4 text-gray-500" />
      </Menu.Button>

      <Menu.Items className="absolute right-0 mt-2 w-48 origin-top-right rounded-lg bg-white border border-gray-200 shadow-lg focus:outline-none z-50">
        <div className="py-1">
          <Menu.Item>
            {({ active }) => (
              <button
                onClick={() => onDelete(client.id)}
                className={cn(
                  'flex items-center gap-2 w-full px-4 py-2 text-sm transition-colors',
                  active ? 'bg-gray-50 text-red-400' : 'text-red-400/80'
                )}
              >
                <Trash2 className="h-4 w-4" />
                <span>Delete Client</span>
              </button>
            )}
          </Menu.Item>
        </div>
      </Menu.Items>
    </Menu>
  );
}
