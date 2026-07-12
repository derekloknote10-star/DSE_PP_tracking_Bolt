import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Link } from 'react-router-dom';
import { Target, FileText, BookOpen, TrendingUp, ChevronRight, Clock, ChevronDown } from 'lucide-react';
import { differenceInDays, isAfter, isBefore } from 'date-fns';
import type { Subject, PastPaper, TopicSet, Target as TargetType, TargetItem } from '../types';

const YEARS = [2016, 2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025];

const PAPERS_PER_SUBJECT: Record<string, number[]> = {
  chi:  [1, 2],
  eng:  [1, 2, 3],
  math: [1, 2],
  m1:   [1],
  bio:  [1, 2],
  econ: [1, 2],
  phy:  [1, 2],
};

export default function DashboardPage() {
  const { user, profile } = useAuth();

  const { data: subjects = [] } = useQuery<Subject[]>({
    queryKey: ['subjects'],
    queryFn: async () => {
      const { data, error } = await supabase.from('subjects').select('*').order('sort_order');
      if (error) throw error;
      return data;
    },
  });

  const { data: papers = [] } = useQuery<PastPaper[]>({
    queryKey: ['past-papers', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from('past_papers').select('*');
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const { data: topicSets = [] } = useQuery<TopicSet[]>({
    queryKey: ['topic-sets', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from('topic_sets').select('*');
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const { data: targets = [] } = useQuery<TargetType[]>({
    queryKey: ['targets', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from('targets').select('*').order('end_date');
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const { data: targetItems = [] } = useQuery<TargetItem[]>({
    queryKey: ['target-items', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('target_items')
        .select('*')
        .in('target_id', targets.map((t) => t.id));
      if (error) throw error;
      return data;
    },
    enabled: targets.length > 0,
  });

  const today = new Date();
  const activeTargets = targets.filter((t) => {
    const end = new Date(t.end_date);
    const start = new Date(t.start_date);
    return !isAfter(start, today) && !isBefore(end, today);
  });

  const subjectReadiness = subjects.map((s) => {
    const subjectPapers = papers.filter((p) => p.subject_id === s.id);
    const completed = subjectPapers.filter((p) => p.status === 'completed').length;
    const paperNums = PAPERS_PER_SUBJECT[s.id] ?? [1, 2];
    const total = YEARS.length * paperNums.length;
    const sets = topicSets.filter((ts) => ts.subject_id === s.id);
    const setsCompleted = sets.filter((ts) => ts.status === 'completed').length;
    const paperPct = total > 0 ? Math.round((completed / total) * 100) : 0;
    const setPct = sets.length > 0 ? Math.round((setsCompleted / sets.length) * 100) : 0;
    const pct = Math.round((paperPct + setPct) / 2);
    return { id: s.id, name: s.name, pct, paperPct, setPct, completed, total };
  });

  const totalPapers = papers.length;
  const completedPapers = papers.filter((p) => p.status === 'completed').length;
  const totalSets = topicSets.length;
  const completedSets = topicSets.filter((ts) => ts.status === 'completed').length;

  return (
    <div className="space-y-6 max-w-6xl">
      {/* Welcome */}
      <div className="relative flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-neutral-900">
            Welcome back, {profile?.display_name ?? 'there'}
          </h2>
          <p className="text-sm text-neutral-500 mt-0.5">Here's your study progress overview.</p>
        </div>
        <video
          src="/video_202607111755.mp4"
          autoPlay
          loop
          muted
          playsInline
//          className="w-20 h-20 sm:w-24 sm:h-24 object-cover rounded-xl opacity-40 shadow-sm flex-shrink-0"
            className="h-full w-auto object-cover rounded-xl opacity-40 shadow-sm"
        />
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={<FileText size={20} />}
          label="Papers Done"
          value={completedPapers}
          sub={`of ${totalPapers} tracked`}
          color="primary"
        />
        <StatCard
          icon={<BookOpen size={20} />}
          label="Topic Sets"
          value={completedSets}
          sub={`of ${totalSets} created`}
          color="success"
        />
        <StatCard
          icon={<Target size={20} />}
          label="Active Targets"
          value={activeTargets.length}
          sub="in progress"
          color="warning"
        />
        <StatCard
          icon={<TrendingUp size={20} />}
          label="Subjects"
          value={subjects.length}
          sub="being tracked"
          color="neutral"
        />
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Subject Readiness Vibe Check */}
        <SubjectVibeCheck subjects={subjectReadiness} papers={papers} />

        {/* Active targets */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-neutral-800">Active Targets</h3>
            <Link to="/targets" className="text-sm text-primary-600 hover:text-primary-700 flex items-center gap-1">
              View all <ChevronRight size={14} />
            </Link>
          </div>
          {activeTargets.length === 0 ? (
            <div className="text-center py-10">
              <Target size={36} className="text-neutral-300 mx-auto mb-3" />
              <p className="text-neutral-500 text-sm">No active targets</p>
              <Link to="/targets" className="btn-primary mt-3 text-xs px-3 py-1.5 inline-flex">
                Create a Target
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {activeTargets.slice(0, 4).map((t) => {
                const items = targetItems.filter((ti) => ti.target_id === t.id);
                const totalCount = items.reduce((s, i) => s + i.required_count, 0);
                const doneCount = items.reduce((s, i) => s + i.completed_count, 0);
                const pct = totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0;
                const daysLeft = differenceInDays(new Date(t.end_date), today);

                return (
                  <Link
                    key={t.id}
                    to={`/targets/${t.id}`}
                    className="block p-3 rounded-lg border border-neutral-200 hover:border-primary-300 hover:bg-primary-50/30 transition-all"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-sm font-medium text-neutral-800 truncate">{t.name}</p>
                      <span className={`text-xs font-medium ml-2 flex-shrink-0 flex items-center gap-1 ${
                        daysLeft <= 3 ? 'text-danger-600' : daysLeft <= 7 ? 'text-warning-600' : 'text-neutral-500'
                      }`}>
                        <Clock size={12} />
                        {daysLeft >= 0 ? `${daysLeft}d left` : 'Overdue'}
                      </span>
                    </div>
                    <div className="w-full bg-neutral-100 rounded-full h-1.5">
                      <div
                        className="bg-primary-500 h-1.5 rounded-full transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <p className="text-xs text-neutral-400 mt-1">{pct}% · {doneCount}/{totalCount} items</p>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </div>


    </div>
  );
}

function StatCard({
  icon, label, value, sub, color
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  sub: string;
  color: 'primary' | 'success' | 'warning' | 'neutral';
}) {
  const colorMap = {
    primary: 'bg-primary-50 text-primary-600',
    success: 'bg-success-50 text-success-600',
    warning: 'bg-warning-50 text-warning-600',
    neutral: 'bg-neutral-100 text-neutral-600',
  };
  return (
    <div className="card p-4">
      <div className={`inline-flex p-2 rounded-lg mb-3 ${colorMap[color]}`}>{icon}</div>
      <p className="text-2xl font-bold text-neutral-900">{value}</p>
      <p className="text-sm font-medium text-neutral-700 leading-tight">{label}</p>
      <p className="text-xs text-neutral-400 mt-0.5">{sub}</p>
    </div>
  );
}

type VibeLevel = { emoji: string; label: string; bar: string; bg: string; text: string };

function getVibe(pct: number): VibeLevel {
  if (pct === 0)  return { emoji: '💀', label: 'Cooked. Completely cooked.',   bar: 'bg-red-400',    bg: 'bg-red-50',    text: 'text-red-600' };
  if (pct < 15)   return { emoji: '😬', label: 'Technically started. Barely.', bar: 'bg-orange-400',  bg: 'bg-orange-50',  text: 'text-orange-600' };
  if (pct < 30)   return { emoji: '🐌', label: 'Going at it... very slowly.',   bar: 'bg-amber-400',  bg: 'bg-amber-50',  text: 'text-amber-600' };
  if (pct < 50)   return { emoji: '🤡', label: 'Halfway there (in your dreams).', bar: 'bg-yellow-400', bg: 'bg-yellow-50', text: 'text-yellow-700' };
  if (pct < 65)   return { emoji: '😅', label: 'Sweating but surviving.',       bar: 'bg-lime-500',   bg: 'bg-lime-50',   text: 'text-lime-700' };
  if (pct < 80)   return { emoji: '💪', label: 'Actually cooking now.',         bar: 'bg-green-500',  bg: 'bg-green-50',  text: 'text-green-700' };
  if (pct < 95)   return { emoji: '🔥', label: 'Scary prepared. Scary.',        bar: 'bg-emerald-500',bg: 'bg-emerald-50',text: 'text-emerald-700' };
  return            { emoji: '👑', label: 'Just go sit the exam already.',      bar: 'bg-teal-500',   bg: 'bg-teal-50',   text: 'text-teal-700' };
}

const STATUS_ICON: Record<string, { icon: string; label: string; cls: string }> = {
  not_started: { icon: '⚪', label: 'Not Started', cls: 'text-neutral-400' },
  in_progress:  { icon: '🟡', label: 'In Progress', cls: 'text-warning-600' },
  completed:    { icon: '🟢', label: 'Done!',       cls: 'text-success-600' },
};

function SubjectVibeCheck({ subjects, papers }: {
  subjects: { id: string; name: string; pct: number; paperPct: number; setPct: number; completed: number; total: number }[];
  papers: PastPaper[];
}) {
  const [open, setOpen] = useState<string | null>(null);

  return (
    <div className="card p-5">
      <h3 className="font-semibold text-neutral-800 mb-1">Readiness Vibe Check</h3>
      <p className="text-xs text-neutral-400 mb-4">An honest (maybe brutal) look at where you stand.</p>
      <div className="space-y-2">
        {subjects.map((s) => {
          const vibe = getVibe(s.pct);
          const isOpen = open === s.id;
          const paperNums = PAPERS_PER_SUBJECT[s.id] ?? [1, 2];
          return (
            <div key={s.id} className={`rounded-xl border transition-all ${isOpen ? 'border-neutral-300 shadow-sm' : 'border-neutral-200'}`}>
              <button
                className="w-full flex items-center gap-3 px-4 py-3 text-left"
                onClick={() => setOpen(isOpen ? null : s.id)}
              >
                <span className="text-xl leading-none">{vibe.emoji}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-semibold text-neutral-800">{s.name}</span>
                    <span className={`text-xs font-bold ${vibe.text}`}>{s.pct}%</span>
                  </div>
                  <div className="w-full bg-neutral-100 rounded-full h-1.5">
                    <div
                      className={`h-1.5 rounded-full transition-all duration-500 ${vibe.bar}`}
                      style={{ width: `${s.pct}%` }}
                    />
                  </div>
                </div>
                <ChevronDown
                  size={15}
                  className={`text-neutral-400 flex-shrink-0 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
                />
              </button>

              {isOpen && (
                <div className={`${vibe.bg} rounded-b-xl`}>
                  <div className="px-4 pt-1 pb-3">
                    <p className={`text-xs font-medium mb-3 ${vibe.text}`}>{vibe.emoji} {vibe.label}</p>
                    {/* Year-by-paper breakdown */}
                    <div className="bg-white/80 rounded-lg overflow-hidden text-xs">
                      <div className={`grid gap-x-2 px-3 py-2 font-semibold text-neutral-500 border-b border-neutral-100`}
                        style={{ gridTemplateColumns: `4rem ${paperNums.map(() => '1fr').join(' ')}` }}>
                        <span>Year</span>
                        {paperNums.map((n) => <span key={n} className="text-center">Paper {n}</span>)}
                      </div>
                      {YEARS.map((year) => (
                        <div
                          key={year}
                          className={`grid gap-x-2 px-3 py-1.5 border-b border-neutral-50 last:border-0`}
                          style={{ gridTemplateColumns: `4rem ${paperNums.map(() => '1fr').join(' ')}` }}
                        >
                          <span className="text-neutral-600 font-medium">{year}</span>
                          {paperNums.map((n) => {
                            const p = papers.find(
                              (pp) => pp.subject_id === s.id && pp.year === year && pp.paper_number === n
                            );
                            const status = p?.status ?? 'not_started';
                            const info = STATUS_ICON[status];
                            return (
                              <span key={n} className={`text-center font-medium ${info.cls}`}>
                                {info.icon} {info.label}
                              </span>
                            );
                          })}
                        </div>
                      ))}
                    </div>
                    <Link
                      to={`/papers?subject=${s.id}`}
                      className={`mt-3 inline-flex items-center gap-1 text-xs font-semibold ${vibe.text} hover:underline`}
                    >
                      Manage papers <ChevronRight size={12} />
                    </Link>
                  </div>
                </div>
              )}
            </div>
          );
        })}
        {subjects.length === 0 && (
          <p className="text-sm text-neutral-400 text-center py-6">No subjects yet — nothing to vibe check.</p>
        )}
      </div>
    </div>
  );
}
