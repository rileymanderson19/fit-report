"use client";

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { createClient } from '@/libs/supabase/client';
import { toast } from 'sonner';
import Link from 'next/link';
import {
  Upload, Edit2, Search, Users, CheckCircle2, AlertTriangle,
  AlertCircle, Star, Trash2, X, Eye, ChevronLeft, ChevronRight, ChevronDown,
  Flame, Scale, TrendingUp
} from 'lucide-react';

type ManualStatus = 'on_track' | 'watch' | 'needs_attention' | 'new';

interface Client {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  goal: 'fat_loss' | 'maintenance' | 'muscle_gain' | null;
  notes: string | null;
  status: ManualStatus;
  created_at: string;
}

interface TrainerizeClient {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
}

type StatusFilter = 'all' | ManualStatus;
type GoalFilter = 'all' | 'fat_loss' | 'maintenance' | 'muscle_gain' | 'none';
type SortOption = 'attention' | 'alpha' | 'newest';

const STATUS_CONFIG: Record<ManualStatus, { label: string; icon: typeof CheckCircle2; color: string; bg: string; border: string; dot: string }> = {
  on_track: { label: 'On Track', icon: CheckCircle2, color: 'text-green-400', bg: 'bg-green-500/20', border: 'border-green-500/30', dot: 'bg-green-400' },
  watch: { label: 'Watch', icon: AlertTriangle, color: 'text-yellow-400', bg: 'bg-yellow-500/20', border: 'border-yellow-500/30', dot: 'bg-yellow-400' },
  needs_attention: { label: 'Needs Attention', icon: AlertCircle, color: 'text-red-400', bg: 'bg-red-500/20', border: 'border-red-500/30', dot: 'bg-red-400' },
  new: { label: 'New', icon: Star, color: 'text-blue-400', bg: 'bg-blue-500/20', border: 'border-blue-500/30', dot: 'bg-blue-400' },
};

const STATUS_OPTIONS: ManualStatus[] = ['on_track', 'watch', 'needs_attention', 'new'];

type GoalType = 'fat_loss' | 'maintenance' | 'muscle_gain' | null;

const GOAL_CONFIG: Record<string, { label: string; icon: typeof Flame; color: string; bg: string; border: string; dot: string }> = {
  fat_loss: { label: 'Fat Loss', icon: Flame, color: 'text-orange-400', bg: 'bg-orange-500/20', border: 'border-orange-500/30', dot: 'bg-orange-400' },
  maintenance: { label: 'Maintenance', icon: Scale, color: 'text-blue-400', bg: 'bg-blue-500/20', border: 'border-blue-500/30', dot: 'bg-blue-400' },
  muscle_gain: { label: 'Muscle Gain', icon: TrendingUp, color: 'text-green-400', bg: 'bg-green-500/20', border: 'border-green-500/30', dot: 'bg-green-400' },
  none: { label: 'Not Set', icon: Scale, color: 'text-gray-400', bg: 'bg-gray-500/20', border: 'border-gray-500/30', dot: 'bg-gray-500' },
};

const GOAL_OPTIONS: { value: GoalType; key: string }[] = [
  { value: 'fat_loss', key: 'fat_loss' },
  { value: 'maintenance', key: 'maintenance' },
  { value: 'muscle_gain', key: 'muscle_gain' },
  { value: null, key: 'none' },
];

