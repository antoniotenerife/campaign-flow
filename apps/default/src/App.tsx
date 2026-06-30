import * as React from 'react';
import { useState, useEffect, useRef } from 'react';
import { useChat } from '@ai-sdk/react';
import { createConversation, createAgentChat } from '@/lib/agent-chat/v2';
import { isToolUIPart } from 'ai';
import { ulid } from 'ulidx';
import { cn } from '@/lib/utils';
import {
  BookOpen, CheckSquare, Calendar, MessageCircle, X, Send,
  Bot, BarChart3, Star, TrendingUp, Loader2, Clock, Users, Award,
  Zap, Target
} from 'lucide-react';

// ─── Types ───────────────────────────────────────────────────────────────────
interface Course {
  id: string;
  title: string;
  level: 'express' | 'intermedio' | 'premium';
  dates: string;
  duration: string;
  profile: string;
  result: string;
  priority: 'gancho' | 'especializacion' | 'premium_c';
}

interface Task {
  id: string;
  title: string;
  phase: string;
  status: 'pendiente' | 'en_curso' | 'hecho';
}

interface CalendarMonth {
  id: string;
  title: string;
  objective: string;
  message: string;
  channel: string;
  materials: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────
const AGENT_ID = '01KWC5GCM7FAFRAVNBMH8C4W1V';

const NAV_ITEMS = [
  { id: 'dashboard', label: 'Dashboard', icon: BarChart3 },
  { id: 'cursos', label: 'Catálogo', icon: BookOpen },
  { id: 'tareas', label: 'Tareas', icon: CheckSquare },
  { id: 'calendario', label: 'Calendario', icon: Calendar },
];

const LEVEL_CONFIG: Record<string, { label: string; color: string; dot: string }> = {
  express: { label: 'Express', color: 'bg-blue-500/20 text-blue-400 border-blue-500/30', dot: 'bg-blue-400' },
  intermedio: { label: 'Intermedio', color: 'bg-amber-500/20 text-amber-400 border-amber-500/30', dot: 'bg-amber-400' },
  premium: { label: 'Premium', color: 'bg-violet-500/20 text-violet-400 border-violet-500/30', dot: 'bg-violet-400' },
};

const PRIORITY_CONFIG: Record<string, { label: string; color: string }> = {
  gancho: { label: '🎯 Gancho', color: 'text-emerald-400' },
  especializacion: { label: '📈 Especialización', color: 'text-amber-400' },
  premium_c: { label: '⭐ Premium', color: 'text-violet-400' },
};

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  pendiente: { label: '⏳ Pendiente', color: 'bg-gray-500/20 text-gray-400' },
  en_curso: { label: '🔄 En curso', color: 'bg-blue-500/20 text-blue-400' },
  hecho: { label: '✅ Hecho', color: 'bg-emerald-500/20 text-emerald-400' },
};

const PHASE_LABELS: Record<string, string> = {
  fase1: '📋 Preparación',
  fase2: '🎨 Materiales',
  fase3: '🚀 Lanzamiento',
  fase4: '📞 Seguimiento',
  fase5: '📊 Evaluación',
};

// ─── API helpers ─────────────────────────────────────────────────────────────
async function fetchCourses(): Promise<Course[]> {
  try {
    const res = await fetch('/api/taskade/projects/GAymCNv25MpgSsdb/nodes');
    const json = await res.json();
    if (!json.ok) return [];
    return json.payload.nodes
      .filter((n: any) => n.fieldValues?.['/attributes/@nivel1'])
      .map((n: any) => ({
        id: n.id,
        title: n.fieldValues?.['/text'] || '',
        level: n.fieldValues?.['/attributes/@nivel1'] || 'express',
        dates: n.fieldValues?.['/attributes/@fecha1'] || '',
        duration: n.fieldValues?.['/attributes/@horas1'] || '',
        profile: n.fieldValues?.['/attributes/@perfil1'] || '',
        result: n.fieldValues?.['/attributes/@result1'] || '',
        priority: n.fieldValues?.['/attributes/@prior1'] || 'gancho',
      }));
  } catch { return []; }
}

