"use client";

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { createClient } from '@/libs/supabase/client';
import { toast } from 'sonner';
import Link from 'next/link';
import {
  Upload, Edit2, Search, Users, CheckCircle2, AlertTriangle,
  AlertCircle, Star, Trash2, X, Eye, ChevronLeft, ChevronRight, ChevronDown,
  Flame, Scale, TrendingUp, Database,
  Trophy, Clock, Activity
} from 'lucide-react';
import type { ClientStatusResult } from '@/lib/client-status';

type ManualStatus = 'on_track' | 'watch' | 'needs_attention' | 'new';

interface DashboardClient {
  id: string;
  first_name: string;
  last_name: string;
  email: string | null;
  goal: 'fat_loss' | 'maintenance' | 'muscle_gain' | null;
  notes: string | null;
  created_at: string;
  manual_status: ManualStatus;
  computed: ClientStatusResult;
}

interface TrainerizeClient {
  id: string;
  first_name: string;
  last_name: string;
  email: string | null;
}

type StatusFilter = 'all' | ManualStatus | 'no_data';
type GoalFilter = 'all' | 'fat_loss' | 'maintenance' | 'muscle_gain' | 'none';
type SortOption = 'attention' | 'computed' | 'alpha' | 'newest';
type GoalType = 'fat_loss' | 'maintenance' | 'muscle_gain' | null;

