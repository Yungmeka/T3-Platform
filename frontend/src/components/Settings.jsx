import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabase';

/* ─── Shared input class (mirrors AuthPage) ──────────────────────── */
const INPUT_CLASS =
  'w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-slate-800 text-sm ' +
  'placeholder:text-slate-400 outline-none transition-all duration-200 ' +
  'focus:border-violet-400 focus:ring-1 focus:ring-violet-400';

const INPUT_READONLY_CLASS =
  'w-full px-4 py-3 rounded-xl border border-slate-100 bg-slate-50 text-slate-500 text-sm ' +
  'outline-none cursor-not-allowed select-all';

/* ─── SVG Icons ─────────────────────────────────────────────────── */
const IconCheck = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
  </svg>
);

const IconWarning = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
  </svg>
);

const IconUser = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
  </svg>
);

const IconLock = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
  </svg>
);

const IconShield = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m0-10.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.75c0 5.592 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.249-8.25-3.286z" />
  </svg>
);

const IconLogout = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" />
  </svg>
);

const IconTrash = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
  </svg>
);

/* ─── Spinner ────────────────────────────────────────────────────── */
const Spinner = () => (
  <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin inline-block" />
);

/* ─── Toast ──────────────────────────────────────────────────────── */
function Toast({ toast, onDismiss }) {
  if (!toast) return null;
  const isError = toast.type === 'error';
  return (
    <div
      className="fixed bottom-6 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-2xl shadow-lg animate-fade-in"
      style={{
        background: isError
          ? 'linear-gradient(135deg, #FEF2F2, #FFF5F5)'
          : 'linear-gradient(135deg, #ECFDF5, #F0FDF4)',
        border: `1px solid ${isError ? '#FECACA' : '#A7F3D0'}`,
        minWidth: '280px',
        maxWidth: '380px',
      }}
      role="alert"
    >
      <span style={{ color: isError ? '#DC2626' : '#059669' }}>
        {isError ? <IconWarning /> : <IconCheck />}
      </span>
      <p
        className="flex-1 text-sm font-medium text-slate-700"
        style={{ fontFamily: 'DM Sans, sans-serif' }}
      >
        {toast.message}
      </p>
      <button
        onClick={onDismiss}
        className="text-slate-400 hover:text-slate-600 transition-colors"
        aria-label="Dismiss notification"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}

/* ─── Section Card ───────────────────────────────────────────────── */
function SectionCard({ icon, title, subtitle, children, danger = false }) {
  return (
    <div
      className="card p-6 md:p-8"
      style={{
        borderRadius: '20px',
        border: danger ? '1px solid #FECACA' : undefined,
        background: danger ? 'linear-gradient(145deg, #FFF5F5, #FFFAFA)' : undefined,
      }}
    >
      {/* Section header */}
      <div className="flex items-center gap-3 mb-6">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{
            background: danger
              ? 'linear-gradient(135deg, #FEE2E2, #FECACA)'
              : 'linear-gradient(135deg, rgba(124,58,237,0.1), rgba(236,72,153,0.1))',
          }}
        >
          <span style={{ color: danger ? '#DC2626' : '#7C3AED' }}>{icon}</span>
        </div>
        <div>
          <h2
            className="text-base font-bold leading-tight"
            style={{
              fontFamily: 'Outfit, sans-serif',
              color: danger ? '#DC2626' : '#0F172A',
            }}
          >
            {title}
          </h2>
          {subtitle && (
            <p
              className="text-xs mt-0.5"
              style={{
                fontFamily: 'DM Sans, sans-serif',
                color: danger ? '#EF4444' : '#94A3B8',
              }}
            >
              {subtitle}
            </p>
          )}
        </div>
      </div>

      {/* Divider */}
      <div
        className="mb-6"
        style={{ borderTop: `1px solid ${danger ? '#FECACA' : '#F1F5F9'}` }}
      />

      {children}
    </div>
  );
}

