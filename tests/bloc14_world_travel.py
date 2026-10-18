"""Bloc 14 — trajets perturbés, effets nationaux par ville, marqueurs Carte.
Comptes temporaires isolés ; horloge commune jamais modifiée ; événements et effets de test supprimés,
indicateurs de ville remis exactement à leur valeur initiale."""
import asyncio, sys, uuid, requests
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timedelta, timezone
from pathlib import Path
from playwright.async_api import async_playwright
sys.path.insert(0, str(Path(__file__).parent))
import economy_persistence as ep
from economy_persistence import prepare, cleanup, rows, rpc, patch, req, check, BASE, ADMIN
from admin_persistence_helpers import relogin

made = []; saved_ind = {}; national = []
def iso(d): return d.isoformat().replace('+00:00', 'Z')
def now():
  return datetime.fromisoformat(rpc('world_clock')['world_now'].split('+')[0].split('.')[0]).replace(tzinfo=timezone.utc)
def loc(city, kind=None, exclude=()):
  q = f'city_id=eq.{city}&accessible=eq.true&district_id=not.is.null&order=name' + (f'&kind=eq.{kind}' if kind else '')
  return next(l for l in rows('locations', q) if l['id'] not in exclude)
def ev(tmpl, city, lid, start_min=-5, dur=180, scope='local', personal=None, status='published'):
  t = now(); tp = rows('world_event_templates', 'id=eq.' + tmpl)[0]
  e = req('/rest/v1/events', {'title': 'TEST B14 ' + tp['title'], 'description': tp['description'], 'city_id': city, 'starts_at': iso(t + timedelta(minutes=start_min)),
    'ends_at': iso(t + timedelta(minutes=start_min + dur)), 'scope': scope, 'category': tp['category'], 'importance': 40, 'status': status, 'location_id': lid,
    'event_key': 'test-b14:' + uuid.uuid4().hex, 'target_kind': 'participation', 'template_id': tmpl, 'character_id': personal, 'game_category': tp['category'],
    'interactive': False, 'reason': tp['reason']}, h={**ADMIN, 'Prefer': 'return=representation'})[0]
  made.append(e['id']); return e
def preview(h, target): return rpc('transport_delay_preview', {'_target_location_id': target}, h)
def start(h, target): return requests.post(BASE + '/rest/v1/rpc/start_life_activity', json={'_type': 'transport', '_target_location_id': target}, headers=h, timeout=30)
def running(cid): return rows('activities', f'character_id=eq.{cid}&type=eq.transport&status=eq.running')
def minutes(a): return round((datetime.fromisoformat(a['end_time']) - datetime.fromisoformat(a['start_time'])).total_seconds() / 60)
def finish(cid, h, gare):
  for a in running(cid): patch('activities', 'id=eq.' + a['id'], {'end_time': a['start_time']})  # échéance accélérée sur la seule ligne de test
  rpc('daily_life_state', h=h); rpc('move_character', {'_location_id': gare}, h)
def denied(method, path, data, h):
  r = requests.request(method, BASE + path, json=data, headers={**h, 'Prefer': 'return=representation'}, timeout=30)
  return r.status_code >= 400 or r.text in ('', '[]')
def together(*calls):
  with ThreadPoolExecutor(max_workers=len(calls)) as p: return [f.result() for f in [p.submit(c) for c in calls]]