const STATUS_CONFIG: Record<ManualStatus, { label: string; icon: typeof CheckCircle2; color: string; bg: string; border: string; dot: string }> = {
  on_track: { label: 'On Track', icon: CheckCircle2, color: 'text-green-600', bg: 'bg-green-50', border: 'border-green-200', dot: 'bg-green-500' },
  watch: { label: 'Watch', icon: AlertTriangle, color: 'text-yellow-600', bg: 'bg-yellow-50', border: 'border-yellow-200', dot: 'bg-yellow-500' },
  needs_attention: { label: 'Needs Attention', icon: AlertCircle, color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-200', dot: 'bg-red-500' },
  new: { label: 'New', icon: Star, color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-200', dot: 'bg-blue-500' },
};

const STATUS_OPTIONS: ManualStatus[] = ['on_track', 'watch', 'needs_attention', 'new'];

const GOAL_CONFIG: Record<string, { label: string; icon: typeof Flame; color: string; bg: string; border: string; dot: string }> = {
  fat_loss: { label: 'Fat Loss', icon: Flame, color: 'text-orange-600', bg: 'bg-orange-50', border: 'border-orange-200', dot: 'bg-orange-500' },
  maintenance: { label: 'Maintenance', icon: Scale, color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-200', dot: 'bg-blue-500' },
  muscle_gain: { label: 'Muscle Gain', icon: TrendingUp, color: 'text-green-600', bg: 'bg-green-50', border: 'border-green-200', dot: 'bg-green-500' },
  none: { label: 'Not Set', icon: Scale, color: 'text-gray-500', bg: 'bg-gray-50', border: 'border-gray-200', dot: 'bg-gray-400' },
};

const GOAL_OPTIONS: { value: GoalType; key: string }[] = [
  { value: 'fat_loss', key: 'fat_loss' },
  { value: 'maintenance', key: 'maintenance' },
  { value: 'muscle_gain', key: 'muscle_gain' },
  { value: null, key: 'none' },
];

const getInitials = (first: string, last: string) =>
  `${first.charAt(0)}${last.charAt(0)}`.toUpperCase();

const avatarColors = [
  'bg-purple-100 text-purple-600',
  'bg-blue-100 text-blue-600',
  'bg-emerald-100 text-emerald-600',
  'bg-amber-100 text-amber-600',
  'bg-rose-100 text-rose-600',
  'bg-cyan-100 text-cyan-600',
];

const getAvatarColor = (name: string) => {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return avatarColors[Math.abs(hash) % avatarColors.length];
};

// --- Alert system ---
interface DashboardAlert {
  id: string;
  type: 'weight' | 'inactivity' | 'win' | 'overdue';
  severity: 'success' | 'warning' | 'danger';
  clientId: string;
  clientName: string;
  message: string;
}

function generateAlerts(clients: DashboardClient[]): DashboardAlert[] {
  const alerts: DashboardAlert[] = [];

  for (const client of clients) {
    const name = `${client.first_name} ${client.last_name}`;
    const { metrics, status, lastReportDate } = client.computed;

    if (status === 'no_data') continue;

    // Weight spike/drop (> 3 lbs)
    if (metrics.weightChange !== null && Math.abs(metrics.weightChange) > 3) {
      const dir = metrics.weightChange > 0 ? 'up' : 'down';
      const abs = Math.abs(metrics.weightChange).toFixed(1);
      const isGood = (client.goal === 'fat_loss' && dir === 'down') ||
                     (client.goal === 'muscle_gain' && dir === 'up');
      alerts.push({
        id: `weight-${client.id}`,
        type: 'weight',
        severity: isGood ? 'success' : 'danger',
        clientId: client.id,
        clientName: name,
        message: isGood
          ? `${client.first_name} is ${dir} ${abs} lbs — great progress!`
          : `${client.first_name}'s weight ${dir === 'up' ? 'jumped' : 'dropped'} ${abs} lbs this period`,
      });
    }

    // Inactivity (has data but 0 workouts)
    if (metrics.totalWorkouts === 0) {
      alerts.push({
        id: `inactive-${client.id}`,
        type: 'inactivity',
        severity: 'warning',
        clientId: client.id,
        clientName: name,
        message: `${client.first_name} hasn't logged any workouts`,
      });
    }

    // Wins (5+ workouts or high protein)
    if (metrics.totalWorkouts >= 5) {
      alerts.push({
        id: `win-workouts-${client.id}`,
        type: 'win',
        severity: 'success',
        clientId: client.id,
        clientName: name,
        message: `${client.first_name} crushed ${metrics.totalWorkouts} workouts this period`,
      });
    }

    // Overdue check-in (> 14 days since last report)
    if (lastReportDate) {
      const daysSince = Math.floor((Date.now() - new Date(lastReportDate).getTime()) / (1000 * 60 * 60 * 24));
      if (daysSince > 14) {
        alerts.push({
          id: `overdue-${client.id}`,
          type: 'overdue',
          severity: 'warning',
          clientId: client.id,
          clientName: name,
          message: `${client.first_name} hasn't been reviewed in ${daysSince} days`,
        });
      }
    }
  }

  // Sort: danger first, then warning, then success
  const severityOrder: Record<string, number> = { danger: 0, warning: 1, success: 2 };
  alerts.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

  return alerts;
}

const ALERT_STYLES: Record<string, { bg: string; border: string; text: string; icon: typeof AlertCircle }> = {
  danger: { bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-700', icon: AlertCircle },
  warning: { bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-700', icon: Clock },
  success: { bg: 'bg-green-50', border: 'border-green-200', text: 'text-green-700', icon: Trophy },
};

export default function ClientsPage() {
  const supabase = createClient();

  const [clients, setClients] = useState<DashboardClient[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [goalFilter, setGoalFilter] = useState<GoalFilter>('all');
  const [sortOption, setSortOption] = useState<SortOption>('attention');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;
  const [dismissedAlertIds, setDismissedAlertIds] = useState<Set<string>>(new Set());
  const [isAlertsExpanded, setIsAlertsExpanded] = useState(true);

  const [statusDropdownId, setStatusDropdownId] = useState<string | null>(null);
  const [goalDropdownId, setGoalDropdownId] = useState<string | null>(null);
  const statusDropdownRef = useRef<HTMLDivElement>(null);
  const goalDropdownRef = useRef<HTMLDivElement>(null);

  const [trainerizeClients, setTrainerizeClients] = useState<TrainerizeClient[]>([]);
  const [importSearchQuery, setImportSearchQuery] = useState('');
  const [selectedImportIds, setSelectedImportIds] = useState<string[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [isFetchingTrainerize, setIsFetchingTrainerize] = useState(false);

  const [deletingClientId, setDeletingClientId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const [editingClientId, setEditingClientId] = useState<string | null>(null);
  const [editingNotes, setEditingNotes] = useState('');
  const [editingGoal, setEditingGoal] = useState<GoalType>(null);
  const [isSavingNotes, setIsSavingNotes] = useState(false);

  const fetchClients = useCallback(async () => {
    try {
      // Validate auth session first (required for RLS)
      const { data: profile } = await supabase.auth.getUser();
      if (!profile.user) throw new Error('No user found');

      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .eq('active', true)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const NO_DATA_COMPUTED: ClientStatusResult = {
        status: 'no_data',
        summary: '',
        metrics: { latestWeight: null, weightChange: null, avgCalories: null, avgProtein: null, avgDailySteps: null, avgSleep: null, totalWorkouts: 0, scheduledWorkouts: 0, workoutDays: 0 },
        lastReportDate: null,
        reportDateRange: null,
      };

      setClients((data || []).map(c => ({
        id: c.id, first_name: c.first_name, last_name: c.last_name, email: c.email,
        goal: c.goal, notes: c.notes, created_at: c.created_at,
        manual_status: (c.status || 'new') as ManualStatus,
        computed: NO_DATA_COMPUTED,
      })));

      // Background: enrich with computed metrics from dashboard API
      fetch('/api/clients/dashboard')
        .then(res => res.ok ? res.json() : null)
        .then(dashData => {
          if (dashData?.clients?.length > 0) {
            setClients(dashData.clients);
          }
        })
        .catch(() => {}); // Silently fail — basic data is already loaded
    } catch (error) {
      console.error('Error fetching clients:', error);
      toast.error('Failed to fetch clients');
    } finally {
      setIsLoading(false);
    }
  }, [supabase]);

  useEffect(() => { fetchClients(); }, [fetchClients]);

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

  const stats = {
    total: clients.length,
    onTrack: clients.filter(c => c.manual_status === 'on_track').length,
    watch: clients.filter(c => c.manual_status === 'watch').length,
    needsAttention: clients.filter(c => c.manual_status === 'needs_attention').length,
    new: clients.filter(c => c.manual_status === 'new').length,
    noData: clients.filter(c => c.computed.status === 'no_data').length,
  };

  const alerts = React.useMemo(() =>
    generateAlerts(clients).filter(a => !dismissedAlertIds.has(a.id)),
    [clients, dismissedAlertIds]
  );

  const filteredClients = clients
    .filter(client => {
      const matchesSearch = searchQuery === '' ||
        `${client.first_name} ${client.last_name}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (client.email || '').toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === 'all' ||
        (statusFilter === 'no_data' ? client.computed.status === 'no_data' : client.manual_status === statusFilter);
      const matchesGoal = goalFilter === 'all' ||
        (goalFilter === 'none' ? client.goal === null : client.goal === goalFilter);
      return matchesSearch && matchesStatus && matchesGoal;
    })
    .sort((a, b) => {
      if (sortOption === 'attention') {
        const p: Record<ManualStatus, number> = { needs_attention: 0, watch: 1, new: 2, on_track: 3 };
        return p[a.manual_status] - p[b.manual_status];
      }
      if (sortOption === 'computed') {
        const p: Record<string, number> = { needs_attention: 0, watch: 1, no_data: 2, on_track: 3 };
        return (p[a.computed.status] ?? 4) - (p[b.computed.status] ?? 4);
      }
      if (sortOption === 'alpha') return a.first_name.localeCompare(b.first_name);
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

  const totalPages = Math.ceil(filteredClients.length / itemsPerPage);
  const currentClients = filteredClients.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const updateClientStatus = async (clientId: string, newStatus: ManualStatus) => {
    setStatusDropdownId(null);
    setClients(prev => prev.map(c => c.id === clientId ? { ...c, manual_status: newStatus } : c));
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
      fetchClients();
    }
  };

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

  const fetchTrainerizeClients = async () => {
    setIsFetchingTrainerize(true);
    try {
      const response = await fetch('/api/trainerize/fetch-clients');
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to fetch clients');
      setTrainerizeClients((data.clients || []).map((c: any) => ({
        id: c.id, first_name: c.firstName, last_name: c.lastName, email: c.email,
      })));
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
      const selected = trainerizeClients.filter(c => selectedImportIds.includes(c.id));
      if (selected.length === 0) throw new Error('No clients selected');

      for (const client of selected) {
        const { error } = await supabase.from('clients').insert({
          trainer_id: user.id,
          first_name: client.first_name,
          last_name: client.last_name,
          email: client.email || null,
          trainerize_id: parseInt(client.id),
          active: true,
          status: 'new',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
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
          goal: editingGoal || null,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to update');
      setClients(prev => prev.map(c =>
        c.id === editingClientId ? { ...c, notes: editingNotes.trim() || null, goal: editingGoal || null } : c
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

  const filteredTrainerizeClients = trainerizeClients.filter(c =>
    `${c.first_name} ${c.last_name}`.toLowerCase().includes(importSearchQuery.toLowerCase()) ||
    (c.email || '').toLowerCase().includes(importSearchQuery.toLowerCase())
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-display font-bold text-gray-900">Clients</h1>
          <p className="text-gray-500 text-sm mt-1">
            {stats.total} client{stats.total !== 1 ? 's' : ''}
            {stats.needsAttention > 0 && (
              <span className="text-red-600 font-medium"> &middot; {stats.needsAttention} need{stats.needsAttention === 1 ? 's' : ''} attention</span>
            )}
          </p>
        </div>
        <button
          className="btn-primary text-sm px-4 py-2.5 rounded-lg flex items-center gap-2"
          onClick={fetchTrainerizeClients}
          disabled={isFetchingTrainerize}
        >
          <Upload className="h-4 w-4" />
          {isFetchingTrainerize ? 'Loading...' : 'Import Clients'}
        </button>
      </div>

      {/* Stats cards */}
      {stats.total > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-6">
          {([
            { key: 'on_track' as const, count: stats.onTrack, cfg: STATUS_CONFIG.on_track },
            { key: 'watch' as const, count: stats.watch, cfg: STATUS_CONFIG.watch },
            { key: 'needs_attention' as const, count: stats.needsAttention, cfg: STATUS_CONFIG.needs_attention },
            { key: 'new' as const, count: stats.new, cfg: STATUS_CONFIG.new },
            { key: 'no_data' as const, count: stats.noData, cfg: { label: 'No Data', icon: Database, color: 'text-gray-500', bg: 'bg-gray-50', border: 'border-gray-200', dot: 'bg-gray-400' } },
          ]).map(({ key, count, cfg }) => {
            const Icon = cfg.icon;
            const isActive = statusFilter === key;
            return (
              <button
                key={key}
                onClick={() => { setStatusFilter(isActive ? 'all' : key); setCurrentPage(1); }}
                className={`card p-3 text-left transition-all ${isActive ? `ring-2 ${cfg.border} ring-current/20` : 'hover:shadow-md hover:border-gray-300'}`}
              >
                <div className="flex items-center gap-2.5">
                  <div className={`p-1.5 rounded-lg ${cfg.bg}`}>
                    <Icon className={`h-4 w-4 ${cfg.color}`} />
                  </div>
                  <div>
                    <span className={`text-xl font-bold ${cfg.color}`}>{count}</span>
                    <p className="text-[11px] text-gray-500 leading-tight">{cfg.label}</p>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* Alerts */}
      {alerts.length > 0 && (
        <div className="mb-4">
          <button
            onClick={() => setIsAlertsExpanded(!isAlertsExpanded)}
            className="flex items-center gap-2 mb-2 text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
          >
            <Activity className="h-4 w-4" />
            <span>{alerts.length} alert{alerts.length !== 1 ? 's' : ''}</span>
            <ChevronDown className={`h-3.5 w-3.5 transition-transform ${isAlertsExpanded ? 'rotate-180' : ''}`} />
          </button>
          {isAlertsExpanded && (
            <div className="space-y-2">
              {alerts.slice(0, 8).map(alert => {
                const style = ALERT_STYLES[alert.severity];
                const AlertIcon = style.icon;
                return (
                  <div
                    key={alert.id}
                    className={`flex items-center justify-between px-3 py-2 rounded-lg border ${style.bg} ${style.border}`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <AlertIcon className={`h-3.5 w-3.5 shrink-0 ${style.text}`} />
                      <Link
                        href={`/dashboard/clients/${alert.clientId}/reports`}
                        className={`text-sm ${style.text} hover:underline truncate`}
                      >
                        {alert.message}
                      </Link>
                    </div>
                    <button
                      onClick={() => setDismissedAlertIds(prev => new Set([...prev, alert.id]))}
                      className="p-0.5 text-gray-400 hover:text-gray-600 shrink-0 ml-2"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                );
              })}
              {alerts.length > 8 && (
                <p className="text-xs text-gray-400 pl-1">+{alerts.length - 8} more alerts</p>
              )}
            </div>
          )}
        </div>
      )}

      {/* Search + filters */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search by name or email..."
            className="input-field pl-9 text-sm"
            value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
          />
        </div>
        <select
          className="input-field w-auto text-sm"
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
          className="input-field w-auto text-sm"
          value={sortOption}
          onChange={(e) => setSortOption(e.target.value as SortOption)}
        >
          <option value="attention">Status: Needs Attention First</option>
          <option value="computed">Data: Most Concerns First</option>
          <option value="alpha">Alphabetical</option>
          <option value="newest">Newest First</option>
        </select>
      </div>

      {/* Client table */}
      <div className="card">
        <div className="overflow-x-visible">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-3">Client</th>
                <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-3 hidden sm:table-cell">Goal</th>
                <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-3">Status</th>
                <th className="text-right text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {currentClients.map((client) => {
                const cfg = STATUS_CONFIG[client.manual_status];
                const fullName = `${client.first_name} ${client.last_name}`;
                const { summary, status: computedStatus } = client.computed;

                return (
                  <tr key={client.id} className="hover:bg-gray-50/50 transition-colors group">
                    {/* Client name + computed summary */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-semibold flex-shrink-0 ${getAvatarColor(fullName)}`}>
                          {getInitials(client.first_name, client.last_name)}
                        </div>
                        <div className="min-w-0">
                          <Link
                            href={`/dashboard/clients/${client.id}/reports`}
                            className="font-medium text-gray-900 hover:text-blue-600 transition-colors text-sm block truncate"
                          >
                            {fullName}
                          </Link>
                          {computedStatus !== 'no_data' ? (
                            <p className="text-xs text-gray-400 truncate max-w-[260px]" title={summary}>
                              {summary}
                            </p>
                          ) : (
                            <p className="text-xs text-gray-300 truncate">{client.email || ''}</p>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Goal dropdown */}
                    <td className="px-4 py-3 hidden sm:table-cell">
                      <div className="relative" ref={goalDropdownId === client.id ? goalDropdownRef : undefined}>
                        {(() => {
                          const gc = GOAL_CONFIG[client.goal || 'none'];
                          const GoalIcon = gc.icon;
                          return (
                            <button
                              onClick={() => { setGoalDropdownId(goalDropdownId === client.id ? null : client.id); setStatusDropdownId(null); }}
                              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium cursor-pointer transition-all hover:shadow-sm ${gc.bg} ${gc.color} border ${gc.border}`}
                            >
                              <GoalIcon className="h-3 w-3" />
                              {gc.label}
                              <ChevronDown className="h-3 w-3 opacity-50" />
                            </button>
                          );
                        })()}
                        {goalDropdownId === client.id && (
                          <div className="absolute top-full left-0 mt-1 w-44 bg-white rounded-lg border border-gray-200 shadow-lg z-50">
                            {GOAL_OPTIONS.map(({ value, key }) => {
                              const gc = GOAL_CONFIG[key];
                              const GoalIcon = gc.icon;
                              const isSelected = (client.goal || 'none') === (value || 'none');
                              return (
                                <button
                                  key={key}
                                  onClick={() => updateClientGoal(client.id, value)}
                                  className={`flex items-center gap-2 w-full px-3 py-2 text-xs transition-colors hover:bg-gray-50 first:rounded-t-lg last:rounded-b-lg ${isSelected ? 'bg-gray-50' : ''}`}
                                >
                                  <GoalIcon className={`h-3 w-3 ${gc.color}`} />
                                  <span className={gc.color}>{gc.label}</span>
                                  {isSelected && <CheckCircle2 className="h-3 w-3 ml-auto text-blue-600" />}
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </td>

                    {/* Status dropdown */}
                    <td className="px-4 py-3">
                      <div className="relative" ref={statusDropdownId === client.id ? statusDropdownRef : undefined}>
                        <button
                          onClick={() => { setStatusDropdownId(statusDropdownId === client.id ? null : client.id); setGoalDropdownId(null); }}
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium cursor-pointer transition-all hover:shadow-sm ${cfg.bg} ${cfg.color} border ${cfg.border}`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
                          {cfg.label}
                          <ChevronDown className="h-3 w-3 opacity-50" />
                        </button>
                        {statusDropdownId === client.id && (
                          <div className="absolute top-full left-0 mt-1 w-44 bg-white rounded-lg border border-gray-200 shadow-lg z-50">
                            {STATUS_OPTIONS.map(s => {
                              const sc = STATUS_CONFIG[s];
                              return (
                                <button
                                  key={s}
                                  onClick={() => updateClientStatus(client.id, s)}
                                  className={`flex items-center gap-2 w-full px-3 py-2 text-xs transition-colors hover:bg-gray-50 first:rounded-t-lg last:rounded-b-lg ${client.manual_status === s ? 'bg-gray-50' : ''}`}
                                >
                                  <span className={`w-2 h-2 rounded-full ${sc.dot}`} />
                                  <span className={sc.color}>{sc.label}</span>
                                  {client.manual_status === s && <CheckCircle2 className="h-3 w-3 ml-auto text-blue-600" />}
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Link
                          href={`/dashboard/clients/${client.id}/reports`}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-all"
                          title="View Reports"
                        >
                          <Eye className="h-4 w-4" />
                        </Link>
                        <button
                          className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-all"
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
                          className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-all"
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

          {filteredClients.length === 0 && (
            <div className="p-12 text-center">
              <Users className="h-10 w-10 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 text-sm mb-4">
                {clients.length === 0
                  ? 'No clients imported yet.'
                  : 'No clients match your current filters.'}
              </p>
              {clients.length === 0 && (
                <button
                  className="btn-primary text-sm px-4 py-2 rounded-lg inline-flex items-center gap-2"
                  onClick={fetchTrainerizeClients}
                  disabled={isFetchingTrainerize}
                >
                  <Upload className="h-4 w-4" />
                  Import Clients
                </button>
              )}
            </div>
          )}
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200">
            <p className="text-xs text-gray-500">
              Showing {(currentPage - 1) * itemsPerPage + 1}–{Math.min(currentPage * itemsPerPage, filteredClients.length)} of {filteredClients.length}
            </p>
            <div className="flex items-center gap-1">
              <button
                className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
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
                      ? 'bg-blue-50 text-blue-600 border border-blue-200'
                      : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                  }`}
                  onClick={() => setCurrentPage(page)}
                >
                  {page}
                </button>
              ))}
              <button
                className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
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
          <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50" onClick={() => setDeletingClientId(null)} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
            <div className="card max-w-md w-full p-6 pointer-events-auto" onClick={e => e.stopPropagation()}>
              <h3 className="font-bold text-lg text-gray-900 mb-2">Confirm Delete</h3>
              <p className="text-gray-600 text-sm">
                Are you sure you want to delete {clients.find(c => c.id === deletingClientId)?.first_name} {clients.find(c => c.id === deletingClientId)?.last_name}?
                This will also delete all their reports. This action cannot be undone.
              </p>
              <div className="flex justify-end gap-2 mt-4">
                <button className="btn-secondary text-sm" onClick={() => setDeletingClientId(null)} disabled={isDeleting}>
                  Cancel
                </button>
                <button className="btn-danger text-sm flex items-center gap-2" onClick={confirmDelete} disabled={isDeleting}>
                  {isDeleting && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                  Delete
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Edit Notes Modal */}
      {editingClientId && (
        <>
          <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50" onClick={() => setEditingClientId(null)} />
          <div className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-20 pointer-events-none">
            <div className="card max-w-lg w-full p-6 pointer-events-auto" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-base text-gray-900">Edit Client Details</h3>
                <button onClick={() => setEditingClientId(null)} className="text-gray-400 hover:text-gray-600">
                  <X className="h-4 w-4" />
                </button>
              </div>
              <p className="text-sm text-gray-500 mb-4">
                {clients.find(c => c.id === editingClientId)?.first_name} {clients.find(c => c.id === editingClientId)?.last_name}
              </p>
              <div className="mb-3">
                <label className="text-sm font-medium text-gray-700 mb-1.5 block">Goal</label>
                <select
                  className="input-field text-sm"
                  value={editingGoal || ''}
                  onChange={(e) => setEditingGoal((e.target.value || null) as GoalType)}
                >
                  <option value="">Not Set</option>
                  <option value="fat_loss">Fat Loss</option>
                  <option value="maintenance">Maintenance</option>
                  <option value="muscle_gain">Muscle Gain</option>
                </select>
              </div>
              <div className="mb-4">
                <label className="text-sm font-medium text-gray-700 mb-1.5 block">Notes</label>
                <textarea
                  className="input-field text-sm min-h-[120px] resize-y"
                  placeholder="Enter client notes/context here..."
                  value={editingNotes}
                  onChange={(e) => setEditingNotes(e.target.value)}
                />
              </div>
              <div className="flex justify-end gap-2">
                <button className="btn-secondary text-sm" onClick={() => setEditingClientId(null)}>Cancel</button>
                <button className="btn-primary text-sm flex items-center gap-2" onClick={saveClientDetails} disabled={isSavingNotes}>
                  {isSavingNotes && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
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
          <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50" onClick={() => { setIsModalOpen(false); setSelectedImportIds([]); setImportSearchQuery(''); }} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
            <div className="card w-full max-w-2xl max-h-[90vh] flex flex-col pointer-events-auto" onClick={e => e.stopPropagation()}>
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-bold text-lg text-gray-900">Import Clients from Trainerize</h3>
                  <button onClick={() => { setIsModalOpen(false); setSelectedImportIds([]); setImportSearchQuery(''); }} className="text-gray-400 hover:text-gray-600">
                    <X className="h-5 w-5" />
                  </button>
                </div>
                <input
                  type="text"
                  placeholder="Search Trainerize clients..."
                  className="input-field text-sm"
                  value={importSearchQuery}
                  onChange={(e) => setImportSearchQuery(e.target.value)}
                />
              </div>
              <div className="overflow-y-auto flex-1">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200 bg-gray-50">
                      <th className="text-left px-4 py-3 w-10">
                        <input
                          type="checkbox"
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
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
                      </th>
                      <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-3">Name</th>
                      <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-3">Email</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredTrainerizeClients.map((client) => (
                      <tr key={client.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <input
                            type="checkbox"
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                            checked={selectedImportIds.includes(client.id)}
                            onChange={() => setSelectedImportIds(prev =>
                              prev.includes(client.id) ? prev.filter(id => id !== client.id) : [...prev, client.id]
                            )}
                          />
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900">{client.first_name} {client.last_name}</td>
                        <td className="px-4 py-3 text-sm text-gray-500">{client.email || '—'}</td>
                      </tr>
                    ))}
                    {filteredTrainerizeClients.length === 0 && (
                      <tr><td colSpan={3} className="text-center py-8 text-gray-400 text-sm">No clients found</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
              <div className="flex items-center justify-between p-6 border-t border-gray-200">
                <p className="text-sm text-gray-500">{selectedImportIds.length} selected</p>
                <div className="flex gap-2">
                  <button className="btn-secondary text-sm" onClick={() => { setIsModalOpen(false); setSelectedImportIds([]); setImportSearchQuery(''); }}>
                    Cancel
                  </button>
                  <button
                    className="btn-primary text-sm flex items-center gap-2"
                    onClick={handleImportClients}
                    disabled={isImporting || selectedImportIds.length === 0}
                  >
                    {isImporting && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                    Import Selected ({selectedImportIds.length})
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
