import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { CheckCircle2, Circle, Clock, ChevronDown, ChevronUp, Edit2, Grid3x3 } from 'lucide-react';
import type { Subject, PastPaper, PaperStatus, MathP2QuestionResult, QuestionResultValue } from '../types';

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

const STATUS_CONFIG: Record<PaperStatus, { label: string; icon: React.ReactNode; color: string; bg: string; ring: string }> = {
  not_started: {
    label: 'Not Started',
    icon: <Circle size={15} />,
    color: 'text-neutral-400',
    bg: 'bg-white',
    ring: 'ring-neutral-200',
  },
  in_progress: {
    label: 'In Progress',
    icon: <Clock size={15} />,
    color: 'text-warning-600',
    bg: 'bg-warning-50',
    ring: 'ring-warning-300',
  },
  completed: {
    label: 'Done',
    icon: <CheckCircle2 size={15} />,
    color: 'text-success-600',
    bg: 'bg-success-50',
    ring: 'ring-success-300',
  },
};

const Q_RESULT_CYCLE: QuestionResultValue[] = ['not_taught', 'right', 'wrong'];

const Q_RESULT_STYLE: Record<QuestionResultValue, { bg: string; text: string; label: string }> = {
  not_taught: { bg: 'bg-neutral-200',  text: 'text-neutral-500', label: 'Not taught' },
  right:      { bg: 'bg-green-500',    text: 'text-white',        label: 'Right'      },
  wrong:      { bg: 'bg-red-500',      text: 'text-white',        label: 'Wrong'      },
};

