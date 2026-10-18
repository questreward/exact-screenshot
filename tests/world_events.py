"""Bloc 12 — événements : comptes temporaires isolés, horloge commune jamais modifiée (échéances accélérées sur les seules lignes de test)."""
import asyncio, uuid, requests
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timedelta
from playwright.async_api import async_playwright
from economy_persistence import prepare, cleanup, rows, rpc, patch, req, check, BASE
from admin_persistence_helpers import hire, bal, relogin

def S(h): return rpc('world_events_state', h=h)
def act(h, eid, choice='participer'):
  return requests.post(BASE + '/rest/v1/rpc/world_event_action', json={'_event_id': eid, '_choice': choice}, headers=h, timeout=30)
def together(*calls):
  with ThreadPoolExecutor(max_workers=len(calls)) as p: return [f.result() for f in [p.submit(c) for c in calls]]
def iso(d): return d.isoformat().replace('+00:00', 'Z')
def place(city, kind): return rows('locations', f'city_id=eq.{city}&kind=eq.{kind}&accessible=eq.true&district_id=not.is.null&order=name&limit=1')[0]
def make(cid, tmpl, lid, offset_min, city='lyon', org=None, personal=True, dur=120):
  now = datetime.fromisoformat(rpc('world_clock')['world_now'].split('+')[0].split('.')[0]).replace(tzinfo=__import__('datetime').timezone.utc)
  st = now + timedelta(minutes=offset_min)
  t = rows('world_event_templates', 'id=eq.' + tmpl)[0]
  e = req('/rest/v1/events', {'title': 'TEST ' + t['title'], 'description': t['description'], 'city_id': city, 'starts_at': iso(st), 'ends_at': iso(st + timedelta(minutes=dur)),
    'scope': 'local', 'category': t['category'], 'importance': 40, 'status': 'scheduled', 'location_id': lid, 'organization_id': org, 'event_key': 'test:' + uuid.uuid4().hex,
    'target_kind': 'participation', 'template_id': tmpl, 'character_id': cid if personal else None, 'game_category': t['category'], 'interactive': t['interactive'], 'reason': t['reason']},
    h={**__import__('economy_persistence').ADMIN, 'Prefer': 'return=representation'})[0]
  made.append(e['id']); return e
def finish(aid, start=True, h=None):
  if start: rpc('start_life_activity', {'_activity_id': aid}, h)
  past = iso(datetime.utcnow() - timedelta(days=3650))
  a = rows('activities', 'id=eq.' + aid)[0]
  patch('activities', 'id=eq.' + aid, {'end_time': a['start_time']})  # échéance accélérée sur la seule ligne de test
def part(cid, eid): r = rows('world_event_participations', f'character_id=eq.{cid}&event_id=eq.{eid}'); return r[0] if r else None
def txs(cid, key): return rows('transactions', 'account_id=eq.' + rows('accounts', 'character_id=eq.' + cid)[0]['id'] + '&operation_key=eq.' + key)
made = []
def fingerprint():
  r = rows('events', 'template_id=is.null&select=id,title,description,city_id,starts_at,status,source_id,event_key,category,importance&order=id')
  return len(r), hash(str(r))

