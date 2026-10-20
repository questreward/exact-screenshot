import { useEffect, useRef, useState } from 'react';

/** Paused/reduced-motion clips remain still; missing clips fall back to local images. */
export function TvReportMedia({ video, image, alt, playing }: { video?: string | undefined; image: string; alt: string; playing: boolean }) {
  const ref = useRef<HTMLVideoElement>(null);
  const [failed, setFailed] = useState(false);
  const [reduced, setReduced] = useState(true);
  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReduced(query.matches);
    update(); query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  }, []);
  useEffect(() => { setFailed(false); }, [video]);
  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    if (!playing || reduced) element.pause();
    else void element.play().catch(() => setFailed(true));
  }, [playing, reduced, video, failed]);
  return video && !failed && !reduced
    ? <video ref={ref} src={`/tv/${video}.mp4`} poster={image} muted loop playsInline preload="metadata" aria-label={alt} onError={() => setFailed(true)} className="absolute inset-0 h-full w-full object-cover" />
    : <img src={image} alt={alt} width={1280} height={720} className={`absolute inset-0 h-full w-full object-cover ${playing && !reduced ? 'tv-report-motion' : ''}`} />;
}