async function fetchTasks(): Promise<Task[]> {
  try {
    const res = await fetch('/api/taskade/projects/m1bn4Mzxuss8ShXS/nodes');
    const json = await res.json();
    if (!json.ok) return [];
    return json.payload.nodes
      .filter((n: any) => n.fieldValues?.['/attributes/@fase01'])
      .map((n: any) => ({
        id: n.id,
        title: n.fieldValues?.['/text'] || '',
        phase: n.fieldValues?.['/attributes/@fase01'] || '',
        status: n.fieldValues?.['/attributes/@estado1'] || 'pendiente',
      }));
  } catch { return []; }
}

async function fetchCalendar(): Promise<CalendarMonth[]> {
  try {
    const res = await fetch('/api/taskade/projects/figirnRYJ5zpbD7R/nodes');
    const json = await res.json();
    if (!json.ok) return [];
    return json.payload.nodes
      .filter((n: any) => n.fieldValues?.['/attributes/@mes001'])
      .map((n: any) => ({
        id: n.id,
        title: n.fieldValues?.['/text'] || '',
        objective: n.fieldValues?.['/attributes/@mes001'] || '',
        message: n.fieldValues?.['/attributes/@msg001'] || '',
        channel: n.fieldValues?.['/attributes/@canal01'] || '',
        materials: n.fieldValues?.['/attributes/@mat001'] || '',
      }));
  } catch { return []; }
}

