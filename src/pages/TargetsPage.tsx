import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Link } from 'react-router-dom';
import { Plus, Target, Clock, ChevronRight, Trash2, X } from 'lucide-react';
import { differenceInDays, format, parseISO } from 'date-fns';
import type { Target as TargetType, Subject } from '../types';

export default function TargetsPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);

  const { data: targets = [], isLoading } = useQuery<TargetType[]>({
    queryKey: ['targets', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from('targets').select('*').order('end_date');
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const deleteTarget = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('targets').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['targets', user?.id] }),
  });

  const today = new Date();

  const grouped = {
    active: targets.filter((t) => new Date(t.start_date) <= today && new Date(t.end_date) >= today),
    upcoming: targets.filter((t) => new Date(t.start_date) > today),
    past: targets.filter((t) => new Date(t.end_date) < today),
  };

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex justify-end">
        <button className="btn-primary" onClick={() => setShowForm(true)}>
          <Plus size={16} /> New Target
        </button>
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-neutral-400">Loading…</div>
      ) : targets.length === 0 ? (
        <div className="card p-12 text-center">
          <Target size={40} className="text-neutral-300 mx-auto mb-3" />
          <p className="text-neutral-500 font-medium">No targets yet</p>
          <p className="text-neutral-400 text-sm mt-1">Create short-term study targets to stay on track.</p>
          <button className="btn-primary mt-4" onClick={() => setShowForm(true)}>
            <Plus size={16} /> Create First Target
          </button>
        </div>
      ) : (
        <>
          {grouped.active.length > 0 && (
            <TargetGroup
              title="Active"
              targets={grouped.active}
              today={today}
              onDelete={(id) => { if (confirm('Delete target?')) deleteTarget.mutate(id); }}
              userId={user?.id ?? ''}
            />
          )}
          {grouped.upcoming.length > 0 && (
            <TargetGroup
              title="Upcoming"
              targets={grouped.upcoming}
              today={today}
              onDelete={(id) => { if (confirm('Delete target?')) deleteTarget.mutate(id); }}
              userId={user?.id ?? ''}
            />
          )}
          {grouped.past.length > 0 && (
            <TargetGroup
              title="Past"
              targets={grouped.past}
              today={today}
              onDelete={(id) => { if (confirm('Delete target?')) deleteTarget.mutate(id); }}
              userId={user?.id ?? ''}
            />
          )}
        </>
      )}

      {showForm && (
        <TargetForm
          onClose={() => setShowForm(false)}
          onCreated={() => {
            setShowForm(false);
            queryClient.invalidateQueries({ queryKey: ['targets', user?.id] });
          }}
        />
      )}
    </div>
  );
}

function TargetGroup({
  title, targets, today, onDelete, userId
}: {
  title: string;
  targets: TargetType[];
  today: Date;
  onDelete: (id: string) => void;
  userId: string;
}) {
  return (
    <div>
      <h3 className="text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-3">{title}</h3>
      <div className="space-y-3">
        {targets.map((t) => {
          const daysLeft = differenceInDays(new Date(t.end_date), today);
          const duration = differenceInDays(new Date(t.end_date), new Date(t.start_date));
          const elapsed = differenceInDays(today, new Date(t.start_date));
          const timePct = duration > 0 ? Math.min(100, Math.round((elapsed / duration) * 100)) : 0;

          return (
            <Link
              key={t.id}
              to={`/targets/${t.id}`}
              className="card p-4 flex items-center gap-4 hover:border-primary-300 hover:shadow-md transition-all group block"
            >
              <div className="w-10 h-10 rounded-xl bg-primary-50 flex items-center justify-center flex-shrink-0">
                <Target size={20} className="text-primary-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-neutral-900 text-sm truncate">{t.name}</p>
                <div className="flex items-center gap-3 mt-1">
                  <span className="text-xs text-neutral-400">
                    {format(parseISO(t.start_date), 'MMM d')} – {format(parseISO(t.end_date), 'MMM d, yyyy')}
                  </span>
                  <span className={`text-xs font-medium flex items-center gap-1 ${
                    daysLeft < 0 ? 'text-danger-600' : daysLeft <= 3 ? 'text-warning-600' : 'text-neutral-500'
                  }`}>
                    <Clock size={11} />
                    {daysLeft < 0 ? 'Overdue' : daysLeft === 0 ? 'Due today' : `${daysLeft}d left`}
                  </span>
                </div>
                <div className="w-full bg-neutral-100 rounded-full h-1 mt-2">
                  <div className="bg-primary-400 h-1 rounded-full" style={{ width: `${timePct}%` }} />
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={(e) => { e.preventDefault(); onDelete(t.id); }}
                  className="text-neutral-200 hover:text-danger-500 transition-colors p-1 opacity-0 group-hover:opacity-100"
                >
                  <Trash2 size={15} />
                </button>
                <ChevronRight size={18} className="text-neutral-300 group-hover:text-primary-400 transition-colors" />
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

function TargetForm({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [name, setName] = useState('');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !startDate || !endDate) { setError('All fields required.'); return; }
    if (endDate <= startDate) { setError('End date must be after start date.'); return; }
    setLoading(true);
    const { error } = await supabase.from('targets').insert({ name: name.trim(), start_date: startDate, end_date: endDate });
    setLoading(false);
    if (error) { setError(error.message); return; }
    onCreated();
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="card p-6 w-full max-w-sm shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-semibold text-neutral-900">New Target</h3>
          <button onClick={onClose} className="text-neutral-400 hover:text-neutral-600"><X size={18} /></button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label">Target Name *</label>
            <input type="text" className="input" placeholder="e.g. May Review Sprint" value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Start Date *</label>
              <input type="date" className="input" value={startDate} onChange={(e) => setStartDate(e.target.value)} required />
            </div>
            <div>
              <label className="label">End Date *</label>
              <input type="date" className="input" value={endDate} onChange={(e) => setEndDate(e.target.value)} required />
            </div>
          </div>

          {error && <p className="text-danger-600 text-sm">{error}</p>}

          <div className="flex gap-2 pt-1">
            <button type="button" className="btn-secondary flex-1" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn-primary flex-1" disabled={loading}>
              {loading ? 'Creating…' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
