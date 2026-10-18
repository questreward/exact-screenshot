"""Bloc 10: quit a job then reapply to the same job. Isolated temp account, test-owned deadlines only."""
import requests
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timedelta
from economy_persistence import prepare, cleanup, rows, rpc, patch, action, check, req, BASE, PUB

def try_apply(h, job_id):
  r = requests.post(BASE + '/rest/v1/rpc/apply_job', json={'_job_id': job_id}, headers=h, timeout=30)
  return r.status_code < 400

def work_once(cid, h):
  now = datetime.fromisoformat(rpc('personal_economy_state', h=h)['world_now'])
  a = sorted(rows('activities', 'character_id=eq.' + cid + '&type=eq.work&status=eq.planned'), key=lambda x: x['start_time'])[0]
  patch('activities', 'id=eq.' + a['id'], {'status': 'running', 'start_time': (now - timedelta(hours=5)).isoformat(), 'end_time': (now - timedelta(hours=1)).isoformat()})
  rpc('personal_economy_state', h=h); rpc('personal_economy_state', h=h)
  return a

try:
  f = prepare(); cid = f['cid']; h = f['h']; account = rows('accounts', 'character_id=eq.' + cid)[0]
  job = rows('jobs', 'city_id=eq.lyon&title=eq.Assistant administratif')[0]
  bal = lambda: rows('accounts', 'id=eq.' + account['id'])[0]['balance']
  respond = lambda: (patch('job_applications', 'character_id=eq.' + cid + '&status=eq.pending', {'response_at': '2000-01-01T00:00:00Z'}), rpc('daily_life_state', h=h))

  # 1 hire (with concurrent applications)
  with ThreadPoolExecutor(max_workers=4) as p: ok = list(p.map(lambda _: try_apply(h, job['id']), range(4)))
  check(ok.count(True) == 1 and len(rows('job_applications', 'character_id=eq.' + cid)) == 1, 'TEST 9 Double candidature simultanée : une seule candidature en attente')
  respond(); emp1 = rows('employments', 'character_id=eq.' + cid)
  check(len(emp1) == 1 and emp1[0]['job_id'] == job['id'], 'TEST 1 Embauche')
  # 2 salary
  b0 = bal(); a1 = work_once(cid, h)
  check(bal() == b0 + a1['reward'] and len(rows('transactions', 'operation_key=eq.salary:' + a1['id'])) == 1, 'TEST 2 Salaire versé une fois')
  # 3 quit
  action(h, 'quit')
  check(not rows('employments', 'character_id=eq.' + cid) and not rows('activities', 'character_id=eq.' + cid + '&type=eq.work&status=eq.planned'), 'TEST 3 Départ : emploi terminé, vacations futures annulées')
  # 4 history
  hist = rpc('personal_economy_state', h=h)['history']
  apps_before = rows('job_applications', 'character_id=eq.' + cid)
  check(any(v['kind'] == 'départ' for v in hist) and len(rows('transactions', 'operation_key=eq.salary:' + a1['id'])) == 1 and apps_before[0]['status'] == 'accepted', 'TEST 4 Historique conservé : départ, ancienne paie, ancienne candidature')
  # 5 reapply same job (+ double click)
  with ThreadPoolExecutor(max_workers=4) as p: ok = list(p.map(lambda _: try_apply(h, job['id']), range(4)))
  apps = rows('job_applications', 'character_id=eq.' + cid + '&order=applied_at')
  check(ok.count(True) == 1 and len(apps) == 2 and apps[0] == apps_before[0] and apps[1]['status'] == 'pending', 'TEST 5 Candidature au même poste acceptée, ancienne candidature intacte, pas de doublon')
  # 6 new hire
  respond(); emp2 = rows('employments', 'character_id=eq.' + cid)
  check(len(emp2) == 1 and emp2[0]['started_at'] != emp1[0]['started_at'], 'TEST 6 Nouvelle embauche : nouvelle relation d’emploi')
  # 7 new salary, old never recredited
  b1 = bal(); a2 = work_once(cid, h)
  check(a2['id'] != a1['id'] and bal() == b1 + a2['reward'] and len(rows('transactions', 'operation_key=eq.salary:' + a1['id'])) == 1 and len(rows('transactions', 'operation_key=eq.salary:' + a2['id'])) == 1, 'TEST 7 Nouveau salaire uniquement pour le nouvel emploi, ancienne paie non recréditée')
  # 10 two active jobs impossible
  other = next(j for j in rows('jobs', 'city_id=eq.lyon') if j['id'] != job['id'])
  r = requests.post(BASE + '/rest/v1/employments', json={'character_id': cid, 'job_id': other['id'], 'started_at': emp2[0]['started_at']}, headers=h, timeout=30)
  check(not try_apply(h, other['id']) and r.status_code >= 400 and len(rows('employments', 'character_id=eq.' + cid)) == 1, 'TEST 10 Deux emplois actifs impossibles')
  # 8 reconnection
  ss = req('/auth/v1/token?grant_type=password', {'email': f['email'], 'password': f['password']}, {'apikey': PUB})
  h2 = {'apikey': PUB, 'Authorization': 'Bearer ' + ss['access_token'], 'Content-Type': 'application/json'}
  s = rpc('daily_life_state', h=h2); rpc('daily_life_state', h=h2)
  check(s['employment'] is not None and len(s['applications']) == 2 and bal() == b1 + a2['reward'], 'TEST 8 Reconnexion : emploi, candidatures et solde cohérents, aucun double paiement')
  print('10 vérifications réussies.')
finally:
  cleanup()