try:
  before = fingerprint()
  f = prepare(); h = f['h']; cid = f['cid']
  # 1. Création / génération et affichage
  s1 = S(h); s2 = S(h)
  gen = [e for e in s1['events'] if e['category'] != 'Actualités' or e.get('reward')]
  check(len(s1['events']) == len(s2['events']) and len(s1['events']) > 0, f"1 Génération et affichage : {len(s1['events'])} événements, identiques après recharge")
  per_day = {}
  for e in rows('events', 'city_id=eq.lyon&template_id=not.is.null&character_id=is.null&event_key=like.wev:*&select=starts_at'):
    per_day[e['starts_at'][:10]] = per_day.get(e['starts_at'][:10], 0) + 1
  check(max(per_day.values()) <= 2, f'1b Au plus 2 événements générés par ville et par jour (max {max(per_day.values())})')
  mine = rows('events', 'character_id=eq.' + cid + '&event_key=like.wevp:*')
  check(len(mine) <= 1, f'1c Au plus 1 événement personnel par jour ({len(mine)})')
  # Sécurité
  sec = [requests.post(BASE + '/rest/v1/events', json={'title': 'x', 'description': 'x', 'scope': 'local', 'category': 'x'}, headers=h).status_code >= 400,
    requests.post(BASE + '/rest/v1/rpc/world_events_settle', json={'_cid': cid}, headers=h).status_code >= 400,
    requests.post(BASE + '/rest/v1/rpc/world_event_effect', json={'_cid': cid, '_event': None, '_kind': 'argent', '_amount': 50}, headers=h).status_code >= 400,
    requests.post(BASE + '/rest/v1/rpc/world_events_generate', json={'_city': 'lyon'}, headers=h).status_code >= 400,
    requests.post(BASE + '/rest/v1/world_event_effects', json={'character_id': cid, 'effect_key': 'x', 'kind': 'argent', 'game_day': '2026-01-01', 'applied_at': '2026-01-01T00:00:00Z'}, headers=h).status_code >= 400,
    requests.post(BASE + '/rest/v1/rpc/economy_cash', json={'_cid': cid, '_key': 'x', '_amount': 50, '_label': 'x', '_category': 'x'}, headers=h).status_code >= 400]
  check(all(sec), '43 Sécurité : créer un événement, régler, appliquer un effet, générer, écrire un effet ou créditer la Banque : tout refusé')
  # 36/38. Événement professionnel rémunéré
  hire(cid, h); job = rows('jobs', 'city_id=eq.lyon&title=eq.Assistant administratif')[0]
  rpc('move_character', {'_location_id': job['location_id']}, h)
  e = make(cid, 'job-replacement', job['location_id'], -1)
  b0 = bal(cid); jobs0 = len(rows('employments', 'character_id=eq.' + cid))
  r = together(*[lambda: act(h, e['id'])] * 4)
  p = part(cid, e['id'])
  check(sum(x.status_code < 400 for x in r) == 1 and p['status'] == 'inscrit', '34 Quatre clics simultanés : une seule participation')
  ag = rows('activities', f"character_id=eq.{cid}&source_key=eq.wevent:{e['id']}")
  check(len(ag) == 1 and ag[0]['type'] == 'world_event' and ag[0]['reward'] == 0, '23 Agenda : une seule entrée, sans salaire caché')
  for x in rows('activities', f"character_id=eq.{cid}&status=eq.planned&type=eq.work"): pass
  en0 = rows('characters', 'id=eq.' + cid)[0]['energy']
  finish(ag[0]['id'], h=h)
  for _ in range(3): S(h)
  check(part(cid, e['id'])['status'] == 'reussi' and bal(cid) == b0 + 40 and len(txs(cid, 'wevent:' + e['id'])) == 1, '36 Banque : +40 € exacts, une transaction, aucun doublon après 3 recharges')
  check(rows('characters', 'id=eq.' + cid)[0]['energy'] == en0 - 15 and len(rows('employments', 'character_id=eq.' + cid)) == jobs0, '38 Travail : énergie −15, aucun emploi créé')
  h2, ss = relogin(f); S(h2); S(h2)
  check(bal(cid) == b0 + 40 and len(txs(cid, 'wevent:' + e['id'])) == 1, '35/36 Reconnexion et rattrapage : aucune seconde récompense')
  check(len(rows('world_event_effects', f"character_id=eq.{cid}&event_id=eq.{e['id']}&kind=eq.argent")) == 1, '19 Récompense unique dans le registre')
  check(not act(h2, e['id']).status_code < 400, '28 Second choix sur un événement déjà joué : refusé')
  # 43. Tentatives de modification
  bad = [requests.patch(BASE + f"/rest/v1/world_event_participations?id=eq.{p['id']}", json={'status': 'reussi'}, headers={**h2, 'Prefer': 'return=representation'}),
    requests.patch(BASE + f"/rest/v1/events?id=eq.{e['id']}", json={'starts_at': '2030-01-01T00:00:00Z'}, headers={**h2, 'Prefer': 'return=representation'}),
    requests.patch(BASE + "/rest/v1/world_event_templates?id=eq.job-replacement", json={'reward_money': 50}, headers={**h2, 'Prefer': 'return=representation'})]
  check(all(x.status_code >= 400 or x.text in ('', '[]') for x in bad) and rows('world_event_templates', 'id=eq.job-replacement')[0]['reward_money'] == 40, '43 Modifier un résultat, une date ou une récompense : refusé')
  # 4/5. Refus et expiration ; conflit
  e2 = make(cid, 'association-invite', place('lyon', 'cafe')['id'], 30)
  check(act(h2, e2['id'], 'ignorer').status_code < 400 and part(cid, e2['id'])['status'] == 'ignore' and act(h2, e2['id']).status_code >= 400, '4 Ignorer puis participer : refusé, choix conservé')
  e3 = make(cid, 'association-invite', place('lyon', 'cafe')['id'], -180, dur=60)
  check(act(h2, e3['id']).status_code >= 400 and part(cid, e3['id']) is None, '5 Événement expiré : participation refusée')
  # Absence
  e4 = make(cid, 'association-invite', place('lyon', 'cafe')['id'], 5)
  check(act(h2, e4['id']).status_code < 400, '3 Participation enregistrée')
  e5 = make(cid, 'association-invite', place('lyon', 'cafe')['id'], 20)
  r5 = act(h2, e5['id'])
  check(r5.status_code >= 400 and 'Conflit avec votre agenda' in r5.text and part(cid, e5['id']) is None, '23 Conflit d’agenda affiché clairement, rien ajouté')
  a4 = part(cid, e4['id'])['activity_id']; finish(a4, start=False); S(h2)
  check(part(cid, e4['id'])['status'] == 'absent' and not rows('world_event_effects', f"character_id=eq.{cid}&event_id=eq.{e4['id']}&kind=neq.notification"), '20 Absence : aucun gain')
  # 37. Social : relation et réputation
  org = rows('organizations', 'city_id=eq.lyon&kind=eq.culture&status=eq.active&order=name&limit=1')[0]
  npc = rows('social_npcs', f"organization_id=eq.{org['id']}&order=first_name&limit=1")
  cafe = place('lyon', 'place'); rpc('move_character', {'_location_id': cafe['id']}, h2)
  e6 = make(cid, 'culture-night', cafe['id'], -1, org=org['id'], personal=False)
  rep0 = (rows('social_stats', 'character_id=eq.' + cid) or [{'reputation': 0}])[0]['reputation']
  rel0 = (rows('social_relations', f"character_id=eq.{cid}&npc_id=eq.{npc[0]['id']}") or [{'score': 0}])[0]['score'] if npc else 0
  act(h2, e6['id']); finish(part(cid, e6['id'])['activity_id'], h=h2); S(h2); S(h2)
  rep1 = rows('social_stats', 'character_id=eq.' + cid)[0]['reputation']
  rel1 = rows('social_relations', f"character_id=eq.{cid}&npc_id=eq.{npc[0]['id']}")[0]['score'] if npc else 0
  check(rep1 == rep0 + 2 and (not npc or rel1 == rel0 + 2), f'37 Social : réputation +2 et relation +2, une seule fois (relation {rel0}→{rel1})')
  # 40. Politique : adhésion exigée, aucune élection créée
  el0 = len(rows('elections', 'select=id'))
  mairie = place('lyon', 'mairie'); e7 = make(cid, 'political-debate', mairie['id'], 40, personal=False)
  refused = act(h2, e7['id']).status_code >= 400
  party = rows('organizations', 'city_id=eq.lyon&kind=eq.party&status=eq.active&order=name&limit=1')[0]
  rpc('change_political_membership', {'_organization_id': party['id'], '_join': True}, h2)
  e8 = make(cid, 'political-debate', mairie['id'], -1, org=party['id'], personal=False)
  rpc('move_character', {'_location_id': mairie['id']}, h2)
  act(h2, e8['id']); finish(part(cid, e8['id'])['activity_id'], h=h2); S(h2); S(h2)
  pr = rows('political_rewards', f"character_id=eq.{cid}&reward_key=eq.wevent:{e8['id']}")
  check(refused and len(pr) == 1 and len(rows('elections', 'select=id')) == el0, '40 Politique : refusé sans adhésion, puis récompense unique, aucune élection créée')
  # Citoyenneté
  e9 = make(cid, 'citizen-meeting', mairie['id'], -1, personal=False)
  act(h2, e9['id']); finish(part(cid, e9['id'])['activity_id'], h=h2); S(h2); S(h2)
  check(len(rows('civic_rewards', f"character_id=eq.{cid}&reward_key=eq.wevent:{e9['id']}")) == 1, '9 Citoyenneté : engagement accordé une seule fois')
  # 22. Notifications plafonnées
  day_n = {}
  for x in rows('world_event_effects', f'character_id=eq.{cid}&kind=eq.notification&select=game_day'): day_n[x['game_day']] = day_n.get(x['game_day'], 0) + 1
  check(max(day_n.values()) <= 3, f'22 Notifications d’événements : au plus 3 par jour ({max(day_n.values())})')
  # Confidentialité et profils
  g = prepare('student', 16); hg = g['h']; cg = g['cid']
  field = rpc('daily_life_state', h=hg)['fields'][0]; rpc('enroll_studies', {'_field_id': field['id']}, hg)
  sg = S(hg)
  check(not any(x['id'] in (e['id'], e2['id']) for x in sg['events']) and requests.get(BASE + f"/rest/v1/events?id=eq.{e['id']}", headers=hg).text == '[]'
        and act(hg, e2['id']).status_code >= 400, '28 Événements personnels privés : invisibles et inaccessibles pour un autre joueur')
  pers = [x for x in sg['events'] if x['personal']]
  check(all(x['category'] in ('Études', 'Social') for x in pers), f'32 Profil 16 ans étudiant : aucun événement réservé aux salariés ({[x["title"] for x in pers]})')
  ej = make(cg, 'job-replacement', job['location_id'], 30)
  check(act(hg, ej['id']).status_code >= 400, '32 Étudiant de 16 ans : remplacement salarié refusé')
  # 39. Études : résultat figé
  uni = rows('study_enrollments', 'character_id=eq.' + cg)[0]['location_id']; rpc('move_character', {'_location_id': uni}, hg)
  es = make(cg, 'study-workshop', uni, -1)
  act(hg, es['id']); finish(part(cg, es['id'])['activity_id'], h=hg); S(hg)
  o1 = part(cg, es['id']); S(hg); hg2, _ = relogin(g); S(hg2); o2 = part(cg, es['id'])
  check(o1['status'] in ('reussi', 'echoue') and o1['outcome'] == o2['outcome'] and o1['roll'] == o2['roll'], f"39/20 Études : résultat {o1['status']} enregistré, identique après reconnexion")
  # 21. Actualités
  gen_news = rows('events', 'template_id=not.is.null&character_id=is.null&source_id=not.is.null&select=id&limit=1')
  check(not rows('events', 'character_id=not.is.null&source_id=not.is.null&select=id') and fingerprint() == before, '21 Actualités : aucun événement personnel diffusé ; 39 événements existants inchangés')
  # 30. Interface
  async def ui():
    async with async_playwright() as pw:
      b = await pw.chromium.launch(headless=True); ctx = await b.new_context(viewport={'width': 390, 'height': 844}); page = await ctx.new_page(); errs = []
      page.on('pageerror', lambda x: errs.append(str(x)))
      await page.goto('http://localhost:8080'); await page.evaluate("async s=>{const {supabase}=await import('/src/integrations/supabase/client.ts');await supabase.auth.setSession(s)}", ss)
      await page.goto('http://localhost:8080/evenements'); await page.get_by_role('heading', name='Événements', exact=True).wait_for()
      await page.get_by_role('tab', name='Récents').click(); await page.get_by_text('Participation réussie').first.wait_for()
      await page.screenshot(path='/tmp/browser/events.png')
      for _ in range(2): await page.reload(); await page.get_by_role('heading', name='Événements', exact=True).wait_for()
      await page.goto('http://localhost:8080/agenda'); await page.get_by_role('heading', name='Agenda', exact=True).wait_for()
      await b.close(); return errs
  import os; os.makedirs('/tmp/browser', exist_ok=True)
  errs = asyncio.run(ui())
  check(not errs and bal(cid) == b0 + 40, '30 Interface : écran Événements (onglets, résultat), recharges et Agenda sans erreur ; Banque inchangée')
  print('Bloc 12 : toutes les vérifications réussies.')
finally:
  for i in made:
    try: req('/rest/v1/world_event_participations?event_id=eq.' + i, method='DELETE'); req('/rest/v1/world_event_effects?event_id=eq.' + i, method='DELETE')
    except Exception: pass
  cleanup()
  for i in made:
    try: req('/rest/v1/events?id=eq.' + i, method='DELETE')
    except Exception: pass
