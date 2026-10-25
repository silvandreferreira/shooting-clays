/** An on/off switch (`role="switch"`) with a 44 px touch target. */
export function Switch({
  checked,
  label,
  onChange,
  disabled = false,
}: {
  checked: boolean;
  label: string;
  onChange: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={onChange}
      className="flex min-h-11 min-w-14 items-center justify-center disabled:opacity-50"
    >
      <span
        aria-hidden
        className={`flex h-7 w-12 items-center rounded-full p-1 transition-colors ${
          checked ? 'justify-end bg-accent' : 'justify-start bg-line'
        }`}
      >
        <span className="size-5 rounded-full bg-card shadow" />
      </span>
    </button>
  );
}
