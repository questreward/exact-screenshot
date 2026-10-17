"""Live isolated regression: requires server credentials, requests, Playwright and an existing auth storage key. Creates/deletes only temporary test users; never changes world clock. Long activity deadlines are accelerated only on test characters. Run: python3 tests/daily_life_persistence.py. Screenshots remain in /tmp/browser/finalisation."""
import asyncio,json,os,uuid,requests
from pathlib import Path
from playwright.async_api import async_playwright
BASE=os.environ['SUPABASE_URL']; KEY=os.environ['SUPABASE_SERVICE_ROLE_KEY']; PUB=os.environ['SUPABASE_PUBLISHABLE_KEY']; OUT=Path('/tmp/browser/finalisation'); OUT.mkdir(parents=True, exist_ok=True); created=[]
ADMIN={'apikey':KEY,'Authorization':'Bearer '+KEY,'Content-Type':'application/json'}
def api(path,method='GET',data=None,headers=None):
 r=requests.request(method,BASE+path,headers=headers or ADMIN,json=data);r.raise_for_status();return r.json() if r.content else None
def rows(table,query):return api('/rest/v1/'+table+'?'+query)
def patch(table,query,data):api('/rest/v1/'+table+'?'+query,'PATCH',data)
async def main():
 async with async_playwright() as p:
  browser=await p.chromium.launch(headless=True)
  try:
   for path,age in [('student',18),('young_worker',18)]:
    email='civitas-life-'+uuid.uuid4().hex+'@example.com'; password=uuid.uuid4().hex+'Aa7!'
    user=api('/auth/v1/admin/users','POST',{'email':email,'password':password,'email_confirm':True});uid=user['id'];created.append(uid)
    session=api('/auth/v1/token?grant_type=password','POST',{'email':email,'password':password},{'apikey':PUB,'Content-Type':'application/json'})
    headers={'apikey':PUB,'Authorization':'Bearer '+session['access_token'],'Content-Type':'application/json'}
    cid=api('/rest/v1/rpc/create_character','POST',{'_first_name':'Essai','_last_name':'Quotidien','_age':age,'_city_id':'lyon','_path_id':path,'_appearance':{}},headers)
    denial=requests.patch(BASE+'/rest/v1/characters?id=eq.'+cid,headers=headers,json={'energy':999});assert rows('characters','id=eq.'+cid)[0]['energy']==100
    forged=requests.post(BASE+'/rest/v1/activities',headers=headers,json={'character_id':cid,'type':'rest','title':'Faux','start_time':'2027-09-01T00:00Z','end_time':'2027-09-01T00:01Z'});assert forged.status_code>=400
    context=await browser.new_context(viewport={'width':444,'height':803});page=await context.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
    await page.goto('http://localhost:8080');
    with open(os.path.expanduser('~/.cache/lovable-auth/session.json')) as f:storage=json.load(f)['storage_key']
    await page.evaluate('([k,v])=>localStorage.setItem(k,v)',[storage,json.dumps(session)])
    await page.goto('http://localhost:8080/vie');await page.get_by_role('heading',level=1).wait_for();await page.wait_for_timeout(1200)
    if path=='student':
     await page.get_by_role('article').filter(has=page.get_by_role('heading',name='Droit',exact=True)).get_by_role('button',name='S’inscrire').click()
     await page.get_by_role('heading',name='Droit — Niveau 1').wait_for()
     await page.get_by_role('link',name='Voir l’université').click();await page.get_by_role('button',name='Se déplacer ici').click();await page.get_by_role('button',name='Vous êtes ici').wait_for()
     activity=rows('activities','character_id=eq.'+cid+'&type=eq.course&order=start_time.asc&limit=1')[0]
     now=api('/rest/v1/rpc/game_now','POST',{},headers)
     from datetime import datetime,timedelta
     start=datetime.fromisoformat(now.replace('Z','+00:00'))-timedelta(minutes=1)
     patch('activities','id=eq.'+activity['id'],{'start_time':start.isoformat(),'end_time':(start+timedelta(hours=2)).isoformat()})
     await page.goto('http://localhost:8080/agenda');await page.get_by_role('button',name='Cours — Droit',exact=False).first.click();await page.get_by_role('button',name='Commencer',exact=True).click()
     await page.wait_for_timeout(1500);print('START RESULT:',await page.locator('[data-sonner-toast]').all_inner_texts());await page.screenshot(path=str(OUT/'start-debug.png'));await page.get_by_role('dialog').get_by_text('En cours',exact=True).wait_for()
     assert rows('characters','id=eq.'+cid)[0]['energy']==80
     assert rows('study_enrollments','character_id=eq.'+cid)[0]['progress']==0
     patch('activities','id=eq.'+activity['id'],{'start_time':(start-timedelta(hours=2)).isoformat(),'end_time':start.isoformat()})
     await page.goto('http://localhost:8080/vie');await page.get_by_text('15 %',exact=True).wait_for()
     await page.get_by_role('link',name='Rentrer chez moi').click();await page.get_by_role('button',name='Se déplacer ici').click();await page.get_by_role('button',name='Vous êtes ici').wait_for()
     await page.get_by_role('button',name='Se reposer',exact=False).click();await page.wait_for_timeout(1200)
     running=rows('activities','character_id=eq.'+cid+'&status=eq.running')[0];patch('activities','id=eq.'+running['id'],{'start_time':(start-timedelta(minutes=30)).isoformat(),'end_time':start.isoformat()})
     await page.goto('http://localhost:8080/vie');await page.get_by_text('Énergie 100 / 100',exact=True).wait_for()
     await page.get_by_role('button',name='Manger',exact=False).click();await page.wait_for_timeout(1000)
     assert rows('accounts','character_id=eq.'+cid)[0]['balance']==492
     running=rows('activities','character_id=eq.'+cid+'&status=eq.running')[0];patch('activities','id=eq.'+running['id'],{'start_time':(start-timedelta(minutes=30)).isoformat(),'end_time':start.isoformat()})
     print(path,': cours −20 énergie, +15 progression, repos plafond 100, repas −8 € OK')
    else:
     rejected_offer=page.get_by_role('article').filter(has=page.get_by_role('heading',name='Développeur junior',exact=True))
     await rejected_offer.get_by_role('button',name='Postuler',exact=True).click()
     await page.wait_for_timeout(700)
     rejected=rows('job_applications','character_id=eq.'+cid)[0]
     assert rejected['status']=='pending'
     # Wait the real response delay (one world minute), without changing this deadline.
     await rejected_offer.get_by_text('Candidature refusée.',exact=False).wait_for(timeout=90000)
     assert rows('job_applications','id=eq.'+rejected['id'])[0]['status']=='rejected'
     assert rows('employments','character_id=eq.'+cid)==[]
     assert rows('activities','character_id=eq.'+cid+'&type=eq.work')==[]
     assert rows('accounts','character_id=eq.'+cid)[0]['balance']==1500
     acc=rows('accounts','character_id=eq.'+cid)[0]
     assert not any(t['label'].startswith('Salaire') for t in rows('transactions','account_id=eq.'+acc['id']))
     await page.screenshot(path=str(OUT/'refus-mobile.png'))
     print('REFUS: statut refusé, information visible, aucun emploi/activité/salaire, solde 1500; autre offre disponible OK')
     title='Assistant administratif' if path=='young_worker' else 'Développeur junior'
     await page.get_by_role('article').filter(has=page.get_by_role('heading',name=title,exact=True)).get_by_role('button',name='Postuler',exact=True).click();await page.wait_for_timeout(1000)
     app=rows('job_applications','character_id=eq.'+cid)[0]
     from datetime import datetime,timedelta,timezone
     past='2027-09-01T00:00:00Z';patch('job_applications','id=eq.'+app['id'],{'response_at':past})
     await page.goto('http://localhost:8080/vie');await page.get_by_role('link',name='Voir mon lieu de travail').wait_for()
     planned=rows('activities','character_id=eq.'+cid+'&type=eq.work&status=eq.planned&order=start_time.asc&limit=1')[0]
     now=api('/rest/v1/rpc/game_now','POST',{},headers);start=datetime.fromisoformat(now.replace('Z','+00:00'))-timedelta(minutes=1)
     patch('activities','id=eq.'+planned['id'],{'start_time':start.isoformat(),'end_time':(start+timedelta(hours=4)).isoformat()})
     await page.get_by_role('link',name='Voir mon lieu de travail').click();await page.get_by_role('button',name='Se déplacer ici').click();await page.get_by_role('button',name='Vous êtes ici').wait_for()
     await page.get_by_role('button',name='Travailler',exact=False).click();await page.wait_for_timeout(1200)
     running=rows('activities','character_id=eq.'+cid+'&status=eq.running')[0]
     assert rows('characters','id=eq.'+cid)[0]['energy']==70
     initial=1500 if path=='young_worker' else 3000
     assert rows('accounts','character_id=eq.'+cid)[0]['balance']==initial
     patch('activities','id=eq.'+running['id'],{'start_time':'2027-08-31T20:00:00Z','end_time':past})
     # End occurred while disconnected: no salary until the next authenticated consultation.
     await page.goto('http://localhost:8080/parametres')
     await page.get_by_role('button',name='Se déconnecter').click();await page.wait_for_timeout(700)
     assert rows('accounts','character_id=eq.'+cid)[0]['balance']==initial
     session=api('/auth/v1/token?grant_type=password','POST',{'email':email,'password':password},{'apikey':PUB,'Content-Type':'application/json'})
     headers={'apikey':PUB,'Authorization':'Bearer '+session['access_token'],'Content-Type':'application/json'}
     await page.evaluate('([k,v])=>localStorage.setItem(k,v)',[storage,json.dumps(session)])
     await page.goto('http://localhost:8080/telephone?app=banque')
     await page.get_by_text('Salaire — '+title,exact=True).wait_for()
     assert rows('employments','character_id=eq.'+cid)[0]['progress']==10
     from concurrent.futures import ThreadPoolExecutor
     with ThreadPoolExecutor(max_workers=5) as pool:
      list(pool.map(lambda _:api('/rest/v1/rpc/daily_life_state','POST',{},headers),range(5)))
     acc=rows('accounts','character_id=eq.'+cid)[0]
     wages=[t for t in rows('transactions','account_id=eq.'+acc['id']) if t['label']=='Salaire — '+title]
     assert len(wages)==1 and wages[0]['amount']==80
     for _ in range(3):
      await page.reload();await page.get_by_text('Salaire — '+title,exact=True).wait_for()
      assert rows('accounts','character_id=eq.'+cid)[0]['balance']==1580
     print('SALAIRE: reprise Banque après déconnexion, +80 une seule transaction, 5 consultations concurrentes et 3 recharges sans doublon OK')
     pay=80 if path=='young_worker' else 110
     assert rows('accounts','character_id=eq.'+cid)[0]['balance']==initial+pay
     await page.goto('http://localhost:8080/telephone?app=banque');await page.get_by_text('Salaire — '+title,exact=True).wait_for()
     print(path,': candidature, emploi, travail −30 énergie, progression +10, salaire +'+str(pay)+' €, banque OK')
    api('/rest/v1/rpc/daily_life_state','POST',{},headers)
    state=api('/rest/v1/rpc/daily_life_state','POST',{},headers)
    station=rows('locations','city_id=eq.lyon&kind=eq.gare&district_id=not.is.null&limit=1')[0]
    await page.goto('http://localhost:8080/carte?city=lyon&district='+station['district_id']+'&location='+station['id'])
    await page.get_by_role('button',name='Se déplacer ici').click();await page.get_by_role('button',name='Vous êtes ici').wait_for()
    destination=state['housing']['location'];await page.screenshot(path=str(OUT/'transport-debug.png'));print('TRANSPORT UI:',await page.locator('select').count(),await page.get_by_role('heading').all_inner_texts());await page.locator('select').nth(0).select_option(destination['district_id'])
    await page.locator('select').nth(1).select_option(destination['id'])
    transport_balance=rows('accounts','character_id=eq.'+cid)[0]['balance']
    await page.get_by_role('button',name='10 min · 2',exact=False).click();await page.wait_for_timeout(1000)
    running=rows('activities','character_id=eq.'+cid+'&status=eq.running')[0]
    assert rows('accounts','character_id=eq.'+cid)[0]['balance']==transport_balance-2
    patch('activities','id=eq.'+running['id'],{'start_time':'2027-08-31T23:50:00Z','end_time':'2027-09-01T00:00:00Z'})
    await page.goto('http://localhost:8080/vie');await page.get_by_role('heading',level=1).wait_for();await page.wait_for_timeout(1000)
    assert rows('character_positions','character_id=eq.'+cid)[0]['location_id']==destination['id']
    print(path,': transport public −2 €, destination enregistrée OK')
    b=rows('accounts','character_id=eq.'+cid)[0]['balance']
    await page.goto('http://localhost:8080/vie');await page.get_by_role('heading',name='Mon logement',exact=True).wait_for()
    state=api('/rest/v1/rpc/daily_life_state','POST',{},headers)
    h=state['housing'];assert h['type_id']==('room' if path=='student' else 'studio')
    assert h['daily_cost']==(10 if path=='student' else 20)
    district=rows('districts','id=eq.'+h['location']['district_id'])[0]
    await page.get_by_text(h['name'],exact=True).wait_for()
    await page.get_by_text(district['name']+' · Lyon',exact=True).wait_for()
    await page.get_by_role('button',name='Payer le logement',exact=True).click()
    await page.get_by_role('button',name='Payé aujourd’hui',exact=True).wait_for()
    await page.screenshot(path=str(OUT/(path+'-logement.png')))
    cost={'student':10,'young_worker':20,'early_career':30}[path]
    assert rows('accounts','character_id=eq.'+cid)[0]['balance']==b-cost
    duplicate=requests.post(BASE+'/rest/v1/rpc/pay_housing',headers=headers,json={});assert duplicate.status_code>=400
    api('/rest/v1/rpc/daily_life_state','POST',{},headers);assert rows('accounts','character_id=eq.'+cid)[0]['balance']==b-cost
    print(path,': logement débité, double paiement refusé, versement non doublé OK')
    await page.goto('http://localhost:8080/agenda');await page.get_by_role('heading',name='Agenda',exact=True).wait_for();await page.wait_for_timeout(1200);await page.screenshot(path=str(OUT/(path+'-agenda.png')))
    assert not await page.evaluate('document.documentElement.scrollWidth>innerWidth')
    before=rows('characters','id=eq.'+cid)[0]; bank=rows('accounts','character_id=eq.'+cid)[0]['balance']
    def snapshot():
     return {table:rows(table,'character_id=eq.'+cid+'&order='+('id' if table in ['activities','job_applications'] else 'character_id')) for table in ['study_enrollments','employments','character_housing','character_positions','activities','job_applications']}
    saved=snapshot()
    acc=rows('accounts','character_id=eq.'+cid)[0];tx=rows('transactions','account_id=eq.'+acc['id']+'&order=id')
    assert bank==(480 if path=='student' else 1558)
    await page.goto('http://localhost:8080/parametres');await page.get_by_role('button',name='Se déconnecter').click();await page.wait_for_timeout(1200)
    session2=api('/auth/v1/token?grant_type=password','POST',{'email':email,'password':password},{'apikey':PUB,'Content-Type':'application/json'})
    await page.evaluate('([k,v])=>localStorage.setItem(k,v)',[storage,json.dumps(session2)])
    await page.goto('http://localhost:8080/vie');await page.get_by_role('heading',level=1).wait_for();await page.wait_for_timeout(1000)
    assert rows('characters','id=eq.'+cid)[0]['energy']==before['energy']
    assert rows('accounts','character_id=eq.'+cid)[0]['balance']==bank
    assert snapshot()==saved
    assert rows('transactions','account_id=eq.'+acc['id']+'&order=id')==tx
    assert rows('characters','id=eq.'+cid)[0]['progression']==before['progression']
    if path=='student':
     await page.get_by_text('15 %',exact=True).wait_for()
     assert saved['study_enrollments'][0]['progress']==15
    else:
     await page.get_by_text('10 points',exact=True).wait_for()
     assert saved['employments'][0]['progress']==10
    await page.get_by_role('button',name='Payé aujourd’hui',exact=True).wait_for()
    await page.screenshot(path=str(OUT/(path+'-persist.png')))
    await page.goto('http://localhost:8080/agenda');await page.get_by_role('heading',name='Agenda',exact=True).wait_for()
    await page.screenshot(path=str(OUT/(path+'-reconnect-agenda.png')))
    await page.goto('http://localhost:8080/telephone?app=banque');await page.get_by_text('Logement — ',exact=False).wait_for()
    if path=='young_worker':await page.get_by_text('Salaire — Assistant administratif',exact=True).wait_for()
    await page.screenshot(path=str(OUT/(path+'-reconnect-banque.png')))
    await page.set_viewport_size({'width':1280,'height':1800});await page.goto('http://localhost:8080/vie');await page.get_by_role('heading',name='Mon logement',exact=True).wait_for()
    assert not await page.evaluate('document.documentElement.scrollWidth>innerWidth')
    await page.screenshot(path=str(OUT/(path+'-desktop.png')))
    assert errors==[]
    print(path,': déconnexion/reconnexion, sauvegarde et mise en page OK; erreurs',errors)
    await context.close()
  finally:
   for uid in created:
    chars=rows('characters','user_id=eq.'+uid)
    for c in chars:
     cid=c['id'];accs=rows('accounts','character_id=eq.'+cid)
     for acc in accs:api('/rest/v1/transactions?account_id=eq.'+acc['id'],'DELETE')
     for table in ['activities','job_applications','employments','study_enrollments','character_housing','character_positions','memberships','accounts']:api('/rest/v1/'+table+'?character_id=eq.'+cid,'DELETE')
     api('/rest/v1/characters?id=eq.'+cid,'DELETE')
    api('/auth/v1/admin/users/'+uid,'DELETE')
   print('Comptes temporaires supprimés :',len(created))
   await browser.close()
asyncio.run(main())
