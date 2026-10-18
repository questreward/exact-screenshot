"""Isolated authenticated social regression; only temporary character deadlines are accelerated."""
import asyncio,os,uuid,json,requests
from datetime import datetime,timedelta
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
from playwright.async_api import async_playwright
BASE=os.environ['SUPABASE_URL'];KEY=os.environ['SUPABASE_SERVICE_ROLE_KEY'];PUB=os.environ['SUPABASE_PUBLISHABLE_KEY'];OUT=Path('/tmp/browser/social');OUT.mkdir(exist_ok=True,parents=True)
ADMIN={'apikey':KEY,'Authorization':'Bearer '+KEY,'Content-Type':'application/json'};users=[]
def req(path,data=None,headers=None,method=None):
 r=requests.request(method or ('POST' if data is not None else 'GET'),BASE+path,json=data,headers=headers or ADMIN);r.raise_for_status();return r.json() if r.content else None
def rows(t,q):return req('/rest/v1/'+t+'?'+q)
def patch(t,q,d):return req('/rest/v1/'+t+'?'+q,d,method='PATCH')
def rpc(n,d,h):return req('/rest/v1/rpc/'+n,d,h)
def denied(n,d,h):r=requests.post(BASE+'/rest/v1/rpc/'+n,json=d,headers=h);assert r.status_code>=400,(n,r.status_code)
def create():
 email='social-'+uuid.uuid4().hex+'@example.com';password=uuid.uuid4().hex+'Aa7!';u=req('/auth/v1/admin/users',{'email':email,'password':password,'email_confirm':True});users.append(u['id']);s=req('/auth/v1/token?grant_type=password',{'email':email,'password':password},{'apikey':PUB,'Content-Type':'application/json'});h={'apikey':PUB,'Authorization':'Bearer '+s['access_token'],'Content-Type':'application/json'};cid=rpc('create_character',{'_first_name':'Essai','_last_name':'Social','_age':18,'_city_id':'lyon','_path_id':'student','_appearance':{}},h);return cid,s,h,email,password