async def ui(fa, fb, gare, n_expected):
  out = Path('/tmp/browser/bloc14'); out.mkdir(parents=True, exist_ok=True)
  async with async_playwright() as pw:
    b = await pw.chromium.launch(headless=True)
    async def open_map(ss, name):
      ctx = await b.new_context(viewport={'width': 1280, 'height': 1800}); page = await ctx.new_page()
      await page.goto('http://localhost:8080')
      await page.evaluate("async s=>{const {supabase}=await import('/src/integrations/supabase/client.ts');await supabase.auth.setSession(s)}", ss)
      await page.goto(f"http://localhost:8080/carte?city=lyon&district={gare['district_id']}")
      await page.wait_for_timeout(8000)
      await page.wait_for_timeout(2500); await page.screenshot(path=str(out / f'{name}.png')); return ctx, page
    ctx, page = await open_map(fa['ss'], 'A_carte')
    badges = page.get_by_test_id('event-marker')
    check(await badges.count() == 1, f'Carte : un seul marqueur pour le lieu ({await badges.count()})')
    label = await badges.first.get_attribute('aria-label')
    check(label.startswith(f'{n_expected} événements'), f'Carte : plusieurs événements au même lieu regroupés ({label})')
    await badges.first.click(); await page.wait_for_timeout(1500)
    sec = page.get_by_role('region', name='Événements de ce lieu')
    await sec.wait_for(); await page.screenshot(path=str(out / 'A_fiche.png'))
    txt = await sec.inner_text()
    check(txt.count('TEST B14') >= n_expected and 'Voir le lieu' in txt, 'Clic → fiches d’événements existantes (boutons du Bloc 12 conservés)')
    check('Transport public : +20 min' in txt, 'Fiche : retard des travaux affiché')
    check('EXPIRÉ' not in txt, 'Événement expiré absent de la fiche')
    await page.reload(); await page.get_by_role('button', name=gare['name'], exact=True).first.wait_for(); await page.wait_for_timeout(2500)
    check(await page.get_by_test_id('event-marker').count() == 1, 'Rechargement : toujours un seul marqueur')
    await ctx.close()
    h2, ss2 = relogin(fa)
    ctx, page = await open_map(ss2, 'A_reconnexion')
    check(await page.get_by_test_id('event-marker').count() == 1, 'Reconnexion : marqueur identique')
    await ctx.close()
    ctx, page = await open_map(fb['ss'], 'B_carte')
    lb = await page.get_by_test_id('event-marker').first.get_attribute('aria-label')
    await page.get_by_test_id('event-marker').first.click(); await page.wait_for_timeout(1500)
    tb = await page.get_by_role('region', name='Événements de ce lieu').inner_text()
    check('PERSO' not in tb and lb.startswith(f'{n_expected} événements'), 'Second compte : événement personnel absent de la Carte et de la fiche')
    await ctx.close()
    # Écran Transport (aperçu avant confirmation)
    ctx = await b.new_context(viewport={'width': 1280, 'height': 1800}); page = await ctx.new_page()
    await page.goto('http://localhost:8080'); await page.evaluate("async s=>{const {supabase}=await import('/src/integrations/supabase/client.ts');await supabase.auth.setSession(s)}", fa['ss'])
    await page.goto(f"http://localhost:8080/carte?city=lyon&district={gare['district_id']}&location={gare['id']}")
    dest = page.get_by_label('Destination'); await dest.wait_for(timeout=30000)
    await dest.select_option(index=1); await page.wait_for_timeout(2500)
    await page.screenshot(path=str(out / 'A_transport.png'))
    st = await page.get_by_role('status').filter(has_text='de travaux').count()
    check(st == 1, 'Écran Transport : retard affiché avant confirmation')
    await ctx.close(); await b.close()

