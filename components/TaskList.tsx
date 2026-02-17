"use client";

import React, { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import {
  Sparkles,
  Check,
  X,
  Play,
  Trash2,
  ChevronDown,
  Dumbbell,
  Apple,
  Heart,
  Brain,
  Leaf,
  Circle,
} from "lucide-react";

interface Task {
  id: string;
  title: string;
  description: string | null;
  rationale: string | null;
  category: string;
  priority: string;
  status: string;
  due_date: string | null;
  created_at: string;
}

const CATEGORY_CONFIG: Record<string, { label: string; icon: typeof Dumbbell; color: string; bg: string }> = {
  training: { label: "Training", icon: Dumbbell, color: "text-blue-600", bg: "bg-blue-50" },
  nutrition: { label: "Nutrition", icon: Apple, color: "text-green-600", bg: "bg-green-50" },
  recovery: { label: "Recovery", icon: Heart, color: "text-rose-600", bg: "bg-rose-50" },
  mindset: { label: "Mindset", icon: Brain, color: "text-purple-600", bg: "bg-purple-50" },
  lifestyle: { label: "Lifestyle", icon: Leaf, color: "text-emerald-600", bg: "bg-emerald-50" },
  general: { label: "General", icon: Circle, color: "text-gray-600", bg: "bg-gray-50" },
};

const PRIORITY_STYLES: Record<string, string> = {
  urgent: "bg-red-100 text-red-700 border-red-200",
  high: "bg-orange-100 text-orange-700 border-orange-200",
  medium: "bg-blue-100 text-blue-700 border-blue-200",
  low: "bg-gray-100 text-gray-600 border-gray-200",
};

interface TaskListProps {
  clientId: string;
  clientName: string;
  dateRange?: { from: string; to: string };
}

export default function TaskList({ clientId, clientName, dateRange }: TaskListProps) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isExpanded, setIsExpanded] = useState(true);
  const [showCompleted, setShowCompleted] = useState(false);

  const fetchTasks = useCallback(async () => {
    try {
      const res = await fetch(`/api/tasks?clientId=${clientId}`);
      if (!res.ok) throw new Error("Failed to fetch tasks");
      const data = await res.json();
      setTasks(data.tasks || []);
    } catch (error) {
      console.error("Error fetching tasks:", error);
    } finally {
      setIsLoading(false);
    }
  }, [clientId]);

  useEffect(() => { fetchTasks(); }, [fetchTasks]);

  const updateTaskStatus = async (taskId: string, status: string) => {
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status } : t));
    try {
      const res = await fetch("/api/tasks", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taskId, status }),
      });
      if (!res.ok) throw new Error("Failed to update");
    } catch {
      toast.error("Failed to update task");
      fetchTasks();
    }
  };

  const deleteTask = async (taskId: string) => {
    setTasks(prev => prev.filter(t => t.id !== taskId));
    try {
      const res = await fetch(`/api/tasks?id=${taskId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete");
    } catch {
      toast.error("Failed to delete task");
      fetchTasks();
    }
  };

  const generateTasks = async () => {
    setIsGenerating(true);
    try {
      const res = await fetch("/api/automations/generate-tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientId, dateRange }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to generate tasks");
      }
      toast.success("Tasks generated");
      fetchTasks();
    } catch (error) {
      console.error("Error generating tasks:", error);
      toast.error(error instanceof Error ? error.message : "Failed to generate tasks");
    } finally {
      setIsGenerating(false);
    }
  };

  const activeTasks = tasks.filter(t => t.status !== "completed" && t.status !== "dismissed");
  const completedTasks = tasks.filter(t => t.status === "completed" || t.status === "dismissed");

  return (
    <div className="card overflow-hidden">
      {/* Header */}
      <div
        className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-lg bg-blue-50">
            <Check className="h-4 w-4 text-blue-600" />
          </div>
          <h3 className="font-semibold text-gray-900 text-sm">Coaching Tasks</h3>
          {activeTasks.length > 0 && (
            <span className="text-[11px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full font-medium">
              {activeTasks.length}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={(e) => { e.stopPropagation(); generateTasks(); }}
            disabled={isGenerating}
            className="text-xs px-3 py-1.5 rounded-lg font-medium transition-all bg-blue-50 text-blue-700 hover:bg-blue-100 disabled:opacity-50 flex items-center gap-1.5"
          >
            {isGenerating ? (
              <div className="w-3 h-3 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
            ) : (
              <Sparkles className="h-3 w-3" />
            )}
            Generate Tasks
          </button>
          <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform ${isExpanded ? "rotate-180" : ""}`} />
        </div>
      </div>

      {isExpanded && (
        <div className="border-t border-gray-100">
          {isLoading ? (
            <div className="p-6 flex items-center justify-center">
              <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : activeTasks.length === 0 && completedTasks.length === 0 ? (
            <div className="p-6 text-center">
              <p className="text-xs text-gray-400 mb-3">
                No tasks yet. Generate AI-powered coaching tasks based on {clientName}&apos;s data.
              </p>
              <button
                onClick={generateTasks}
                disabled={isGenerating}
                className="text-xs px-4 py-2 rounded-lg font-medium bg-blue-50 text-blue-700 hover:bg-blue-100 disabled:opacity-50 inline-flex items-center gap-1.5"
              >
                {isGenerating ? (
                  <div className="w-3 h-3 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Sparkles className="h-3 w-3" />
                )}
                Generate Tasks
              </button>
            </div>
          ) : (
            <div>
              {/* Active tasks */}
              <ul className="divide-y divide-gray-50">
                {activeTasks.map(task => {
                  const cat = CATEGORY_CONFIG[task.category] || CATEGORY_CONFIG.general;
                  const CatIcon = cat.icon;
                  return (
                    <li key={task.id} className="p-3 hover:bg-gray-50/50 transition-colors group">
                      <div className="flex items-start gap-3">
                        <div className={`p-1 rounded ${cat.bg} mt-0.5`}>
                          <CatIcon className={`h-3.5 w-3.5 ${cat.color}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-0.5">
                            <span className="text-sm font-medium text-gray-900 truncate">{task.title}</span>
                            <span className={`text-[10px] px-1.5 py-0.5 rounded border font-medium ${PRIORITY_STYLES[task.priority] || PRIORITY_STYLES.medium}`}>
                              {task.priority}
                            </span>
                          </div>
                          {task.description && (
                            <p className="text-xs text-gray-500 line-clamp-2 mb-1">{task.description}</p>
                          )}
                          {task.rationale && (
                            <p className="text-[11px] text-gray-400 italic line-clamp-1">{task.rationale}</p>
                          )}
                        </div>
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                          {task.status === "pending" && (
                            <button
                              onClick={() => updateTaskStatus(task.id, "in_progress")}
                              className="p-1 rounded text-blue-500 hover:bg-blue-50"
                              title="Start"
                            >
                              <Play className="h-3.5 w-3.5" />
                            </button>
                          )}
                          <button
                            onClick={() => updateTaskStatus(task.id, "completed")}
                            className="p-1 rounded text-green-500 hover:bg-green-50"
                            title="Complete"
                          >
                            <Check className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => updateTaskStatus(task.id, "dismissed")}
                            className="p-1 rounded text-gray-400 hover:bg-gray-100"
                            title="Dismiss"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => deleteTask(task.id)}
                            className="p-1 rounded text-red-400 hover:bg-red-50"
                            title="Delete"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>

              {/* Completed tasks toggle */}
              {completedTasks.length > 0 && (
                <div className="border-t border-gray-100">
                  <button
                    onClick={() => setShowCompleted(!showCompleted)}
                    className="w-full px-3 py-2 text-xs text-gray-400 hover:text-gray-600 hover:bg-gray-50 transition-colors flex items-center gap-1"
                  >
                    <ChevronDown className={`h-3 w-3 transition-transform ${showCompleted ? "rotate-180" : ""}`} />
                    {completedTasks.length} completed/dismissed
                  </button>
                  {showCompleted && (
                    <ul className="divide-y divide-gray-50">
                      {completedTasks.map(task => {
                        const cat = CATEGORY_CONFIG[task.category] || CATEGORY_CONFIG.general;
                        const CatIcon = cat.icon;
                        return (
                          <li key={task.id} className="p-3 opacity-50">
                            <div className="flex items-center gap-3">
                              <div className={`p-1 rounded ${cat.bg}`}>
                                <CatIcon className={`h-3.5 w-3.5 ${cat.color}`} />
                              </div>
                              <span className="text-sm text-gray-500 line-through truncate flex-1">{task.title}</span>
                              <span className="text-[10px] text-gray-400">{task.status}</span>
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
