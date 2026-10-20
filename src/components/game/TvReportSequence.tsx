import { useEffect, useState } from 'react';
import { reportPassages } from '@/game/tv-report';
import { captionDuration } from '@/game/tv-playback';
import { TvReportMedia } from './TvReportMedia';

/** Alternates local views and recorded passages; animations never imply footage of the event. */
export function TvReportSequence({ image, reporter, video, text, title, playing }: {
  image: string; reporter: string; video?: string | undefined; text: string; title: string; playing: boolean;
}) {
  const [shot, setShot] = useState(0);
  const passages = reportPassages(text);
  useEffect(() => { setShot(0); }, [text]);
  useEffect(() => {
    if (!playing || !passages.length) return;
    const timer = window.setTimeout(() => setShot(current => (current + 1) % passages.length), captionDuration(passages[shot] ?? ''));
    return () => window.clearTimeout(timer);
  }, [playing, shot, text]);
  return <>
    <TvReportMedia image={image} video={video} alt={`Illustration du reportage : ${title}`} playing={playing} />
    <img src={reporter} alt="Journaliste CIVITAS" width={1280} height={720} className="absolute right-3 top-12 aspect-video w-1/4 rounded border border-primary object-cover sm:top-16" />
    {passages[shot] && <div key={shot} className="absolute inset-x-3 top-12 mr-[28%] border-l-2 border-primary bg-background/90 p-2 sm:top-16 sm:p-3">
      <p className="text-[10px] font-semibold uppercase text-primary sm:text-xs">Dans cette édition · {shot + 1}/{passages.length}</p>
      <p className="mt-1 line-clamp-3 break-words text-xs leading-relaxed text-foreground sm:text-sm">{passages[shot]}</p>
    </div>}
  </>;
}