/* ─── Field ──────────────────────────────────────────────────────── */
function Field({ id, label, children }) {
  return (
    <div>
      <label
        htmlFor={id}
        className="block text-xs font-semibold text-slate-500 mb-1.5"
        style={{ fontFamily: 'DM Sans, sans-serif' }}
      >
        {label}
      </label>
      {children}
    </div>
  );
}

/* ─── Primary Button ─────────────────────────────────────────────── */
function PrimaryButton({ onClick, disabled, loading, children, type = 'button' }) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      className="inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-full text-white text-sm font-semibold transition-all hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
      style={{
        background: 'linear-gradient(135deg, #7C3AED, #EC4899)',
        fontFamily: 'DM Sans, sans-serif',
        boxShadow: '0 4px 16px rgba(124,58,237,0.25)',
      }}
    >
      {loading ? <Spinner /> : children}
    </button>
  );
}

/* ─── Danger Button ──────────────────────────────────────────────── */
function DangerButton({ onClick, disabled, loading, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || loading}
      className="inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-full text-white text-sm font-semibold transition-all hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
      style={{
        background: 'linear-gradient(135deg, #EF4444, #DC2626)',
        fontFamily: 'DM Sans, sans-serif',
        boxShadow: '0 4px 12px rgba(239,68,68,0.25)',
      }}
    >
      {loading ? <Spinner /> : children}
    </button>
  );
}

/* ─── Inline status message ──────────────────────────────────────── */
function InlineMessage({ type, message }) {
  if (!message) return null;
  const isError = type === 'error';
  return (
    <div
      className="flex items-start gap-2 px-4 py-3 rounded-xl text-sm"
      style={{
        background: isError ? '#FEF2F2' : '#F0FDF4',
        border: `1px solid ${isError ? '#FECACA' : '#BBF7D0'}`,
        color: isError ? '#DC2626' : '#059669',
        fontFamily: 'DM Sans, sans-serif',
      }}
      role="alert"
    >
      <span className="flex-shrink-0 mt-0.5">
        {isError ? <IconWarning /> : <IconCheck />}
      </span>
      <span>{message}</span>
    </div>
  );
}

