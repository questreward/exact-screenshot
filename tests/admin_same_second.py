"""Bloc 11 — démarches créées dans la même seconde du monde (requêtes simultanées). Comptes temporaires isolés."""
import asyncio, uuid, requests
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timedelta
from playwright.async_api import async_playwright
from economy_persistence import prepare, cleanup, rows, rpc, patch, req, check, action, BASE, ADMIN
from admin_persistence_helpers import A, st, hire, docs, fixture_tx, tx, relogin

def post(h, cmd, inp):
  return requests.post(BASE + '/rest/v1/rpc/admin_action', json={'_command': cmd, '_request_id': str(uuid.uuid4()), '_input': inp}, headers=h, timeout=30)
def together(*calls):
  with ThreadPoolExecutor(max_workers=len(calls)) as p: return [f.result() for f in [p.submit(c) for c in calls]]
def base(period): return period.rsplit(':', 1)[0]
def snapshot(h): return {p['id']: {k: p[k] for k in ('period', 'status', 'type_id', 'title', 'started_at')} for p in st(h)['procedures']}

try:
  f = prepare(); h = f['h']; cid = f['cid']; hire(cid, h); s = st(h); now = datetime.fromisoformat(s['world_now'])
  before = snapshot(h)
  # 1. Deux changements réels signalés simultanément
  home = rows('character_housing', 'character_id=eq.' + cid)[0]
  patch('character_housing', 'character_id=eq.' + cid, {'type_id': next(t['id'] for t in rows('housing_types', 'select=id') if t['id'] != home['type_id'])})
  action(h, 'quit')
  r = together(lambda: post(h, 'report_change', {'change': 'job'}), lambda: post(h, 'report_change', {'change': 'housing'}))
  ch = [p for p in st(h)['procedures'] if p['type_id'] == 'situation_change']
  check(all(x.status_code < 400 for x in r) and len(ch) == 2 and len({p['period'] for p in ch}) == 2, f'1 Deux changements simultanés enregistrés (même seconde : {base(ch[0]["period"])[:19] == base(ch[1]["period"])[:19]})')
  # 5. Deux clics simultanés sur « Commencer » → une seule démarche
  hire(cid, h)
  r = together(*[lambda: post(h, 'start', {'type_id': 'housing_aid'})] * 3)
  aids = [p for p in st(h)['procedures'] if p['type_id'] == 'housing_aid']
  check(len(aids) == 1 and sum(x.status_code < 400 for x in r) == 1, '5 Clics simultanés : une seule demande créée, règle « une aide active » intacte')
  # 2. Deux demandes d'aide différentes dans la même seconde (étudiant de 18 ans)
  g = prepare('student', 18); hg = g['h']; cg = g['cid']; st(hg)
  field = rpc('daily_life_state', h=hg)['fields'][0]; rpc('enroll_studies', {'_field_id': field['id']}, hg)
  r = together(lambda: post(hg, 'start', {'type_id': 'housing_aid'}), lambda: post(hg, 'start', {'type_id': 'student_aid'}))
  P = st(hg)['procedures']
  check(all(x.status_code < 400 for x in r) and {p['type_id'] for p in P} >= {'housing_aid', 'student_aid'}, '2 Deux demandes d’aide simultanées : les deux créées')
  # 3. Refus puis nouvelle demande dans la même seconde
  sid = next(p['id'] for p in P if p['type_id'] == 'student_aid')
  fixture_tx(cg, 2000, 'salaire', 'Salaire — fixture', now.isoformat())
  docs(hg, 'school_certificate', 'identity', 'income_proof')
  for t in ['school_certificate', 'identity', 'income_proof']: A(hg, 'attach', {'procedure_id': sid, 'type_id': t})
  A(hg, 'confirm', {'procedure_id': sid}); A(hg, 'submit', {'procedure_id': sid})
  patch('administrative_procedures', 'id=eq.' + sid, {'response_at': (now - timedelta(minutes=1)).isoformat()})
  st(hg); A(hg, 'start', {'type_id': 'student_aid'})
  S = [p for p in st(hg)['procedures'] if p['type_id'] == 'student_aid']
  check(len(S) == 2 and any(p['status'] == 'refusee' for p in S) and any(p['status'] == 'a_faire' for p in S), '3 Refus puis nouvelle demande immédiate : acceptée, refus conservé')
  # 4. Renouvellement dans la même seconde qu'une autre démarche
  aid = aids[0]['id']
  docs(h, 'housing_proof', 'income_proof', 'situation_proof')
  for t in ['housing_proof', 'income_proof', 'situation_proof']: A(h, 'attach', {'procedure_id': aid, 'type_id': t})
  A(h, 'confirm', {'procedure_id': aid}); A(h, 'submit', {'procedure_id': aid})
  patch('administrative_procedures', 'id=eq.' + aid, {'response_at': (now - timedelta(minutes=1)).isoformat()}); st(h)
  res = next(p for p in st(h)['procedures'] if p['id'] == aid)['result']
  patch('administrative_procedures', 'id=eq.' + aid, {'result': {**res, 'starts_at': (now - timedelta(days=85)).isoformat(), 'ends_at': (now + timedelta(days=5)).isoformat()}})
  st(h); paid = len(tx(cid, 'Aide au logement*'))
  action(h, 'quit')
  r = together(lambda: post(h, 'renew', {'procedure_id': aid}), lambda: post(h, 'renew', {'procedure_id': aid}), lambda: post(h, 'report_change', {'change': 'job'}))
  P = st(h)['procedures']
  check(len([p for p in P if p['renewed_from'] == aid]) == 1 and len([p for p in P if p['type_id'] == 'situation_change']) == 3, '4 Renouvellement + changement simultanés : un seul renouvellement, changement enregistré')
  # 6. Une seule déclaration fiscale par année
  together(*[lambda: st(h)] * 3)
  tax = [p for p in st(h)['procedures'] if p['type_id'] == 'tax_declaration']
  dup = requests.post(BASE + '/rest/v1/administrative_procedures', json={'character_id': cid, 'type_id': 'tax_declaration', 'category': 'Fiscalité', 'title': 'x', 'period': tax[0]['period'], 'started_at': now.isoformat()}, headers=ADMIN, timeout=30)
  check(len(tax) == 1 and ':' not in tax[0]['period'] and dup.status_code == 409 and post(h, 'start', {'type_id': 'tax_declaration'}).status_code >= 400, '6 Deuxième déclaration de la même année toujours refusée')
  # 7. Démarches antérieures inchangées
  after = snapshot(h)
  check(all(after[k]['period'] == v['period'] and after[k]['type_id'] == v['type_id'] for k, v in before.items()), '7 Démarches antérieures inchangées')
  # 8/9/10 Reconnexion, recharge, Banque et Agenda
  h2, ss = relogin(f); st(h2); st(h2)
  check(snapshot(h2) == snapshot(h) and len(tx(cid, 'Aide au logement*')) == paid, '8/9 Reconnexion et recharges : mêmes démarches, aucun versement de plus')
  async def ui():
    async with async_playwright() as pw:
      b = await pw.chromium.launch(headless=True); page = await (await b.new_context(viewport={'width': 390, 'height': 844})).new_page(); errs = []
      page.on('pageerror', lambda e: errs.append(str(e)))
      await page.goto('http://localhost:8080'); await page.evaluate("async s=>{const {supabase}=await import('/src/integrations/supabase/client.ts');await supabase.auth.setSession(s)}", ss)
      await page.goto('http://localhost:8080/agenda'); await page.get_by_role('heading', name='Agenda', exact=True).wait_for()
      ok = await page.get_by_text('Échéances administratives', exact=False).count() > 0
      await page.screenshot(path='/tmp/browser/admin-agenda.png')
      await page.goto('http://localhost:8080/telephone?app=banque'); await page.get_by_text('Aide au logement (simulation)', exact=False).first.wait_for()
      bank = await page.get_by_text('Aide au logement (simulation)', exact=False).count()
      await b.close(); return ok, bank, errs
  ok, bank, errs = asyncio.run(ui())
  check(ok and bank == paid and not errs, f'10 Agenda : échéances visibles ; Banque : {paid} versement(s) affiché(s), sans erreur')
  print('Tests « même seconde » : tous réussis.')
finally:
  cleanup()
