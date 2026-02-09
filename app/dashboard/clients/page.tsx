"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/libs/supabase/client';
import { toast } from 'sonner';
import Link from 'next/link';
import {
  Upload, Edit2, Search, Users, CheckCircle2, AlertTriangle,
  AlertCircle, CircleDashed, Trash2, X, Eye, MoreHorizontal,
  TrendingUp, TrendingDown, Minus, ChevronLeft, ChevronRight
} from 'lucide-react';
import GoalBadge from '@/components/GoalBadge';
import type { ClientStatus } from '@/lib/client-status';

interface DashboardClient {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  goal: 'fat_loss' | 'maintenance' | 'muscle_gain' | null;
  notes: string | null;
  created_at: string;
  status: {
    status: ClientStatus;
    summary: string;
    metrics: {
      latestWeight: number | null;
      weightChange: number | null;
      avgCalories: number | null;
      avgProtein: number | null;
      avgDailySteps: number | null;
      avgSleep: number | null;
      totalWorkouts: number;
      workoutDays: number;
    };
    lastReportDate: string | null;
    reportDateRange: { start: string; end: string } | null;
  };
}

interface DashboardStats {
  total: number;
  onTrack: number;
  watch: number;
  needsAttention: number;
  noData: number;
}

interface TrainerizeClient {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
}

type StatusFilter = 'all' | ClientStatus;
type GoalFilter = 'all' | 'fat_loss' | 'maintenance' | 'muscle_gain' | 'none';
type SortOption = 'attention' | 'alpha' | 'recent';

const STATUS_CONFIG = {
  on_track: { label: 'On Track', icon: CheckCircle2, color: 'text-green-400', bg: 'bg-green-500/20', border: 'border-green-500/30', dot: 'bg-green-400' },
  watch: { label: 'Watch', icon: AlertTriangle, color: 'text-yellow-400', bg: 'bg-yellow-500/20', border: 'border-yellow-500/30', dot: 'bg-yellow-400' },
  needs_attention: { label: 'Needs Attention', icon: AlertCircle, color: 'text-red-400', bg: 'bg-red-500/20', border: 'border-red-500/30', dot: 'bg-red-400' },
  no_data: { label: 'No Data', icon: CircleDashed, color: 'text-gray-400', bg: 'bg-gray-500/20', border: 'border-gray-500/30', dot: 'bg-gray-500' },
};

