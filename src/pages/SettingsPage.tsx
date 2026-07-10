import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { useQueryClient } from '@tanstack/react-query';
import { User, Link2, Save } from 'lucide-react';

export default function SettingsPage() {
  const { user, profile, refreshProfile } = useAuth();
  const queryClient = useQueryClient();

  const [displayName, setDisplayName] = useState(profile?.display_name ?? '');
  const [studentEmail, setStudentEmail] = useState('');
  const [saving, setSaving] = useState(false);
  const [linking, setLinking] = useState(false);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);
  const [linkMsg, setLinkMsg] = useState<string | null>(null);
  const [linkError, setLinkError] = useState<string | null>(null);

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
    </div>
  );
}