async def main():
 async with async_playwright() as pw:
  browser=await pw.chromium.launch(headless=True)
  try:
   cid,session,h,email,password=create();other,_,h2,_,_=create();ctx=await browser.new_context(viewport={'width':1280,'height':1800});page=await ctx.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
   await page.goto('http://localhost:8080');await page.evaluate("async s=>{const {supabase}=await import('/src/integrations/supabase/client.ts');await supabase.auth.setSession(s)}",session)
   org=next(o for o in rpc('organization_directory',{'_city_id':'lyon'},h) if o['kind']=='culture');npc=rows('social_npcs','organization_id=eq.'+org['id'])[0];event=org['events'][0]
   denied('social_interact',{'_npc_id':npc['id'],'_action_id':'introduce'},h)
   await page.goto('http://localhost:8080/carte?city=lyon&district='+org['location']['district_id']+'&location='+org['location']['id']);await page.get_by_role('button',name='Se déplacer ici',exact=True).click();await page.get_by_role('button',name='Vous êtes ici',exact=True).wait_for();await page.get_by_role('button',name=npc['first_name']+' '+npc['last_name'],exact=False).click();await page.get_by_role('button',name='Se présenter',exact=True).click();await page.get_by_text('Connaissance',exact=False).first.wait_for();rel=rows('social_relations','character_id=eq.'+cid)[0];assert rel['score']==5
   print('1 Rencontre créée et visible; mauvais lieu refusé')
   past=(datetime.fromisoformat(rpc('game_now',{},h).replace('Z','+00:00'))-timedelta(hours=2)).isoformat();patch('social_relations','id=eq.'+rel['id'],{'last_interaction':past});rpc('social_interact',{'_npc_id':npc['id'],'_action_id':'discuss'},h);assert rows('social_relations','id=eq.'+rel['id'])[0]['score']==10;denied('social_interact',{'_npc_id':npc['id'],'_action_id':'discuss'},h);print('2 Discussion +5; délai respecté')
   await page.goto('http://localhost:8080/organisations/'+org['id']+'?city=lyon');await page.get_by_role('button',name='Rejoindre',exact=True).click();await page.get_by_role('button',name='Quitter l’organisation',exact=True).wait_for();m=rows('memberships','character_id=eq.'+cid)[0];assert m['role']=='member' and m['status']=='active';await page.goto('http://localhost:8080/personnage');await page.get_by_role('link',name=org['name']+' · Membre',exact=True).wait_for();print('3 Adhésion membre visible sur profil')
   await page.goto('http://localhost:8080/organisations/'+org['id']+'?city=lyon');await page.get_by_role('button',name='Quitter l’organisation',exact=True).click();await page.get_by_role('button',name='Rejoindre',exact=True).wait_for();assert rows('memberships','id=eq.'+m['id'])[0]['status']=='former';assert not any(m['status']=='active' for m in rpc('social_state',{},h)['memberships']);print('4 Départ conserve historique sans adhésion active')
   await page.get_by_role('button',name='Rejoindre',exact=True).click();await page.get_by_role('button',name='Quitter l’organisation',exact=True).wait_for();await page.get_by_role('button',name='Participer',exact=True).click();await page.get_by_role('link',name='Voir dans l’agenda',exact=True).wait_for();aid=rows('activities','character_id=eq.'+cid+'&type=eq.social&status=eq.planned')[0]['id'];assert rows('social_participations','activity_id=eq.'+aid)[0]['status']=='reserved'
   denied('start_life_activity',{'_type':'social'},h);denied('start_life_activity',{'_activity_id':aid},h)
   now=datetime.fromisoformat(rpc('game_now',{},h).replace('Z','+00:00'));patch('activities','id=eq.'+aid,{'start_time':(now-timedelta(minutes=1)).isoformat(),'end_time':(now+timedelta(minutes=44)).isoformat()});await page.get_by_role('link',name='Voir dans l’agenda',exact=True).click();await page.get_by_role('button',name=event['title'],exact=False).click();await page.get_by_role('button',name='Commencer',exact=True).click();await page.get_by_role('dialog').get_by_text('En cours',exact=True).wait_for();assert rows('social_stats','character_id=eq.'+cid)[0]['reputation']==1;assert rows('social_participations','activity_id=eq.'+aid)[0]['status']=='running';denied('change_membership',{'_organization_id':org['id'],'_join':False},h);denied('move_character',{'_location_id':rows('locations','city_id=eq.lyon&kind=eq.parc&limit=1')[0]['id']},h)
   patch('activities','id=eq.'+aid,{'start_time':(now-timedelta(hours=1)).isoformat(),'end_time':(now-timedelta(minutes=1)).isoformat()});await page.reload();await page.get_by_role('button',name=event['title'],exact=False).click();await page.get_by_role('dialog').get_by_text('Terminé',exact=True).wait_for();assert rows('social_stats','character_id=eq.'+cid)[0]['reputation']==7;assert rows('social_stats','character_id=eq.'+cid)[0]['influence']==2
   with ThreadPoolExecutor(max_workers=5) as pool:list(pool.map(lambda _:rpc('daily_life_state',{},h),range(5)))
   assert rows('social_stats','character_id=eq.'+cid)[0]['reputation']==7;print('5 Agenda, participation, fin différée et récompense unique')
   # Second real participation, accelerating only its isolated deadline.
   second=next(o for o in rpc('organization_directory',{'_city_id':'lyon'},h) if o['kind']=='sport');rpc('change_membership',{'_organization_id':second['id'],'_join':True},h);rpc('move_character',{'_location_id':second['location']['id']},h);aid2=rpc('reserve_social_event',{'_event_id':second['events'][0]['id']},h);patch('activities','id=eq.'+aid2,{'start_time':(now-timedelta(minutes=1)).isoformat(),'end_time':(now+timedelta(minutes=44)).isoformat()});rpc('start_life_activity',{'_activity_id':aid2},h);patch('activities','id=eq.'+aid2,{'start_time':(now-timedelta(hours=1)).isoformat(),'end_time':(now-timedelta(minutes=1)).isoformat()});rpc('daily_life_state',{},h);assert rows('social_stats','character_id=eq.'+cid)[0]['reputation']==13;print('6 Deux activités: réputation 13, aucune hausse anticipée');assert rows('social_stats','character_id=eq.'+cid)[0]['influence']==4;print('7 Influence 4, indépendante de la banque')
   await page.goto('http://localhost:8080/organisations/'+org['id']+'?city=lyon');await page.get_by_role('link',name='Voir sur la carte',exact=True).click();assert ('location='+org['location']['id']) in page.url;await page.get_by_role('heading',name=org['location']['name'],exact=True).wait_for();print('8 Carte au bon lieu')
   snapshot=rpc('social_state',{},h);bank=rows('accounts','character_id=eq.'+cid)[0]['balance'];assert bank==500
   await page.goto('http://localhost:8080/parametres');await page.get_by_role('button',name='Se déconnecter',exact=True).click();session2=req('/auth/v1/token?grant_type=password',{'email':email,'password':password},{'apikey':PUB,'Content-Type':'application/json'});await page.evaluate("async s=>{const {supabase}=await import('/src/integrations/supabase/client.ts');await supabase.auth.setSession(s)}",session2);await page.goto('http://localhost:8080/personnage');await page.get_by_role('link',name=org['name']+' · Membre',exact=True).wait_for();after=rpc('social_state',{},h)
   for k in ['stats','relations','memberships','participations']:assert snapshot[k]==after[k]
   await page.screenshot(path=str(OUT/'profil-desktop.png'));await page.set_viewport_size({'width':390,'height':844});await page.goto('http://localhost:8080/telephone?app=contacts');await page.get_by_role('button',name=npc['first_name']+' '+npc['last_name'],exact=False).wait_for();assert not await page.evaluate('document.documentElement.scrollWidth>innerWidth');await page.screenshot(path=str(OUT/'contacts-mobile.png'));await page.goto('http://localhost:8080/organisations/'+org['id']+'?city=lyon');await page.get_by_role('heading',name=org['name'],exact=True).wait_for();assert not await page.evaluate('document.documentElement.scrollWidth>innerWidth');await page.screenshot(path=str(OUT/'organisation-mobile.png'));print('9 Reconnexion et présentations téléphone/ordinateur')
   for t,d,q in [('social_stats',{'reputation':999,'influence':999},'character_id=eq.'+cid),('memberships',{'role':'founder'},'id=eq.'+m['id']),('social_relations',{'score':100},'id=eq.'+rel['id'])]:
    r=requests.patch(BASE+'/rest/v1/'+t+'?'+q,json=d,headers=h);assert r.status_code>=400
   r=requests.post(BASE+'/rest/v1/memberships',json={'character_id':cid,'organization_id':org['id'],'role':'founder'},headers=h);assert r.status_code>=400
   for t in ['social_stats','social_relations','memberships','social_participations','characters','accounts']:
    query=('id' if t=='characters' else 'character_id')+'=eq.'+cid;assert req('/rest/v1/'+t+'?'+query,headers=h2)==[]
   denied('start_life_activity',{'_activity_id':aid},h2);denied('settle_daily_life',{'_character_id':cid},h2);denied('social_state',{}, {'apikey':PUB,'Content-Type':'application/json'})
   directory=rpc('organization_directory',{'_city_id':'lyon'},h2);assert not any(not m['fictional'] and m['first_name']=='Essai' for o in directory for m in o['members']);assert rows('social_stats','character_id=eq.'+cid)[0]['reputation']==13;assert errors==[],errors;print('10 Écritures, rôles, autre joueur, anonyme et faux départ refusés; aucun accès privé')
  finally:
   for uid in users:
    for c in rows('characters','user_id=eq.'+uid):
     for a in rows('accounts','character_id=eq.'+c['id']):req('/rest/v1/transactions?account_id=eq.'+a['id'],method='DELETE')
     for t in ['social_participations','social_interactions','social_relations','social_stats','membership_history','activities','job_applications','employments','study_enrollments','character_housing','character_positions','memberships','accounts']:req('/rest/v1/'+t+'?character_id=eq.'+c['id'],method='DELETE')
     req('/rest/v1/characters?id=eq.'+c['id'],method='DELETE')
    req('/auth/v1/admin/users/'+uid,method='DELETE')
   await browser.close()
asyncio.run(main())
