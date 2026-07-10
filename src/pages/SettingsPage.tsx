import React, { useState, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { useQueryClient } from '@tanstack/react-query';
import { User, Link2, Save, Download, Upload, CheckCircle2, AlertCircle } from 'lucide-react';
import type { PastPaper, TopicSet, Target, MathP2QuestionResult } from '../types';

type ExportData = {
  exported_at: string;
  past_papers: PastPaper[];
  topic_sets: TopicSet[];
  targets: (Target & { items: any[] })[];
  math_p2_question_results: MathP2QuestionResult[];
};

export default function SettingsPage() {
  const { user, profile, refreshProfile } = useAuth();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [displayName, setDisplayName] = useState(profile?.display_name ?? '');
  const [studentEmail, setStudentEmail] = useState('');
  const [saving, setSaving] = useState(false);
  const [linking, setLinking] = useState(false);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);
  const [linkMsg, setLinkMsg] = useState<string | null>(null);
  const [linkError, setLinkError] = useState<string | null>(null);

  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);
  const [dataMsg, setDataMsg] = useState<string | null>(null);
  const [dataError, setDataError] = useState<string | null>(null);

  const saveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const { error } = await supabase
      .from('profiles')
      .update({ display_name: displayName.trim() })
      .eq('id', user!.id);
    setSaving(false);
    if (error) { setSaveMsg('Failed to save.'); return; }
    await refreshProfile();
    setSaveMsg('Saved!');
    setTimeout(() => setSaveMsg(null), 3000);
  };

  const linkStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    setLinkError(null);
    setLinkMsg(null);
    setLinking(true);

    const { data: studentProfile } = await supabase
      .from('profiles')
      .select('id, role, display_name')
      .eq('email', studentEmail.trim().toLowerCase())
      .eq('role', 'student')
      .maybeSingle();

    if (!studentProfile) {
      setLinkError('No student account found with that email.');
      setLinking(false);
      return;
    }

    const { error } = await supabase
      .from('profiles')
      .update({ linked_student_id: studentProfile.id })
      .eq('id', user!.id);

    setLinking(false);
    if (error) { setLinkError(error.message); return; }
    await refreshProfile();
    setLinkMsg(`Linked to ${studentProfile.display_name ?? studentEmail}!`);
    setStudentEmail('');
  };

  // ─── Export ────────────────────────────────────────────────────────────────
  const handleExport = async () => {
    setExporting(true);
    setDataError(null);
    setDataMsg(null);
    try {
      const [papers, topicSets, targets, mathP2] = await Promise.all([
        supabase.from('past_papers').select('*').eq('user_id', user!.id),
        supabase.from('topic_sets').select('*').eq('user_id', user!.id),
        supabase.from('targets').select('*').eq('user_id', user!.id),
        supabase.from('math_p2_question_results').select('*').eq('user_id', user!.id),
      ]);

      if (papers.error) throw papers.error;
      if (topicSets.error) throw topicSets.error;
      if (targets.error) throw targets.error;
      if (mathP2.error) throw mathP2.error;

      // Fetch target_items for each target
      const targetsWithItems = await Promise.all(
        (targets.data ?? []).map(async (t) => {
          const { data: items, error } = await supabase
            .from('target_items')
            .select('*')
            .eq('target_id', t.id);
          if (error) throw error;
          return { ...t, items: items ?? [] };
        })
      );

      const exportData: ExportData = {
        exported_at: new Date().toISOString(),
        past_papers: papers.data ?? [],
        topic_sets: topicSets.data ?? [],
        targets: targetsWithItems,
        math_p2_question_results: mathP2.data ?? [],
      };

      const json = JSON.stringify(exportData, null, 2);
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `dse-progress-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      const total = exportData.past_papers.length + exportData.topic_sets.length + exportData.targets.length + exportData.math_p2_question_results.length;
      setDataMsg(`Exported ${total} records successfully.`);
      setTimeout(() => setDataMsg(null), 5000);
    } catch (err: any) {
      setDataError(err.message ?? 'Export failed.');
    } finally {
      setExporting(false);
    }
  };

  // ─── Import ────────────────────────────────────────────────────────────────
  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImporting(true);
    setDataError(null);
    setDataMsg(null);

    try {
      const text = await file.text();
      const data = JSON.parse(text) as ExportData;

      let counts = { papers: 0, topicSets: 0, targets: 0, mathP2: 0 };

      // Past papers — upsert by unique (subject_id, year, paper_number)
      if (data.past_papers?.length) {
        const rows = data.past_papers.map((p) => ({
          subject_id: p.subject_id,
          year: p.year,
          paper_number: p.paper_number,
          status: p.status,
          score: p.score ?? null,
          completion_date: p.completion_date ?? null,
          notes: p.notes ?? null,
        }));
        const { error } = await supabase
          .from('past_papers')
          .upsert(rows, { onConflict: 'user_id,subject_id,year,paper_number' });
        if (error) throw error;
        counts.papers = rows.length;
      }

      // Math P2 question results — upsert by unique (year, question_number)
      if (data.math_p2_question_results?.length) {
        const rows = data.math_p2_question_results.map((r) => ({
          year: r.year,
          question_number: r.question_number,
          result: r.result,
        }));
        const { error } = await supabase
          .from('math_p2_question_results')
          .upsert(rows, { onConflict: 'user_id,year,question_number' });
        if (error) throw error;
        counts.mathP2 = rows.length;
      }

      // Topic sets — upsert by id (re-insert with new ids to avoid collisions)
      if (data.topic_sets?.length) {
        const rows = data.topic_sets.map((ts) => ({
          subject_id: ts.subject_id,
          name: ts.name,
          topic_tag: ts.topic_tag ?? null,
          estimated_difficulty: ts.estimated_difficulty ?? null,
          estimated_time_minutes: ts.estimated_time_minutes ?? null,
          status: ts.status,
          created_by_role: ts.created_by_role,
        }));
        const { data: inserted, error } = await supabase
          .from('topic_sets')
          .insert(rows)
          .select('id, name');
        if (error) throw error;
        counts.topicSets = inserted?.length ?? 0;
      }

      // Targets — insert new copies (with items)
      if (data.targets?.length) {
        for (const t of data.targets) {
          const { data: newTarget, error: tErr } = await supabase
            .from('targets')
            .insert({
              name: t.name,
              start_date: t.start_date,
              end_date: t.end_date,
            })
            .select('id')
            .single();
          if (tErr) throw tErr;

          if (t.items?.length) {
            const itemRows = t.items.map((item: any) => ({
              target_id: newTarget.id,
              subject_id: item.subject_id ?? null,
              item_type: item.item_type,
              item_ref_id: item.item_ref_id ?? null,
              required_count: item.required_count,
              completed_count: item.completed_count,
              sort_order: item.sort_order,
            }));
            const { error: iErr } = await supabase.from('target_items').insert(itemRows);
            if (iErr) throw iErr;
          }
          counts.targets++;
        }
      }

      queryClient.invalidateQueries();
      const total = counts.papers + counts.topicSets + counts.targets + counts.mathP2;
      setDataMsg(`Imported ${total} records (${counts.papers} papers, ${counts.mathP2} Q45 tags, ${counts.topicSets} topic sets, ${counts.targets} targets).`);
      setTimeout(() => setDataMsg(null), 8000);
    } catch (err: any) {
      setDataError(err.message ?? 'Import failed. Check the file format.');
    } finally {
      setImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div className="max-w-lg space-y-6">
      {/* Profile */}
      <div className="card p-6">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-9 h-9 bg-primary-100 rounded-lg flex items-center justify-center">
            <User size={18} className="text-primary-600" />
          </div>
          <div>
            <h3 className="font-semibold text-neutral-900">Profile</h3>
            <p className="text-xs text-neutral-400">{profile?.email}</p>
          </div>
        </div>

        <form onSubmit={saveProfile} className="space-y-4">
          <div>
            <label className="label">Display Name</label>
            <input
              type="text"
              className="input"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
            />
          </div>
          <div>
            <label className="label">Role</label>
            <div className={`badge ${profile?.role === 'parent' ? 'badge-primary' : 'badge-success'} text-sm`}>
              {profile?.role}
            </div>
          </div>

          <button type="submit" className="btn-primary" disabled={saving}>
            <Save size={15} />
            {saving ? 'Saving…' : 'Save Changes'}
          </button>
          {saveMsg && <p className="text-success-600 text-sm">{saveMsg}</p>}
        </form>
      </div>

      {/* Parent: link student */}
      {profile?.role === 'parent' && (
        <div className="card p-6">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-9 h-9 bg-success-100 rounded-lg flex items-center justify-center">
              <Link2 size={18} className="text-success-600" />
            </div>
            <div>
              <h3 className="font-semibold text-neutral-900">Link Student</h3>
              <p className="text-xs text-neutral-400">
                {profile.linked_student_id ? 'Currently linked to a student account.' : 'Not linked to any student.'}
              </p>
            </div>
          </div>

          <form onSubmit={linkStudent} className="space-y-4">
            <div>
              <label className="label">Student's Email</label>
              <input
                type="email"
                className="input"
                placeholder="student@example.com"
                value={studentEmail}
                onChange={(e) => setStudentEmail(e.target.value)}
                required
              />
            </div>
            {linkError && <p className="text-danger-600 text-sm">{linkError}</p>}
            {linkMsg && <p className="text-success-600 text-sm">{linkMsg}</p>}
            <button type="submit" className="btn-primary" disabled={linking}>
              <Link2 size={15} />
              {linking ? 'Linking…' : 'Link Student'}
            </button>
          </form>
        </div>
      )}

      {/* Data Export / Import */}
      <div className="card p-6">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-9 h-9 bg-primary-100 rounded-lg flex items-center justify-center">
            <Download size={18} className="text-primary-600" />
          </div>
          <div>
            <h3 className="font-semibold text-neutral-900">Data Backup</h3>
            <p className="text-xs text-neutral-400">
              Export all progress (past papers, Q45 tags, topic sets, targets) or import from a backup file.
            </p>
          </div>
        </div>

        <div className="space-y-3">
          <button
            onClick={handleExport}
            disabled={exporting}
            className="btn-secondary w-full justify-center"
          >
            <Download size={15} />
            {exporting ? 'Exporting…' : 'Export All Data'}
          </button>

          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={importing}
            className="btn-secondary w-full justify-center"
          >
            <Upload size={15} />
            {importing ? 'Importing…' : 'Import from File'}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={handleImportFile}
          />
        </div>

        {dataMsg && (
          <div className="mt-4 flex items-start gap-2 p-3 rounded-lg bg-success-50 text-success-700 text-sm">
            <CheckCircle2 size={16} className="mt-0.5 flex-shrink-0" />
            <span>{dataMsg}</span>
          </div>
        )}
        {dataError && (
          <div className="mt-4 flex items-start gap-2 p-3 rounded-lg bg-danger-50 text-danger-700 text-sm">
            <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
            <span>{dataError}</span>
          </div>
        )}
      </div>
    </div>
  );
}
