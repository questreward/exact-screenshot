import { ClipboardCheck, HandHeart, Radio, Search, Shield, Wrench, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { WorkBackdrop } from './WorkBackdrop';

/** Icons describe literal choices, never grant equipment or invent actions. */
function actionIcon(label: string) {
  if (/radio|renfort|appel|communi|prévenir|prevenir/i.test(label)) return Radio;
  if (/rapport|rédig|redig|compte.rendu/i.test(label)) return ClipboardCheck;
  if (/observ|vérifi|verifi|examin|éval|eval/i.test(label)) return Search;
  if (/sécur|secur|proté|prote/i.test(label)) return Shield;
  if (/aid|accueill|assist|écout|ecout/i.test(label)) return HandHeart;
  if (/répar|repar|outil|matériel|materiel/i.test(label)) return Wrench;
  return ArrowRight;
}

export function MissionActions({ job, title, step, choices, disabled, onChoose }: { job: string; title: string; step: string; choices: { label: string }[]; disabled: boolean; onChoose: (index: number) => void }) {
  return <div className="space-y-3">
    <WorkBackdrop job={job} title={title} />
    <p className="mission-step-enter border-l-2 border-primary pl-3" aria-live="polite">{step}</p>
    <div className="grid gap-2 sm:grid-cols-2">{choices.map((choice, i) => {
      const Icon = actionIcon(choice.label);
      return <Button key={i} variant="outline" className="min-h-20 h-auto justify-start gap-3 whitespace-normal p-4 text-left" disabled={disabled} onClick={() => onChoose(i)}><Icon className="text-primary" /><span className="min-w-0 break-words">{choice.label}</span></Button>;
    })}</div>
  </div>;
}