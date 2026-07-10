import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Plus, CheckCircle2, Circle, Clock, Trash2, ChevronDown, BookOpen, X } from 'lucide-react';
import type { Subject, TopicSet, Difficulty, PaperStatus } from '../types';

const STATUS_LABELS: Record<PaperStatus, { label: string; badge: string }> = {
  not_started: { label: 'Not Started', badge: 'badge-neutral' },
  in_progress:  { label: 'In Progress', badge: 'badge-warning' },
  completed:    { label: 'Completed',   badge: 'badge-success' },
};

const DIFF_LABELS: Record<Difficulty, { label: string; color: string }> = {
  easy:   { label: 'Easy',   color: 'text-success-600' },
  medium: { label: 'Medium', color: 'text-warning-600' },
  hard:   { label: 'Hard',   color: 'text-danger-600' },
};

export default function TopicSetsPage() {
  const { user, profile } = useAuth();
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [filterSubject, setFilterSubject] = useState('');

  const { data: subjects = [] } = useQuery<Subject[]>({
    queryKey: ['subjects'],
    queryFn: async () => {
      const { data, error } = await supabase.from('subjects').select('*').order('sort_order');
      if (error) throw error;
      return data;
    },
  });

  const { data: sets = [], isLoading } = useQuery<TopicSet[]>({
    queryKey: ['topic-sets', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from('topic_sets').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: PaperStatus }) => {
      const { error } = await supabase
        .from('topic_sets')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['topic-sets', user?.id] }),
  });

  const deleteSet = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('topic_sets').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['topic-sets', user?.id] }),
  });

  const filtered = filterSubject ? sets.filter((s) => s.subject_id === filterSubject) : sets;

  const cycleStatus = (set: TopicSet) => {
    const next: PaperStatus = set.status === 'not_started' ? 'in_progress'
      : set.status === 'in_progress' ? 'completed' : 'not_started';
    updateStatus.mutate({ id: set.id, status: next });
  };

  return (
    <div className="max-w-4xl space-y-5">
      <div className="flex flex-wrap gap-3 items-center justify-between">
        <div className="flex items-center gap-2">
          <select
            className="input w-auto text-sm"
            value={filterSubject}
            onChange={(e) => setFilterSubject(e.target.value)}
          >
            <option value="">All Subjects</option>
            {subjects.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>
        <button className="btn-primary" onClick={() => setShowForm(true)}>
          <Plus size={16} /> New Topic Set
        </button>
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-neutral-400">Loading…</div>
      ) : filtered.length === 0 ? (
        <div className="card p-12 text-center">
          <BookOpen size={40} className="text-neutral-300 mx-auto mb-3" />
          <p className="text-neutral-500 font-medium">No topic sets yet</p>
          <p className="text-neutral-400 text-sm mt-1">Create a preparation set to get started.</p>
          <button className="btn-primary mt-4" onClick={() => setShowForm(true)}>
            <Plus size={16} /> Create First Set
          </button>
        </div>
      ) : (
        <div className="grid gap-3">
          {filtered.map((set) => {
            const subject = subjects.find((s) => s.id === set.subject_id);
            const statusCfg = STATUS_LABELS[set.status];
            return (
              <div key={set.id} className="card p-4 flex flex-col sm:flex-row sm:items-center gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-neutral-900 text-sm">{set.name}</span>
                    <span className="badge-primary badge">{subject?.name}</span>
                    {set.topic_tag && <span className="badge-neutral badge">{set.topic_tag}</span>}
                    {set.estimated_difficulty && (
                      <span className={`text-xs font-medium ${DIFF_LABELS[set.estimated_difficulty].color}`}>
                        {DIFF_LABELS[set.estimated_difficulty].label}
                      </span>
                    )}
                  </div>
                  {set.estimated_time_minutes && (
                    <p className="text-xs text-neutral-400 mt-1">~{set.estimated_time_minutes} min</p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => cycleStatus(set)}
                    className={`badge cursor-pointer select-none ${statusCfg.badge} hover:opacity-80 transition-opacity`}
                  >
                    {set.status === 'completed' ? <CheckCircle2 size={12} className="mr-1" /> :
                     set.status === 'in_progress' ? <Clock size={12} className="mr-1" /> :
                     <Circle size={12} className="mr-1" />}
                    {statusCfg.label}
                  </button>
                  <button
                    onClick={() => { if (confirm('Delete this topic set?')) deleteSet.mutate(set.id); }}
                    className="text-neutral-300 hover:text-danger-500 transition-colors p-1"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showForm && (
        <TopicSetForm
          subjects={subjects}
          defaultRole={profile?.role ?? 'parent'}
          onClose={() => setShowForm(false)}
          onCreated={() => {
            setShowForm(false);
            queryClient.invalidateQueries({ queryKey: ['topic-sets', user?.id] });
          }}
        />
      )}
    </div>
  );
}

function TopicSetForm({
  subjects, defaultRole, onClose, onCreated,
}: {
  subjects: Subject[];
  defaultRole: string;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [name, setName] = useState('');
  const [subjectId, setSubjectId] = useState(subjects[0]?.id ?? '');
  const [topicTag, setTopicTag] = useState('');
  const [difficulty, setDifficulty] = useState<Difficulty | ''>('');
  const [time, setTime] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !subjectId) { setError('Name and subject are required.'); return; }
    setLoading(true);
    const { error } = await supabase.from('topic_sets').insert({
      name: name.trim(),
      subject_id: subjectId,
      topic_tag: topicTag.trim() || null,
      estimated_difficulty: difficulty || null,
      estimated_time_minutes: time ? parseInt(time) : null,
      created_by_role: defaultRole as 'student' | 'parent',
    });
    setLoading(false);
    if (error) { setError(error.message); return; }
    onCreated();
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="card p-6 w-full max-w-md shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-semibold text-neutral-900">New Topic Set</h3>
          <button onClick={onClose} className="text-neutral-400 hover:text-neutral-600"><X size={18} /></button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label">Set Name *</label>
            <input type="text" className="input" placeholder="e.g. Differentiation Practice" value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div>
            <label className="label">Subject *</label>
            <select className="input" value={subjectId} onChange={(e) => setSubjectId(e.target.value)}>
              {subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Topic Tag</label>
            <input type="text" className="input" placeholder="e.g. Calculus, Reading Comprehension" value={topicTag} onChange={(e) => setTopicTag(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Difficulty</label>
              <select className="input" value={difficulty} onChange={(e) => setDifficulty(e.target.value as Difficulty | '')}>
                <option value="">—</option>
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
              </select>
            </div>
            <div>
              <label className="label">Est. Time (min)</label>
              <input type="number" className="input" placeholder="60" min={1} value={time} onChange={(e) => setTime(e.target.value)} />
            </div>
          </div>

          {error && <p className="text-danger-600 text-sm">{error}</p>}

          <div className="flex gap-2 pt-1">
            <button type="button" className="btn-secondary flex-1" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn-primary flex-1" disabled={loading}>
              {loading ? 'Creating…' : 'Create Set'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
