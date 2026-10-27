import {
  MAX_REVOKE_MESSAGE_LENGTH,
  type AccountStatus,
  type AdminUser,
} from '@shooting-clays/shared';
import { useEffect, useId, useState } from 'react';
import { useSearchParams } from 'react-router';
import { Avatar } from '../components/Avatar';
import { Switch } from '../components/Switch';
import { useT } from '../i18n';
import { formatDay } from '../lib/format';
import { useAdminUsers, useRemoveUser, useRevokeUser, useSetUserStatus } from '../lib/queries';

const TOAST_MS = 6000;

const FILTERS = ['all', 'active', 'pending'] as const;
type Filter = (typeof FILTERS)[number];
const isFilter = (value: string | null): value is Filter => FILTERS.includes(value as Filter);

/** Disabled accounts only show under "All". */
const inFilter = (user: AdminUser, filter: Filter) => filter === 'all' || user.status === filter;

const matches = (user: AdminUser, query: string) => {
  const q = query.trim().toLocaleLowerCase();
  return (
    !q ||
    user.displayName.toLocaleLowerCase().includes(q) ||
    (user.email?.toLocaleLowerCase().includes(q) ?? false)
  );
};

interface Toast {
  message: string;
  undo?: () => void;
}

/** On = active; off = disabled, or stays pending for someone never approved. */
const nextStatus = (status: AccountStatus): AccountStatus =>
  status === 'active' ? 'disabled' : 'active';

function StatusSwitch({ user, onToggle }: { user: AdminUser; onToggle: () => void }) {
  const t = useT();
  return (
    <Switch
      checked={user.status === 'active'}
      label={t.admin.toggleLabel(user.displayName)}
      onChange={onToggle}
    />
  );
}

/**
 * "Remove" revokes the access with a message the user reads before the account goes (decision
 * #65); "Delete now", on a revoked account, deletes it at once. Both need the name typed.
 */