export default function PastPapersPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const [expandedSubject, setExpandedSubject] = useState<string | null>(
    searchParams.get('subject')
  );
  useEffect(() => {
    const s = searchParams.get('subject');
    if (s) setExpandedSubject(s);
  }, [searchParams]);
  const [editingPaper, setEditingPaper] = useState<PastPaper | null>(null);
  const [q45Year, setQ45Year] = useState<number | null>(null);

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

  const updatePaper = useMutation({
    mutationFn: async ({
      subjectId, year, paperNumber, status, score, notes
    }: {
      subjectId: string; year: number; paperNumber: number;
      status: PaperStatus; score?: number | null; notes?: string | null;
    }) => {
      const completionDate = status === 'completed' ? new Date().toISOString().split('T')[0] : null;

      const { data: existing, error: fetchError } = await supabase
        .from('past_papers')
        .select('id')
        .eq('subject_id', subjectId)
        .eq('year', year)
        .eq('paper_number', paperNumber)
        .eq('user_id', (await supabase.auth.getUser()).data.user!.id)
        .maybeSingle();
      if (fetchError) throw fetchError;

      if (existing) {
        const { error } = await supabase
          .from('past_papers')
          .update({ status, score: score ?? null, notes: notes ?? null, completion_date: completionDate, updated_at: new Date().toISOString() })
          .eq('id', existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('past_papers').insert({
          subject_id: subjectId, year, paper_number: paperNumber, status,
          score: score ?? null, notes: notes ?? null,
          completion_date: completionDate,
        });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['past-papers', user?.id] });
      setEditingPaper(null);
    },
  });

  const getPaper = (subjectId: string, year: number, paperNum: number) =>
    papers.find((p) => p.subject_id === subjectId && p.year === year && p.paper_number === paperNum);

  const cycleStatus = (subjectId: string, year: number, paperNum: number) => {
    const paper = getPaper(subjectId, year, paperNum);
    const current: PaperStatus = paper?.status ?? 'not_started';
    const next: PaperStatus = current === 'not_started' ? 'in_progress' : current === 'in_progress' ? 'completed' : 'not_started';
    updatePaper.mutate({ subjectId, year, paperNumber: paperNum, status: next, score: null, notes: null });
  };

  return (
    <div className="max-w-5xl space-y-4">
      <p className="text-sm text-neutral-500">
        Click a cell to cycle status. Use the edit icon for score and notes.
      </p>

      {subjects.map((subject) => {
        const paperNums = PAPERS_PER_SUBJECT[subject.id] ?? [1, 2];
        const subjectPapers = papers.filter((p) => p.subject_id === subject.id);
        const completed = subjectPapers.filter((p) => p.status === 'completed').length;
        const total = YEARS.length * paperNums.length;
        const pct = Math.round((completed / total) * 100);
        const isExpanded = expandedSubject === subject.id;
        const isMath = subject.id === 'math';

        return (
          <div key={subject.id} className="card overflow-hidden">
            <button
              className="w-full flex items-center justify-between px-5 py-4 hover:bg-neutral-50 transition-colors"
              onClick={() => setExpandedSubject(isExpanded ? null : subject.id)}
            >
              <div className="flex items-center gap-4">
                <span className="font-semibold text-neutral-900">{subject.name}</span>
                <div className="hidden sm:flex items-center gap-3">
                  <div className="w-24 bg-neutral-100 rounded-full h-1.5">
                    <div className="bg-primary-500 h-1.5 rounded-full" style={{ width: `${pct}%` }} />
                  </div>
                  <span className="text-sm text-neutral-500">{completed}/{total} done</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="badge-primary badge">{pct}%</span>
                {isExpanded ? <ChevronUp size={18} className="text-neutral-400" /> : <ChevronDown size={18} className="text-neutral-400" />}
              </div>
            </button>

            {isExpanded && (
              <div className="px-5 pb-5 overflow-x-auto">
                <table className="w-full text-sm border-collapse min-w-[480px]">
                  <thead>
                    <tr>
                      <th className="text-left py-2 pr-4 text-neutral-500 font-medium text-xs w-16">Year</th>
                      {paperNums.map((n) => (
                        <th key={n} className="text-center py-2 px-2 text-neutral-500 font-medium text-xs">
                          Paper {n}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {YEARS.map((year) => (
                      <tr key={year} className="border-t border-neutral-100">
                        <td className="py-2 pr-4 text-neutral-700 font-medium">{year}</td>
                        {paperNums.map((num) => {
                          const paper = getPaper(subject.id, year, num);
                          const status: PaperStatus = paper?.status ?? 'not_started';
                          const cfg = STATUS_CONFIG[status];
                          const showQ45 = isMath && num === 2;
                          return (
                            <td key={num} className="py-2 px-2 text-center">
                              <div className="inline-flex items-center gap-1 flex-wrap justify-center">
                                <button
                                  onClick={() => cycleStatus(subject.id, year, num)}
                                  className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full ring-1 text-xs font-medium transition-all hover:opacity-80 ${cfg.color} ${cfg.bg} ${cfg.ring}`}
                                >
                                  {cfg.icon}
                                  <span className="hidden sm:inline">{cfg.label}</span>
                                </button>
                                <button
                                  onClick={() => setEditingPaper(paper ?? {
                                    id: '', user_id: '', subject_id: subject.id,
                                    year, paper_number: num, status: 'not_started',
                                    score: null, completion_date: null, notes: null,
                                    created_at: '', updated_at: '',
                                  })}
                                  className="text-neutral-300 hover:text-neutral-600 transition-colors"
                                >
                                  <Edit2 size={13} />
                                </button>
                                {showQ45 && (
                                  <button
                                    title="Tag 45 questions"
                                    onClick={() => setQ45Year(year)}
                                    className="text-neutral-300 hover:text-primary-500 transition-colors"
                                  >
                                    <Grid3x3 size={13} />
                                  </button>
                                )}
                              </div>
                              {paper?.score != null && (
                                <div className="text-xs text-neutral-400 mt-0.5">{paper.score}%</div>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        );
      })}

      {editingPaper && (
        <PaperEditModal
          paper={editingPaper}
          onSave={(status, score, notes) => {
            updatePaper.mutate({
              subjectId: editingPaper.subject_id,
              year: editingPaper.year,
              paperNumber: editingPaper.paper_number,
              status, score, notes,
            });
          }}
          onClose={() => setEditingPaper(null)}
          saving={updatePaper.isPending}
        />
      )}

      {q45Year !== null && (
        <Q45Modal year={q45Year} onClose={() => setQ45Year(null)} />
      )}
    </div>
  );
}

function Q45Modal({ year, onClose }: { year: number; onClose: () => void }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: results = [] } = useQuery<MathP2QuestionResult[]>({
    queryKey: ['math-p2-questions', user?.id, year],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('math_p2_question_results')
        .select('*')
        .eq('year', year);
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const upsertResult = useMutation({
    mutationFn: async ({ questionNumber, result }: { questionNumber: number; result: QuestionResultValue }) => {
      const { error } = await supabase
        .from('math_p2_question_results')
        .upsert(
          { year, question_number: questionNumber, result, updated_at: new Date().toISOString() },
          { onConflict: 'user_id,year,question_number' }
        );
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['math-p2-questions', user?.id, year] });
    },
  });

  const getResult = (qn: number): QuestionResultValue =>
    (results.find((r) => r.question_number === qn)?.result as QuestionResultValue) ?? 'not_taught';

  const cycleResult = (qn: number) => {
    const current = getResult(qn);
    const idx = Q_RESULT_CYCLE.indexOf(current);
    const next = Q_RESULT_CYCLE[(idx + 1) % Q_RESULT_CYCLE.length];
    upsertResult.mutate({ questionNumber: qn, result: next });
  };

  const counts = Q_RESULT_CYCLE.reduce<Record<QuestionResultValue, number>>(
    (acc, r) => ({ ...acc, [r]: results.filter((x) => x.result === r).length }),
    { not_taught: 0, right: 0, wrong: 0 }
  );
  const notTagged = 45 - results.length;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="card p-6 w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-1">
          <h3 className="font-semibold text-neutral-900">Math Paper 2 — {year}</h3>
          <button onClick={onClose} className="text-neutral-400 hover:text-neutral-700 text-lg leading-none">✕</button>
        </div>
        <p className="text-xs text-neutral-400 mb-4">Click a question to cycle: Grey → Green → Red → Grey</p>

        {/* Summary */}
        <div className="flex gap-3 mb-5 text-xs font-medium">
          <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-green-100 text-green-700">
            <span className="w-2 h-2 rounded-full bg-green-500 inline-block" />
            {counts.right} right
          </span>
          <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-100 text-red-700">
            <span className="w-2 h-2 rounded-full bg-red-500 inline-block" />
            {counts.wrong} wrong
          </span>
          <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-neutral-100 text-neutral-600">
            <span className="w-2 h-2 rounded-full bg-neutral-400 inline-block" />
            {counts.not_taught} not taught
          </span>
          {notTagged > 0 && (
            <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-neutral-50 text-neutral-400">
              {notTagged} untagged
            </span>
          )}
        </div>

        {/* 45-question grid: 9 columns × 5 rows */}
        <div className="grid grid-cols-9 gap-1.5">
          {Array.from({ length: 45 }, (_, i) => i + 1).map((qn) => {
            const result = getResult(qn);
            const style = Q_RESULT_STYLE[result];
            return (
              <button
                key={qn}
                onClick={() => cycleResult(qn)}
                title={`Q${qn}: ${style.label}`}
                className={`aspect-square rounded-lg text-xs font-bold transition-all hover:scale-110 active:scale-95 ${style.bg} ${style.text}`}
              >
                {qn}
              </button>
            );
          })}
        </div>

        {/* Legend */}
        <div className="flex gap-4 mt-5 text-xs text-neutral-500 flex-wrap">
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-neutral-200 inline-block" /> Not taught</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-green-500 inline-block" /> Right</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-red-500 inline-block" /> Wrong</span>
        </div>
      </div>
    </div>
  );
}

function PaperEditModal({
  paper, onSave, onClose, saving,
}: {
  paper: PastPaper;
  onSave: (status: PaperStatus, score: number | null, notes: string | null) => void;
  onClose: () => void;
  saving: boolean;
}) {
  const [status, setStatus] = useState<PaperStatus>(paper.status);
  const [score, setScore] = useState(paper.score?.toString() ?? '');
  const [notes, setNotes] = useState(paper.notes ?? '');

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="card p-6 w-full max-w-sm shadow-xl" onClick={(e) => e.stopPropagation()}>
        <h3 className="font-semibold text-neutral-900 mb-4">
          Edit {paper.subject_id.toUpperCase()} {paper.year} Paper {paper.paper_number}
        </h3>

        <div className="space-y-4">
          <div>
            <label className="label">Status</label>
            <div className="flex gap-2">
              {(['not_started', 'in_progress', 'completed'] as PaperStatus[]).map((s) => (
                <button
                  key={s}
                  onClick={() => setStatus(s)}
                  className={`flex-1 py-1.5 text-xs rounded-lg border font-medium transition-all ${
                    status === s
                      ? 'border-primary-500 bg-primary-50 text-primary-700'
                      : 'border-neutral-200 text-neutral-600'
                  }`}
                >
                  {STATUS_CONFIG[s].label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="label">Score (%)</label>
            <input
              type="number"
              min={0}
              max={100}
              className="input"
              placeholder="e.g. 72"
              value={score}
              onChange={(e) => setScore(e.target.value)}
            />
          </div>

          <div>
            <label className="label">Notes</label>
            <textarea
              className="input resize-none"
              rows={2}
              placeholder="Any notes about this paper…"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
        </div>

        <div className="flex gap-2 mt-5">
          <button className="btn-secondary flex-1" onClick={onClose}>Cancel</button>
          <button
            className="btn-primary flex-1"
            disabled={saving}
            onClick={() => onSave(status, score ? parseFloat(score) : null, notes || null)}
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}