/* ─── Delete Account Modal ───────────────────────────────────────── */
function DeleteAccountModal({ onClose }) {
  const [confirmText, setConfirmText] = useState('');
  const isConfirmed = confirmText === 'DELETE';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="delete-modal-title"
    >
      <div
        className="w-full max-w-md mx-4 bg-white animate-fade-in"
        style={{
          borderRadius: '24px',
          boxShadow: '0 8px 48px rgba(0,0,0,0.14)',
          padding: '32px',
        }}
      >
        {/* Warning icon */}
        <div
          className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-5"
          style={{ background: '#FEF2F2' }}
        >
          <span style={{ color: '#DC2626' }}>
            <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
            </svg>
          </span>
        </div>

        <h3
          id="delete-modal-title"
          className="text-xl font-bold text-slate-900 text-center mb-2"
          style={{ fontFamily: 'Outfit, sans-serif' }}
        >
          Delete Account
        </h3>
        <p
          className="text-sm text-slate-500 text-center mb-6"
          style={{ fontFamily: 'DM Sans, sans-serif', lineHeight: 1.65 }}
        >
          This action is permanent and cannot be undone. All your brands, scans,
          and data will be permanently removed.
        </p>

        {/* Support message */}
        <div
          className="flex items-start gap-3 rounded-xl px-4 py-3 mb-6"
          style={{ background: '#FEF2F2', border: '1px solid #FECACA' }}
        >
          <span className="flex-shrink-0 mt-0.5" style={{ color: '#DC2626' }}>
            <IconWarning />
          </span>
          <p
            className="text-sm"
            style={{ fontFamily: 'DM Sans, sans-serif', color: '#B91C1C', lineHeight: 1.6 }}
          >
            To delete your account, please contact{' '}
            <a
              href="mailto:support@t3tx.com"
              className="font-semibold underline underline-offset-2 hover:text-red-800 transition-colors"
            >
              support@t3tx.com
            </a>
            {' '}and our team will process your request within 2 business days.
          </p>
        </div>

        {/* Confirm input */}
        <div className="mb-6">
          <label
            htmlFor="delete-confirm"
            className="block text-xs font-semibold text-slate-500 mb-1.5"
            style={{ fontFamily: 'DM Sans, sans-serif' }}
          >
            Type <span className="font-bold text-red-600 tracking-wide">DELETE</span> to confirm
          </label>
          <input
            id="delete-confirm"
            type="text"
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            placeholder="DELETE"
            className={INPUT_CLASS}
            style={{
              fontFamily: 'DM Sans, sans-serif',
              borderColor: confirmText && !isConfirmed ? '#FECACA' : undefined,
            }}
            autoComplete="off"
            autoFocus
          />
        </div>

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-3 rounded-full border border-slate-200 text-slate-600 text-sm font-semibold hover:bg-slate-50 transition-all"
            style={{ fontFamily: 'DM Sans, sans-serif' }}
          >
            Cancel
          </button>
          <a
            href={isConfirmed ? 'mailto:support@t3tx.com?subject=Account Deletion Request' : undefined}
            onClick={!isConfirmed ? (e) => e.preventDefault() : undefined}
            className={`flex-1 py-3 rounded-full text-white text-sm font-semibold text-center transition-all ${
              isConfirmed
                ? 'hover:opacity-90 cursor-pointer'
                : 'opacity-40 cursor-not-allowed pointer-events-none'
            }`}
            style={{
              background: 'linear-gradient(135deg, #EF4444, #DC2626)',
              fontFamily: 'DM Sans, sans-serif',
              boxShadow: isConfirmed ? '0 4px 12px rgba(239,68,68,0.3)' : 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
            }}
          >
            <IconTrash />
            Contact Support
          </a>
        </div>
      </div>
    </div>
  );
}

