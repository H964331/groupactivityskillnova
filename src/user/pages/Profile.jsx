// ════════════════════════════════════════════════════════════
//  USER — pages/Profile.jsx (API-driven)
// ════════════════════════════════════════════════════════════
import { useEffect, useId, useState } from 'react';
import { Edit, Save, X, Loader2, Camera, CheckCircle } from 'lucide-react';
import { Card, SectionHeader } from '../../shared/components/UI';
import api from '../../lib/api';
import { useAuthStore } from '../../lib/auth';
import notify from '../../lib/toast';

const FIELDS = [
  { label: 'Full Name', key: 'name', type: 'text', required: true, maxLen: 80,
    validate: (v) => !v?.trim() ? 'Full name is required.' : v.trim().length < 2 ? 'Name must be at least 2 characters.' : '' },
  { label: 'Email', key: 'email', type: 'email', disabled: true },
  { label: 'Phone Number', key: 'phone', type: 'tel' },
  { label: 'Department', key: 'department', type: 'text' },
  { label: 'College', key: 'college', type: 'text' },
  { label: 'Year of Study', key: 'yearOfStudy', type: 'text' },
  { label: 'Date of Birth', key: 'dateOfBirth', type: 'date' },
  { label: 'LinkedIn Link', key: 'linkedinUrl', type: 'url',
    validate: (v) => v && !/^https?:\/\/.+/.test(v) ? 'Enter a valid URL starting with https://' : '' },
  { label: 'GitHub Link', key: 'githubUrl', type: 'url',
    validate: (v) => v && !/^https?:\/\/.+/.test(v) ? 'Enter a valid URL starting with https://' : '' },
];

const FormField = ({ field, value, editing, onChange, touched, error }) => {
  const uid = useId();
  const [focused, setFocused] = useState(false);
  const hasError = touched && !!error;
  const hasSuccess = touched && !error && value;

  const inputStyle = {
    width: '100%',
    padding: '9px 12px',
    fontSize: 14,
    borderRadius: 10,
    outline: 'none',
    fontFamily: 'inherit',
    border: `1px solid ${hasError ? '#ef4444' : hasSuccess ? '#10b981' : 'var(--border)'}`,
    background: hasError ? 'rgba(239,68,68,0.04)' : hasSuccess ? 'rgba(16,185,129,0.04)' : 'var(--input-bg)',
    color: 'var(--text)',
    boxShadow: focused ? `0 0 0 4px ${hasError ? 'rgba(239,68,68,0.12)' : hasSuccess ? 'rgba(16,185,129,0.12)' : 'rgba(37,99,235,0.12)'}` : 'none',
    opacity: editing ? 1 : 0.6,
  };

  return (
    <div>
      <label htmlFor={uid} style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 5, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 0.04 }}>
        {field.label}
        {field.required && editing && <span style={{ color: '#ff6d34' }}> *</span>}
      </label>
      <input id={uid} type={field.type} value={value ? new Date(value).toISOString?.().slice(0, 10) === value.slice(0, 10) && field.type === 'date' ? value : value : ''} disabled={!editing || field.disabled}
        onChange={onChange}
        onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
        maxLength={field.maxLen}
        style={inputStyle}
        aria-invalid={hasError ? 'true' : undefined}
      />
      {hasError && <p style={{ fontSize: 11, color: '#ef4444', marginTop: 4 }}>{error}</p>}
    </div>
  );
};

