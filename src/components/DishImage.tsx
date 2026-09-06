import { useEffect, useMemo, useState } from 'react';
import { UtensilsCrossed } from 'lucide-react';
import { getExternalImageCandidates } from '../lib/url';

export default function DishImage({
  src,
  alt,
  className = ''
}: {
  src?: string;
  alt: string;
  className?: string;
}) {
  const candidates = useMemo(
    () => getExternalImageCandidates(src),
    [src]
  );
  const [candidateIndex, setCandidateIndex] = useState(0);

  // Important: the same dish keeps the same React key after editing.
  // Reset the failure state whenever its image URL changes so a corrected URL is retried.
  useEffect(() => {
    setCandidateIndex(0);
  }, [src]);

  const currentSrc = candidates[candidateIndex];

  if (!currentSrc) {
    return (
      <div
        className={
          'bg-gradient-to-br from-blue-50 to-slate-100 dark:from-slate-800 dark:to-slate-900 flex items-center justify-center text-blue-300 ' +
          className
        }
        aria-label={alt}
      >
        <UtensilsCrossed className="w-5 h-5" />
      </div>
    );
  }

  return (
    <img
      key={currentSrc}
      src={currentSrc}
      alt={alt}
      loading="lazy"
      decoding="async"
      referrerPolicy="no-referrer"
      onError={() => {
        setCandidateIndex(index =>
          index + 1 < candidates.length ? index + 1 : candidates.length
        );
      }}
      className={'object-cover ' + className}
    />
  );
}