async function updateTaskStatus(nodeId: string, status: string) {
  await fetch(`/api/taskade/projects/m1bn4Mzxuss8ShXS/nodes/${nodeId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ '/attributes/@estado1': status }),
  });
}

// ─── Chat ─────────────────────────────────────────────────────────────────────
function ActiveChat({ chat, onClose }: { chat: ReturnType<typeof createAgentChat>; onClose: () => void }) {
  const { messages, status, addToolApprovalResponse } = useChat({ chat, id: chat.id });
  const [input, setInput] = useState('');
  const isSending = status === 'submitted' || status === 'streaming';
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const handleSend = async () => {
    const text = input.trim();
    if (!text || isSending) return;
    setInput('');
    await chat.sendMessage({ id: ulid(), role: 'user', parts: [{ type: 'text', text }] });
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between p-4 border-b border-white/10">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center">
            <Bot size={14} className="text-white" />
          </div>
          <div>
            <p className="text-sm font-semibold text-white">Asesor IC</p>
            <p className="text-xs text-white/50">Campaña 2026–2027</p>
          </div>
        </div>
        <button onClick={onClose} className="text-white/50 hover:text-white transition-colors p-1 rounded-lg hover:bg-white/10">
          <X size={16} />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-white/10">
        {messages.length === 0 && (
          <div className="text-center text-white/40 text-sm py-8">
            <Bot size={32} className="mx-auto mb-3 opacity-30" />
            <p className="font-medium">Asesor disponible</p>
            <p className="text-xs mt-1">Pregunta sobre cursos, mensajes, tareas o el calendario</p>
          </div>
        )}
        {messages.map((msg) => (
          <div key={msg.id} className={cn('flex gap-2', msg.role === 'user' ? 'justify-end' : 'justify-start')}>
            {msg.role === 'assistant' && (
              <div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-500 to-violet-600 flex-shrink-0 flex items-center justify-center mt-0.5">
                <Bot size={10} className="text-white" />
              </div>
            )}
            <div className={cn(
              'max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed',
              msg.role === 'user' ? 'bg-blue-600 text-white rounded-br-sm' : 'bg-white/10 text-white/90 rounded-bl-sm'
            )}>
              {msg.parts.map((part, i) => {
                if (part.type === 'text') return <span key={i} className="whitespace-pre-wrap">{part.text}</span>;
                if (isToolUIPart(part)) return (
                  <span key={i} className="text-xs opacity-60 italic block">🔧 {part.toolName}</span>
                );
                return null;
              })}
            </div>
          </div>
        ))}
        {isSending && (
          <div className="flex gap-2">
            <div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-500 to-violet-600 flex-shrink-0 flex items-center justify-center">
              <Bot size={10} className="text-white" />
            </div>
            <div className="bg-white/10 rounded-2xl rounded-bl-sm px-4 py-3">
              <div className="flex gap-1">
                <div className="w-1.5 h-1.5 rounded-full bg-white/40 animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-1.5 h-1.5 rounded-full bg-white/40 animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-1.5 h-1.5 rounded-full bg-white/40 animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>
      <div className="p-3 border-t border-white/10">
        <div className="flex gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
            placeholder="Escribe tu pregunta..."
            className="flex-1 bg-white/10 rounded-xl px-3 py-2.5 text-sm text-white placeholder:text-white/30 outline-none focus:ring-1 focus:ring-blue-500/50"
          />
          <button
            onClick={handleSend}
            disabled={isSending || !input.trim()}
            className="w-9 h-9 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-40 flex items-center justify-center transition-colors flex-shrink-0"
          >
            <Send size={14} className="text-white" />
          </button>
        </div>
      </div>
    </div>
  );
}

function ChatPanel({ onClose }: { onClose: () => void }) {
  const [chat, setChat] = useState<ReturnType<typeof createAgentChat> | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    createConversation(AGENT_ID)
      .then(({ conversationId }) => setChat(createAgentChat(AGENT_ID, conversationId)))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="flex flex-col h-full items-center justify-center gap-2 text-white/50">
      <Loader2 size={22} className="animate-spin" />
      <p className="text-sm">Conectando...</p>
    </div>
  );
  if (!chat) return null;
  return <ActiveChat chat={chat} onClose={onClose} />;
}

// ─── Dashboard ────────────────────────────────────────────────────────────────
function Dashboard({ courses, tasks }: { courses: Course[]; tasks: Task[] }) {
  const express = courses.filter(c => c.level === 'express').length;
  const intermedios = courses.filter(c => c.level === 'intermedio').length;
  const premium = courses.filter(c => c.level === 'premium').length;
  const done = tasks.filter(t => t.status === 'hecho').length;
  const inProgress = tasks.filter(t => t.status === 'en_curso').length;
  const pending = tasks.filter(t => t.status === 'pendiente').length;
  const progressPct = tasks.length > 0 ? Math.round((done / tasks.length) * 100) : 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Campaña Impulsa Canarias</h1>
        <p className="text-white/50 text-sm mt-1">Panel de control formativo 2026–2027</p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Cursos Express', value: express, icon: Zap, color: 'from-blue-600/20 to-blue-600/5', iconColor: 'text-blue-400' },
          { label: 'Intermedios', value: intermedios, icon: TrendingUp, color: 'from-amber-600/20 to-amber-600/5', iconColor: 'text-amber-400' },
          { label: 'Cursos Premium', value: premium, icon: Star, color: 'from-violet-600/20 to-violet-600/5', iconColor: 'text-violet-400' },
          { label: 'Total cursos', value: courses.length, icon: BookOpen, color: 'from-emerald-600/20 to-emerald-600/5', iconColor: 'text-emerald-400' },
        ].map(stat => {
          const Icon = stat.icon;
          return (
            <div key={stat.label} className={cn('rounded-2xl p-4 bg-gradient-to-br border border-white/5', stat.color)}>
              <div className="flex items-center justify-between mb-3">
                <Icon size={18} className={stat.iconColor} />
                <span className="text-2xl font-bold text-white">{stat.value}</span>
              </div>
              <p className="text-xs text-white/50">{stat.label}</p>
            </div>
          );
        })}
      </div>

      {/* Progress + breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="rounded-2xl bg-white/5 border border-white/10 p-5">
          <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
            <CheckSquare size={16} className="text-blue-400" />
            Progreso de campaña
          </h3>
          <div className="mb-4">
            <div className="flex justify-between text-sm mb-2">
              <span className="text-white/60">Tareas completadas</span>
              <span className="text-white font-semibold">{progressPct}%</span>
            </div>
            <div className="h-2 bg-white/10 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-blue-500 to-violet-500 rounded-full transition-all duration-500"
                style={{ width: `${progressPct}%` }}
              />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'Hechas', value: done, color: 'text-emerald-400' },
              { label: 'En curso', value: inProgress, color: 'text-blue-400' },
              { label: 'Pendientes', value: pending, color: 'text-gray-400' },
            ].map(s => (
              <div key={s.label} className="text-center">
                <p className={cn('text-xl font-bold', s.color)}>{s.value}</p>
                <p className="text-xs text-white/40 mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl bg-white/5 border border-white/10 p-5">
          <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
            <Target size={16} className="text-violet-400" />
            Prioridades comerciales
          </h3>
          <div className="space-y-3">
            {[
              { label: '🎯 Cursos Gancho', desc: 'Captación rápida de alumnos', courses: courses.filter(c => c.priority === 'gancho'), color: 'bg-emerald-400' },
              { label: '📈 Especialización', desc: 'Crecimiento profesional', courses: courses.filter(c => c.priority === 'especializacion'), color: 'bg-amber-400' },
              { label: '⭐ Premium', desc: 'Alto valor — empresas y avanzados', courses: courses.filter(c => c.priority === 'premium_c'), color: 'bg-violet-400' },
            ].map(group => (
              <div key={group.label} className="flex items-center gap-3">
                <div className={cn('w-2 h-2 rounded-full flex-shrink-0', group.color)} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white">{group.label}</p>
                  <p className="text-xs text-white/40 truncate">{group.desc}</p>
                </div>
                <span className="text-white font-bold text-sm">{group.courses.length}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Quick access to gancho courses */}
      <div className="rounded-2xl bg-white/5 border border-white/10 p-5">
        <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
          <Zap size={16} className="text-emerald-400" />
          Cursos gancho — lanzar primero
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {courses.filter(c => c.priority === 'gancho').slice(0, 5).map(course => (
            <div key={course.id} className="rounded-xl bg-white/5 border border-white/10 p-3 hover:bg-white/10 transition-colors">
              <div className="flex items-start justify-between gap-2 mb-2">
                <p className="text-sm font-medium text-white leading-snug">{course.title}</p>
                <span className={cn('text-xs px-2 py-0.5 rounded-full border flex-shrink-0', LEVEL_CONFIG[course.level]?.color)}>
                  {LEVEL_CONFIG[course.level]?.label}
                </span>
              </div>
              <div className="flex items-center gap-3 text-xs text-white/40">
                <span className="flex items-center gap-1"><Clock size={10} /> {course.duration}</span>
                <span className="flex items-center gap-1"><Calendar size={10} /> {course.dates.split(' ')[0]}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Courses View ─────────────────────────────────────────────────────────────
function CoursesView({ courses }: { courses: Course[] }) {
  const [filter, setFilter] = useState<'all' | 'express' | 'intermedio' | 'premium'>('all');
  const filtered = filter === 'all' ? courses : courses.filter(c => c.level === filter);

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-white">Catálogo de cursos</h2>
          <p className="text-white/40 text-sm">{courses.length} cursos — Julio 2026 a Junio 2027</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          {(['all', 'express', 'intermedio', 'premium'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn(
                'px-3 py-1.5 rounded-xl text-xs font-medium transition-colors',
                filter === f ? 'bg-white/20 text-white' : 'bg-white/5 text-white/50 hover:bg-white/10'
              )}
            >
              {f === 'all' ? 'Todos' : f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {filtered.map(course => {
          const lvl = LEVEL_CONFIG[course.level] || LEVEL_CONFIG.express;
          const pri = PRIORITY_CONFIG[course.priority] || PRIORITY_CONFIG.gancho;
          return (
            <div key={course.id} className="rounded-2xl bg-white/5 border border-white/10 p-5 hover:bg-white/8 transition-colors">
              <div className="flex items-start justify-between gap-3 mb-3">
                <h3 className="text-sm font-semibold text-white leading-snug flex-1">{course.title}</h3>
                <span className={cn('text-xs px-2 py-1 rounded-full border font-medium flex-shrink-0', lvl.color)}>
                  {lvl.label}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 mb-3">
                <div className="bg-white/5 rounded-lg p-2">
                  <p className="text-xs text-white/40 mb-0.5">Fechas</p>
                  <p className="text-xs text-white font-medium">{course.dates}</p>
                </div>
                <div className="bg-white/5 rounded-lg p-2">
                  <p className="text-xs text-white/40 mb-0.5">Duración</p>
                  <p className="text-xs text-white font-medium">{course.duration}</p>
                </div>
              </div>
              <div className="space-y-1.5 text-xs text-white/60">
                <p><span className="text-white/30">Perfil:</span> {course.profile}</p>
                <p><span className="text-white/30">Resultado:</span> {course.result}</p>
              </div>
              <div className="mt-3 pt-3 border-t border-white/10">
                <span className={cn('text-xs font-medium', pri.color)}>{pri.label}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Tasks View ───────────────────────────────────────────────────────────────
function TasksView({ tasks, onStatusChange }: { tasks: Task[]; onStatusChange: (id: string, status: string) => void }) {
  const phases = ['fase1', 'fase2', 'fase3', 'fase4', 'fase5'];

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold text-white">Tareas de campaña</h2>
        <p className="text-white/40 text-sm">{tasks.filter(t => t.status === 'hecho').length} de {tasks.length} completadas</p>
      </div>
      <div className="space-y-4">
        {phases.map(phase => {
          const phaseTasks = tasks.filter(t => t.phase === phase);
          if (phaseTasks.length === 0) return null;
          const phDone = phaseTasks.filter(t => t.status === 'hecho').length;
          const pct = Math.round((phDone / phaseTasks.length) * 100);
          return (
            <div key={phase} className="rounded-2xl bg-white/5 border border-white/10 p-5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-white">{PHASE_LABELS[phase] || phase}</h3>
                <span className="text-xs text-white/40">{phDone}/{phaseTasks.length}</span>
              </div>
              <div className="h-1.5 bg-white/10 rounded-full overflow-hidden mb-4">
                <div className="h-full bg-gradient-to-r from-blue-500 to-violet-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
              </div>
              <div className="space-y-2">
                {phaseTasks.map(task => {
                  const st = STATUS_CONFIG[task.status] || STATUS_CONFIG.pendiente;
                  return (
                    <div key={task.id} className="flex items-center gap-3 group">
                      <div className="flex-1 text-sm text-white/80">{task.title}</div>
                      <select
                        value={task.status}
                        onChange={(e) => onStatusChange(task.id, e.target.value)}
                        className={cn(
                          'text-xs px-2 py-1 rounded-lg border-0 outline-none cursor-pointer transition-colors',
                          st.color
                        )}
                        style={{ background: 'transparent' }}
                      >
                        <option value="pendiente">⏳ Pendiente</option>
                        <option value="en_curso">🔄 En curso</option>
                        <option value="hecho">✅ Hecho</option>
                      </select>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Calendar View ────────────────────────────────────────────────────────────
function CalendarView({ months }: { months: CalendarMonth[] }) {
  const [selected, setSelected] = useState<CalendarMonth | null>(null);

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold text-white">Calendario de campaña</h2>
        <p className="text-white/40 text-sm">Estrategia mes a mes</p>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {months.map((month, i) => (
          <button
            key={month.id}
            onClick={() => setSelected(selected?.id === month.id ? null : month)}
            className={cn(
              'rounded-2xl border p-5 text-left transition-all',
              selected?.id === month.id
                ? 'bg-blue-600/20 border-blue-500/40'
                : 'bg-white/5 border-white/10 hover:bg-white/8 hover:border-white/20'
            )}
          >
            <div className="flex items-start justify-between gap-2 mb-2">
              <h3 className="text-sm font-semibold text-white leading-snug">{month.title}</h3>
              <span className="text-xs text-white/30 flex-shrink-0">Período {i + 1}</span>
            </div>
            <p className="text-xs text-white/60 mb-3">{month.objective}</p>
            {selected?.id === month.id && (
              <div className="space-y-2 pt-3 border-t border-white/10">
                {[
                  { label: '💬 Mensaje', value: month.message },
                  { label: '📱 Canal', value: month.channel },
                  { label: '📄 Materiales', value: month.materials },
                ].map(item => (
                  <div key={item.label}>
                    <p className="text-xs text-white/40 mb-0.5">{item.label}</p>
                    <p className="text-xs text-white/80">{item.value}</p>
                  </div>
                ))}
              </div>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── App ──────────────────────────────────────────────────────────────────────
const App: React.FC = function () {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [chatOpen, setChatOpen] = useState(false);
  const [courses, setCourses] = useState<Course[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [calendar, setCalendar] = useState<CalendarMonth[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([fetchCourses(), fetchTasks(), fetchCalendar()])
      .then(([c, t, cal]) => { setCourses(c); setTasks(t); setCalendar(cal); })
      .finally(() => setLoading(false));
  }, []);

  const handleStatusChange = async (id: string, status: string) => {
    setTasks(prev => prev.map(t => t.id === id ? { ...t, status: status as Task['status'] } : t));
    await updateTaskStatus(id, status);
  };

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-[#0a0a0f]/80 backdrop-blur-xl border-b border-white/10 px-4 sm:px-6 py-3">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center flex-shrink-0">
              <Award size={16} className="text-white" />
            </div>
            <div className="hidden sm:block">
              <p className="text-sm font-bold text-white leading-none">Impulsa Canarias</p>
              <p className="text-xs text-white/40 mt-0.5">Campaña 2026–2027</p>
            </div>
          </div>
          <nav className="flex items-center gap-1">
            {NAV_ITEMS.map(item => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={cn(
                    'flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium transition-all',
                    activeTab === item.id ? 'bg-white/15 text-white' : 'text-white/50 hover:text-white hover:bg-white/10'
                  )}
                >
                  <Icon size={14} />
                  <span className="hidden sm:inline">{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>
      </header>

      {/* Main */}
      <main className="flex-1 max-w-6xl mx-auto w-full px-4 sm:px-6 py-6 pb-24">
        {loading ? (
          <div className="flex items-center justify-center py-24 gap-3 text-white/40">
            <Loader2 size={20} className="animate-spin" />
            <span className="text-sm">Cargando datos...</span>
          </div>
        ) : (
          <>
            {activeTab === 'dashboard' && <Dashboard courses={courses} tasks={tasks} />}
            {activeTab === 'cursos' && <CoursesView courses={courses} />}
            {activeTab === 'tareas' && <TasksView tasks={tasks} onStatusChange={handleStatusChange} />}
            {activeTab === 'calendario' && <CalendarView months={calendar} />}
          </>
        )}
      </main>

      {/* Floating chat button */}
      <div className="fixed bottom-6 right-6 z-40 flex flex-col items-end gap-3">
        {chatOpen && (
          <div className="fixed inset-0 sm:inset-auto sm:bottom-20 sm:right-6 w-full h-full sm:w-[360px] sm:h-[520px] bg-[#131320] sm:rounded-2xl sm:border sm:border-white/10 sm:shadow-2xl flex flex-col overflow-hidden z-50">
            <ChatPanel onClose={() => setChatOpen(false)} />
          </div>
        )}
        {chatOpen && (
          <div className="fixed inset-0 bg-black/50 sm:hidden z-40" onClick={() => setChatOpen(false)} />
        )}
        <button
          onClick={() => setChatOpen(!chatOpen)}
          className={cn(
            'w-14 h-14 rounded-full shadow-lg flex items-center justify-center transition-all duration-300 z-50',
            chatOpen
              ? 'bg-gray-700 rotate-12'
              : 'bg-gradient-to-br from-blue-500 to-violet-600 hover:scale-110'
          )}
        >
          {chatOpen ? <X size={22} className="text-white" /> : <MessageCircle size={22} className="text-white" />}
        </button>
      </div>
    </div>
  );
};

export default App;