const Profile = () => {
  const { user, hydrate } = useAuthStore();
  const [editing, setEditing] = useState(false);
  const [saved, setSaved] = useState(false);
  const [profile, setProfile] = useState(null);
  const [snapshot, setSnapshot] = useState(null);
  const [touched, setTouched] = useState({});
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) return;
    setProfile({
      name: user.name ?? '',
      email: user.email ?? '',
      phone: user.phone ?? '',
      department: user.department ?? '',
      college: user.college ?? '',
      yearOfStudy: user.yearOfStudy ?? '',
      dateOfBirth: user.dateOfBirth ? new Date(user.dateOfBirth).toISOString().slice(0, 10) : '',
      linkedinUrl: user.linkedinUrl ?? '',
      githubUrl: user.githubUrl ?? '',
      bio: user.bio ?? '',
      skills: user.skills ?? '',
      avatarUrl: user.avatarUrl ?? '',
    });
  }, [user]);

  if (!profile) return <div className="flex items-center justify-center min-h-[60vh]"><Loader2 className="animate-spin" size={28} style={{ color: 'var(--muted)' }} /></div>;

  const sanitize = (name, value) => {
    if (typeof value !== 'string') return value;
    let v = value.trim();
    if (name === 'name') v = v.replace(/[<>'"&]/g, '').slice(0, 80);
    if (name === 'department' || name === 'college') v = v.replace(/[<>'"&]/g, '').slice(0, 100);
    if (name === 'yearOfStudy') v = v.replace(/[^0-9-]/g, '').slice(0, 10);
    if (name === 'linkedinUrl' || name === 'githubUrl') v = v.replace(/[<>"&]/g, '').slice(0, 255);
    return v;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setProfile((p) => ({ ...p, [name]: sanitize(name, value) }));
    setSaved(false);
    if (touched[name]) {
      const f = FIELDS.find((x) => x.key === name);
      setErrors((prev) => ({ ...prev, [name]: f?.validate ? f.validate(sanitize(name, value)) : '' }));
    }
  };

  const startEditing = () => {
    setSnapshot({ ...profile });
    setEditing(true);
    setSaved(false);
    setTouched({});
    setErrors({});
  };

  const cancel = () => {
    if (snapshot) setProfile(snapshot);
    setEditing(false);
    setTouched({});
    setErrors({});
  };

  const handlePhotoUpload = (e) => {
    if (!editing) return;
    const file = e.target.files[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setProfile((p) => ({ ...p, avatarUrl: url }));
      notify.success('Profile photo updated locally. Save to confirm.');
    }
  };

  const save = async () => {
    const newTouched = {}, newErrors = {};
    let hasError = false;
    FIELDS.forEach((f) => {
      newTouched[f.key] = true;
      const err = f.validate ? f.validate(profile[f.key]) : '';
      newErrors[f.key] = err;
      if (err) hasError = true;
    });
    setTouched(newTouched);
    setErrors(newErrors);
    if (hasError) return;

    setSaving(true);
    try {
      await api.patch(`/users/${user.id}`, {
        name: profile.name,
        department: profile.department,
        college: profile.college,
        yearOfStudy: profile.yearOfStudy,
        dateOfBirth: profile.dateOfBirth || null,
        linkedinUrl: profile.linkedinUrl,
        githubUrl: profile.githubUrl,
        phone: profile.phone,
        bio: profile.bio,
        skills: profile.skills,
        avatarUrl: profile.avatarUrl,
      });
      notify.success('Profile saved!');
      setEditing(false);
      setSaved(true);
      hydrate();
    } catch (err) {
      notify.error(err.response?.data?.error || 'Could not save profile.');
    } finally {
      setSaving(false);
    }
  };

  const hasErrors = Object.values(errors).some(Boolean);

  const allFields = ['name', 'email', 'phone', 'department', 'college', 'yearOfStudy', 'dateOfBirth', 'linkedinUrl', 'githubUrl', 'bio', 'skills'];
  const filledFields = allFields.filter(f => !!profile[f]);
  const completionPercentage = Math.round((filledFields.length / allFields.length) * 100);

  return (
    <div className="max-w-4xl space-y-6 w-full min-w-0">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <SectionHeader title="Modern Profile" subtitle="Manage your professional identity and personal information" />
        
        <div className="flex flex-col items-end min-w-[200px]">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-sm font-medium" style={{ color: 'var(--muted)' }}>Profile Completion</span>
            <span className="text-lg font-bold" style={{ color: completionPercentage === 100 ? '#10b981' : '#ff6d34' }}>{completionPercentage}%</span>
          </div>
          <div className="w-full h-2 rounded-full overflow-hidden bg-gray-200 dark:bg-gray-800">
            <div 
              className="h-full rounded-full transition-all duration-500 ease-out"
              style={{ 
                width: `${completionPercentage}%`, 
                background: completionPercentage === 100 ? '#10b981' : 'linear-gradient(90deg, #3b82f6, #8b5cf6)'
              }}
            />
          </div>
        </div>
      </div>

      <Card className="overflow-hidden shadow-xl border border-[var(--border)]">
        <div className="h-32 w-full relative" style={{ background: 'linear-gradient(135deg, #1e3a8a, #5b21b6, #db2777)' }}>
          <div className="absolute inset-0 opacity-20 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] mix-blend-overlay"></div>
        </div>

        <div className="px-6 pb-8">
          <div className="flex flex-col items-center sm:flex-row sm:items-end gap-6 -mt-16 mb-8 text-center sm:text-left relative z-10">
            <div className="relative group">
              <div className="w-32 h-32 rounded-2xl border-4 flex items-center justify-center text-4xl font-bold text-white shadow-2xl flex-shrink-0 overflow-hidden bg-white"
                style={{ background: 'linear-gradient(135deg, #2563EB, #7C3AED)', borderColor: 'var(--card)' }}>
                {profile.avatarUrl ? (
                  <img src={profile.avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  ((profile.name || '').split(' ').map((n) => n[0]).join('').slice(0, 2) || '?').toUpperCase()
                )}
              </div>
              {editing && (
                <label className="absolute bottom-2 right-2 p-2 bg-black/70 rounded-lg cursor-pointer hover:bg-black/90 transition text-white backdrop-blur-sm shadow-lg">
                  <Camera size={18} />
                  <input type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
                </label>
              )}
            </div>
            
            <div className="pb-2 flex-1 min-w-0">
              <h2 className="text-2xl font-bold break-words flex items-center justify-center sm:justify-start gap-2" style={{ color: 'var(--text)' }}>
                {profile.name}
                {completionPercentage === 100 && <CheckCircle size={20} className="text-emerald-500" />}
              </h2>
              <p className="text-md mt-1" style={{ color: 'var(--muted)' }}>{user?.role} {profile.department ? `· ${profile.department}` : ''}</p>
            </div>
            
            <div className="pb-2 w-full sm:w-auto flex gap-3">
              {!editing ? (
                <button onClick={startEditing} className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-2.5 text-sm font-semibold transition hover:shadow-lg"
                  style={{ border: '1px solid var(--border)', borderRadius: 10, color: 'var(--text)', background: 'var(--card)' }}>
                  <Edit size={16} /> Edit Profile
                </button>
              ) : (
                <>
                  <button onClick={cancel} className="flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold transition hover:bg-gray-100 dark:hover:bg-gray-800"
                    style={{ border: '1px solid var(--border)', borderRadius: 10, color: 'var(--muted)', background: 'transparent' }}>
                    <X size={16} /> Cancel
                  </button>
                  <button onClick={save} disabled={hasErrors || saving}
                    className="flex items-center justify-center gap-2 px-5 py-2.5 text-sm font-bold text-white transition hover:shadow-lg hover:scale-[1.02]"
                    style={{ background: hasErrors ? '#6b7280' : 'linear-gradient(135deg, #10b981, #059669)', borderRadius: 10, opacity: hasErrors ? 0.7 : 1 }}>
                    {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} Save Changes
                  </button>
                </>
              )}
            </div>
          </div>

          {saved && (
            <div className="flex items-center gap-3 px-5 py-3 mb-6 text-sm font-medium rounded-xl shadow-sm" style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)', color: '#059669' }}>
              <CheckCircle size={18} /> Profile saved successfully.
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-5">
              <h3 className="text-lg font-bold border-b pb-2" style={{ borderColor: 'var(--border)', color: 'var(--text)' }}>Personal Details</h3>
              {FIELDS.slice(0, 5).map((field) => (
                <FormField key={field.key} field={field} value={profile[field.key]}
                  editing={editing && !field.disabled} onChange={(e) => handleChange({ target: { name: field.key, value: e.target.value } })}
                  touched={touched[field.key]} error={errors[field.key]} />
              ))}
            </div>

            <div className="space-y-5">
              <h3 className="text-lg font-bold border-b pb-2" style={{ borderColor: 'var(--border)', color: 'var(--text)' }}>Professional Info</h3>
              {FIELDS.slice(5).map((field) => (
                <FormField key={field.key} field={field} value={profile[field.key]}
                  editing={editing && !field.disabled} onChange={(e) => handleChange({ target: { name: field.key, value: e.target.value } })}
                  touched={touched[field.key]} error={errors[field.key]} />
              ))}
            </div>

            <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6 mt-2">
              <div>
                <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wider text-[var(--muted)]">Bio</label>
                <textarea name="bio" value={profile.bio} disabled={!editing}
                  onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
                  placeholder="Tell us about yourself..."
                  rows={4} className="w-full p-3 text-sm rounded-xl border border-[var(--border)] bg-[var(--input-bg)] text-[var(--text)] focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition disabled:opacity-60 resize-none" />
              </div>
              
              <div>
                <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wider text-[var(--muted)]">Skills</label>
                <textarea name="skills" value={profile.skills} disabled={!editing}
                  onChange={(e) => setProfile({ ...profile, skills: e.target.value })}
                  placeholder="React, Node.js, Python..."
                  rows={4} className="w-full p-3 text-sm rounded-xl border border-[var(--border)] bg-[var(--input-bg)] text-[var(--text)] focus:ring-4 focus:ring-purple-500/10 focus:border-purple-500 outline-none transition disabled:opacity-60 resize-none" />
              </div>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default Profile;
