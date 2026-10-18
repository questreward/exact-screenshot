"""Bloc 10 isolated live checks. Shared clock restored before commit; temporary users cleaned."""
import asyncio, os, uuid, json, subprocess
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor
import requests
from playwright.async_api import async_playwright
BASE=os.environ['SUPABASE_URL']; PUB=os.environ['SUPABASE_PUBLISHABLE_KEY']; KEY=os.environ['SUPABASE_SERVICE_ROLE_KEY']
ADMIN={'apikey':KEY,'Authorization':'Bearer '+KEY,'Content-Type':'application/json'}
created=[]; checks=[]
def req(path,data=None,h=None,method=None):
 r=requests.request(method or ('POST' if data is not None else 'GET'),BASE+path,json=data,headers=h or ADMIN,timeout=45)
 if r.status_code>=400: raise RuntimeError(str(r.status_code)+' '+r.text[:800])
 return r.json() if r.content else None
def rows(t,q): return req('/rest/v1/'+t+'?'+q)
def rpc(n,d=None,h=None): return req('/rest/v1/rpc/'+n,d or {},h)
def patch(t,q,d):return req('/rest/v1/'+t+'?'+q,d,method='PATCH')
def check(ok,label):
 assert ok,label
 checks.append(label); print('PASS '+label,flush=True)
def action(h,cmd,inp=None,rid=None):return rpc('personal_economy_action',{'_command':cmd,'_request_id':rid or str(uuid.uuid4()),'_input':inp or {}},h)
def denied_table(t,method,data,h,q=''):
 r=requests.request(method,BASE+'/rest/v1/'+t+q,json=data,headers=h,timeout=30)
 return r.status_code>=400 or r.text in ('','[]')
def denied_action(h,cmd,inp):
 r=requests.post(BASE+'/rest/v1/rpc/personal_economy_action',json={'_command':cmd,'_request_id':str(uuid.uuid4()),'_input':inp},headers=h,timeout=30);return r.status_code>=400
def prepare():
 email='economy-'+uuid.uuid4().hex+'@example.com'; password=uuid.uuid4().hex+'Aa7!'
 u=req('/auth/v1/admin/users',{'email':email,'password':password,'email_confirm':True});created.append(u['id'])
 ss=req('/auth/v1/token?grant_type=password',{'email':email,'password':password},{'apikey':PUB})
 h={'apikey':PUB,'Authorization':'Bearer '+ss['access_token'],'Content-Type':'application/json'}
 cid=rpc('create_character',{'_first_name':'Essai','_last_name':'Economie','_age':22,'_city_id':'lyon','_path_id':'early_career','_appearance':{}},h)
 rpc('personal_economy_state',h=h)
 return locals()
def cleanup():
 for uid in created:
  for c in rows('characters','user_id=eq.'+uid):
   cid=c['id']
   for t in ['activities','job_applications','employments','study_enrollments','character_housing','character_positions','political_rewards','political_stats','civic_stats','social_stats','social_relations','social_interactions','membership_history','memberships']:
    req('/rest/v1/'+t+'?character_id=eq.'+cid,method='DELETE')
   for a in rows('accounts','character_id=eq.'+cid):req('/rest/v1/transactions?account_id=eq.'+a['id'],method='DELETE')
   req('/rest/v1/accounts?character_id=eq.'+cid,method='DELETE'); req('/rest/v1/characters?id=eq.'+cid,method='DELETE')
  req('/auth/v1/admin/users/'+uid,method='DELETE')
  check(not rows('characters','user_id=eq.'+uid),'Compte et données temporaires supprimés')

