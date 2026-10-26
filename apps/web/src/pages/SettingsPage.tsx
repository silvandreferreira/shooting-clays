import { MAX_DISPLAY_NAME_LENGTH, type Me } from '@shooting-clays/shared';
import { useId, useState, type FormEvent } from 'react';
import { LanguagePicker } from '../components/LanguagePicker';
import { Switch } from '../components/Switch';
import { useT } from '../i18n';
import { useUpdateProfile } from '../lib/queries';

function DisplayNameForm({ me }: { me: Me }) {
  const t = useT();
  const [name, setName] = useState(me.displayName);
  const update = useUpdateProfile();
  const inputId = useId();
  const helpId = useId();
  const trimmed = name.trim();

  const submit = (e: FormEvent) => {
    e.preventDefault();
    update.mutate({ displayName: trimmed });
  };

  return (
    <form onSubmit={submit} className="space-y-2 rounded-2xl border border-line bg-card p-4">
      <label htmlFor={inputId} className="block font-semibold">
        {t.settings.displayName}
      </label>
      <input
        id={inputId}
        value={name}
        onChange={(e) => {
          setName(e.target.value);
          update.reset();
        }}
        maxLength={MAX_DISPLAY_NAME_LENGTH}
        autoComplete="nickname"
        aria-describedby={helpId}
        className="min-h-11 w-full rounded-lg border-2 border-line bg-surface px-3"
      />
      <p id={helpId} className="text-sm text-ink-muted">
        {t.settings.displayNameHelp}
      </p>
      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={!trimmed || trimmed === me.displayName || update.isPending}
          className="min-h-11 rounded-lg bg-accent px-6 font-semibold text-accent-ink disabled:opacity-50"
        >
          {update.isPending ? t.settings.saving : t.settings.save}
        </button>
        <p role="status" className="text-sm font-medium">
          {update.isSuccess && t.settings.saved}
        </p>
      </div>
      {update.isError && (
        <p role="alert" className="font-medium text-danger">
          {t.settings.saveError}
        </p>
      )}
    </form>
  );
}

function CommunitySwitch({ me }: { me: Me }) {
  const t = useT();
  const update = useUpdateProfile();
  const helpId = useId();
  return (
    <div className="space-y-2 rounded-2xl border border-line bg-card p-4">
      <div className="flex items-center justify-between gap-3">
        <span className="font-semibold" aria-hidden>
          {t.settings.showInCommunity}
        </span>
        <Switch
          checked={me.showInCommunity}
          label={t.settings.showInCommunity}
          disabled={update.isPending}
          onChange={() => update.mutate({ showInCommunity: !me.showInCommunity })}
        />
      </div>
      <p id={helpId} className="text-sm text-ink-muted">
        {t.settings.showInCommunityHelp}
      </p>
      {update.isError && (
        <p role="alert" className="font-medium text-danger">
          {t.settings.saveError}
        </p>
      )}
    </div>
  );
}

/** Saved in the profile too, so the choice follows the user to other devices. */
function LanguageSetting() {
  const t = useT();
  const update = useUpdateProfile();
  return (
    <div className="space-y-2 rounded-2xl border border-line bg-card p-4">
      <p className="font-semibold" aria-hidden>
        {t.settings.language}
      </p>
      <LanguagePicker onChange={(locale) => update.mutate({ locale })} />
      {update.isError && (
        <p role="alert" className="font-medium text-danger">
          {t.settings.saveError}
        </p>
      )}
    </div>
  );
}

export function SettingsPage({ me }: { me: Me }) {
  const t = useT();
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">{t.settings.title}</h1>
      <DisplayNameForm me={me} />
      <CommunitySwitch me={me} />
      <LanguageSetting />
    </div>
  );
}
