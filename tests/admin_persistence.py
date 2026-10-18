"""Bloc 11 — démarches simulées. Comptes temporaires isolés ; seules des échéances appartenant au test sont avancées (jamais l'horloge commune)."""
import asyncio, uuid, requests
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timedelta
from playwright.async_api import async_playwright
from economy_persistence import prepare, cleanup, rows, rpc, patch, req, check, action, BASE, PUB

def A(h, cmd, inp=None, rid=None):
  return rpc('admin_action', {'_command': cmd, '_request_id': rid or str(uuid.uuid4()), '_input': inp or {}}, h)
def denied(h, cmd, inp=None):
  r = requests.post(BASE + '/rest/v1/rpc/admin_action', json={'_command': cmd, '_request_id': str(uuid.uuid4()), '_input': inp or {}}, headers=h, timeout=30)
  return r.status_code >= 400, r.text
def write_denied(h, method, path, data):
  r = requests.request(method, BASE + '/rest/v1/' + path, json=data, headers={**h, 'Prefer': 'return=representation'}, timeout=30)
  return r.status_code >= 400 or r.text in ('', '[]')
def st(h): return rpc('admin_state', h=h)
def proc(h, type_id, pred=lambda p: True): return next(p for p in st(h)['procedures'] if p['type_id'] == type_id and pred(p))
def fixture_tx(cid, amount, category, label, when):
  acc = rows('accounts', 'character_id=eq.' + cid)[0]
  req('/rest/v1/transactions', {'account_id': acc['id'], 'amount': amount, 'label': label, 'category': category, 'world_at': when})
  patch('accounts', 'id=eq.' + acc['id'], {'balance': acc['balance'] + amount})
def bal(cid): return rows('accounts', 'character_id=eq.' + cid)[0]['balance']
def tx(cid, like): return rows('transactions', 'account_id=eq.' + rows('accounts', 'character_id=eq.' + cid)[0]['id'] + '&label=like.' + like)
def relogin(f):
  ss = req('/auth/v1/token?grant_type=password', {'email': f['email'], 'password': f['password']}, {'apikey': PUB})
  return {'apikey': PUB, 'Authorization': 'Bearer ' + ss['access_token'], 'Content-Type': 'application/json'}, ss
def hire(cid, h):
  job = rows('jobs', 'city_id=eq.lyon&title=eq.Assistant administratif')[0]
  rpc('apply_job', {'_job_id': job['id']}, h); patch('job_applications', 'character_id=eq.' + cid + '&status=eq.pending', {'response_at': '2000-01-01T00:00:00Z'}); rpc('daily_life_state', h=h)
def docs(h, *types):
  for t in types: A(h, 'document', {'type_id': t})

