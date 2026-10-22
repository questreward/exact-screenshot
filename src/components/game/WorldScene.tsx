import { useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useQuery, useSuspenseQuery } from "@tanstack/react-query";
import { CreditCard, Map as MapIcon, Smartphone, Zap, Volume2, VolumeX } from "lucide-react";
import { CharacterAvatar } from "./CharacterAvatar";
import { useWorldClock } from "./WorldClock";
import { useMyUniform } from "@/hooks/use-my-uniform";
import { useStyleLook } from "@/game/style-look";
import { normalizeAppearance } from "@/game/appearance";
import { moodFromEnergy } from "@/game/character-look";
import { cityKey, phaseFilter } from "@/game/home-scene";
import { arrivalLine, sceneWeather, showEnergy, streetLife } from "@/game/world-scene";
import { nextStep } from "@/game/next-step";
import { formatMoney, lifeQuery, notificationsQuery, weatherQuery } from "@/services/game";
import { notificationTarget } from "@/game/next-step";
import paris from "@/assets/v2/ville-paris.webp";
import lyon from "@/assets/v2/ville-lyon.webp";
import marseille from "@/assets/v2/ville-marseille.webp";
import bordeaux from "@/assets/v2/ville-bordeaux.webp";
import lille from "@/assets/v2/ville-lille.webp";

const CITY = { paris, lyon, marseille, bordeaux, lille };
const INTRO_KEY = "civitas-arrival-seen";

type Props = { firstName: string; cityName?: string | null | undefined; cityId?: string | null | undefined; appearance: unknown; energy: number; balance: number };

/** Gentle synthetic city hum, off by default, started only by the player. */
function useCityAmbience() {
  const ctx = useRef<AudioContext | null>(null);
  const [on, setOn] = useState(false);
  const toggle = () => {
    if (on) { void ctx.current?.close(); ctx.current = null; setOn(false); return; }
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ac = new AC();
    const buffer = ac.createBuffer(1, ac.sampleRate * 4, ac.sampleRate);
    const d = buffer.getChannelData(0);
    let last = 0;
    for (let i = 0; i < d.length; i++) { last = (last + 0.02 * (Math.random() * 2 - 1)) / 1.02; d[i] = last * 3.5; }
    const src = ac.createBufferSource(); src.buffer = buffer; src.loop = true;
    const filter = ac.createBiquadFilter(); filter.type = "lowpass"; filter.frequency.value = 700;
    const gain = ac.createGain(); gain.gain.value = 0; gain.gain.linearRampToValueAtTime(0.35, ac.currentTime + 1.5);
    src.connect(filter).connect(gain).connect(ac.destination); src.start();
    ctx.current = ac; setOn(true);
  };
  useEffect(() => () => { void ctx.current?.close(); }, []);
  return { on, toggle };
}

