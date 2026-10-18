"""Bloc 11 — changements de situation comparés par type (correctif 0038). Compte temporaire isolé."""
import uuid, requests
from concurrent.futures import ThreadPoolExecutor
from economy_persistence import prepare, cleanup, rows, rpc, patch, check, action, BASE
from admin_persistence_helpers import st, hire, docs, bal, relogin

def post(h, change):
  return requests.post(BASE + '/rest/v1/rpc/admin_action', json={'_command': 'report_change', '_request_id': str(uuid.uuid4()), '_input': {'change': change}}, headers=h, timeout=30)
def together(*calls):
  with ThreadPoolExecutor(max_workers=len(calls)) as p: return [f.result() for f in [p.submit(c) for c in calls]]
def changes(h, kind=None):
  return [p for p in st(h)['procedures'] if p['type_id'] == 'situation_change' and (kind is None or p['result']['change'] == kind)]
def set_home(cid, t): patch('character_housing', 'character_id=eq.' + cid, {'type_id': t})
def ok(r): return r.status_code < 400
def refused(r): return r.status_code >= 400 and 'Aucun changement réel' in r.text
def acct(cid): return rows('accounts', 'character_id=eq.' + cid)[0]['id']
def money(cid): return bal(cid), len(rows('transactions', 'account_id=eq.' + acct(cid) + '&select=id'))
def agenda(cid): return sorted((a['id'], a['status'], a['start_time']) for a in rows('activities', 'character_id=eq.' + cid + '&select=id,status,start_time'))
def proof(cid): return [d['status'] for d in rows('administrative_documents', 'character_id=eq.' + cid + '&type_id=eq.housing_proof&order=issued_at.asc')]

try:
  f = prepare(); h = f['h']; cid = f['cid']; st(h)
  start_home = rows('character_housing', 'character_id=eq.' + cid)[0]['type_id']
  others = [t for t in ['room', 'studio', 'flat', 'house'] if t != start_home]
  # 1. Emploi puis logement, même seconde
  hire(cid, h); set_home(cid, others[0]); docs(h, 'housing_proof')
  m0, a0 = money(cid), agenda(cid)
  r = together(lambda: post(h, 'job'), lambda: post(h, 'housing'))
  check(all(map(ok, r)) and len(changes(h, 'job')) == 1 and len(changes(h, 'housing')) == 1, '1 Emploi puis logement dans la même seconde : les deux enregistrés')
  check(proof(cid)[-1] == 'perime', '8a Justificatif de logement périmé après le changement de logement')
  # 3 / 4. Signalements identiques refusés
  check(refused(post(h, 'job')), '3 Deuxième changement d’emploi identique : refusé')
  check(refused(post(h, 'housing')), '4 Deuxième changement de logement identique : refusé')
  # 9 / 10. Banque et Agenda non touchés par les signalements
  check(money(cid) == m0, '9 Banque : solde et transactions inchangés par les signalements')
  check(agenda(cid) == a0, '10 Agenda : aucune activité créée, modifiée ou annulée par les signalements')
  # 2. Logement puis emploi, même seconde (nouvelle situation réelle)
  action(h, 'quit'); set_home(cid, others[1]); docs(h, 'housing_proof')
  r = together(lambda: post(h, 'housing'), lambda: post(h, 'job'))
  check(all(map(ok, r)) and len(changes(h, 'job')) == 2 and len(changes(h, 'housing')) == 2, '2 Logement puis emploi dans la même seconde : les deux enregistrés')
  # 5. Nouvel emploi réel
  hire(cid, h)
  check(ok(post(h, 'job')) and len(changes(h, 'job')) == 3, '5 Nouveau changement d’emploi réel : accepté')
  # 6 + 13. Nouveau logement réel, avec 4 clics simultanés
  set_home(cid, others[2]); docs(h, 'housing_proof'); m1 = money(cid)
  r = together(*[lambda: post(h, 'housing')] * 4)
  check(sum(map(ok, r)) == 1 and sum(map(refused, r)) == 3 and len(changes(h, 'housing')) == 3, '6/13 Nouveau logement réel accepté ; 4 clics simultanés → un seul signalement')
  check(proof(cid)[-1] == 'perime' and 'valide' not in proof(cid), '8b Justificatif de logement de nouveau périmé ; aucun justificatif valide restant')
  check(money(cid) == m1, '9b Banque inchangée par les clics simultanés')
  # 7. Historique conservé, chaque signalement comparé à son propre type
  J, H = changes(h, 'job'), changes(h, 'housing')
  check(len(J) == 3 and len(H) == 3 and all(p['status'] == 'terminee' for p in J + H)
        and len({p['result']['after'].get('housing_type') for p in H}) == 3
        and all(p['result']['before'].get('housing_type') != p['result']['after'].get('housing_type') for p in H)
        and all(p['result']['before'].get('job_id') != p['result']['after'].get('job_id') for p in J),
        '7 Historique : 3 changements d’emploi et 3 de logement conservés, chacun comparé à son propre type')
  # 11 / 12. Reconnexion et recharges
  ids = sorted(p['id'] for p in changes(h)); m2 = money(cid)
  h2, _ = relogin(f)
  check(sorted(p['id'] for p in changes(h2)) == ids and money(cid) == m2, '11 Reconnexion : mêmes signalements, Banque inchangée')
  for _ in range(3): st(h2)
  check(sorted(p['id'] for p in changes(h2)) == ids and money(cid) == m2, '12 Trois recharges : aucun signalement ni mouvement en plus')
  print('Changements par type : tous réussis.')
finally:
  cleanup()
