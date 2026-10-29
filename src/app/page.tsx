'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Sunrise, BookOpen, Brain, Dumbbell, Briefcase, UtensilsCrossed,
  HeartPulse, Moon, Sparkles, Plus, Pencil, Trash2, Check, CheckCheck,
  ListChecks, CheckCircle2, Clock3, Target, CalendarDays, Zap, Loader2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { useToast } from '@/hooks/use-toast'
import { cn } from '@/lib/utils'

// ---------------- Types ----------------
interface Task {
  id: string
  title: string
  time: string
  category: string
  completed: boolean
  date: string
  createdAt?: string
}

type FilterKey = 'all' | 'pending' | 'completed'

interface CategoryDef {
  id: string
  label: string
  emoji: string
  icon: React.ComponentType<{ className?: string }>
  bg: string
  text: string
}

// ---------------- Colourful category config ----------------
const CATEGORIES: CategoryDef[] = [
  { id: 'wakeup',  label: 'Wake Up',           emoji: '☀️', icon: Sunrise,         bg: 'bg-amber-500',   text: 'text-amber-600' },
  { id: 'read',    label: 'Reading',           emoji: '📚', icon: BookOpen,        bg: 'bg-emerald-500', text: 'text-emerald-600' },
  { id: 'skill',   label: 'Skill Development', emoji: '🧠', icon: Brain,           bg: 'bg-violet-600',  text: 'text-violet-600' },
  { id: 'fitness', label: 'Fitness',           emoji: '💪', icon: Dumbbell,        bg: 'bg-red-500',     text: 'text-red-500' },
  { id: 'work',    label: 'Work',              emoji: '💼', icon: Briefcase,       bg: 'bg-zinc-900',    text: 'text-zinc-900' },
  { id: 'meal',    label: 'Meal Time',         emoji: '🍽️', icon: UtensilsCrossed, bg: 'bg-orange-500',  text: 'text-orange-600' },
  { id: 'health',  label: 'Health',            emoji: '🧘', icon: HeartPulse,      bg: 'bg-pink-500',    text: 'text-pink-500' },
  { id: 'sleep',   label: 'Sleep',             emoji: '🌙', icon: Moon,            bg: 'bg-violet-900',  text: 'text-violet-800' },
  { id: 'other',   label: 'Other',             emoji: '✨', icon: Sparkles,        bg: 'bg-teal-500',    text: 'text-teal-600' },
]

const CATEGORY_MAP: Record<string, CategoryDef> = Object.fromEntries(
  CATEGORIES.map((c) => [c.id, c]),
)

function getCategory(id: string): CategoryDef {
  return CATEGORY_MAP[id] ?? CATEGORY_MAP['other']
}

// ---------------- Quick-add templates ----------------
const QUICK_TEMPLATES = [
  { title: 'Wake Up',           time: '06:30', category: 'wakeup' },
  { title: 'Morning Workout',   time: '07:00', category: 'fitness' },
  { title: 'Read a Book',       time: '20:00', category: 'read' },
  { title: 'Skill Development', time: '19:00', category: 'skill' },
  { title: 'Work Session',      time: '09:00', category: 'work' },
  { title: 'Sleep Early',       time: '22:30', category: 'sleep' },
]

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: 'all',       label: 'All' },
  { key: 'pending',   label: 'Pending' },
  { key: 'completed', label: 'Completed' },
]