export function WorldScene({ firstName, cityName, cityId, appearance, energy, balance }: Props) {
  const { look } = useStyleLook();
  const uniform = useMyUniform();
  const { time, phase } = useWorldClock();
  const { data: life } = useSuspenseQuery(lifeQuery);
  const { data: notifs } = useSuspenseQuery(notificationsQuery);
  const { data: weather } = useQuery({ ...weatherQuery(cityId ?? ""), enabled: !!cityId });
  const sky = sceneWeather(weather?.condition);
  const life2 = streetLife(phase);
  const night = phase === "nuit" || phase === "soiree";
  const hour = time.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit", timeZone: "UTC" });
  const step = nextStep({ now: time, activities: life.activities, notifications: notifs, hasHousing: !!life.housing, studying: !!life.enrollment, working: !!life.employment, age: life.character.age });
  const sound = useCityAmbience();

  // Short arrival title, once per session.
  const [intro, setIntro] = useState(false);
  useEffect(() => {
    try { if (sessionStorage.getItem(INTRO_KEY)) return; sessionStorage.setItem(INTRO_KEY, "1"); } catch { /* storage unavailable */ }
    setIntro(true); const id = setTimeout(() => setIntro(false), 2600); return () => clearTimeout(id);
  }, []);

  // Newest unread notification slides in, then leaves.
  const unread = notifs.find((n) => !n.read);
  const [toast, setToast] = useState(false);
  useEffect(() => {
    if (!unread) return;
    const a = setTimeout(() => setToast(true), intro ? 2800 : 600);
    const b = setTimeout(() => setToast(false), (intro ? 2800 : 600) + 5000);
    return () => { clearTimeout(a); clearTimeout(b); };
  }, [unread?.id, intro]);

  return (
    <section aria-label={`${firstName} à ${cityName ?? "sa ville"}`} data-phase={phase} data-sky={sky}
      className="world-scene relative -mx-4 -mt-6 h-[calc(100dvh-8rem)] min-h-[30rem] overflow-hidden sm:mx-0 sm:rounded-2xl lg:-mt-10 lg:h-[calc(100dvh-5rem)]">
      {/* Camera: slow drift + arrival zoom */}
      <img src={CITY[cityKey(cityName)]} alt="" className="world-camera absolute inset-0 h-full w-full object-cover" style={{ filter: phaseFilter(phase) }} />
      {night && <div className="world-windows absolute inset-0" aria-hidden />}
      {sky === "nuageux" && <div className="absolute inset-0 bg-muted/30" aria-hidden />}
      {sky === "pluie" && <div className="world-rain absolute inset-0" aria-hidden />}
      {sky === "neige" && <div className="world-snow absolute inset-0" aria-hidden />}
      <div className="absolute inset-0 bg-gradient-to-t from-background via-background/10 to-background/40" aria-hidden />

      {/* Street life */}
      <div className="absolute inset-x-0 bottom-[18%] h-10" aria-hidden>
        {Array.from({ length: life2.cars }, (_, i) => (
          <span key={`c${i}`} className="world-car" data-night={night || undefined} style={{ animationDelay: `${i * -3.7}s`, animationDuration: `${9 + i * 2}s`, bottom: `${(i % 2) * 14}px` }} />
        ))}
      </div>
      <div className="absolute inset-x-0 bottom-[10%] h-12" aria-hidden>
        {Array.from({ length: life2.people }, (_, i) => (
          <span key={`p${i}`} className="world-walker" data-rain={sky === "pluie" || undefined} style={{ animationDelay: `${i * -4.3}s`, animationDuration: `${22 + (i % 3) * 6}s`, animationDirection: i % 2 ? "reverse" : "normal", left: 0 }} />
        ))}
      </div>

      {/* Minimal HUD */}
      <div className="absolute inset-x-3 top-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Link to="/telephone" search={{ app: "banque" }} aria-label={`Solde ${formatMoney(balance)}`} className="glass flex min-h-11 items-center gap-1.5 rounded-full px-3 text-sm font-bold shadow-card">
            <CreditCard className="h-4 w-4 text-primary" />{formatMoney(balance)}
          </Link>
          {showEnergy(energy) && <span className="glass flex min-h-11 items-center gap-1 rounded-full px-3 text-sm font-bold text-destructive shadow-card" aria-label={`Énergie basse : ${energy}`}><Zap className="h-4 w-4" />{energy}</span>}
        </div>
        <div className="flex items-center gap-2">
          <span className="glass flex min-h-11 items-center rounded-full px-3 font-display text-sm font-bold shadow-card">{hour}</span>
          <button type="button" onClick={sound.toggle} aria-label={sound.on ? "Couper l'ambiance de la ville" : "Écouter l'ambiance de la ville"} aria-pressed={sound.on}
            className="glass flex h-11 w-11 items-center justify-center rounded-full shadow-card">{sound.on ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}</button>
        </div>
      </div>

      {/* Notification */}
      {unread && (
        <Link to={(unread.news_id ? "/actualites" : notificationTarget(unread)) as "/banque"} aria-live="polite"
          className="world-toast glass absolute inset-x-3 top-16 mx-auto flex max-w-sm items-center gap-3 rounded-2xl p-3 shadow-elegant" data-show={toast || undefined}>
          <Smartphone className="h-5 w-5 shrink-0 text-primary" />
          <span className="min-w-0"><span className="block truncate text-sm font-bold">{unread.title}</span><span className="block truncate text-xs text-muted-foreground">{unread.body}</span></span>
        </Link>
      )}

      {/* Arrival title */}
      {intro && (
        <div className="world-title pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center" aria-hidden>
          <p className="font-display text-3xl font-bold drop-shadow sm:text-5xl">{cityName ?? "CIVITAS"} — {hour}</p>
          <p className="mt-2 text-base drop-shadow sm:text-lg">{arrivalLine(phase)}</p>
        </div>
      )}

      {/* Player */}
      <div className="world-player absolute bottom-6 left-1/2 h-56 w-40 -translate-x-1/2 sm:h-72 sm:w-52">
        <CharacterAvatar appearance={normalizeAppearance(appearance as never)} mood={moodFromEnergy(energy)} uniform={uniform} look={look} className="h-full w-full" />
      </div>

      {/* Discreet objective + phone/map */}
      <div className="absolute inset-x-3 bottom-3 flex items-end justify-between gap-2">
        <Link to={step.to as "/agenda"} className="glass flex min-h-12 max-w-[60%] items-center gap-2 rounded-2xl px-3 py-2 shadow-card">
          <span aria-hidden>{step.emoji}</span>
          <span className="min-w-0"><span className="block text-[10px] font-bold uppercase tracking-wide text-primary">Objectif</span><span className="block truncate text-sm font-semibold">{step.title}</span></span>
        </Link>
        <div className="flex gap-2">
          <Link to="/ville-3d" className="glass flex h-12 items-center gap-2 rounded-full px-4 text-sm font-bold shadow-card">🚶 Sortir</Link>
          <Link to="/carte" aria-label="Ouvrir la carte" className="glass flex h-12 w-12 items-center justify-center rounded-full shadow-card"><MapIcon className="h-5 w-5" /></Link>
          <Link to="/telephone" aria-label="Ouvrir le téléphone" className="glass flex h-12 w-12 items-center justify-center rounded-full shadow-card"><Smartphone className="h-5 w-5" /></Link>
        </div>
      </div>
    </section>
  );
}
