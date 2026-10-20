import { useEffect, useState } from 'react';
import { captionChunks, captionDuration } from '@/game/tv-playback';

export function useTvPlayback(text: string, playing: boolean, voiceOn: boolean, advance: () => void) {
  const [localVoice, setLocalVoice] = useState<SpeechSynthesisVoice | undefined>();
  const [caption, setCaption] = useState('');
  const [voiceFailed, setVoiceFailed] = useState(false);
  useEffect(() => {
    if (!('speechSynthesis' in window)) return;
    const synth = window.speechSynthesis;
    const update = () => setLocalVoice(synth.getVoices().find(v => v.localService && v.lang.startsWith('fr')));
    update(); synth.addEventListener('voiceschanged', update);
    return () => { synth.removeEventListener('voiceschanged', update); synth.cancel(); };
  }, []);
  useEffect(() => { setVoiceFailed(false); }, [text, voiceOn]);
  useEffect(() => {
    const chunks = captionChunks(text);
    setCaption(chunks[0] ?? '');
    if (!playing || !chunks.length) return;
    let active = true;
    let index = 0;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let utterance: SpeechSynthesisUtterance | undefined;
    const synth = 'speechSynthesis' in window ? window.speechSynthesis : undefined;
    const playChunk = () => {
      if (!active) return;
      const chunk = chunks[index];
      if (!chunk) { advance(); return; }
      setCaption(chunk);
      let finished = false;
      const next = () => {
        if (!active || finished) return;
        finished = true; clearTimeout(timer); index += 1; playChunk();
      };
      if (voiceOn && localVoice && synth && !voiceFailed) {
        utterance = new SpeechSynthesisUtterance(chunk);
        utterance.voice = localVoice; utterance.lang = 'fr-FR'; utterance.rate = 1.02;
        utterance.onend = next;
        utterance.onerror = () => { if (active) setVoiceFailed(true); };
        // Watchdog: an unavailable voice cannot freeze the edition.
        timer = setTimeout(next, captionDuration(chunk) + 5000);
        synth.speak(utterance);
      } else timer = setTimeout(next, captionDuration(chunk));
    };
    playChunk();
    return () => { active = false; clearTimeout(timer); if (utterance) { utterance.onend = null; utterance.onerror = null; } synth?.cancel(); };
  }, [text, playing, voiceOn, localVoice, voiceFailed, advance]);
  return { caption, voiceAvailable: !!localVoice && !voiceFailed };
}