try:
  # ===================== DÉCLARATION =====================
  f = prepare(); h = f['h']; cid = f['cid']
  s0 = st(h); now = datetime.fromisoformat(s0['world_now']); year = now.strftime('%Y')
  tax = [p for p in s0['procedures'] if p['type_id'] == 'tax_declaration']
  check(len(tax) == 1 and tax[0]['period'] == year and tax[0]['status'] == 'a_faire', 'D1 Déclaration créée automatiquement (une par année du monde)')
  # Revenus de test (fixture) : 12 000 € de salaires dans l'année du monde, 500 € de formations
  fixture_tx(cid, 12000, 'salaire', 'Salaire — fixture', now.isoformat()); fixture_tx(cid, -500, 'formation', 'Formation — fixture', now.isoformat())
  check(st(h)['situation']['year_income'] == 12000, 'D2 Revenus récupérés depuis la Banque (12 000 €)')
  pid = tax[0]['id']
  check(write_denied(h, 'PATCH', 'administrative_procedures?id=eq.' + pid, {'status': 'terminee'}) and write_denied(h, 'POST', 'tax_declarations', {'procedure_id': pid, 'character_id': cid, 'version': 1, 'income': 1, 'taxable': 0, 'tax': 0, 'training_spent': 0, 'credit': 0, 'net': -5000, 'submitted_at': now.isoformat()}), 'D3 Revenu et déclaration non modifiables directement')
  check(denied(h, 'submit', {'procedure_id': pid})[0], 'Envoi refusé sans documents ni situation')
  docs(h, 'identity', 'bank_statement', 'income_proof')
  for t in ['identity', 'bank_statement', 'income_proof']: A(h, 'attach', {'procedure_id': pid, 'type_id': t})
  check(denied(h, 'submit', {'procedure_id': pid})[0], 'Envoi refusé sans situation confirmée')
  A(h, 'confirm', {'procedure_id': pid, 'training_credit': False, 'income': 1})
  with ThreadPoolExecutor(max_workers=4) as p: list(p.map(lambda _: requests.post(BASE + '/rest/v1/rpc/admin_action', json={'_command': 'submit', '_request_id': str(uuid.uuid4()), '_input': {'procedure_id': pid}}, headers=h, timeout=30), range(4)))
  P = proc(h, 'tax_declaration')
  check(P['status'] == 'acceptee' and len(P['declarations']) == 1, 'D4 Validation : une seule déclaration malgré 4 envois simultanés')
  check(P['declarations'][0]['income'] == 12000 and P['declarations'][0]['net'] == 200 and P['balance'] == 200, 'D5 Calcul serveur : 12 000 € → 200 €')
  b = bal(cid)
  with ThreadPoolExecutor(max_workers=4) as p: list(p.map(lambda _: requests.post(BASE + '/rest/v1/rpc/admin_action', json={'_command': 'pay', '_request_id': str(uuid.uuid4()), '_input': {'procedure_id': pid}}, headers=h, timeout=30), range(4)))
  check(bal(cid) == b - 200 and proc(h, 'tax_declaration')['status'] == 'terminee', 'D6 Paiement : 200 € prélevés une seule fois (4 clics)')
  check(len(tx(cid, 'Impôt*')) == 1, 'D7 Transaction Banque unique')
  h2, ss = relogin(f); st(h2); st(h2)
  check(proc(h2, 'tax_declaration')['status'] == 'terminee' and bal(cid) == b - 200 and len(tx(cid, 'Impôt*')) == 1, 'D8/D9 Reconnexion et recharges : même statut, aucune double transaction')
  check(denied(h, 'pay', {'procedure_id': pid})[0], 'Paiement déjà effectué : refusé')
  # Correction avant clôture : crédit formation 100 € → montant 100 € → remboursement 100 €
  b = bal(cid); A(h, 'correct', {'procedure_id': pid, 'training_credit': True}); A(h, 'correct', {'procedure_id': pid, 'training_credit': True})
  P = proc(h, 'tax_declaration')
  check([d['status'] for d in P['declarations']] == ['remplacee', 'remplacee', 'active'] and P['declarations'][2]['net'] == 100 and bal(cid) == b + 100 and len(tx(cid, 'Remboursement fiscal*')) == 1, 'D10 Correction : historique conservé, remboursement de 100 € une seule fois')
  patch('administrative_procedures', 'id=eq.' + pid, {'closes_at': (now - timedelta(days=1)).isoformat()})
  ok, msg = denied(h, 'correct', {'procedure_id': pid, 'training_credit': False})
  check(ok and 'Modification impossible' in msg, 'Après clôture : « Modification impossible pour cette période »')

  # ===================== RETARD (même compte, nouvelle période fictive) =====================
  g = prepare(); hg = g['h']; cg = g['cid']; st(hg)
  late = proc(hg, 'tax_declaration')
  patch('administrative_procedures', 'id=eq.' + late['id'], {'due_at': (now - timedelta(hours=1)).isoformat()})
  st(hg); st(hg)
  late = proc(hg, 'tax_declaration')
  notes = rows('notifications', 'user_id=eq.' + g['u']['id'] + '&title=eq.Démarche en retard')
  check(late['late'] and late['result'].get('late_fee') == 10 and len(notes) == 1, 'R1 Échéance dépassée : statut retard, une notification')
  docs(hg, 'identity', 'bank_statement', 'income_proof')
  for t in ['identity', 'bank_statement', 'income_proof']: A(hg, 'attach', {'procedure_id': late['id'], 'type_id': t})
  A(hg, 'confirm', {'procedure_id': late['id']}); A(hg, 'submit', {'procedure_id': late['id']})
  hg2, _ = relogin(g); st(hg2); st(hg2)
  late = proc(hg2, 'tax_declaration')
  check(late['balance'] == 10 and len(rows('notifications', 'user_id=eq.' + g['u']['id'] + '&title=eq.Démarche en retard')) == 1, 'R2 Conséquence simple : 10 € dus une seule fois, même après reconnexion')
  b = bal(cg); A(hg, 'pay', {'procedure_id': late['id']})
  check(bal(cg) == b - 10 and proc(hg, 'tax_declaration')['status'] == 'terminee', 'R3 Majoration réglée via la Banque, sans double conséquence')

  # ===================== AIDE AU LOGEMENT =====================
  k = prepare(); hk = k['h']; ck = k['cid']; hire(ck, hk)
  rid = str(uuid.uuid4())
  with ThreadPoolExecutor(max_workers=3) as p: list(p.map(lambda _: requests.post(BASE + '/rest/v1/rpc/admin_action', json={'_command': 'start', '_request_id': str(uuid.uuid4()), '_input': {'type_id': 'housing_aid'}}, headers=hk, timeout=30), range(3)))
  aids = [p for p in st(hk)['procedures'] if p['type_id'] == 'housing_aid']
  check(len(aids) == 1, 'L1/L11 Demande commencée une seule fois (double clic)')
  aid = aids[0]['id']
  docs(hk, 'housing_proof', 'income_proof', 'situation_proof')
  check(denied(hk, 'attach', {'procedure_id': aid, 'type_id': 'school_certificate'})[0], 'Document non demandé refusé')
  for t in ['housing_proof', 'income_proof', 'situation_proof']: A(hk, 'attach', {'procedure_id': aid, 'type_id': t})
  check(all(a['valid'] for a in proc(hk, 'housing_aid')['attachments']) and len(proc(hk, 'housing_aid')['attachments']) == 3, 'L2 Documents joints (checklist complète)')
  A(hk, 'confirm', {'procedure_id': aid}); A(hk, 'submit', {'procedure_id': aid})
  check(proc(hk, 'housing_aid')['status'] == 'envoyee', 'L4 Dossier envoyé, réponse attendue')
  monthly = st(hk)['situation']['housing_monthly']; expected = monthly * 40 // 100
  patch('administrative_procedures', 'id=eq.' + aid, {'response_at': (now - timedelta(minutes=1)).isoformat()})
  b = bal(ck); st(hk); st(hk)
  P = proc(hk, 'housing_aid')
  check(P['status'] == 'acceptee', 'L3/L5 Éligibilité contrôlée par le serveur, demande acceptée')
  check(P['result']['amount'] == expected, f'L6 Montant : 40 % de {monthly} € = {expected} €')
  check(bal(ck) == b + expected and len(tx(ck, 'Aide au logement*')) == 1, 'L7/L8 Premier versement en Banque')
  hk2, _ = relogin(k); st(hk2); st(hk2)
  check(len(tx(ck, 'Aide au logement*')) == 1, 'L9/L12 Reconnexion et recharges : aucun double versement')
  check(write_denied(hk, 'PATCH', 'administrative_procedures?id=eq.' + aid, {'result': {'amount': 99999}}), 'Montant d’aide non modifiable')
  # Hors connexion : 31 jours plus tard → 2e versement, une seule fois
  starts = datetime.fromisoformat(P['result']['starts_at']) - timedelta(days=31); ends = starts + timedelta(days=90)
  patch('administrative_procedures', 'id=eq.' + aid, {'result': {**P['result'], 'starts_at': starts.isoformat(), 'ends_at': ends.isoformat()}})
  with ThreadPoolExecutor(max_workers=3) as p: list(p.map(lambda _: st(hk), range(3)))
  check(len(tx(ck, 'Aide au logement*')) == 2, 'H1 Hors connexion : 2e versement unique après 30 jours du monde')
  check(denied(hk, 'renew', {'procedure_id': aid})[0], 'Renouvellement refusé trop tôt')
  # Fin proche → avis + renouvellement unique
  starts = now - timedelta(days=85); ends = starts + timedelta(days=90)
  patch('administrative_procedures', 'id=eq.' + aid, {'result': {**proc(hk, 'housing_aid')['result'], 'starts_at': starts.isoformat(), 'ends_at': ends.isoformat()}})
  st(hk); st(hk)
  check(len(tx(ck, 'Aide au logement*')) == 3 and len(rows('notifications', 'user_id=eq.' + k['u']['id'] + '&title=eq.Votre aide arrive à échéance')) == 1, 'H2 3e versement et avis d’échéance uniques')
  with ThreadPoolExecutor(max_workers=3) as p: list(p.map(lambda _: requests.post(BASE + '/rest/v1/rpc/admin_action', json={'_command': 'renew', '_request_id': str(uuid.uuid4()), '_input': {'procedure_id': aid}}, headers=hk, timeout=30), range(3)))
  check(len([p for p in st(hk)['procedures'] if p['renewed_from'] == aid]) == 1, 'L10 Renouvellement créé une seule fois')
  patch('administrative_procedures', 'id=eq.' + aid, {'result': {**proc(hk, 'housing_aid', lambda p: p['id'] == aid)['result'], 'ends_at': (now - timedelta(minutes=1)).isoformat()}})
  st(hk); st(hk)
  check(proc(hk, 'housing_aid', lambda p: p['id'] == aid)['status'] == 'terminee' and len(tx(ck, 'Aide au logement*')) == 3, 'H3 Fin de l’aide : terminée, aucun versement de trop')

  # Refus pédagogique (revenus au-dessus du plafond)
  fixture_tx(ck, 2000, 'salaire', 'Salaire — fixture', now.isoformat())
  ren = proc(hk, 'housing_aid', lambda p: p['renewed_from'] == aid)['id']
  for t in ['housing_proof', 'income_proof', 'situation_proof']: A(hk, 'attach', {'procedure_id': ren, 'type_id': t})
  A(hk, 'confirm', {'procedure_id': ren}); A(hk, 'submit', {'procedure_id': ren})
  patch('administrative_procedures', 'id=eq.' + ren, {'response_at': (now - timedelta(minutes=1)).isoformat()}); st(hk)
  R = proc(hk, 'housing_aid', lambda p: p['id'] == ren)
  check(R['status'] == 'refusee' and 'plafond' in R['result']['reason'], 'Refus expliqué : « revenus simulés au-dessus du plafond »')

  # ===================== CHANGEMENT DE SITUATION =====================
  m = prepare(); hm = m['h']; cm = m['cid']; hire(cm, hm); st(hm)
  # Le point de départ enregistré inclut déjà l'emploi → aucun changement réel
  check(denied(hm, 'report_change', {'change': 'job'})[0], 'Changement non réel refusé')
  A(hm, 'start', {'type_id': 'housing_aid'}); maid = proc(hm, 'housing_aid')['id']
  docs(hm, 'housing_proof', 'income_proof', 'situation_proof', 'work_contract')
  for t in ['housing_proof', 'income_proof', 'situation_proof']: A(hm, 'attach', {'procedure_id': maid, 'type_id': t})
  A(hm, 'confirm', {'procedure_id': maid}); A(hm, 'submit', {'procedure_id': maid})
  patch('administrative_procedures', 'id=eq.' + maid, {'response_at': (now - timedelta(minutes=1)).isoformat()}); st(hm)
  paid = len(tx(cm, 'Aide au logement*'))
  action(hm, 'quit'); A(hm, 'report_change', {'change': 'job'})
  S = st(hm)
  stale = {d['type_id']: d['status'] for d in S['documents'] if d['type_id'] in ('work_contract', 'income_proof', 'situation_proof')}
  check(all(v == 'perime' for v in stale.values()) and proc(hm, 'housing_aid')['status'] == 'a_completer', 'C1 Changement d’emploi : documents périmés, aide à compléter')
  P = proc(hm, 'housing_aid'); patch('administrative_procedures', 'id=eq.' + maid, {'result': {**P['result'], 'starts_at': (now - timedelta(days=31)).isoformat()}}); st(hm)
  check(len(tx(cm, 'Aide au logement*')) == paid, 'Versements suspendus tant que le dossier est à compléter')
  check(denied(hm, 'submit', {'procedure_id': maid})[0], 'Renvoi refusé avec documents périmés')
  home = rows('character_housing', 'character_id=eq.' + cm)[0]
  other = next(l for l in rows('locations', 'city_id=eq.lyon&kind=eq.logement&accessible=eq.true') if l['id'] != home['location_id'])
  patch('character_housing', 'character_id=eq.' + cm, {'location_id': other['id']})  # fixture : déménagement
  A(hm, 'report_change', {'change': 'housing'})
  check(next(d for d in st(hm)['documents'] if d['type_id'] == 'housing_proof')['status'] == 'perime', 'C2 Changement de logement : justificatif de logement périmé')
  sdt = prepare('student', 18); hs = sdt['h']; cs = sdt['cid']; st(hs)
  field = rpc('daily_life_state', h=hs)['fields'][0]; rpc('enroll_studies', {'_field_id': field['id']}, hs); st(hs)
  A(hs, 'report_change', {'change': 'status'})
  patch('study_enrollments', 'character_id=eq.' + cs, {'progress': 100}); action(hs, 'career')
  check(denied(hs, 'report_change', {'change': 'city'})[0], 'Ville inchangée : signalement refusé')
  A(hs, 'report_change', {'change': 'status'})
  changes = [p for p in st(hs)['procedures'] if p['type_id'] == 'situation_change']
  check(len(changes) == 2 and changes[0]['category'] == 'Études', 'C3 Passage études → vie active enregistré')
  # recalcul : aide renvoyée avec nouveaux documents → nouveau montant réévalué
  hire(cm, hm); docs(hm, 'income_proof', 'situation_proof')
  A(hm, 'confirm', {'procedure_id': maid}); A(hm, 'submit', {'procedure_id': maid})
  patch('administrative_procedures', 'id=eq.' + maid, {'response_at': (now - timedelta(minutes=1)).isoformat()}); st(hm)
  check(proc(hm, 'housing_aid')['status'] == 'acceptee', 'C4 Démarche recalculée après mise à jour des justificatifs')

  # ===================== SÉCURITÉ =====================
  check(write_denied(hk, 'POST', 'administrative_procedures', {'character_id': ck, 'type_id': 'housing_aid', 'category': 'x', 'title': 'x', 'period': 'x', 'status': 'acceptee', 'started_at': now.isoformat()}), 'S1 Création d’une démarche acceptée refusée')
  r = requests.post(BASE + '/rest/v1/rpc/economy_cash', json={'_cid': ck, '_key': 'forge', '_amount': 99999, '_label': 'x', '_category': 'aide'}, headers=hk, timeout=30)
  check(r.status_code >= 400 and len(tx(ck, 'x')) == 0, 'S2 Remboursement / crédit direct refusé (faille Bloc 10 fermée)')
  check(write_denied(hk, 'POST', 'transactions', {'account_id': rows('accounts', 'character_id=eq.' + ck)[0]['id'], 'amount': 500, 'label': 'Forge'}), 'S3 Transaction forgée refusée')
  check(write_denied(h, 'PATCH', 'tax_declarations?procedure_id=eq.' + pid, {'net': -9999}) and write_denied(h, 'PATCH', 'administrative_procedures?id=eq.' + pid, {'due_at': '2099-01-01T00:00:00Z'}), 'S4 Impôt, déclaration validée et échéance non modifiables')
  check(denied(hg, 'pay', {'procedure_id': pid})[0] and denied(hg, 'attach', {'procedure_id': aid, 'type_id': 'housing_proof'})[0] and req('/rest/v1/administrative_procedures?id=eq.' + aid, h=hg) == [], 'S5 Démarche d’un autre joueur inaccessible')
  r = requests.post(BASE + '/rest/v1/rpc/settle_administration', json={'_cid': ck}, headers=hk, timeout=30)
  check(r.status_code >= 400 and denied(hk, 'start', {'type_id': 'tax_declaration'})[0], 'S6 Fonctions internes et démarches non autorisées refusées')
  minor = prepare('student', 16); st(minor['h'])
  check(not any(p['type_id'] == 'tax_declaration' for p in st(minor['h'])['procedures']) and denied(minor['h'], 'start', {'type_id': 'housing_aid'})[0], 'S7 16 ans : pas de déclaration ni d’aide au logement (contrôle serveur)')

  # ===================== RECONNEXION (interface) =====================
  async def ui():
    async with async_playwright() as pw:
      b = await pw.chromium.launch(headless=True); ctx = await b.new_context(viewport={'width': 390, 'height': 844}); page = await ctx.new_page(); errors = []
      page.on('pageerror', lambda e: errors.append(str(e)))
      await page.goto('http://localhost:8080'); await page.evaluate("async s=>{const {supabase}=await import('/src/integrations/supabase/client.ts');await supabase.auth.setSession(s)}", k['ss'])
      await page.goto('http://localhost:8080/demarches'); await page.get_by_role('heading', name='Mes démarches', exact=True).wait_for()
      await page.screenshot(path='/tmp/browser/admin-1.png')
      before = await page.get_by_text('Aide au logement', exact=False).count()
      await page.get_by_role('tab', name='Documents').click(); await page.screenshot(path='/tmp/browser/admin-2.png')
      overflow = await page.evaluate('document.documentElement.scrollWidth<=window.innerWidth')
      for _ in range(2): await page.reload(); await page.get_by_role('heading', name='Mes démarches', exact=True).wait_for()
      await page.goto('http://localhost:8080/agenda'); await page.get_by_role('heading', name='Agenda', exact=True).wait_for(); await page.screenshot(path='/tmp/browser/admin-3.png')
      await page.goto('http://localhost:8080/parametres'); await page.get_by_role('main').get_by_role('button', name='Se déconnecter', exact=True).click(); await page.wait_for_url('**/auth*')
      _, ss2 = relogin(k)
      await page.evaluate("async s=>{const {supabase}=await import('/src/integrations/supabase/client.ts');await supabase.auth.setSession(s)}", ss2)
      await page.goto('http://localhost:8080/demarches'); await page.get_by_role('heading', name='Mes démarches', exact=True).wait_for()
      after = await page.get_by_text('Aide au logement', exact=False).count()
      await page.get_by_role('tab', name='Historique').click(); await page.screenshot(path='/tmp/browser/admin-4.png')
      await b.close(); return before, after, overflow, errors
  before, after, overflow, errors = asyncio.run(ui())
  check(before == after and before > 0 and len(tx(ck, 'Aide au logement*')) == 3, 'Reconnexion (interface) : même statut, aucune perte après recharges')
  check(overflow and not errors, 'Affichage téléphone sans débordement ni erreur')
  print('Bloc 11 : toutes les vérifications réussies.')
finally:
  cleanup()