export default function ClientsPage() {
  const supabase = createClient();

  const [clients, setClients] = useState<DashboardClient[]>([]);
  const [stats, setStats] = useState<DashboardStats>({ total: 0, onTrack: 0, watch: 0, needsAttention: 0, noData: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [goalFilter, setGoalFilter] = useState<GoalFilter>('all');
  const [sortOption, setSortOption] = useState<SortOption>('attention');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

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
  const [editingGoal, setEditingGoal] = useState<DashboardClient['goal']>(null);
  const [isSavingNotes, setIsSavingNotes] = useState(false);

  // Step 1: Load clients from Supabase (same pattern as old working code)
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

      if (error) throw error;

      const defaultStatus: DashboardClient['status'] = {
        status: 'no_data',
        summary: '',
        metrics: { latestWeight: null, weightChange: null, avgCalories: null, avgProtein: null, avgDailySteps: null, avgSleep: null, totalWorkouts: 0, workoutDays: 0 },
        lastReportDate: null,
        reportDateRange: null,
      };

      const dashClients: DashboardClient[] = (data || []).map(c => ({
        id: c.id,
        first_name: c.first_name,
        last_name: c.last_name,
        email: c.email,
        goal: c.goal,
        notes: c.notes,
        created_at: c.created_at,
        status: defaultStatus,
      }));

      setClients(dashClients);
      setStats({ total: dashClients.length, onTrack: 0, watch: 0, needsAttention: 0, noData: dashClients.length });
    } catch (error) {
      console.error('Error fetching clients:', error);
      toast.error('Failed to fetch clients');
    } finally {
      setIsLoading(false);
    }
  }, [supabase]);

  // Step 2: Enrich with status data from API (runs after clients load)
  const enrichWithStatus = useCallback(async () => {
    try {
      const response = await fetch('/api/clients/dashboard');
      if (!response.ok) return;
      const data = await response.json();
      if (data.clients) {
        setClients(data.clients);
        setStats(data.stats);
      }
    } catch (error) {
      console.error('Status enrichment failed:', error);
      // Silently fail — clients are already displayed
    }
  }, []);

  useEffect(() => {
    fetchClients();
  }, [fetchClients]);

  // Enrich after clients load
  useEffect(() => {
    if (!isLoading && clients.length > 0) {
      enrichWithStatus();
    }
  }, [isLoading, clients.length, enrichWithStatus]);

  // Filter and sort
  const filteredClients = clients
    .filter(client => {
      const matchesSearch = searchQuery === '' ||
        `${client.first_name} ${client.last_name}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
        client.email.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === 'all' || client.status.status === statusFilter;
      const matchesGoal = goalFilter === 'all' ||
        (goalFilter === 'none' ? client.goal === null : client.goal === goalFilter);
      return matchesSearch && matchesStatus && matchesGoal;
    })
    .sort((a, b) => {
      if (sortOption === 'attention') {
        const priority: Record<ClientStatus, number> = { needs_attention: 0, watch: 1, no_data: 2, on_track: 3 };
        return priority[a.status.status] - priority[b.status.status];
      }
      if (sortOption === 'alpha') {
        return a.first_name.localeCompare(b.first_name);
      }
      // recent: by last report date
      const aDate = a.status.lastReportDate ? new Date(a.status.lastReportDate).getTime() : 0;
      const bDate = b.status.lastReportDate ? new Date(b.status.lastReportDate).getTime() : 0;
      return bDate - aDate;
    });

  const totalPages = Math.ceil(filteredClients.length / itemsPerPage);
  const currentClients = filteredClients.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

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

      if (selectedTrainerizeClients.length === 0) {
        throw new Error('No clients selected');
      }

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
      setStats(prev => ({ ...prev, total: prev.total - 1 }));
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

  const timeAgo = (dateStr: string) => {
    const now = new Date();
    const date = new Date(dateStr);
    const days = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    if (days === 0) return 'today';
    if (days === 1) return 'yesterday';
    if (days < 7) return `${days}d ago`;
    return `${Math.floor(days / 7)}w ago`;
  };

  const filteredTrainerizeClients = trainerizeClients.filter(client =>
    `${client.first_name} ${client.last_name}`.toLowerCase().includes(importSearchQuery.toLowerCase()) ||
    client.email.toLowerCase().includes(importSearchQuery.toLowerCase())
  );

  if (isLoading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <span className="loading loading-spinner loading-lg text-accent-purple" />
      </div>
    );
  }

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

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const WeightTrend = ({ change, goal }: { change: number | null; goal: DashboardClient['goal'] }) => {
    if (change === null) return <span className="text-gray-500 text-xs">—</span>;
    const isPositive = change > 0;
    const isNegative = change < 0;
    const isNeutral = Math.abs(change) < 0.2;

    // Determine if the trend is "good" based on goal
    let trendGood = isNeutral;
    if (goal === 'fat_loss') trendGood = isNegative;
    else if (goal === 'muscle_gain') trendGood = isPositive;

    const Icon = isNeutral ? Minus : isPositive ? TrendingUp : TrendingDown;
    const colorClass = trendGood ? 'text-green-400' : isNeutral ? 'text-gray-400' : 'text-orange-400';

    return (
      <div className={`flex items-center gap-1 ${colorClass}`}>
        <Icon className="h-3.5 w-3.5" />
        <span className="text-xs font-medium">
          {isPositive ? '+' : ''}{change.toFixed(1)} lbs
        </span>
      </div>
    );
  };

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
            { key: 'onTrack' as const, status: 'on_track' as ClientStatus, count: stats.onTrack },
            { key: 'watch' as const, status: 'watch' as ClientStatus, count: stats.watch },
            { key: 'needsAttention' as const, status: 'needs_attention' as ClientStatus, count: stats.needsAttention },
            { key: 'noData' as const, status: 'no_data' as ClientStatus, count: stats.noData },
          ]).map(({ key, status, count }) => {
            const config = STATUS_CONFIG[status];
            const Icon = config.icon;
            const isActive = statusFilter === status;
            return (
              <button
                key={key}
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
            <option value="recent">Recent Reports</option>
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
                <th className="text-left text-xs font-medium text-gray-400 uppercase tracking-wider px-4 py-3 hidden md:table-cell">Last Report</th>
                <th className="text-left text-xs font-medium text-gray-400 uppercase tracking-wider px-4 py-3 hidden sm:table-cell">Goal</th>
                <th className="text-left text-xs font-medium text-gray-400 uppercase tracking-wider px-4 py-3 hidden lg:table-cell">Trend</th>
                <th className="text-left text-xs font-medium text-gray-400 uppercase tracking-wider px-4 py-3 hidden lg:table-cell">Summary</th>
                <th className="text-left text-xs font-medium text-gray-400 uppercase tracking-wider px-4 py-3">Status</th>
                <th className="text-right text-xs font-medium text-gray-400 uppercase tracking-wider px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {currentClients.map((client) => {
                const config = STATUS_CONFIG[client.status.status];
                const { metrics } = client.status;
                const fullName = `${client.first_name} ${client.last_name}`;

                return (
                  <tr
                    key={client.id}
                    className="hover:bg-white/[0.03] transition-colors group"
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

                    {/* Last report */}
                    <td className="px-4 py-3 hidden md:table-cell">
                      {client.status.lastReportDate ? (
                        <div>
                          <p className="text-sm text-gray-300">{formatDate(client.status.lastReportDate)}</p>
                          <p className="text-xs text-gray-500">{timeAgo(client.status.lastReportDate)}</p>
                        </div>
                      ) : (
                        <span className="text-xs text-gray-500">No reports</span>
                      )}
                    </td>

                    {/* Goal */}
                    <td className="px-4 py-3 hidden sm:table-cell">
                      <GoalBadge goal={client.goal} />
                    </td>

                    {/* Weight trend */}
                    <td className="px-4 py-3 hidden lg:table-cell">
                      <WeightTrend change={metrics.weightChange} goal={client.goal} />
                    </td>

                    {/* Summary */}
                    <td className="px-4 py-3 hidden lg:table-cell">
                      <p className={`text-xs ${config.color} max-w-[200px] truncate`} title={client.status.summary}>
                        {client.status.summary || '—'}
                      </p>
                    </td>

                    {/* Status badge */}
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${config.bg} ${config.color} border ${config.border}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${config.dot}`} />
                        {config.label}
                      </span>
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
                  onChange={(e) => setEditingGoal(e.target.value as DashboardClient['goal'])}
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
