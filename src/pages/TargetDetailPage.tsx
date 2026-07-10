import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { ArrowLeft, Plus, Trash2, X, CheckCircle2 } from 'lucide-react';
import { differenceInDays, format, parseISO } from 'date-fns';
import type { Target, TargetItem, Subject } from '../types';

const ITEM_TYPE_LABELS: Record<string, string> = {
  past_paper_year: 'Past Paper Year',
  past_paper_paper: 'Past Paper (specific)',
  topic_set: 'Topic Set',
  topic: 'Topic',
};

export default function TargetDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [showAddItem, setShowAddItem] = useState(false);

  const { data: target } = useQuery<Target>({
    queryKey: ['target', id],
    queryFn: async () => {
      const { data, error } = await supabase.from('targets').select('*').eq('id', id!).maybeSingle();
      if (error) throw error;
      return data!;
    },
    enabled: !!id,
  });

  const { data: items = [] } = useQuery<TargetItem[]>({
    queryKey: ['target-items', id],
    queryFn: async () => {
      const { data, error } = await supabase.from('target_items').select('*').eq('target_id', id!).order('sort_order');
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const { data: subjects = [] } = useQuery<Subject[]>({
    queryKey: ['subjects'],
    queryFn: async () => {
      const { data, error } = await supabase.from('subjects').select('*').order('sort_order');
      if (error) throw error;
      return data;
    },
  });

  const updateItem = useMutation({
    mutationFn: async ({ itemId, completed_count }: { itemId: string; completed_count: number }) => {
      const { error } = await supabase.from('target_items').update({ completed_count }).eq('id', itemId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['target-items', id] });
      queryClient.invalidateQueries({ queryKey: ['target-items', user?.id] });
    },
  });

  const deleteItem = useMutation({
    mutationFn: async (itemId: string) => {
      const { error } = await supabase.from('target_items').delete().eq('id', itemId);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['target-items', id] }),
  });

  if (!target) return <div className="text-neutral-400 py-12 text-center">Loading…</div>;

  const today = new Date();
  const daysLeft = differenceInDays(new Date(target.end_date), today);
  const totalRequired = items.reduce((s, i) => s + i.required_count, 0);
  const totalCompleted = items.reduce((s, i) => s + i.completed_count, 0);
  const overallPct = totalRequired > 0 ? Math.round((totalCompleted / totalRequired) * 100) : 0;

  return (
    <div className="max-w-3xl space-y-6">
      <button
        onClick={() => navigate('/targets')}
        className="flex items-center gap-2 text-sm text-neutral-500 hover:text-neutral-800 transition-colors"
      >
        <ArrowLeft size={16} /> Back to Targets
      </button>

      {/* Header */}
      <div className="card p-6">
        <h2 className="text-xl font-bold text-neutral-900 mb-1">{target.name}</h2>
        <p className="text-sm text-neutral-500">
          {format(parseISO(target.start_date), 'MMM d')} – {format(parseISO(target.end_date), 'MMM d, yyyy')}
          {' · '}
          <span className={daysLeft < 0 ? 'text-danger-600 font-medium' : daysLeft <= 3 ? 'text-warning-600 font-medium' : ''}>
            {daysLeft < 0 ? 'Overdue' : daysLeft === 0 ? 'Due today' : `${daysLeft} days left`}
          </span>
        </p>

        {/* Progress */}
        <div className="mt-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-neutral-700">Overall Progress</span>
            <span className="text-lg font-bold text-primary-600">{overallPct}%</span>
          </div>
          <div className="w-full bg-neutral-100 rounded-full h-3">
            <div
              className="bg-primary-500 h-3 rounded-full transition-all"
              style={{ width: `${overallPct}%` }}
            />
          </div>
          <p className="text-xs text-neutral-400 mt-1.5">{totalCompleted} of {totalRequired} items completed</p>
        </div>
      </div>

      {/* Items */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-neutral-800">Target Items</h3>
          <button className="btn-primary text-xs px-3 py-1.5" onClick={() => setShowAddItem(true)}>
            <Plus size={14} /> Add Item
          </button>
        </div>

        {items.length === 0 ? (
          <div className="card p-8 text-center">
            <p className="text-neutral-400 text-sm">No items yet. Add items to track your progress.</p>
            <button className="btn-primary mt-3 text-xs px-3 py-1.5" onClick={() => setShowAddItem(true)}>
              <Plus size={14} /> Add First Item
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            {items.map((item) => {
              const subject = subjects.find((s) => s.id === item.subject_id);
              const pct = item.required_count > 0 ? Math.round((item.completed_count / item.required_count) * 100) : 0;
              const done = item.completed_count >= item.required_count;

              return (
                <div key={item.id} className={`card p-4 flex items-center gap-3 ${done ? 'opacity-75' : ''}`}>
                  <button
                    onClick={() => {
                      const next = done ? 0 : item.required_count;
                      updateItem.mutate({ itemId: item.id, completed_count: next });
                    }}
                    className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                      done ? 'border-success-500 bg-success-500' : 'border-neutral-300 hover:border-primary-400'
                    }`}
                  >
                    {done && <CheckCircle2 size={14} className="text-white" />}
                  </button>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-sm font-medium ${done ? 'line-through text-neutral-400' : 'text-neutral-800'}`}>
                        {ITEM_TYPE_LABELS[item.item_type]}
                        {item.item_ref_id && <span className="font-normal text-neutral-500"> — {item.item_ref_id}</span>}
                      </span>
                      {subject && <span className="badge-primary badge">{subject.name}</span>}
                    </div>
                    {item.required_count > 1 && (
                      <div className="flex items-center gap-2 mt-1.5">
                        <div className="flex-1 bg-neutral-100 rounded-full h-1">
                          <div className="bg-primary-400 h-1 rounded-full" style={{ width: `${pct}%` }} />
                        </div>
                        <span className="text-xs text-neutral-400">{item.completed_count}/{item.required_count}</span>
                      </div>
                    )}
                  </div>

                  {item.required_count > 1 && (
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => updateItem.mutate({ itemId: item.id, completed_count: Math.max(0, item.completed_count - 1) })}
                        className="w-6 h-6 rounded border border-neutral-200 text-neutral-500 hover:bg-neutral-100 text-xs font-bold"
                      >−</button>
                      <span className="text-xs font-medium w-6 text-center">{item.completed_count}</span>
                      <button
                        onClick={() => updateItem.mutate({ itemId: item.id, completed_count: Math.min(item.required_count, item.completed_count + 1) })}
                        className="w-6 h-6 rounded border border-neutral-200 text-neutral-500 hover:bg-neutral-100 text-xs font-bold"
                      >+</button>
                    </div>
                  )}

                  <button
                    onClick={() => deleteItem.mutate(item.id)}
                    className="text-neutral-200 hover:text-danger-500 transition-colors p-1"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {showAddItem && (
        <AddItemForm
          targetId={id!}
          subjects={subjects}
          onClose={() => setShowAddItem(false)}
          onAdded={() => {
            setShowAddItem(false);
            queryClient.invalidateQueries({ queryKey: ['target-items', id] });
          }}
        />
      )}
    </div>
  );
}

function AddItemForm({
  targetId, subjects, onClose, onAdded,
}: {
  targetId: string;
  subjects: Subject[];
  onClose: () => void;
  onAdded: () => void;
}) {
  const [subjectId, setSubjectId] = useState(subjects[0]?.id ?? '');
  const [itemType, setItemType] = useState<'past_paper_year' | 'past_paper_paper' | 'topic_set' | 'topic'>('past_paper_year');
  const [itemRef, setItemRef] = useState('');
  const [requiredCount, setRequiredCount] = useState('1');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.from('target_items').insert({
      target_id: targetId,
      subject_id: subjectId || null,
      item_type: itemType,
      item_ref_id: itemRef.trim() || null,
      required_count: parseInt(requiredCount) || 1,
    });
    setLoading(false);
    if (error) { setError(error.message); return; }
    onAdded();
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="card p-6 w-full max-w-sm shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-semibold text-neutral-900">Add Target Item</h3>
          <button onClick={onClose} className="text-neutral-400 hover:text-neutral-600"><X size={18} /></button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label">Subject</label>
            <select className="input" value={subjectId} onChange={(e) => setSubjectId(e.target.value)}>
              <option value="">— Any —</option>
              {subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Item Type</label>
            <select className="input" value={itemType} onChange={(e) => setItemType(e.target.value as typeof itemType)}>
              {Object.entries(ITEM_TYPE_LABELS).map(([v, l]) => (
                <option key={v} value={v}>{l}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Reference (optional)</label>
            <input
              type="text"
              className="input"
              placeholder={itemType === 'past_paper_year' ? 'e.g. 2022' : itemType === 'past_paper_paper' ? 'e.g. 2022 Paper 1' : 'e.g. Set name / topic'}
              value={itemRef}
              onChange={(e) => setItemRef(e.target.value)}
            />
          </div>
          <div>
            <label className="label">Required Count</label>
            <input type="number" className="input" min={1} value={requiredCount} onChange={(e) => setRequiredCount(e.target.value)} />
          </div>

          {error && <p className="text-danger-600 text-sm">{error}</p>}

          <div className="flex gap-2 pt-1">
            <button type="button" className="btn-secondary flex-1" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn-primary flex-1" disabled={loading}>
              {loading ? 'Adding…' : 'Add Item'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