export default function ClientsPage() {
  const supabase = createClient();

  const [clients, setClients] = useState<Client[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [goalFilter, setGoalFilter] = useState<GoalFilter>('all');
  const [sortOption, setSortOption] = useState<SortOption>('attention');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Dropdown state
  const [statusDropdownId, setStatusDropdownId] = useState<string | null>(null);
  const [goalDropdownId, setGoalDropdownId] = useState<string | null>(null);
  const statusDropdownRef = useRef<HTMLDivElement>(null);
  const goalDropdownRef = useRef<HTMLDivElement>(null);

  // Import state
  const [trainerizeClients, setTrainerizeClients] = useState<TrainerizeClient[]>([]);
  const [importSearchQuery, setImportSearchQuery] = useState('');
  const [selectedImportIds, setSelectedImportIds] = useState<string[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [isFetchingTrainerize, setIsFetchingTrainerize] = useState(false);

  // Delete state
  const [deletingClientId, setDeletingClientId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Edit state
  const [editingClientId, setEditingClientId] = useState<string | null>(null);
  const [editingNotes, setEditingNotes] = useState('');
  const [editingGoal, setEditingGoal] = useState<Client['goal']>(null);
  const [isSavingNotes, setIsSavingNotes] = useState(false);

  // Load clients
  const fetchClients = useCallback(async () => {
    try {
      const { data: profile } = await supabase.auth.getUser();
      if (!profile.user) throw new Error('No user found');

      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .eq('active', true)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const clientList: Client[] = (data || []).map(c => ({
        id: c.id,
        first_name: c.first_name,
        last_name: c.last_name,
        email: c.email,
        goal: c.goal,
        notes: c.notes,
        status: c.status || 'new',
        created_at: c.created_at,
      }));

      setClients(clientList);
    } catch (error) {
      console.error('Error fetching clients:', error);
      toast.error('Failed to fetch clients');
    } finally {
      setIsLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    fetchClients();
  }, [fetchClients]);

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (statusDropdownRef.current && !statusDropdownRef.current.contains(e.target as Node)) {
        setStatusDropdownId(null);
      }
      if (goalDropdownRef.current && !goalDropdownRef.current.contains(e.target as Node)) {
        setGoalDropdownId(null);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  // Compute stats from client data
  const stats = {
    total: clients.length,
    onTrack: clients.filter(c => c.status === 'on_track').length,
    watch: clients.filter(c => c.status === 'watch').length,
    needsAttention: clients.filter(c => c.status === 'needs_attention').length,
    new: clients.filter(c => c.status === 'new').length,
  };

  // Filter and sort
  const filteredClients = clients
    .filter(client => {
      const matchesSearch = searchQuery === '' ||
        `${client.first_name} ${client.last_name}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
        client.email.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === 'all' || client.status === statusFilter;
      const matchesGoal = goalFilter === 'all' ||
        (goalFilter === 'none' ? client.goal === null : client.goal === goalFilter);
      return matchesSearch && matchesStatus && matchesGoal;
    })
    .sort((a, b) => {
      if (sortOption === 'attention') {
        const priority: Record<ManualStatus, number> = { needs_attention: 0, watch: 1, new: 2, on_track: 3 };
        return priority[a.status] - priority[b.status];
      }
      if (sortOption === 'alpha') {
        return a.first_name.localeCompare(b.first_name);
      }
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

  const totalPages = Math.ceil(filteredClients.length / itemsPerPage);
  const currentClients = filteredClients.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  // Update client status
  const updateClientStatus = async (clientId: string, newStatus: ManualStatus) => {
    setStatusDropdownId(null);
    // Optimistic update
    setClients(prev => prev.map(c => c.id === clientId ? { ...c, status: newStatus } : c));

    try {
      const response = await fetch('/api/clients/update-notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientId, status: newStatus }),
      });
      if (!response.ok) throw new Error('Failed to update status');
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error('Failed to update status');
      fetchClients(); // Revert on error
    }
  };

  // Update client goal
  const updateClientGoal = async (clientId: string, newGoal: GoalType) => {
    setGoalDropdownId(null);
    setClients(prev => prev.map(c => c.id === clientId ? { ...c, goal: newGoal } : c));

    try {
      const response = await fetch('/api/clients/update-notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientId, goal: newGoal }),
      });
      if (!response.ok) throw new Error('Failed to update goal');
    } catch (error) {
      console.error('Error updating goal:', error);
      toast.error('Failed to update goal');
      fetchClients();
    }
  };

  // Import handlers
  const fetchTrainerizeClients = async () => {
    setIsFetchingTrainerize(true);
    try {
      const response = await fetch('/api/trainerize/fetch-clients');
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to fetch clients');

      const mappedClients = (data.clients || []).map((client: any) => ({
        id: client.id,
        first_name: client.firstName,
        last_name: client.lastName,
        email: client.email
      }));

      setTrainerizeClients(mappedClients);
      setSelectedImportIds([]);
      setImportSearchQuery('');
      setIsModalOpen(true);
    } catch (error) {
      console.error('Error fetching clients:', error);
      toast.error('Failed to fetch clients from Trainerize');
    } finally {
      setIsFetchingTrainerize(false);
    }
  };

  const handleImportClients = async () => {
    setIsImporting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No user found');

      const selectedTrainerizeClients = trainerizeClients.filter(client =>
        selectedImportIds.includes(client.id)
      );

      if (selectedTrainerizeClients.length === 0) throw new Error('No clients selected');

      for (const client of selectedTrainerizeClients) {
        const { error } = await supabase
          .from('clients')
          .insert({
            trainer_id: user.id,
            first_name: client.first_name,
            last_name: client.last_name,
            email: client.email,
            trainerize_id: parseInt(client.id),
            active: true,
            status: 'new',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          });

        if (error) throw new Error(`Failed to import ${client.first_name} ${client.last_name}: ${error.message}`);
      }

      toast.success('Clients imported successfully');
      setIsModalOpen(false);
      setSelectedImportIds([]);
      fetchClients();
    } catch (error) {
      console.error('Error importing clients:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to import clients');
    } finally {
      setIsImporting(false);
    }
  };

  const confirmDelete = async () => {
    if (!deletingClientId) return;
    setIsDeleting(true);
    try {
      const response = await fetch(`/api/clients/delete?id=${deletingClientId}`, { method: 'DELETE' });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete client');
      }

      setClients(prev => prev.filter(c => c.id !== deletingClientId));
      toast.success('Client deleted');
    } catch (error) {
      console.error('Error deleting client:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to delete');
    } finally {
      setIsDeleting(false);
      setDeletingClientId(null);
    }
  };

  const saveClientDetails = async () => {
    if (!editingClientId) return;
    setIsSavingNotes(true);
    try {
      const response = await fetch('/api/clients/update-notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId: editingClientId,
          notes: editingNotes.trim() || null,
          goal: editingGoal || null
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to update');

      setClients(prev => prev.map(c =>
        c.id === editingClientId
          ? { ...c, notes: editingNotes.trim() || null, goal: editingGoal || null }
          : c
      ));
      toast.success('Client details updated');
      setEditingClientId(null);
    } catch (error) {
      console.error('Error updating:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to update');
    } finally {
      setIsSavingNotes(false);
    }
  };

  const filteredTrainerizeClients = trainerizeClients.filter(client =>
    `${client.first_name} ${client.last_name}`.toLowerCase().includes(importSearchQuery.toLowerCase()) ||
    client.email.toLowerCase().includes(importSearchQuery.toLowerCase())
  );

  // Helpers
  const getInitials = (first: string, last: string) =>
    `${first.charAt(0)}${last.charAt(0)}`.toUpperCase();

  const avatarColors = [
    'bg-purple-500/20 text-purple-300',
    'bg-blue-500/20 text-blue-300',
    'bg-emerald-500/20 text-emerald-300',
    'bg-amber-500/20 text-amber-300',
    'bg-rose-500/20 text-rose-300',
    'bg-cyan-500/20 text-cyan-300',
  ];

  const getAvatarColor = (name: string) => {
    let hash = 0;
    for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
    return avatarColors[Math.abs(hash) % avatarColors.length];
  };

  if (isLoading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <span className="loading loading-spinner loading-lg text-accent-purple" />
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-display font-bold gradient-text">Clients</h1>
          <p className="text-gray-400 text-sm mt-1">
            Manage and monitor your {stats.total} client{stats.total !== 1 ? 's' : ''}
          </p>
        </div>
        <button
          className={`btn-gradient text-sm px-4 py-2 rounded-lg transition-all flex items-center gap-2 ${isFetchingTrainerize ? 'opacity-50 cursor-not-allowed' : ''}`}
          onClick={fetchTrainerizeClients}
          disabled={isFetchingTrainerize}
        >
          <Upload className="h-4 w-4" />
          {isFetchingTrainerize ? 'Loading...' : 'Import Clients'}
        </button>
      </div>

      {/* Stats bar */}
      {stats.total > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          {([
            { status: 'on_track' as ManualStatus, count: stats.onTrack },
            { status: 'watch' as ManualStatus, count: stats.watch },
            { status: 'needs_attention' as ManualStatus, count: stats.needsAttention },
            { status: 'new' as ManualStatus, count: stats.new },
          ]).map(({ status, count }) => {
            const config = STATUS_CONFIG[status];
            const Icon = config.icon;
            const isActive = statusFilter === status;
            return (
              <button
                key={status}
                onClick={() => {
                  setStatusFilter(isActive ? 'all' : status);
                  setCurrentPage(1);
                }}
                className={`card-elevated p-4 text-left transition-all ${isActive ? `ring-1 ${config.border}` : 'hover:bg-white/5'}`}
              >
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${config.bg}`}>
                    <Icon className={`h-5 w-5 ${config.color}`} />
                  </div>
                  <div>
                    <span className={`text-2xl font-bold ${config.color}`}>{count}</span>
                    <p className="text-xs text-gray-400">{config.label}</p>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* Search + filters bar */}
      <div className="card-elevated p-3 mb-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
            <input
              type="text"
              placeholder="Search by name or email..."
              className="bg-white/5 border border-white/10 text-white text-sm placeholder-gray-500 focus:outline-none focus:border-accent-purple/50 rounded-lg pl-9 pr-3 py-2 w-full"
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
            />
          </div>

          <select
            className="bg-white/5 border border-white/10 text-gray-300 text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-accent-purple/50"
            value={goalFilter}
            onChange={(e) => { setGoalFilter(e.target.value as GoalFilter); setCurrentPage(1); }}
          >
            <option value="all">All Goals</option>
            <option value="fat_loss">Fat Loss</option>
            <option value="maintenance">Maintenance</option>
            <option value="muscle_gain">Muscle Gain</option>
            <option value="none">No Goal Set</option>
          </select>

          <select
            className="bg-white/5 border border-white/10 text-gray-300 text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-accent-purple/50"
            value={sortOption}
            onChange={(e) => setSortOption(e.target.value as SortOption)}
          >
            <option value="attention">Needs Attention First</option>
            <option value="alpha">Alphabetical</option>
            <option value="newest">Newest First</option>
          </select>
        </div>
      </div>

      {/* Client table */}
      <div className="card-elevated overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/10">
                <th className="text-left text-xs font-medium text-gray-400 uppercase tracking-wider px-4 py-3">Client</th>
                <th className="text-left text-xs font-medium text-gray-400 uppercase tracking-wider px-4 py-3 hidden sm:table-cell">Goal</th>
                <th className="text-left text-xs font-medium text-gray-400 uppercase tracking-wider px-4 py-3">Status</th>
                <th className="text-right text-xs font-medium text-gray-400 uppercase tracking-wider px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {currentClients.map((client) => {
                const config = STATUS_CONFIG[client.status];
                const fullName = `${client.first_name} ${client.last_name}`;

                return (
                  <tr
                    key={client.id}
                    className="hover:bg-white/[0.03] transition-colors"
                  >
                    {/* Client name + email */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-semibold flex-shrink-0 ${getAvatarColor(fullName)}`}>
                          {getInitials(client.first_name, client.last_name)}
                        </div>
                        <div className="min-w-0">
                          <Link
                            href={`/dashboard/clients/${client.id}/reports`}
                            className="font-medium text-white hover:text-accent-purple transition-colors text-sm block truncate"
                          >
                            {fullName}
                          </Link>
                          <p className="text-xs text-gray-500 truncate">{client.email}</p>
                        </div>
                      </div>
                    </td>

                    {/* Goal — clickable dropdown */}
                    <td className="px-4 py-3 hidden sm:table-cell">
                      <div className="relative" ref={goalDropdownId === client.id ? goalDropdownRef : undefined}>
                        {(() => {
                          const gc = GOAL_CONFIG[client.goal || 'none'];
                          const GoalIcon = gc.icon;
                          return (
                            <button
                              onClick={() => {
                                setGoalDropdownId(goalDropdownId === client.id ? null : client.id);
                                setStatusDropdownId(null);
                              }}
                              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium cursor-pointer transition-all hover:ring-1 hover:ring-white/20 ${gc.bg} ${gc.color} border ${gc.border}`}
                            >
                              <GoalIcon className="h-3 w-3" />
                              {gc.label}
                              <ChevronDown className="h-3 w-3 opacity-50" />
                            </button>
                          );
                        })()}

                        {goalDropdownId === client.id && (
                          <div className="absolute top-full left-0 mt-1 w-44 rounded-lg border border-white/10 shadow-xl z-50" style={{ backgroundColor: '#13111C' }}>
                            {GOAL_OPTIONS.map(({ value, key }) => {
                              const gc = GOAL_CONFIG[key];
                              const GoalIcon = gc.icon;
                              const isSelected = (client.goal || 'none') === (value || 'none');
                              return (
                                <button
                                  key={key}
                                  onClick={() => updateClientGoal(client.id, value)}
                                  className={`flex items-center gap-2 w-full px-3 py-2 text-xs transition-colors hover:bg-white/5 first:rounded-t-lg last:rounded-b-lg ${
                                    isSelected ? 'bg-white/5' : ''
                                  }`}
                                >
                                  <GoalIcon className={`h-3 w-3 ${gc.color}`} />
                                  <span className={gc.color}>{gc.label}</span>
                                  {isSelected && (
                                    <CheckCircle2 className="h-3 w-3 ml-auto text-accent-purple" />
                                  )}
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </td>

                    {/* Status — clickable dropdown */}
                    <td className="px-4 py-3">
                      <div className="relative" ref={statusDropdownId === client.id ? statusDropdownRef : undefined}>
                        <button
                          onClick={() => {
                            setStatusDropdownId(statusDropdownId === client.id ? null : client.id);
                            setGoalDropdownId(null);
                          }}
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium cursor-pointer transition-all hover:ring-1 hover:ring-white/20 ${config.bg} ${config.color} border ${config.border}`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${config.dot}`} />
                          {config.label}
                          <ChevronDown className="h-3 w-3 opacity-50" />
                        </button>

                        {statusDropdownId === client.id && (
                          <div className="absolute top-full left-0 mt-1 w-44 rounded-lg border border-white/10 shadow-xl z-50" style={{ backgroundColor: '#13111C' }}>
                            {STATUS_OPTIONS.map(s => {
                              const sc = STATUS_CONFIG[s];
                              return (
                                <button
                                  key={s}
                                  onClick={() => updateClientStatus(client.id, s)}
                                  className={`flex items-center gap-2 w-full px-3 py-2 text-xs transition-colors hover:bg-white/5 first:rounded-t-lg last:rounded-b-lg ${
                                    client.status === s ? 'bg-white/5' : ''
                                  }`}
                                >
                                  <span className={`w-2 h-2 rounded-full ${sc.dot}`} />
                                  <span className={sc.color}>{sc.label}</span>
                                  {client.status === s && (
                                    <CheckCircle2 className="h-3 w-3 ml-auto text-accent-purple" />
                                  )}
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <Link
                          href={`/dashboard/clients/${client.id}/reports`}
                          className="p-1.5 rounded-lg text-gray-500 hover:text-accent-purple hover:bg-white/5 transition-all"
                          title="View Reports"
                        >
                          <Eye className="h-4 w-4" />
                        </Link>
                        <button
                          className="p-1.5 rounded-lg text-gray-500 hover:text-accent-purple hover:bg-white/5 transition-all"
                          onClick={() => {
                            setEditingClientId(client.id);
                            setEditingNotes(client.notes || '');
                            setEditingGoal(client.goal);
                          }}
                          title="Edit Client"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button
                          className="p-1.5 rounded-lg text-gray-500 hover:text-red-400 hover:bg-white/5 transition-all"
                          onClick={() => setDeletingClientId(client.id)}
                          title="Delete Client"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {/* Empty state */}
          {filteredClients.length === 0 && (
            <div className="p-12 text-center">
              <Users className="h-10 w-10 text-gray-600 mx-auto mb-3" />
              <p className="text-gray-400 text-sm">
                {clients.length === 0
                  ? 'No clients imported yet. Click "Import Clients" to get started.'
                  : 'No clients match your current filters.'}
              </p>
            </div>
          )}
        </div>

        {/* Pagination footer */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-white/10">
            <p className="text-xs text-gray-500">
              Showing {(currentPage - 1) * itemsPerPage + 1}–{Math.min(currentPage * itemsPerPage, filteredClients.length)} of {filteredClients.length}
            </p>
            <div className="flex items-center gap-1">
              <button
                className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                onClick={() => setCurrentPage(p => p - 1)}
                disabled={currentPage === 1}
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                <button
                  key={page}
                  className={`min-w-[28px] h-7 rounded-lg text-xs font-medium transition-all ${
                    page === currentPage
                      ? 'bg-accent-purple/20 text-accent-purple border border-accent-purple/30'
                      : 'text-gray-400 hover:text-white hover:bg-white/5'
                  }`}
                  onClick={() => setCurrentPage(page)}
                >
                  {page}
                </button>
              ))}
              <button
                className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                onClick={() => setCurrentPage(p => p + 1)}
                disabled={currentPage === totalPages}
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {deletingClientId && (
        <>
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50" onClick={() => setDeletingClientId(null)} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
            <div className="card-elevated max-w-md w-full p-6 pointer-events-auto" onClick={e => e.stopPropagation()}>
              <h3 className="font-bold text-lg text-white mb-2">Confirm Delete</h3>
              <p className="text-gray-300 text-sm">
                Are you sure you want to delete {clients.find(c => c.id === deletingClientId)?.first_name} {clients.find(c => c.id === deletingClientId)?.last_name}?
                This will also delete all their reports. This action cannot be undone.
              </p>
              <div className="flex justify-end gap-2 mt-4">
                <button
                  className="glass border border-white/10 hover:border-white/20 px-4 py-2 rounded-lg text-sm transition-all"
                  onClick={() => setDeletingClientId(null)}
                  disabled={isDeleting}
                >
                  Cancel
                </button>
                <button
                  className="glass border border-red-500/50 hover:border-red-500 bg-red-500/10 hover:bg-red-500/20 text-red-400 px-4 py-2 rounded-lg text-sm transition-all flex items-center gap-2"
                  onClick={confirmDelete}
                  disabled={isDeleting}
                >
                  {isDeleting ? <span className="loading loading-spinner loading-sm" /> : 'Delete'}
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Edit Notes Modal */}
      {editingClientId && (
        <>
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50" onClick={() => setEditingClientId(null)} />
          <div className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-20 pointer-events-none">
            <div className="card-elevated max-w-lg w-full p-6 pointer-events-auto" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-base text-white">
                  Edit Client Details
                </h3>
                <button onClick={() => setEditingClientId(null)} className="text-gray-400 hover:text-white">
                  <X className="h-4 w-4" />
                </button>
              </div>
              <p className="text-sm text-gray-300 mb-4">
                {clients.find(c => c.id === editingClientId)?.first_name} {clients.find(c => c.id === editingClientId)?.last_name}
              </p>

              <div className="mb-3">
                <label className="text-xs text-gray-400 mb-1.5 block">Goal</label>
                <select
                  className="bg-bg-secondary border border-white/10 text-white text-sm rounded-lg px-3 py-2 w-full focus:outline-none focus:border-accent-purple"
                  value={editingGoal || ''}
                  onChange={(e) => setEditingGoal(e.target.value as Client['goal'])}
                >
                  <option value="">Not Set</option>
                  <option value="fat_loss">Fat Loss</option>
                  <option value="maintenance">Maintenance</option>
                  <option value="muscle_gain">Muscle Gain</option>
                </select>
              </div>

              <div className="mb-4">
                <label className="text-xs text-gray-400 mb-1.5 block">Notes</label>
                <textarea
                  className="bg-bg-secondary border border-white/10 text-white text-sm placeholder-gray-500 focus:outline-none focus:border-accent-purple rounded-lg px-3 py-2 w-full min-h-[120px] resize-y"
                  placeholder="Enter client notes/context here..."
                  value={editingNotes}
                  onChange={(e) => setEditingNotes(e.target.value)}
                />
              </div>

              <div className="flex justify-end gap-2">
                <button
                  className="glass border border-white/10 hover:border-white/20 text-sm px-4 py-2 rounded-lg transition-all"
                  onClick={() => setEditingClientId(null)}
                >
                  Cancel
                </button>
                <button
                  className={`btn-gradient text-sm px-4 py-2 rounded-lg flex items-center gap-2 ${isSavingNotes ? 'opacity-50 cursor-not-allowed' : ''}`}
                  onClick={saveClientDetails}
                  disabled={isSavingNotes}
                >
                  {isSavingNotes && <span className="loading loading-spinner loading-sm" />}
                  Save
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Import Clients Modal */}
      {isModalOpen && (
        <>
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50" onClick={() => { setIsModalOpen(false); setSelectedImportIds([]); setImportSearchQuery(''); }} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
            <div className="card-elevated w-full max-w-5xl max-h-[90vh] flex flex-col pointer-events-auto" onClick={e => e.stopPropagation()}>
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-bold text-lg text-white">Import Clients from Trainerize</h3>
                  <button onClick={() => { setIsModalOpen(false); setSelectedImportIds([]); setImportSearchQuery(''); }} className="text-gray-400 hover:text-white">
                    <X className="h-5 w-5" />
                  </button>
                </div>
                <input
                  type="text"
                  placeholder="Search Trainerize clients..."
                  className="bg-bg-secondary border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-accent-purple rounded-lg px-4 py-2 w-full"
                  value={importSearchQuery}
                  onChange={(e) => setImportSearchQuery(e.target.value)}
                />
              </div>

              <div className="overflow-x-auto overflow-y-auto flex-1 px-6">
                <table className="table w-full">
                  <thead>
                    <tr>
                      <th className="text-gray-400">
                        <label>
                          <input
                            type="checkbox"
                            className="checkbox border-white/20 [--chkbg:theme(colors.accent-purple)] [--chkfg:white] checked:border-accent-purple"
                            checked={filteredTrainerizeClients.length > 0 && filteredTrainerizeClients.every(c => selectedImportIds.includes(c.id))}
                            onChange={(e) => {
                              if (e.target.checked) {
                                const newIds = new Set([...selectedImportIds]);
                                filteredTrainerizeClients.forEach(c => newIds.add(c.id));
                                setSelectedImportIds(Array.from(newIds));
                              } else {
                                const filteredIds = new Set(filteredTrainerizeClients.map(c => c.id));
                                setSelectedImportIds(selectedImportIds.filter(id => !filteredIds.has(id)));
                              }
                            }}
                          />
                        </label>
                      </th>
                      <th className="text-gray-400">Name</th>
                      <th className="text-gray-400">Email</th>
                      <th className="text-gray-400">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredTrainerizeClients.map((client) => (
                      <tr key={client.id} className="hover:bg-white/5">
                        <td>
                          <label>
                            <input
                              type="checkbox"
                              className="checkbox border-white/20 [--chkbg:theme(colors.accent-purple)] [--chkfg:white] checked:border-accent-purple"
                              checked={selectedImportIds.includes(client.id)}
                              onChange={() => setSelectedImportIds(prev =>
                                prev.includes(client.id) ? prev.filter(id => id !== client.id) : [...prev, client.id]
                              )}
                            />
                          </label>
                        </td>
                        <td className="text-white">{client.first_name} {client.last_name}</td>
                        <td className="text-gray-300">{client.email}</td>
                        <td>
                          <span className="text-gray-500">Not Imported</span>
                        </td>
                      </tr>
                    ))}
                    {filteredTrainerizeClients.length === 0 && (
                      <tr><td colSpan={4} className="text-center py-4 text-gray-400">No clients found</td></tr>
                    )}
                  </tbody>
                </table>
              </div>

              <div className="flex justify-end gap-2 p-6 border-t border-white/10">
                <button
                  className={`btn-gradient px-6 py-3 rounded-lg font-medium ${isImporting ? 'opacity-50 cursor-not-allowed' : ''} flex items-center gap-2`}
                  onClick={handleImportClients}
                  disabled={isImporting || selectedImportIds.length === 0}
                >
                  {isImporting && <span className="loading loading-spinner loading-sm" />}
                  Import Selected ({selectedImportIds.length})
                </button>
                <button
                  className="glass border border-white/10 hover:border-white/20 px-6 py-3 rounded-lg font-medium transition-all"
                  onClick={() => { setIsModalOpen(false); setSelectedImportIds([]); setImportSearchQuery(''); }}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
