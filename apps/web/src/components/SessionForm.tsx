import { zodResolver } from '@hookform/resolvers/zod';
import {
  DISCIPLINES,
  MAX_SCORE,
  TARGET_LETTERS,
  hasTargetLetters,
  sessionInputSchema,
  type SessionData,
  type SessionInput,
} from '@shooting-clays/shared';
import { useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { apiErrorMessage, useT } from '../i18n';
import { ApiError } from '../lib/api';

interface Props {
  title: string;
  defaultValues: SessionInput;
  onSubmit: (data: SessionData) => Promise<unknown>;
  onCancel?: () => void;
}

const fieldLabel = 'mb-2 block text-sm font-semibold';
const errorText = 'mt-1 text-sm font-medium text-danger';

export function SessionForm({ title, defaultValues, onSubmit, onCancel }: Props) {
  const t = useT();
  // The failure, not its text: the message follows the active language.
  const [saveError, setSaveError] = useState<{ code?: string } | null>(null);
  const {
    register,
    handleSubmit,
    setValue,
    getValues,
    control,
    formState: { errors, isSubmitting },
  } = useForm<SessionInput, unknown, SessionData>({
    resolver: zodResolver(sessionInputSchema),
    defaultValues,
  });
  const discipline = useWatch({ control, name: 'discipline' });
  const showTargets = hasTargetLetters(discipline);

  const disciplineField = register('discipline', {
    // Hardest targets never carry over to another discipline.
    onChange: () => setValue('hardestTargets', []),
  });

  const step = (delta: number) => {
    const current = Number(getValues('score'));
    const next = Math.min(MAX_SCORE, Math.max(0, (Number.isFinite(current) ? current : 0) + delta));
    setValue('score', next, { shouldValidate: true });
  };

  const submit = handleSubmit(async (data) => {
    setSaveError(null);
    try {
      await onSubmit(data);
    } catch (error) {
      setSaveError({ code: error instanceof ApiError ? error.code : undefined });
    }
  });

  return (
    <form onSubmit={(e) => void submit(e)} noValidate className="space-y-6">
      <h1 className="text-2xl font-bold">{title}</h1>

      <div>
        <label htmlFor="date" className={fieldLabel}>
          {t.form.date}
        </label>
        <input
          id="date"
          type="date"
          {...register('date')}
          aria-invalid={Boolean(errors.date)}
          className="min-h-12 w-full rounded-xl border border-line bg-card px-3 text-lg"
        />
        {errors.date && <p className={errorText}>{t.form.errors.date}</p>}
      </div>

      <fieldset>
        <legend className={fieldLabel}>{t.form.discipline}</legend>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {DISCIPLINES.map((d) => (
            <label
              key={d.key}
              className="flex min-h-14 cursor-pointer items-center justify-center rounded-xl border-2 border-line bg-card px-2 text-center font-semibold has-checked:border-accent has-checked:bg-accent has-checked:text-accent-ink has-focus-visible:outline-2 has-focus-visible:outline-accent"
            >
              <input type="radio" value={d.key} {...disciplineField} className="sr-only" />
              {t.disciplines[d.key]}
            </label>
          ))}
        </div>
      </fieldset>

      <div>
        <label htmlFor="score" className={fieldLabel}>
          {t.form.score}
        </label>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => step(-1)}
            aria-label={t.form.decrease}
            className="size-14 shrink-0 rounded-xl border border-line bg-card text-3xl font-bold"
          >
            −
          </button>
          <input
            id="score"
            type="number"
            inputMode="numeric"
            min={0}
            max={MAX_SCORE}
            {...register('score', { valueAsNumber: true })}
            aria-invalid={Boolean(errors.score)}
            className="min-h-14 w-full rounded-xl border border-line bg-card text-center text-3xl font-bold tabular-nums"
          />
          <button
            type="button"
            onClick={() => step(1)}
            aria-label={t.form.increase}
            className="size-14 shrink-0 rounded-xl border border-line bg-card text-3xl font-bold"
          >
            +
          </button>
        </div>
        {errors.score && (
          <p role="alert" className={errorText}>
            {t.form.errors.score}
          </p>
        )}
      </div>

      {showTargets && (
        <fieldset>
          <legend className={fieldLabel}>{t.form.hardestTargets}</legend>
          <div className="grid grid-cols-6 gap-2">
            {TARGET_LETTERS.map((letter) => (
              <label
                key={letter}
                className="flex min-h-12 cursor-pointer items-center justify-center rounded-xl border-2 border-line bg-card text-lg font-bold has-checked:border-accent has-checked:bg-accent has-checked:text-accent-ink has-focus-visible:outline-2 has-focus-visible:outline-accent"
              >
                <input
                  type="checkbox"
                  value={letter}
                  {...register('hardestTargets')}
                  className="sr-only"
                />
                {letter}
              </label>
            ))}
          </div>
        </fieldset>
      )}

      <div>
        <label htmlFor="notes" className={fieldLabel}>
          {t.form.notes}
        </label>
        <textarea
          id="notes"
          rows={3}
          placeholder={t.form.notesPlaceholder}
          {...register('notes')}
          aria-invalid={Boolean(errors.notes)}
          className="w-full rounded-xl border border-line bg-card p-3 text-base"
        />
        {errors.notes && <p className={errorText}>{t.form.errors.notes}</p>}
      </div>

      {saveError && (
        <p role="alert" className="rounded-xl border border-danger p-3 font-medium text-danger">
          {t.form.saveError}
          {saveError.code && ` (${apiErrorMessage(t, saveError.code)})`}
        </p>
      )}

      <div className="flex gap-3">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="min-h-14 flex-1 rounded-xl border border-line bg-card text-lg font-semibold"
          >
            {t.form.cancel}
          </button>
        )}
        <button
          type="submit"
          disabled={isSubmitting}
          className="min-h-14 flex-2 rounded-xl bg-accent text-lg font-bold text-accent-ink disabled:opacity-60"
        >
          {isSubmitting ? t.form.saving : t.form.save}
        </button>
      </div>
    </form>
  );
}
