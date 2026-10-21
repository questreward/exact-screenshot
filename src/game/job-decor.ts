// Présentation seulement : décor affiché selon le métier de la mission du jour.
import { cabForJob, type CabKind } from "./v2-scenes";

export type JobDecor = CabKind | "bureau" | "commerce" | "chantier" | "hopital" | "ecole" | "rue";

export function decorForJob(job: string): JobDecor {
  const cab = cabForJob(job);
  if (cab) return cab;
  const j = job.toLowerCase();
  if (/pompier/.test(j)) return "pompiers";
  if (/gendarm/.test(j)) return "gendarmerie";
  if (/police|policier/.test(j)) return "police";
  if (/samu|ambulan/.test(j)) return "samu";
  if (/protection civile|secouriste/.test(j)) return "protection_civile";
  if (/infirm|médec|medec|aide-soign|soignant|hôpital|hopital|pharmac/.test(j)) return "hopital";
  if (/enseign|professeur|instit|animat|éducat|educat/.test(j)) return "ecole";
  if (/facteur|livreu|chauffeur|conducteur|taxi|coursier/.test(j)) return "rue";
  if (/maçon|macon|plomb|électric|electric|menuis|charpent|peintre|ouvrier|chantier|artisan|garag|mécan|mecan/.test(j)) return "chantier";
  if (/vendeu|caiss|boulang|boucher|serveu|commer|cuisin|barista|fleur/.test(j)) return "commerce";
  return "bureau";
}

// Le matériel du véhicule ne concerne que les métiers de secours et de sécurité.
export function hasTruckKit(job: string): CabKind | null {
  const d = decorForJob(job);
  return d === "pompiers" || d === "police" || d === "gendarmerie" || d === "samu" || d === "protection_civile" ? d : null;
}