/* ─── Main Component ─────────────────────────────────────────────── */
export default function Settings({ brand, onNavigate }) {
  // ── User state
  const [userEmail, setUserEmail] = useState('');
  const [initLoading, setInitLoading] = useState(true);

  // ── Profile section
  const [fullName, setFullName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileStatus, setProfileStatus] = useState(null); // { type, message }

  // ── Password section
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordStatus, setPasswordStatus] = useState(null); // { type, message }

  // ── Danger zone
  const [signOutAllLoading, setSignOutAllLoading] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  // ── Global toast
  const [toast, setToast] = useState(null);

  const showToast = useCallback((type, message) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4500);
  }, []);

  // ── Load user on mount
  useEffect(() => {
    async function loadUser() {
      setInitLoading(true);
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          setUserEmail(user.email ?? '');
          setFullName(user.user_metadata?.full_name ?? '');
          setCompanyName(user.user_metadata?.company_name ?? '');
        }
      } catch (err) {
        console.error('[Settings] load user error:', err);
      } finally {
        setInitLoading(false);
      }
    }
    loadUser();
  }, []);

  // ── Save Profile
  async function handleSaveProfile(e) {
    e.preventDefault();
    setProfileStatus(null);
    setProfileLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({
        data: {
          full_name: fullName.trim(),
          company_name: companyName.trim(),
        },
      });
      if (error) throw error;
      setProfileStatus({ type: 'success', message: 'Profile updated successfully.' });
      showToast('success', 'Profile saved.');
    } catch (err) {
      const msg = err.message || 'Failed to update profile. Please try again.';
      setProfileStatus({ type: 'error', message: msg });
    } finally {
      setProfileLoading(false);
    }
  }

  // ── Update Password
  async function handleUpdatePassword(e) {
    e.preventDefault();
    setPasswordStatus(null);

    if (newPassword.length < 8) {
      setPasswordStatus({ type: 'error', message: 'Password must be at least 8 characters.' });
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordStatus({ type: 'error', message: 'Passwords do not match.' });
      return;
    }

    setPasswordLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      setPasswordStatus({ type: 'success', message: 'Password updated successfully.' });
      setNewPassword('');
      setConfirmPassword('');
      showToast('success', 'Password changed.');
    } catch (err) {
      const msg = err.message || 'Failed to update password. Please try again.';
      setPasswordStatus({ type: 'error', message: msg });
    } finally {
      setPasswordLoading(false);
    }
  }

  // ── Sign Out All Devices
  async function handleSignOutAll() {
    setSignOutAllLoading(true);
    try {
      const { error } = await supabase.auth.signOut({ scope: 'global' });
      if (error) throw error;
      // Auth state change in App.jsx will handle redirect
    } catch (err) {
      showToast('error', err.message || 'Could not sign out. Please try again.');
    } finally {
      setSignOutAllLoading(false);
    }
  }

  // ── Password validation hints
  const passwordMismatch = confirmPassword.length > 0 && newPassword !== confirmPassword;
  const passwordTooShort = newPassword.length > 0 && newPassword.length < 8;

  /* ── Skeleton loader while fetching user ── */
  if (initLoading) {
    return (
      <div className="flex flex-col gap-6 animate-fade-in">
        {[0, 1, 2].map((i) => (
          <div key={i} className="card p-6 md:p-8" style={{ borderRadius: '20px' }}>
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-slate-100 animate-pulse" />
              <div>
                <div className="h-4 w-32 rounded-lg bg-slate-100 animate-pulse mb-1.5" />
                <div className="h-3 w-48 rounded-lg bg-slate-100 animate-pulse" />
              </div>
            </div>
            <div className="flex flex-col gap-4">
              <div className="h-11 rounded-xl bg-slate-100 animate-pulse" />
              <div className="h-11 rounded-xl bg-slate-100 animate-pulse" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 animate-fade-in">

      {/* ── Toast ── */}
      <Toast toast={toast} onDismiss={() => setToast(null)} />

      {/* ── 1. Profile Section ── */}
      <SectionCard
        icon={<IconUser />}
        title="Profile"
        subtitle="Update your name and company information"
      >
        <form onSubmit={handleSaveProfile} noValidate>
          <div className="flex flex-col gap-4">
            {/* Email — read-only */}
            <Field id="settings-email" label="Email Address">
              <input
                id="settings-email"
                type="email"
                value={userEmail}
                readOnly
                className={INPUT_READONLY_CLASS}
                style={{ fontFamily: 'DM Sans, sans-serif' }}
                aria-describedby="email-hint"
              />
              <p
                id="email-hint"
                className="mt-1.5 text-[11px] text-slate-400"
                style={{ fontFamily: 'DM Sans, sans-serif' }}
              >
                Email cannot be changed here. Contact support to update it.
              </p>
            </Field>

            {/* Full name */}
            <Field id="settings-fullname" label="Full Name">
              <input
                id="settings-fullname"
                type="text"
                autoComplete="name"
                placeholder="Jane Smith"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className={INPUT_CLASS}
                style={{ fontFamily: 'DM Sans, sans-serif' }}
              />
            </Field>

            {/* Company name */}
            <Field id="settings-company" label="Company Name">
              <input
                id="settings-company"
                type="text"
                autoComplete="organization"
                placeholder="Acme Inc."
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                className={INPUT_CLASS}
                style={{ fontFamily: 'DM Sans, sans-serif' }}
              />
            </Field>
          </div>

          {/* Inline feedback */}
          {profileStatus && (
            <div className="mt-4">
              <InlineMessage type={profileStatus.type} message={profileStatus.message} />
            </div>
          )}

          {/* Action */}
          <div className="mt-5 flex justify-end">
            <PrimaryButton type="submit" loading={profileLoading}>
              Save Profile
            </PrimaryButton>
          </div>
        </form>
      </SectionCard>

      {/* ── 2. Change Password Section ── */}
      <SectionCard
        icon={<IconLock />}
        title="Change Password"
        subtitle="Set a new password for your account"
      >
        <form onSubmit={handleUpdatePassword} noValidate>
          <div className="flex flex-col gap-4">
            {/* New password */}
            <Field id="settings-new-password" label="New Password">
              <input
                id="settings-new-password"
                type="password"
                autoComplete="new-password"
                placeholder="Min. 8 characters"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className={INPUT_CLASS}
                style={{
                  fontFamily: 'DM Sans, sans-serif',
                  borderColor: passwordTooShort ? '#FECACA' : undefined,
                }}
              />
              {passwordTooShort && (
                <p
                  className="mt-1.5 text-[11px] text-red-500"
                  style={{ fontFamily: 'DM Sans, sans-serif' }}
                  role="alert"
                >
                  Password must be at least 8 characters.
                </p>
              )}
            </Field>

            {/* Confirm password */}
            <Field id="settings-confirm-password" label="Confirm New Password">
              <input
                id="settings-confirm-password"
                type="password"
                autoComplete="new-password"
                placeholder="Re-enter new password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className={INPUT_CLASS}
                style={{
                  fontFamily: 'DM Sans, sans-serif',
                  borderColor: passwordMismatch ? '#FECACA' : undefined,
                }}
              />
              {passwordMismatch && (
                <p
                  className="mt-1.5 text-[11px] text-red-500"
                  style={{ fontFamily: 'DM Sans, sans-serif' }}
                  role="alert"
                >
                  Passwords do not match.
                </p>
              )}
            </Field>
          </div>

          {/* Inline feedback */}
          {passwordStatus && (
            <div className="mt-4">
              <InlineMessage type={passwordStatus.type} message={passwordStatus.message} />
            </div>
          )}

          {/* Action */}
          <div className="mt-5 flex justify-end">
            <PrimaryButton
              type="submit"
              loading={passwordLoading}
              disabled={passwordTooShort || passwordMismatch || !newPassword || !confirmPassword}
            >
              Update Password
            </PrimaryButton>
          </div>
        </form>
      </SectionCard>

      {/* ── 3. Danger Zone ── */}
      <SectionCard
        icon={<IconShield />}
        title="Danger Zone"
        subtitle="Irreversible actions — proceed with caution"
        danger
      >
        <div className="flex flex-col gap-5">

          {/* Sign out all devices */}
          <div
            className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-4 rounded-xl"
            style={{ background: '#FFF5F5', border: '1px solid #FEE2E2' }}
          >
            <div>
              <p
                className="text-sm font-semibold text-slate-800"
                style={{ fontFamily: 'DM Sans, sans-serif' }}
              >
                Sign Out of All Devices
              </p>
              <p
                className="text-xs text-slate-500 mt-0.5"
                style={{ fontFamily: 'DM Sans, sans-serif' }}
              >
                Revoke all active sessions across every browser and device.
              </p>
            </div>
            <DangerButton
              onClick={handleSignOutAll}
              loading={signOutAllLoading}
            >
              <IconLogout />
              Sign Out All
            </DangerButton>
          </div>

          {/* Delete account */}
          <div
            className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-4 rounded-xl"
            style={{ background: '#FFF5F5', border: '1px solid #FEE2E2' }}
          >
            <div>
              <p
                className="text-sm font-semibold text-slate-800"
                style={{ fontFamily: 'DM Sans, sans-serif' }}
              >
                Delete Account
              </p>
              <p
                className="text-xs text-slate-500 mt-0.5"
                style={{ fontFamily: 'DM Sans, sans-serif' }}
              >
                Permanently remove your account and all associated data.
              </p>
            </div>
            <DangerButton onClick={() => setShowDeleteModal(true)}>
              <IconTrash />
              Delete Account
            </DangerButton>
          </div>

        </div>
      </SectionCard>

      {/* ── Delete Account Modal ── */}
      {showDeleteModal && (
        <DeleteAccountModal onClose={() => setShowDeleteModal(false)} />
      )}

    </div>
  );
}
