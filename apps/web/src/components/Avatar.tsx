import { useState } from 'react';

/** Google photo when available; the name's initial if there is none or it fails to load. */
export function Avatar({ name, image }: { name: string; image: string | null }) {
  const [failed, setFailed] = useState(false);
  if (image && !failed) {
    return (
      <img
        src={image}
        alt=""
        // Google photo URLs can refuse requests that carry a referrer.
        referrerPolicy="no-referrer"
        onError={() => setFailed(true)}
        className="size-11 rounded-full object-cover"
      />
    );
  }
  return <>{name.trim().charAt(0).toUpperCase() || '?'}</>;
}