function RemoveDialog({
  user,
  onClose,
  onRemoved,
}: {
  user: AdminUser;
  onClose: () => void;
  onRemoved: () => void;
}) {
  const t = useT();
  const revoke = user.status !== 'revoked';
  const [typed, setTyped] = useState('');
  const [message, setMessage] = useState(t.admin.revokeDefaultMessage);
  const removeUser = useRemoveUser();
  const revokeUser = useRevokeUser();
  const mutation = revoke ? revokeUser : removeUser;
  const titleId = useId();
  const inputId = useId();
  const messageId = useId();
  const confirmed = typed.trim() === user.displayName.trim() && (!revoke || message.trim() !== '');
  const submit = () =>
    revoke
      ? revokeUser.mutate({ userId: user.userId, message }, { onSuccess: onRemoved })
      : removeUser.mutate(user.userId, { onSuccess: onRemoved });

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
          {revoke ? t.admin.revokeTitle(user.displayName) : t.admin.removeTitle(user.displayName)}
        </h2>
        <p className="text-ink-muted">{revoke ? t.admin.revokeWarning : t.admin.removeWarning}</p>
        {revoke && (
          <div className="space-y-1">
            <label htmlFor={messageId} className="block font-semibold">
              {t.admin.revokeMessageLabel}
            </label>
            <textarea
              id={messageId}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={4}
              maxLength={MAX_REVOKE_MESSAGE_LENGTH}
              className="w-full rounded-lg border-2 border-line bg-surface p-3"
            />
          </div>
        )}
        <div className="space-y-1">
          <label htmlFor={inputId} className="block font-semibold">
            {t.admin.removeConfirmLabel(user.displayName)}
          </label>
          <input
            id={inputId}
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            autoComplete="off"
            autoFocus={!revoke}
            className="min-h-11 w-full rounded-lg border-2 border-line bg-surface px-3"
          />
        </div>
        {mutation.isError && (
          <p role="alert" className="font-medium text-danger">
            {revoke ? t.admin.revokeError : t.admin.removeError}
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
            disabled={!confirmed || mutation.isPending}
            onClick={submit}
            className="min-h-12 flex-1 rounded-xl bg-danger font-semibold text-surface disabled:opacity-50"
          >
            {revoke
              ? revokeUser.isPending
                ? t.admin.revoking
                : t.admin.revokeConfirm
              : removeUser.isPending
                ? t.admin.removing
                : t.admin.removeConfirm}
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
  const t = useT();
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
      </div>
      {/* Admin accounts (the signed-in admin's included) are managed through ADMIN_EMAILS. */}
      {!isAdmin && (
        <div className="flex flex-col items-end gap-1">
          {user.status === 'revoked' ? (
            <p className="max-w-32 text-right text-sm font-semibold text-ink-muted">
              {t.admin.revokedStatus}
            </p>
          ) : (
            <StatusSwitch user={user} onToggle={onToggle} />
          )}
          <button
            type="button"
            onClick={onRemove}
            className="min-h-11 rounded-lg px-3 font-semibold text-danger"
          >
            {user.status === 'revoked' ? t.admin.removeNow : t.admin.remove}
          </button>
        </div>
      )}
    </li>
  );
}

export function AdminPage() {
  const t = useT();
  const { data: users, isPending, isError } = useAdminUsers(true);
  const [params, setParams] = useSearchParams();
  const filter: Filter = isFilter(params.get('status')) ? (params.get('status') as Filter) : 'all';
  const query = params.get('q') ?? '';
  const update = (key: string, value: string) =>
    setParams(
      (p) => {
        const next = new URLSearchParams(p);
        if (value && value !== 'all') next.set(key, value);
        else next.delete(key);
        return next;
      },
      { replace: true },
    );
  const shown = users?.filter((u) => inFilter(u, filter) && matches(u, query)) ?? [];
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
      <input
        type="search"
        aria-label={t.admin.search}
        placeholder={t.admin.search}
        value={query}
        onChange={(e) => update('q', e.target.value)}
        className="min-h-11 w-full rounded-lg border-2 border-line bg-card px-3"
      />
      <div
        role="group"
        aria-label={t.admin.filterLabel}
        className="grid grid-cols-3 gap-1 rounded-xl border border-line bg-card p-1"
      >
        {FILTERS.map((f) => (
          <button
            key={f}
            type="button"
            aria-pressed={filter === f}
            onClick={() => update('status', f)}
            className={`min-h-11 rounded-lg px-2 text-sm font-semibold ${
              filter === f ? 'bg-accent text-accent-ink' : 'text-ink-muted'
            }`}
          >
            {t.admin.filters[f]} ({users?.filter((u) => inFilter(u, f)).length ?? 0})
          </button>
        ))}
      </div>
      {isPending ? (
        <p className="py-8 text-center text-ink-muted">{t.admin.loading}</p>
      ) : isError && !users ? (
        <p role="alert" className="py-8 text-center">
          {t.admin.loadError}
        </p>
      ) : users.length === 0 ? (
        <p className="py-8 text-center text-ink-muted">{t.admin.empty}</p>
      ) : shown.length === 0 ? (
        <p className="py-8 text-center text-ink-muted">{t.admin.noMatches}</p>
      ) : (
        <ul className="space-y-3">
          {shown.map((user) => (
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
            ? 'fixed inset-x-4 bottom-[calc(1rem+env(safe-area-inset-bottom))] mx-auto flex lg:bottom-[calc(5rem+env(safe-area-inset-bottom))] max-w-md items-center gap-3 rounded-xl bg-ink p-3 text-sm font-medium text-surface shadow-lg'
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
            setToast({
              message:
                removing.status === 'revoked'
                  ? t.admin.removed(removing.displayName)
                  : t.admin.revokedToast(removing.displayName),
            });
            setRemoving(null);
          }}
        />
      )}
    </div>
  );
}
