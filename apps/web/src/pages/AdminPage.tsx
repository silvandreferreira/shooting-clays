import type { AccountStatus, AdminUser } from '@shooting-clays/shared';
import { useEffect, useId, useState } from 'react';
import { Avatar } from '../components/Avatar';
import { t } from '../i18n/en';
import { formatDay } from '../lib/format';
import { useAdminUsers, useRemoveUser, useSetUserStatus } from '../lib/queries';

const TOAST_MS = 6000;

interface Toast {
  message: string;
  undo?: () => void;
}

/** On = active; off = disabled, or stays pending for someone never approved. */
const nextStatus = (status: AccountStatus): AccountStatus =>
  status === 'active' ? 'disabled' : 'active';

function StatusSwitch({ user, onToggle }: { user: AdminUser; onToggle: () => void }) {
  const on = user.status === 'active';
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={t.admin.toggleLabel(user.displayName)}
      onClick={onToggle}
      className="flex min-h-11 min-w-14 items-center justify-center"
    >
      <span
        aria-hidden
        className={`flex h-7 w-12 items-center rounded-full p-1 transition-colors ${
          on ? 'justify-end bg-accent' : 'justify-start bg-line'
        }`}
      >
        <span className="size-5 rounded-full bg-card shadow" />
      </span>
    </button>
  );
}

function RemoveDialog({
  user,
  onClose,
  onRemoved,
}: {
  user: AdminUser;
  onClose: () => void;
  onRemoved: () => void;
}) {
  const [typed, setTyped] = useState('');
  const removeUser = useRemoveUser();
  const titleId = useId();
  const inputId = useId();
  const confirmed = typed.trim() === user.displayName.trim();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-20 flex items-end justify-center bg-black/50 p-4 sm:items-center">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="w-full max-w-md space-y-4 rounded-2xl bg-card p-5 shadow-xl"
      >
        <h2 id={titleId} className="text-xl font-bold">
          {t.admin.removeTitle(user.displayName)}
        </h2>
        <p className="text-ink-muted">{t.admin.removeWarning}</p>
        <div className="space-y-1">
          <label htmlFor={inputId} className="block font-semibold">
            {t.admin.removeConfirmLabel(user.displayName)}
          </label>
          <input
            id={inputId}
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            autoComplete="off"
            autoFocus
            className="min-h-11 w-full rounded-lg border-2 border-line bg-surface px-3"
          />
        </div>
        {removeUser.isError && (
          <p role="alert" className="font-medium text-danger">
            {t.admin.removeError}
          </p>
        )}
        <div className="flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="min-h-12 flex-1 rounded-xl border-2 border-line font-semibold"
          >
            {t.form.cancel}
          </button>
          <button
            type="button"
            disabled={!confirmed || removeUser.isPending}
            onClick={() => removeUser.mutate(user.userId, { onSuccess: onRemoved })}
            className="min-h-12 flex-1 rounded-xl bg-danger font-semibold text-surface disabled:opacity-50"
          >
            {removeUser.isPending ? t.admin.removing : t.admin.removeConfirm}
          </button>
        </div>
      </div>
    </div>
  );
}

function UserRow({
  user,
  onToggle,
  onRemove,
}: {
  user: AdminUser;
  onToggle: () => void;
  onRemove: () => void;
}) {
  const isAdmin = user.role === 'admin';
  return (
    <li
      aria-label={user.displayName}
      className="flex items-start gap-3 rounded-2xl border border-line bg-card p-4 shadow-sm"
    >
      <span className="flex size-11 shrink-0 items-center justify-center overflow-hidden rounded-full bg-accent text-lg font-bold text-accent-ink">
        <Avatar name={user.displayName} image={user.avatarUrl} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="flex flex-wrap items-center gap-x-2 font-semibold">
          <span className="truncate">{user.displayName}</span>
          {isAdmin && (
            <span className="rounded-full border border-line px-2 text-xs text-ink-muted">
              {t.admin.adminRole}
            </span>
          )}
        </p>
        {user.email && <p className="truncate text-sm text-ink-muted">{user.email}</p>}
        <p className="text-sm text-ink-muted">
          {t.admin.signedUp(formatDay(user.signedUpAt))} · {t.admin.sessions(user.sessionCount)}
        </p>
        <p className="text-sm text-ink-muted">
          {user.lastActivityAt
            ? t.admin.lastActivity(formatDay(user.lastActivityAt))
            : t.admin.noActivity}
        </p>
        <p className="mt-1 text-sm font-semibold" data-testid="status">
          {t.admin.status[user.status]}
        </p>
      </div>
      {/* Admin accounts (the signed-in admin's included) are managed through ADMIN_EMAILS. */}
      {!isAdmin && (
        <div className="flex flex-col items-end gap-1">
          <StatusSwitch user={user} onToggle={onToggle} />
          <button
            type="button"
            onClick={onRemove}
            className="min-h-11 rounded-lg px-3 font-semibold text-danger"
          >
            {t.admin.remove}
          </button>
        </div>
      )}
    </li>
  );
}

export function AdminPage() {
  const { data: users, isPending, isError } = useAdminUsers(true);
  const setStatus = useSetUserStatus();
  const [removing, setRemoving] = useState<AdminUser | null>(null);
  const [toast, setToast] = useState<Toast | null>(null);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), TOAST_MS);
    return () => clearTimeout(timer);
  }, [toast]);

  const changeStatus = (user: AdminUser, status: AccountStatus, undoable: boolean) =>
    setStatus.mutate(
      { userId: user.userId, status },
      {
        onSuccess: () =>
          setToast(
            undoable
              ? {
                  message:
                    status === 'active'
                      ? t.admin.approved(user.displayName)
                      : t.admin.disabled(user.displayName),
                  undo: () => {
                    setToast(null);
                    changeStatus(user, user.status, false);
                  },
                }
              : null,
          ),
        onError: () => setToast({ message: t.admin.changeError }),
      },
    );

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">{t.admin.title}</h1>
      {isPending ? (
        <p className="py-8 text-center text-ink-muted">{t.admin.loading}</p>
      ) : isError && !users ? (
        <p role="alert" className="py-8 text-center">
          {t.admin.loadError}
        </p>
      ) : users.length === 0 ? (
        <p className="py-8 text-center text-ink-muted">{t.admin.empty}</p>
      ) : (
        <ul className="space-y-3">
          {users.map((user) => (
            <UserRow
              key={user.userId}
              user={user}
              onToggle={() => changeStatus(user, nextStatus(user.status), true)}
              onRemove={() => setRemoving(user)}
            />
          ))}
        </ul>
      )}
      <div
        role="status"
        aria-live="polite"
        className={
          toast
            ? 'fixed inset-x-4 bottom-[calc(5rem+env(safe-area-inset-bottom))] mx-auto flex max-w-md items-center gap-3 rounded-xl bg-ink p-3 text-sm font-medium text-surface shadow-lg'
            : 'sr-only'
        }
      >
        {toast && <span className="flex-1">{toast.message}</span>}
        {toast?.undo && (
          <button
            type="button"
            onClick={toast.undo}
            className="min-h-11 rounded-lg px-3 font-bold underline"
          >
            {t.admin.undo}
          </button>
        )}
      </div>
      {removing && (
        <RemoveDialog
          user={removing}
          onClose={() => setRemoving(null)}
          onRemoved={() => {
            setToast({ message: t.admin.removed(removing.displayName) });
            setRemoving(null);
          }}
        />
      )}
    </div>
  );
}