try:
  fa = prepare(); fb = prepare()
  ha, cid = fa['h'], fa['cid']; hb = fb['h']
  gare = loc('lyon', 'gare'); target = loc('lyon', exclude=(gare['id'],)); other = loc('lyon', exclude=(gare['id'], target['id']))
  rpc('move_character', {'_location_id': gare['id']}, ha); rpc('move_character', {'_location_id': gare['id']}, hb)
  base = rows('life_rules', 'id=eq.transport')[0]['duration_minutes']
  # Perturbations sans rapport : autre lieu, autre ville, expirée, annulée, personnelle
  ev('street-works', 'lyon', other['id'])
  ev('street-works', 'paris', loc('paris')['id'])
  e_exp = ev('street-works', 'lyon', gare['id'], start_min=-300, dur=60); patch('events', 'id=eq.' + e_exp['id'], {'title': 'TEST B14 EXPIRÉ'})
  e_can = ev('street-works', 'lyon', gare['id'], status='cancelled')
  e_per = ev('street-works', 'lyon', gare['id'], personal=cid); patch('events', 'id=eq.' + e_per['id'], {'title': 'TEST B14 PERSO'})
  check(all(r['travel_delay_minutes'] == 20 for r in rows('events', 'id=in.(' + ','.join(made[:4]) + ')')) and rows('events', 'id=eq.' + e_per['id'])[0]['travel_delay_minutes'] == 0,
        'Retard recopié du modèle (+20) uniquement pour les événements publics')
  p0 = preview(ha, target['id'])
  check(p0['delay_minutes'] == 0 and p0['total_minutes'] == base, f'T1 Trajet normal / non concerné / expiré / annulé / personnel / autre ville : {base} min')
  r = start(ha, target['id']); a = running(cid)[0]
  check(r.status_code < 400 and minutes(a) == base and a['travel_delay_minutes'] == 0, 'T1 Trajet réel sans retard')
  finish(cid, ha, gare['id'])
  # Une perturbation concernée
  e1 = ev('street-works', 'lyon', gare['id'])
  p1 = preview(ha, target['id'])
  check(p1['delay_minutes'] == 20 and p1['total_minutes'] == base + 20 and [x['id'] for x in p1['events']] == [e1['id']], f'T2 Aperçu : {base} + 20 min')
  rs = together(lambda: start(ha, target['id']), lambda: start(ha, target['id']))
  a = running(cid)
  check(sum(x.status_code < 400 for x in rs) == 1 and len(a) == 1, 'T8 Deux clics simultanés : un seul trajet')
  a = a[0]
  check(minutes(a) == base + 20 and a['travel_delay_minutes'] == 20 and a['travel_event_ids'] == [e1['id']], 'T2/T3 Retard appliqué exactement une fois (+20)')
  for _ in range(3): rpc('daily_life_state', h=ha)
  check(rows('activities', 'id=eq.' + a['id'])[0]['end_time'] == a['end_time'], 'T4 Rechargements : durée inchangée')
  h2, _ = relogin(fa); rpc('daily_life_state', h=h2)
  check(rows('activities', 'id=eq.' + a['id'])[0]['end_time'] == a['end_time'], 'T5 Reconnexion : durée inchangée')
  ev('street-works', 'lyon', target['id'])
  check(rows('activities', 'id=eq.' + a['id'])[0]['end_time'] == a['end_time'], 'Durée figée : une perturbation apparue en route ne rallonge pas le trajet')
  life = rpc('daily_life_state', h=ha)
  ag = [x for x in life.get('activities', []) if x['id'] == a['id']]
  check(ag and ag[0]['end_time'][:16] == a['end_time'][:16], 'T10 Agenda : heure de fin rallongée affichée')
  finish(cid, ha, gare['id'])
  # Deux puis trois perturbations
  p2 = preview(ha, target['id'])
  check(p2['delay_minutes'] == 40, 'T9 Deux travaux simultanés : +40 min')
  ev('street-works', 'lyon', None)
  p3 = preview(ha, target['id'])
  check(p3['delay_minutes'] == 40 and len(p3['events']) == 3, 'Trois travaux : plafond 40 min')
  start(ha, target['id']); a = running(cid)[0]
  check(minutes(a) == base + 40 and len(a['travel_event_ids']) == 3, 'Trajet réel plafonné à +40 min')
  finish(cid, ha, gare['id'])
  # Sécurité
  sec = [denied('PATCH', f"/rest/v1/activities?id=eq.{a['id']}", {'travel_delay_minutes': 0}, ha),
    denied('PATCH', f"/rest/v1/events?id=eq.{e1['id']}", {'travel_delay_minutes': 0}, ha),
    denied('PATCH', f"/rest/v1/events?id=eq.{e1['id']}", {'location_id': other['id']}, ha),
    denied('POST', '/rest/v1/events', {'title': 'x', 'description': 'x', 'scope': 'local', 'category': 'x', 'travel_delay_minutes': 60}, ha),
    denied('POST', '/rest/v1/world_event_city_effects', {'event_id': e1['id'], 'city_id': 'lyon', 'indicator': 'satisfaction', 'level': 'strong', 'amount': 3, 'applied_at': '2026-01-01T00:00:00Z'}, ha),
    denied('POST', '/rest/v1/rpc/transport_delay', {'_city': 'lyon', '_from': gare['id'], '_to': target['id'], '_at': '2026-01-01T00:00:00Z'}, ha),
    denied('POST', '/rest/v1/rpc/world_event_city_effects_apply', {'_event_id': e1['id']}, ha),
    denied('PATCH', '/rest/v1/world_event_settings?id=eq.1', {'travel_delay_cap_minutes': 0}, ha),
    denied('PATCH', "/rest/v1/world_event_templates?id=eq.street-works", {'travel_delay_minutes': 0}, ha)]
  check(all(sec), 'Sécurité : durée, perturbation, effet, déplacement d’événement, réglages : tout refusé au joueur')
  check(rows('world_event_settings', 'id=eq.1')[0]['travel_delay_cap_minutes'] == 40, 'Plafond toujours à 40')
  # Confidentialité de l'événement personnel
  check(denied('GET', f"/rest/v1/events?id=eq.{e_per['id']}", None, hb), 'Second compte : lecture directe de l’événement personnel refusée')
  sb = rpc('world_events_state', h=hb)
  check(all(x['id'] != e_per['id'] for x in sb['events']), 'Second compte : événement personnel absent de son fil')
  check(rpc('publish_world_event', {'_event_id': e_per['id']}) is None and not rows('news', 'event_id=eq.' + e_per['id']), 'Événement personnel jamais publié en actualité')
  # Effets nationaux par ville
  for c in rows('city_indicators', 'indicator=eq.satisfaction'): saved_ind[c['city_id']] = c['value']
  patch('city_indicators', 'city_id=eq.lyon&indicator=eq.satisfaction', {'value': 25})
  patch('city_indicators', 'city_id=eq.paris&indicator=eq.satisfaction', {'value': 75})
  en = ev('national-campaign', None, None, scope='national'); national.append(en['id'])
  rs = together(*[lambda: req('/rest/v1/rpc/world_event_city_effects_apply', {'_event_id': en['id']})] * 3)
  req('/rest/v1/rpc/world_event_city_effects_apply', {'_event_id': en['id']})
  fx = {r['city_id']: r for r in rows('world_event_city_effects', 'event_id=eq.' + en['id'])}
  check(len(fx) == len(saved_ind) and sum(rs) == len(saved_ind), f'Même événement national : une seule ligne par ville ({len(fx)}) malgré 4 appels dont 3 simultanés')
  check(fx['lyon']['level'] == 'strong' and fx['lyon']['amount'] == 3 and fx['paris']['level'] == 'none' and fx['paris']['amount'] == 0, 'Effets différents : Lyon fort (+3), Paris aucun (0)')
  others = [c for c in saved_ind if c not in ('lyon', 'paris')]
  check(all(fx[c]['level'] == 'low' and fx[c]['amount'] == 1 for c in others), 'Autres villes à 60 : effet faible (+1)')
  ind = {c['city_id']: c['value'] for c in rows('city_indicators', 'indicator=eq.satisfaction')}
  check(ind['lyon'] == 28 and ind['paris'] == 75 and all(ind[c] == saved_ind[c] + 1 for c in others), 'Satisfaction appliquée une seule fois par ville')
  hist = rows('indicator_history', 'effect_key=like.wevent-city:' + en['id'] + '*')
  check(len(hist) == len(saved_ind) - 1, 'Historique : une trace par ville concernée')
  s1 = rpc('world_events_state', h=ha); h3, _ = relogin(fa); s2 = rpc('world_events_state', h=h3)
  ce = [x.get('city_effect') for x in s1['events'] + s2['events'] if x['id'] == en['id']]
  check(len(ce) == 2 and all(c and c['level'] == 'strong' for c in ce), 'Recharge et reconnexion : « Effet fort » visible pour Lyon, sans nouvel effet')
  check(rows('city_indicators', 'city_id=eq.lyon&indicator=eq.satisfaction')[0]['value'] == 28, 'Aucun doublon après recharge et reconnexion')
  ecan = ev('national-campaign', None, None, scope='national', status='cancelled'); national.append(ecan['id'])
  eper = ev('national-campaign', None, None, scope='national', personal=cid); national.append(eper['id'])
  check(req('/rest/v1/rpc/world_event_city_effects_apply', {'_event_id': ecan['id']}) == 0 and req('/rest/v1/rpc/world_event_city_effects_apply', {'_event_id': eper['id']}) == 0,
        'National annulé ou personnel : aucun effet')
  # Carte (navigateur)
  ev('culture-night', 'lyon', gare['id'])
  asyncio.run(ui(fa, fb, gare, 2))
  print('TOTAL', len(ep.checks), 'vérifications réussies')
finally:
  ids = made
  if ids:
    req('/rest/v1/world_event_city_effects?event_id=in.(' + ','.join(ids) + ')', method='DELETE')
    for i in national: req('/rest/v1/indicator_history?effect_key=like.wevent-city:' + i + '*', method='DELETE')
  for c, v in saved_ind.items(): patch('city_indicators', f'city_id=eq.{c}&indicator=eq.satisfaction', {'value': v})
  if ids: req('/rest/v1/events?id=in.(' + ','.join(ids) + ')', method='DELETE')
  cleanup()
  check(not rows('events', 'event_key=like.test-b14:*'), 'Événements de test supprimés')
  check({c['city_id']: c['value'] for c in rows('city_indicators', 'indicator=eq.satisfaction')} == saved_ind or not saved_ind, 'Satisfaction des villes restaurée')
