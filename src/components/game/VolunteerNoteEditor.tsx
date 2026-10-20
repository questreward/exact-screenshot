import { useState } from 'react';
import { useMutation, useSuspenseQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { volunteerAction, volunteerDossierQuery } from '@/services/game';
export function VolunteerNoteEditor({ shiftId }: { shiftId: string }) {
  const { data } = useSuspenseQuery(volunteerDossierQuery);
  const [note, setNote] = useState('');
  const qc = useQueryClient();
  const saved = data?.notes.find(n => n.shift_id === shiftId);
  const mutation = useMutation({
    mutationFn: () => volunteerAction('volunteer_save_note', { _shift: shiftId, _note: note }),
    onSuccess: d => { qc.setQueryData(volunteerDossierQuery.queryKey, d); toast.success('Note privée conservée.'); },
    onError: (e: Error) => toast.error(e.message),
  });
  if (!data) return null;
  return <div className="space-y-2 border-t border-border pt-3"><label htmlFor={`note-${shiftId}`} className="font-semibold">Note personnelle privée</label><p className="text-xs text-muted-foreground">Déclaration personnelle, non certifiée · conservée après enregistrement.</p>{saved ? <p className="whitespace-pre-wrap break-words">{saved.note}</p> : <><Textarea id={`note-${shiftId}`} value={note} maxLength={2000} onChange={e => setNote(e.target.value)} rows={5}/><Button className="min-h-12 w-full" disabled={!note.trim() || mutation.isPending} onClick={() => mutation.mutate()}>Conserver ma note</Button></>}</div>;
}