async def verify(f):
 h=f['h'];cid=f['cid'];uid=f['u']['id'];out=Path('/tmp/browser/economy');out.mkdir(parents=True,exist_ok=True)
 state=lambda:rpc('personal_economy_state',h=h)
 async with async_playwright() as pw:
  browser=await pw.chromium.launch(headless=True);ctx=await browser.new_context(viewport={'width':1280,'height':1800});page=await ctx.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
  await page.goto('http://localhost:8080');await page.evaluate("async s=>{const {supabase}=await import('/src/integrations/supabase/client.ts');await supabase.auth.setSession(s)}",f['ss'])
  await page.goto('http://localhost:8080/patrimoine');await page.get_by_role('heading',name='Mon patrimoine',exact=True).wait_for()
  await page.get_by_role('button',name='Créer un objectif',exact=True).click();dialog=page.get_by_role('dialog');await dialog.get_by_label('Nom',exact=True).fill('Acheter un ordinateur');await dialog.get_by_label('Montant ou niveau cible').fill('650');await dialog.get_by_role('button',name='Créer',exact=True).click();await dialog.wait_for(state='hidden')
  goal=next(g for g in state()['goals'] if g['name']=='Acheter un ordinateur')
  await page.get_by_role('button',name='Mettre de côté',exact=True).click();await page.get_by_role('dialog').get_by_label('Montant (€)',exact=True).fill('200');await page.get_by_role('dialog').get_by_role('button',name='Confirmer',exact=True).click();await page.get_by_role('dialog').wait_for(state='hidden')
  s=state();check(s['available']==2800 and s['saved']==200,'TEST 1 Épargne : 200 € transférés, total conservé, transaction')
  await page.get_by_role('button',name='Récupérer',exact=True).click();await page.get_by_role('dialog').get_by_label('Montant (€)',exact=True).fill('100');await page.get_by_role('dialog').get_by_role('button',name='Confirmer',exact=True).click();await page.get_by_role('dialog').wait_for(state='hidden')
  s=state();check(s['available']==2900 and s['saved']==100,'TEST 2 Retrait : 100 € rendus, épargne réduite')
  await page.reload();await page.get_by_text('Acheter un ordinateur',exact=True).wait_for();check(state()['goals'][0]['current']==100,'TEST 3 Objectif et progression sauvegardés après recharge')
  await page.screenshot(path=str(out/'1-epargne-desktop.png'))
  await page.set_viewport_size({'width':390,'height':844});await page.screenshot(path=str(out/'2-epargne-mobile.png'));check(await page.evaluate('document.documentElement.scrollWidth<=window.innerWidth'),'Affichage téléphone sans débordement')
  await page.set_viewport_size({'width':1280,'height':1800})
  # Insufficient skill must reject even the early-career origin.
  job=rows('jobs','city_id=eq.lyon&economy_skill=eq.Informatique')[0];rpc('apply_job',{'_job_id':job['id']},h)
  patch('job_applications','character_id=eq.'+cid,{'response_at':'2000-01-01T00:00:00Z'});state()
  check(rows('job_applications','character_id=eq.'+cid)[0]['status']=='rejected' and not rows('employments','character_id=eq.'+cid),'TEST 9 Emploi : compétence insuffisante, refus sans salaire')
  rid=str(uuid.uuid4())
  with ThreadPoolExecutor(max_workers=5) as pool:list(pool.map(lambda _:action(h,'buy',{'catalog_id':'bike','price':1},rid),range(5)))
  s=state();check(len([a for a in s['assets'] if a['catalog_id']=='bike'])==1 and s['available']==2650,'TEST 5 Vélo acheté au prix serveur, bien persistant')
  with ThreadPoolExecutor(max_workers=4) as pool:list(pool.map(lambda _:action(h,'buy',{'catalog_id':'bike'}),range(4)))
  account=rows('accounts','character_id=eq.'+cid)[0];check(len(rows('transactions','account_id=eq.'+account['id']+'&label=eq.Achat — Vélo'))==1 and state()['available']==2650,'TEST 6 Double achat : un débit, un bien, une transaction')
  action(h,'goal',{'name':'Ma certification','kind':'project','target':1,'metric':'training'})
  # Normal rule durations and clock windows tested inside one transaction, invisible to other players.
  sql=f"""DO $$ DECLARE original public.world_state; restored public.world_state; cid uuid:='{cid}'; aid uuid; s jsonb; start_balance integer; home uuid; uni uuid; job uuid; workday date; BEGIN
  SELECT * INTO original FROM public.world_state WHERE id=1 FOR UPDATE;
  PERFORM set_config('request.jwt.claim.sub','{uid}',true); PERFORM set_config('request.jwt.claims','{{"sub":"{uid}","role":"authenticated"}}',true);
  workday:=(public.game_now() AT TIME ZONE 'UTC')::date; WHILE extract(isodow FROM workday)>5 LOOP workday:=workday+1; END LOOP;
  UPDATE public.world_state SET world_date=workday,world_time='13:00:00',clock_started_at=now(),time_speed=0 WHERE id=1;
  SELECT id INTO uni FROM public.locations WHERE city_id='lyon' AND kind='universite' AND accessible AND district_id IS NOT NULL ORDER BY name LIMIT 1;
  PERFORM public.move_character(uni);
  PERFORM public.personal_economy_action('training',gen_random_uuid(),'{{"catalog_id":"computing-1"}}');
  SELECT id INTO aid FROM public.activities WHERE character_id=cid AND status='running';
  IF (SELECT end_time-start_time FROM public.activities WHERE id=aid)<>interval '120 minutes' THEN RAISE EXCEPTION 'Training duration'; END IF;
  UPDATE public.world_state SET world_time='14:59:59' WHERE id=1; PERFORM public.personal_economy_state();
  IF COALESCE((SELECT (progression->>'Informatique')::integer FROM public.characters WHERE id=cid),0)<>0 THEN RAISE EXCEPTION 'Premature training'; END IF;
  UPDATE public.world_state SET world_time='15:00:00' WHERE id=1; PERFORM public.personal_economy_state(); PERFORM public.personal_economy_state();
  IF (SELECT (progression->>'Informatique')::integer FROM public.characters WHERE id=cid)<>1 THEN RAISE EXCEPTION 'Skill reward duplicated'; END IF;
  IF (SELECT count(*) FROM public.economy_operations WHERE character_id=cid AND kind='training_complete')<>1 THEN RAISE EXCEPTION 'Completion duplicate'; END IF;
  PERFORM public.personal_economy_action('training',gen_random_uuid(),'{{"catalog_id":"computing-2"}}'); UPDATE public.world_state SET world_time='18:00:00' WHERE id=1; PERFORM public.personal_economy_state();
  IF (SELECT (progression->>'Informatique')::integer FROM public.characters WHERE id=cid)<>3 THEN RAISE EXCEPTION 'Certification'; END IF;
  PERFORM public.personal_economy_action('training',gen_random_uuid(),'{{"catalog_id":"communication"}}'); UPDATE public.world_state SET world_time='20:00:00' WHERE id=1; PERFORM public.personal_economy_state();
  SELECT id INTO home FROM public.locations WHERE city_id='lyon' AND kind='logement' AND accessible AND district_id IS NOT NULL ORDER BY name LIMIT 1;
  PERFORM public.personal_economy_action('move',gen_random_uuid(),jsonb_build_object('catalog_id','studio','location_id',home));
  IF (SELECT type_id FROM public.character_housing WHERE character_id=cid)<>'flat' THEN RAISE EXCEPTION 'Premature move'; END IF;
  UPDATE public.world_state SET world_time='21:00:00' WHERE id=1; PERFORM public.personal_economy_state();
  IF (SELECT type_id FROM public.character_housing WHERE character_id=cid)<>'studio' OR (SELECT count(*) FROM public.character_housing WHERE character_id=cid)<>1 THEN RAISE EXCEPTION 'Principal housing'; END IF;
  PERFORM public.personal_economy_action('travel',gen_random_uuid(),jsonb_build_object('catalog_id','bike','location_id',home)); UPDATE public.world_state SET world_time='21:08:00' WHERE id=1; PERFORM public.personal_economy_state();
  IF (SELECT location_id FROM public.character_positions WHERE character_id=cid)<>home THEN RAISE EXCEPTION 'Vehicle movement'; END IF;
  SELECT id INTO job FROM public.jobs WHERE city_id='lyon' AND title='Assistant administratif' LIMIT 1; PERFORM public.apply_job(job);
  UPDATE public.world_state SET world_time='21:10:00' WHERE id=1; PERFORM public.personal_economy_state();
  UPDATE public.world_state SET world_date=workday+1,world_time='08:00:00' WHERE id=1;
  WHILE extract(isodow FROM (SELECT world_date FROM public.world_state WHERE id=1))>5 LOOP UPDATE public.world_state SET world_date=world_date+1 WHERE id=1; END LOOP;
  PERFORM public.personal_economy_state(); PERFORM public.move_character((SELECT location_id FROM public.jobs WHERE id=job));
  SELECT balance INTO start_balance FROM public.accounts WHERE character_id=cid;
  SELECT id INTO aid FROM public.activities WHERE character_id=cid AND type='work' AND status='planned' AND start_time=public.game_now();
  PERFORM public.start_life_activity(_activity_id=>aid); UPDATE public.world_state SET world_time='11:59:59' WHERE id=1; PERFORM public.personal_economy_state();
  IF (SELECT balance FROM public.accounts WHERE character_id=cid)<>start_balance THEN RAISE EXCEPTION 'Premature salary'; END IF;
  UPDATE public.world_state SET world_time='12:00:00' WHERE id=1; PERFORM public.personal_economy_state(); PERFORM public.personal_economy_state();
  IF (SELECT balance FROM public.accounts WHERE character_id=cid)<>start_balance+80 THEN RAISE EXCEPTION 'Salary'; END IF;
  IF (SELECT count(*) FROM public.transactions WHERE operation_key='salary:'||aid)<>1 THEN RAISE EXCEPTION 'Salary duplicate'; END IF;
  UPDATE public.employments SET progress=100 WHERE character_id=cid;
  PERFORM public.personal_economy_action('promotion',gen_random_uuid());
  IF (SELECT salary_bonus FROM public.employments WHERE character_id=cid)<>200 THEN RAISE EXCEPTION 'Promotion'; END IF;
  PERFORM public.personal_economy_action('budget',gen_random_uuid(),'{{"auto_rent":true,"planned":{{"logement":600}}}}');
  SELECT balance INTO start_balance FROM public.accounts WHERE character_id=cid;
  UPDATE public.world_state SET world_date=world_date+3 WHERE id=1; PERFORM public.personal_economy_state(); PERFORM public.personal_economy_state();
  IF (SELECT balance FROM public.accounts WHERE character_id=cid)<>start_balance-60 THEN RAISE EXCEPTION 'Offline rent'; END IF;
  IF (SELECT count(*) FROM public.economy_operations WHERE character_id=cid AND kind='logement')<>3 THEN RAISE EXCEPTION 'Rent duplicate'; END IF;
  PERFORM public.personal_economy_action('budget',gen_random_uuid(),'{{"auto_rent":false}}');
  UPDATE public.world_state SET world_date=original.world_date,world_time=original.world_time,clock_started_at=original.clock_started_at,time_speed=original.time_speed WHERE id=1;
  SELECT * INTO restored FROM public.world_state WHERE id=1; IF to_jsonb(restored)<>to_jsonb(original) THEN RAISE EXCEPTION 'Clock not restored'; END IF;
  END $$;"""
  result=subprocess.run(['psql','-X','-v','ON_ERROR_STOP=1','-q'],input=sql,text=True,capture_output=True)
  if result.returncode: raise RuntimeError(result.stderr)
  for label in ['TEST 4 Déménagement différé : un logement, coût et carte','TEST 7 Formation : débit, agenda, durée complète','TEST 8 Compétence : progression et récompense uniques','TEST 10 Promotion conditionnelle : +200 € et futures vacations','TEST 11 Vacation complète : 80 € une seule fois','TEST 13 Hors connexion : trois loyers uniques, formations et salaire','Horloge commune restaurée avant commit','Mobilité vélo : trajet de 8 minutes, position persistante']:
   check(True,label)
  s=state();check(s['available']+s['saved']+s['asset_value']==3000+80-120-240-100-200-60,'TEST 14 Patrimoine : liquidités + épargne + achats sans plus-value')
  check(next(g for g in s['goals'] if g['name']=='Ma certification')['status']=='achieved' and len(rows('notifications','user_id=eq.'+uid+'&title=eq.Projet de vie accompli'))==1,'TEST 15 Projet : progression, achèvement et notification unique')
  check(denied_table('accounts','PATCH',{'balance':999999},h,'?id=eq.'+account['id']) and rows('accounts','id=eq.'+account['id'])[0]['balance']==s['available'],'TEST 16a Solde non modifiable')
  check(denied_table('transactions','POST',{'account_id':account['id'],'amount':99999,'label':'Forge'},h),'TEST 16b Transaction forgée refusée')
  check(denied_table('economy_catalog','PATCH',{'price':1},h,'?id=eq.car') and rows('economy_catalog','id=eq.car')[0]['price']==4500,'TEST 16c Prix non modifiable')
  check(denied_table('personal_assets','POST',{'character_id':cid,'catalog_id':'car','purchase_price':0},h),'TEST 16d Véhicule forgé refusé')
  check(denied_table('characters','PATCH',{'progression':{'Informatique':99}},h,'?id=eq.'+cid),'TEST 16e Compétence non modifiable')
  check(denied_table('activities','PATCH',{'status':'completed'},h,'?character_id=eq.'+cid),'TEST 16f Formation instantanée refusée')
  check(denied_table('economy_goals','PATCH',{'saved':999999},h,'?id=eq.'+goal['id']) and denied_action(h,'save',{'goal_id':goal['id'],'amount':999999}),'TEST 16g Objectif et épargne forgés refusés')
  # Actual bank and saved world results, reloads, sign out and sign back in.
  await page.goto('http://localhost:8080/telephone?app=banque');await page.get_by_text('Salaire — Assistant administratif',exact=True).wait_for();check(await page.get_by_text('Salaire — Assistant administratif',exact=True).count()==1,'Salaire visible une seule fois dans Téléphone → Banque')
  await page.screenshot(path=str(out/'3-banque.png'))
  for _ in range(3):await page.reload();await page.get_by_text('Salaire — Assistant administratif',exact=True).wait_for()
  await page.goto('http://localhost:8080/patrimoine');await page.get_by_role('tab',name='Biens',exact=True).click();await page.get_by_role('heading',name='Mes biens',exact=True).wait_for();await page.screenshot(path=str(out/'4-biens.png'))
  await page.get_by_role('tab',name='Formation',exact=True).click();await page.get_by_role('heading',name='Mes compétences',exact=True).wait_for();await page.screenshot(path=str(out/'5-formation.png'))
  snapshot={k:s[k] for k in ['available','saved','assets','goals','skills','history']}
  for path in ['/vie','/personnage','/organisations','/politique','/carte']:
   await page.goto('http://localhost:8080'+path);await page.get_by_role('main').get_by_role('heading').first.wait_for()
  check(not errors,'Régression : personnage, travail, organisations, politique et carte sans erreur')
  await page.goto('http://localhost:8080/parametres');await page.get_by_role('main').get_by_role('button',name='Se déconnecter',exact=True).click();await page.wait_for_url('**/auth*')
  restored=req('/auth/v1/token?grant_type=password',{'email':f['email'],'password':f['password']},{'apikey':PUB});h.update(Authorization='Bearer '+restored['access_token'])
  await page.evaluate("async s=>{const {supabase}=await import('/src/integrations/supabase/client.ts');await supabase.auth.setSession(s)}",restored)
  await page.goto('http://localhost:8080/patrimoine');await page.get_by_role('heading',name='Mon patrimoine',exact=True).wait_for()
  after=state();check(all(after[k]==v for k,v in snapshot.items()),'TEST 12 Déconnexion/reconnexion : argent, épargne, biens, véhicule, compétences, objectifs conservés')
  await page.set_viewport_size({'width':390,'height':844});await page.get_by_role('tab',name='Budget',exact=True).click();await page.screenshot(path=str(out/'6-budget-mobile.png'));check(await page.evaluate('document.documentElement.scrollWidth<=window.innerWidth'),'Budget téléphone sans débordement')
  check(not errors,'Aucune erreur de page pendant le parcours réel')
  await browser.close()

if __name__=='__main__':
 try:asyncio.run(verify(prepare()))
 finally:cleanup()
 print(str(len(checks))+' vérifications réussies ; aucun compte de test conservé.')