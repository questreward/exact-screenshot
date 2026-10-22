import { decorForJob, type JobDecor } from "@/game/job-decor";
import pompiers from "@/assets/v2/cab-pompiers.webp";
import police from "@/assets/v2/cab-police.webp";
import gendarmerie from "@/assets/v2/cab-gendarmerie.webp";
import samu from "@/assets/v2/cab-samu.webp";
import protection_civile from "@/assets/v2/cab-protection-civile.webp";
import bureau from "@/assets/v2/job-bureau.webp";
import commerce from "@/assets/v2/job-commerce.webp";
import chantier from "@/assets/v2/job-chantier.webp";
import hopital from "@/assets/v2/job-hopital.webp";
import ecole from "@/assets/v2/job-ecole.webp";
import rue from "@/assets/v2/job-rue.webp";

const IMAGES: Record<JobDecor, string> = { pompiers, police, gendarmerie, samu, protection_civile, bureau, commerce, chantier, hopital, ecole, rue };

export function WorkBackdrop({ job, title }: { job: string; title: string }) {
  return <div className="relative overflow-hidden"><img src={IMAGES[decorForJob(job)]} alt={`Décor de métier · ${title}`} width={1024} height={576} className="aspect-[16/9] w-full object-cover" /><div className="absolute inset-0 bg-gradient-to-t from-card via-transparent to-transparent" /><p className="absolute bottom-4 inset-x-4 text-xs text-muted-foreground">CIVITAS · décor illustratif</p></div>;
}