// ---------------- Helpers ----------------
function todayStr(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function splitTime(time: string): { main: string; period: string } {
  const [h, m] = time.split(':').map(Number)
  const period = h >= 12 ? 'PM' : 'AM'
  const hour = h % 12 || 12
  return { main: `${hour}:${String(m).padStart(2, '0')}`, period }
}

function formatTime12h(time: string): string {
  const { main, period } = splitTime(time)
  return `${main} ${period}`
}

function sortTasks(a: Task, b: Task): number {
  return a.time.localeCompare(b.time) || (a.createdAt ?? '').localeCompare(b.createdAt ?? '')
}

// ---------------- Stat card ----------------
function StatCard({
  icon: Icon, label, value, className,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  value: number | string
  className?: string
}) {
  return (
    <div className={cn('rounded-2xl p-4 text-white shadow-md sm:p-5', className)}>
      <div className="flex items-center justify-between gap-2">
        <span className="text-3xl font-extrabold tabular-nums sm:text-4xl">{value}</span>
        <Icon className="h-6 w-6 shrink-0 opacity-80" aria-hidden />
      </div>
      <p className="mt-1 text-[11px] font-bold uppercase tracking-wider text-white/80 sm:text-xs">
        {label}
      </p>
    </div>
  )
}

// ---------------- Page ----------------
export default function Home() {
  const { toast } = useToast()
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<FilterKey>('all')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingTask, setEditingTask] = useState<Task | null>(null)
  const [deletingTask, setDeletingTask] = useState<Task | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [form, setForm] = useState({ title: '', time: '08:00', category: 'other' })
  const [mounted, setMounted] = useState(false)
  const [now, setNow] = useState<Date | null>(null)

  useEffect(() => {
    setMounted(true)
    setNow(new Date())
    const timer = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  const fetchTasks = useCallback(async () => {
    try {
      const res = await fetch(`/api/tasks?date=${todayStr()}`)
      if (!res.ok) throw new Error()
      const data = await res.json()
      setTasks((data.tasks ?? []).sort(sortTasks))
    } catch {
      toast({
        title: 'Could not load tasks',
        description: 'Please refresh the page and try again.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => {
    fetchTasks()
  }, [fetchTasks])

  // ------- Dialog & CRUD handlers -------
  const openAddDialog = () => {
    setEditingTask(null)
    setForm({ title: '', time: '08:00', category: 'other' })
    setDialogOpen(true)
  }

  const openEditDialog = (task: Task) => {
    setEditingTask(task)
    setForm({ title: task.title, time: task.time, category: task.category })
    setDialogOpen(true)
  }

  const handleSubmit = async () => {
    if (!form.title.trim()) {
      toast({
        title: 'Title required',
        description: 'Please give your task a name before saving.',
        variant: 'destructive',
      })
      return
    }
    setSubmitting(true)
    try {
      if (editingTask) {
        const res = await fetch(`/api/tasks/${editingTask.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(form),
        })
        if (!res.ok) throw new Error()
        const data = await res.json()
        setTasks((prev) => prev.map((t) => (t.id === data.task.id ? data.task : t)).sort(sortTasks))
        toast({ title: 'Task updated! ✏️', description: `"${data.task.title}" has been saved.` })
      } else {
        const res = await fetch('/api/tasks', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...form, date: todayStr() }),
        })
        if (!res.ok) throw new Error()
        const data = await res.json()
        setTasks((prev) => [...prev, data.task].sort(sortTasks))
        toast({
          title: 'Task added! 🎉',
          description: `"${data.task.title}" scheduled at ${formatTime12h(data.task.time)}.`,
        })
      }
      setDialogOpen(false)
    } catch {
      toast({
        title: 'Something went wrong',
        description: 'Your task could not be saved. Please try again.',
        variant: 'destructive',
      })
    } finally {
      setSubmitting(false)
    }
  }

  const toggleComplete = async (task: Task) => {
    const next = !task.completed
    setTasks((prev) => prev.map((t) => (t.id === task.id ? { ...t, completed: next } : t)))
    try {
      const res = await fetch(`/api/tasks/${task.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ completed: next }),
      })
      if (!res.ok) throw new Error()
      if (next) {
        toast({ title: 'Activity completed! ✅', description: `"${task.title}" — great job!` })
      }
    } catch {
      setTasks((prev) =>
        prev.map((t) => (t.id === task.id ? { ...t, completed: task.completed } : t)),
      )
      toast({
        title: 'Update failed',
        description: 'Could not mark this activity. Please try again.',
        variant: 'destructive',
      })
    }
  }

  const confirmDelete = async () => {
    if (!deletingTask) return
    const task = deletingTask
    setDeletingTask(null)
    setTasks((prev) => prev.filter((t) => t.id !== task.id))
    try {
      const res = await fetch(`/api/tasks/${task.id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error()
      toast({ title: 'Task deleted 🗑️', description: `"${task.title}" has been removed.` })
    } catch {
      setTasks((prev) => [...prev, task].sort(sortTasks))
      toast({
        title: 'Delete failed',
        description: 'Could not delete this task. Please try again.',
        variant: 'destructive',
      })
    }
  }

  const addTemplate = async (tpl: (typeof QUICK_TEMPLATES)[number]) => {
    if (tasks.some((t) => t.title.toLowerCase() === tpl.title.toLowerCase())) {
      toast({
        title: 'Already in your list',
        description: `"${tpl.title}" is already planned for today.`,
      })
      return
    }
    try {
      const res = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...tpl, date: todayStr() }),
      })
      if (!res.ok) throw new Error()
      const data = await res.json()
      setTasks((prev) => [...prev, data.task].sort(sortTasks))
      toast({
        title: 'Task added! 🎉',
        description: `"${data.task.title}" scheduled at ${formatTime12h(data.task.time)}.`,
      })
    } catch {
      toast({
        title: 'Something went wrong',
        description: 'Quick add failed. Please try again.',
        variant: 'destructive',
      })
    }
  }

  // ------- Derived stats -------
  const total = tasks.length
  const completedCount = tasks.filter((t) => t.completed).length
  const pendingCount = total - completedCount
  const progress = total === 0 ? 0 : Math.round((completedCount / total) * 100)

  const filteredTasks = useMemo(() => {
    if (filter === 'pending') return tasks.filter((t) => !t.completed)
    if (filter === 'completed') return tasks.filter((t) => t.completed)
    return tasks
  }, [tasks, filter])

  const progressMessage =
    total === 0
      ? 'Add your first activity to get started!'
      : progress === 100
        ? 'Perfect day! All activities completed! 🎉'
        : progress >= 50
          ? 'Almost there — keep it up! ⭐'
          : progress > 0
            ? 'Good start — keep going! 💪'
            : "Ready to crush the day? Let's go! 🚀"

  const clock = mounted && now
    ? now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true })
    : ''
  const dateLong = mounted && now
    ? now.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
    : ''

  return (
    <div className="flex min-h-screen flex-col bg-white text-zinc-900">
      {/* ---------------- Header ---------------- */}
      <header className="relative overflow-hidden bg-zinc-950 text-white">
        <div className="absolute -left-24 -top-24 h-72 w-72 rounded-full bg-violet-600/30 blur-3xl" aria-hidden />
        <div className="absolute -bottom-32 right-0 h-72 w-72 rounded-full bg-purple-600/20 blur-3xl" aria-hidden />
        <div className="absolute right-1/3 top-10 h-40 w-40 rounded-full bg-fuchsia-500/20 blur-3xl" aria-hidden />
        <div className="relative mx-auto flex max-w-5xl flex-col gap-6 px-4 py-8 sm:flex-row sm:items-center sm:justify-between sm:py-12">
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-violet-500/40 bg-violet-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-violet-300">
              <Zap className="h-3.5 w-3.5" aria-hidden /> Daily Planner
            </span>
            <h1 className="mt-3 text-4xl font-extrabold tracking-tight sm:text-5xl">
              Daily
              <span className="bg-gradient-to-r from-violet-400 to-fuchsia-400 bg-clip-text text-transparent">
                Flow
              </span>
            </h1>
            <p className="mt-2 max-w-md text-sm text-zinc-400 sm:text-base">
              Plan your day — wake up, read, develop skills — and track every activity to a
              perfect 100%.
            </p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 px-5 py-4 backdrop-blur">
            {mounted ? (
              <>
                <div className="flex items-center gap-2 text-sm text-zinc-300">
                  <CalendarDays className="h-4 w-4 text-violet-400" aria-hidden />
                  {dateLong}
                </div>
                <div className="mt-1 font-mono text-3xl font-bold tabular-nums text-white">
                  {clock}
                </div>
              </>
            ) : (
              <div className="h-[76px] w-56" aria-hidden />
            )}
          </div>
        </div>
      </header>

      {/* ---------------- Main ---------------- */}
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8">
        {/* Stats cards */}
        <section aria-label="Task statistics" className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          <StatCard
            icon={ListChecks}
            label="Total Tasks"
            value={total}
            className="bg-gradient-to-br from-violet-600 to-purple-700"
          />
          <StatCard
            icon={CheckCircle2}
            label="Completed"
            value={completedCount}
            className="bg-gradient-to-br from-emerald-500 to-green-600"
          />
          <StatCard
            icon={Clock3}
            label="Pending"
            value={pendingCount}
            className="bg-gradient-to-br from-orange-500 to-amber-600"
          />
          <StatCard
            icon={Target}
            label="Progress"
            value={`${progress}%`}
            className="bg-zinc-950"
          />
        </section>

        {/* Progress bar */}
        <section
          aria-label="Daily progress"
          className="mt-4 rounded-2xl border-2 border-zinc-200 bg-white p-5 shadow-sm sm:p-6"
        >
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-lg font-extrabold">Today&apos;s Progress</h2>
            <span className="rounded-full bg-violet-100 px-3 py-1 text-sm font-extrabold text-violet-700">
              {completedCount}/{total} done
            </span>
          </div>
          <div
            className="mt-4 h-4 w-full overflow-hidden rounded-full bg-violet-100"
            role="progressbar"
            aria-valuenow={progress}
            aria-valuemin={0}
            aria-valuemax={100}
          >
            <motion.div
              className="h-full rounded-full bg-gradient-to-r from-violet-600 via-purple-500 to-fuchsia-500"
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.6, ease: 'easeOut' }}
            />
          </div>
          <p className="mt-3 text-sm font-medium text-zinc-600">{progressMessage}</p>
        </section>

        {/* Quick add */}
        <section aria-label="Quick add activities" className="mt-8">
          <h2 className="flex items-center gap-2 text-lg font-extrabold">
            <Sparkles className="h-5 w-5 text-violet-600" aria-hidden />
            Quick Add Activities
          </h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {QUICK_TEMPLATES.map((tpl) => {
              const cat = getCategory(tpl.category)
              return (
                <button
                  key={tpl.title}
                  type="button"
                  onClick={() => addTemplate(tpl)}
                  className={cn(
                    'inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-bold text-white shadow-sm transition-all hover:scale-105 hover:shadow-md active:scale-95',
                    cat.bg,
                  )}
                >
                  <span aria-hidden>{tpl.emoji}</span>
                  {tpl.title}
                  <span className="rounded-full bg-white/20 px-1.5 py-0.5 text-[10px] font-extrabold">
                    {formatTime12h(tpl.time)}
                  </span>
                </button>
              )
            })}
          </div>
        </section>

        {/* Add button + filters */}
        <section
          aria-label="Add and filter tasks"
          className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
        >
          <Button
            onClick={openAddDialog}
            size="lg"
            className="h-12 rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 px-6 text-base font-extrabold text-white shadow-lg shadow-violet-200 transition-all hover:scale-[1.02] hover:from-violet-700 hover:to-purple-700 active:scale-95"
          >
            <Plus className="mr-2 h-5 w-5" aria-hidden /> Add New Task
          </Button>
          <div className="flex items-center gap-2" role="group" aria-label="Filter tasks">
            {FILTERS.map((f) => {
              const count =
                f.key === 'all' ? total : f.key === 'pending' ? pendingCount : completedCount
              return (
                <button
                  key={f.key}
                  type="button"
                  onClick={() => setFilter(f.key)}
                  aria-pressed={filter === f.key}
                  className={cn(
                    'rounded-xl px-4 py-2.5 text-sm font-bold transition-all active:scale-95',
                    filter === f.key
                      ? 'bg-violet-600 text-white shadow-md shadow-violet-200'
                      : 'bg-zinc-950 text-white hover:bg-zinc-800',
                  )}
                >
                  {f.label}
                  <span
                    className={cn(
                      'ml-1.5 rounded-full px-1.5 py-0.5 text-[10px] font-extrabold',
                      filter === f.key ? 'bg-white/25' : 'bg-white/15',
                    )}
                  >
                    {count}
                  </span>
                </button>
              )
            })}
          </div>
        </section>
        {/* Task list */}
        <section aria-label="Task list" className="mt-6 space-y-3">
          {loading ? (
            <div className="space-y-3" aria-busy="true" aria-label="Loading tasks">
              {[1, 2, 3].map((n) => (
                <div key={n} className="flex items-center gap-4 rounded-2xl border-2 border-zinc-200 p-4">
                  <div className="h-12 w-16 animate-pulse rounded-xl bg-zinc-200" />
                  <div className="h-11 w-11 animate-pulse rounded-xl bg-zinc-200" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 w-2/3 animate-pulse rounded bg-zinc-200" />
                    <div className="h-3 w-1/4 animate-pulse rounded bg-zinc-100" />
                  </div>
                  <div className="flex gap-2">
                    <div className="h-10 w-10 animate-pulse rounded-xl bg-zinc-200" />
                    <div className="h-10 w-10 animate-pulse rounded-xl bg-zinc-200" />
                    <div className="h-10 w-10 animate-pulse rounded-xl bg-zinc-200" />
                  </div>
                </div>
              ))}
            </div>
          ) : filteredTasks.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-zinc-300 bg-zinc-50 px-6 py-16 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-600 to-purple-600 text-white shadow-lg shadow-violet-200">
                <ListChecks className="h-8 w-8" aria-hidden />
              </div>
              <h3 className="mt-4 text-lg font-extrabold">
                {filter === 'all'
                  ? 'No activities yet'
                  : filter === 'pending'
                    ? 'No pending activities'
                    : 'No completed activities yet'}
              </h3>
              <p className="mt-1 max-w-sm text-sm text-zinc-500">
                {filter === 'completed'
                  ? 'Complete an activity and it will show up here. Keep going!'
                  : 'Use Quick Add above or create a custom task with your own time and category.'}
              </p>
              {filter !== 'completed' && (
                <Button
                  onClick={openAddDialog}
                  className="mt-5 rounded-xl bg-violet-600 font-bold text-white shadow-md hover:bg-violet-700"
                >
                  <Plus className="mr-2 h-4 w-4" aria-hidden /> Add your first task
                </Button>
              )}
            </div>
          ) : (
            <AnimatePresence initial={false}>
              {filteredTasks.map((task) => {
                const cat = getCategory(task.category)
                const { main, period } = splitTime(task.time)
                return (
                  <motion.div
                    key={task.id}
                    layout
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -24 }}
                    transition={{ duration: 0.25 }}
                    className={cn(
                      'flex items-center gap-3 rounded-2xl border-2 p-3 transition-colors sm:gap-4 sm:p-4',
                      task.completed
                        ? 'border-zinc-200 bg-zinc-50'
                        : 'border-zinc-200 bg-white hover:border-violet-300 hover:shadow-lg hover:shadow-violet-100',
                    )}
                  >
                    {/* Time chip */}
                    <div className="flex min-w-[60px] shrink-0 flex-col items-center justify-center rounded-xl bg-zinc-950 px-2 py-2 text-white">
                      <span className="text-sm font-extrabold leading-none sm:text-base">{main}</span>
                      <span className="mt-0.5 text-[10px] font-bold text-violet-300">{period}</span>
                    </div>

                    {/* Category icon */}
                    <div
                      className={cn(
                        'hidden h-11 w-11 shrink-0 items-center justify-center rounded-xl text-white sm:flex',
                        cat.bg,
                      )}
                      aria-hidden
                    >
                      <cat.icon className="h-5 w-5" />
                    </div>

                    {/* Title + category */}
                    <div className="min-w-0 flex-1">
                      <p
                        className={cn(
                          'truncate font-semibold',
                          task.completed && 'text-zinc-400 line-through',
                        )}
                      >
                        {task.title}
                      </p>
                      <span
                        className={cn(
                          'mt-0.5 inline-flex items-center gap-1 text-xs font-bold',
                          task.completed ? 'text-zinc-400' : cat.text,
                        )}
                      >
                        <cat.icon className="h-3 w-3 sm:hidden" aria-hidden />
                        <span aria-hidden>{cat.emoji}</span> {cat.label}
                      </span>
                    </div>

                    {/* Actions */}
                    <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
                      <button
                        type="button"
                        onClick={() => toggleComplete(task)}
                        aria-label={
                          task.completed
                            ? `Mark "${task.title}" as not completed`
                            : `Mark "${task.title}" as completed`
                        }
                        className={cn(
                          'flex h-10 w-10 items-center justify-center rounded-xl text-white shadow-sm transition-all hover:scale-110 active:scale-90 sm:h-11 sm:w-11',
                          task.completed
                            ? 'bg-emerald-500 hover:bg-emerald-600'
                            : 'bg-violet-600 hover:bg-violet-700',
                        )}
                      >
                        {task.completed ? (
                          <CheckCheck className="h-5 w-5" aria-hidden />
                        ) : (
                          <Check className="h-5 w-5" aria-hidden />
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={() => openEditDialog(task)}
                        aria-label={`Edit "${task.title}"`}
                        className="flex h-10 w-10 items-center justify-center rounded-xl bg-zinc-950 text-white shadow-sm transition-all hover:scale-110 hover:bg-zinc-800 active:scale-90 sm:h-11 sm:w-11"
                      >
                        <Pencil className="h-4 w-4" aria-hidden />
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeletingTask(task)}
                        aria-label={`Delete "${task.title}"`}
                        className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-500 text-white shadow-sm transition-all hover:scale-110 hover:bg-red-600 active:scale-90 sm:h-11 sm:w-11"
                      >
                        <Trash2 className="h-4 w-4" aria-hidden />
                      </button>
                    </div>
                  </motion.div>
                )
              })}
            </AnimatePresence>
          )}
        </section>
      </main>

      {/* ---------------- Footer ---------------- */}
      <footer className="mt-auto bg-zinc-950 py-5 text-center text-sm text-zinc-400">
        <p>
          Daily
          <span className="font-extrabold text-violet-400">Flow</span> — build great habits, one
          activity at a time.
        </p>
      </footer>

      {/* ---------------- Add / Edit dialog ---------------- */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="rounded-2xl sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-extrabold">
              {editingTask ? 'Edit Task' : 'Add New Task'}
            </DialogTitle>
            <DialogDescription>
              {editingTask
                ? 'Update the details of your activity below.'
                : 'What do you plan to do today? Set a time and pick a colourful category.'}
            </DialogDescription>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault()
              handleSubmit()
            }}
            className="space-y-4"
          >
            <div className="space-y-2">
              <Label htmlFor="task-title" className="font-bold">Task Title</Label>
              <Input
                id="task-title"
                placeholder="e.g. Read 20 pages of a book"
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                className="h-11 rounded-xl border-2 focus-visible:ring-violet-500"
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="task-time" className="font-bold">Time</Label>
              <input
                id="task-time"
                type="time"
                value={form.time}
                onChange={(e) => setForm((f) => ({ ...f, time: e.target.value }))}
                className="h-11 w-full rounded-xl border-2 border-zinc-200 bg-white px-3 text-sm font-bold text-zinc-900 focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-200"
              />
            </div>
            <div className="space-y-2">
              <Label className="font-bold">Category</Label>
              <div className="grid grid-cols-3 gap-2">
                {CATEGORIES.map((cat) => (
                  <button
                    type="button"
                    key={cat.id}
                    onClick={() => setForm((f) => ({ ...f, category: cat.id }))}
                    aria-pressed={form.category === cat.id}
                    className={cn(
                      'flex flex-col items-center gap-1 rounded-xl border-2 px-2 py-2.5 text-[11px] font-bold leading-tight transition-all active:scale-95',
                      form.category === cat.id
                        ? cn(cat.bg, 'border-transparent text-white shadow-md')
                        : 'border-zinc-200 bg-white text-zinc-600 hover:border-zinc-400',
                    )}
                  >
                    <span className="text-lg leading-none" aria-hidden>{cat.emoji}</span>
                    <span className="text-center">{cat.label}</span>
                  </button>
                ))}
              </div>
            </div>
            <DialogFooter className="gap-2 pt-2 sm:gap-0">
              <Button
                type="button"
                variant="outline"
                onClick={() => setDialogOpen(false)}
                className="rounded-xl border-2 border-zinc-300 font-bold hover:bg-zinc-100"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={submitting}
                className="rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 font-bold text-white shadow-md hover:from-violet-700 hover:to-purple-700 disabled:opacity-60"
              >
                {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />}
                {editingTask ? 'Save Changes' : 'Add Task'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ---------------- Delete confirmation ---------------- */}
      <AlertDialog open={!!deletingTask} onOpenChange={(open) => !open && setDeletingTask(null)}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-xl font-extrabold">Delete this task?</AlertDialogTitle>
            <AlertDialogDescription>
              &ldquo;{deletingTask?.title}&rdquo; will be permanently removed from today&apos;s
              list. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl font-bold">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="rounded-xl bg-red-500 font-bold text-white hover:bg-red-600"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
