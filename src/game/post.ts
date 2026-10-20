/** Presentation only: the database owns postage and deadlines. */
export const POST = { greenCents: 139, registeredCents: 536, collectionDays: 15 } as const;
export const postageLabel = (registered: boolean) => `${((registered ? POST.registeredCents : POST.greenCents) / 100).toFixed(2).replace('.', ',')} €`;
export const collectionExpired = (presented: string, now: string) => Date.parse(now) >= Date.parse(presented) + POST.collectionDays * 86400000;
export type PostLetter = { id: string; sender: string; subject: string; body: string; registered: boolean; status: string; presented_at: string; read_at: string | null; archived: boolean };
export type PostState = { world_now: string; letters: PostLetter[] };
