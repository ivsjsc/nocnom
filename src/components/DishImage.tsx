import { useState } from 'react';
import { UtensilsCrossed } from 'lucide-react';

export default function DishImage({
  src,
  alt,
  className = ''
}: {
  src?: string;
  alt: string;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);

  if (!src || failed) {
    return (
      <div
        className={'bg-gradient-to-br from-blue-50 to-slate-100 flex items-center justify-center text-blue-300 ' + className}
        aria-label={alt}
      >
        <UtensilsCrossed className="w-5 h-5" />
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      loading="lazy"
      onError={() => setFailed(true)}
      className={'object-cover ' + className}
    />
  );
}
