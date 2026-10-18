import asyncio, os, uuid, requests
from pathlib import Path
from datetime import datetime, timedelta
from concurrent.futures import ThreadPoolExecutor
from playwright.async_api import async_playwright
BASE=os.environ['SUPABASE_URL'];KEY=os.environ['SUPABASE_SERVICE_ROLE_KEY'];PUB=os.environ['SUPABASE_PUBLISHABLE_KEY'];OUT=Path('/tmp/browser/news');users=[];fixtures=[];org_id=None
ADMIN={'apikey':KEY,'Authorization':'Bearer '+KEY,'Content-Type':'application/json','Prefer':'return=representation'}
def req(path,data=None,h=None,method=None):
 r=requests.request(method or ('POST' if data is not None else 'GET'),BASE+path,json=data,headers=h or ADMIN)
 if r.status_code>=400: raise RuntimeError(str(r.status_code)+' '+r.text)
 return r.json() if r.content else None
def rows(t,q='',h=None):return req('/rest/v1/'+t+'?'+q,h=h)
def rpc(n,d,h=ADMIN):return req('/rest/v1/rpc/'+n,d,h)
def create(city):
 email='news-'+uuid.uuid4().hex+'@example.com';password=uuid.uuid4().hex+'Aa7!';u=req('/auth/v1/admin/users',{'email':email,'password':password,'email_confirm':True});users.append(u['id']);s=req('/auth/v1/token?grant_type=password',{'email':email,'password':password},{'apikey':PUB,'Content-Type':'application/json'});h={'apikey':PUB,'Authorization':'Bearer '+s['access_token'],'Content-Type':'application/json'};cid=rpc('create_character',{'_first_name':'Essai','_last_name':'Actualités','_age':18,'_city_id':city,'_path_id':'student','_appearance':{}},h);return cid,s,h,email,password
async def main():
 global org_id
 async with async_playwright() as pw:
  browser=await pw.chromium.launch(headless=True)
  try:
   cid,s,h,email,password=create('lyon');cid2,s2,h2,_,_=create('lille');uid=s['user']['id'];now=rpc('game_now',{},h)
   before=rpc('refresh_world_news',{});assert rpc('refresh_world_news',{})==0
   state=rpc('news_state',{},h);assert len(state['articles'])>=20;assert all(a['source'] and a['category'] and a['published_at'] for a in state['articles'])
   ctx=await browser.new_context(viewport={'width':1280,'height':1800});page=await ctx.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
   await page.goto('http://localhost:8080');await page.evaluate("async s=>{const {supabase}=await import('/src/integrations/supabase/client.ts');await supabase.auth.setSession(s)}",s)
   await page.goto('http://localhost:8080/telephone');await page.get_by_role('button',name='Actualités',exact=False).click();await page.get_by_role('heading',name='Actualités',exact=True).wait_for();await page.wait_for_timeout(800);await page.screenshot(path=str(OUT/'feed-desktop.png'));print('1 Téléphone → actualités : articles, sources, catégories, dates, portées visibles')
   linked=next(a for a in state['articles'] if a['organization'] and a['city_id']=='lyon');aid=linked['id']
   await page.goto('http://localhost:8080/actualites/'+aid);await page.get_by_role('heading',name=linked['title'],exact=True).wait_for();await page.get_by_role('heading',name='La source',exact=True).wait_for();await page.get_by_role('heading',name='Événement lié',exact=True).wait_for();print('2 Détail complet, source, réputation et événement lié')
   assert all(a['city_id']=='lyon' for a in state['articles'] if a['scope']=='local' and a['relevance']>=30)
   other=rpc('news_state',{},h2);assert other['city_id']=='lille';assert any(a['city_id']=='lille' and a['relevance']>=30 for a in other['articles']);assert any(a['scope']=='national' for a in other['articles']);print('3 Villes Lyon/Lille : pertinence locale distincte et nationales accessibles')
   await page.get_by_role('button',name='Article lu',exact=True).wait_for();assert next(a for a in rpc('news_state',{},h)['articles'] if a['id']==aid)['read_at'];print('4 Lecture persistante')
   await page.get_by_role('button',name='Enregistrer',exact=True).click();await page.get_by_role('button',name='Enregistré',exact=True).wait_for();assert next(a for a in rpc('news_state',{},h)['articles'] if a['id']==aid)['bookmarked'];print('5 Favori enregistré')
   await page.get_by_role('link',name='Organisation concernée',exact=True).click();await page.get_by_role('heading',name=linked['organization']['name'],exact=True).wait_for();print('6 Organisation concernée : bon lien')
   await page.goto('http://localhost:8080/actualites/'+aid);await page.get_by_role('link',name='Voir sur la carte',exact=True).click();await page.get_by_role('heading',name=linked['location']['name'],exact=True).wait_for();assert 'location='+linked['location']['id'] in page.url;print('7 Carte existante : bon lieu affiché')
   loc=rows('locations','city_id=eq.lyon&limit=1')[0]
   org=req('/rest/v1/organizations',{'name':'Organisation essai '+uuid.uuid4().hex,'description':'Test isolé','kind':'culture','city_id':'lyon','location_id':loc['id'],'status':'active','visibility':'public'})[0];org_id=org['id'];rpc('change_membership',{'_organization_id':org_id,'_join':True},h)
   # Remove only temporary user's seed notifications so cooldown fixtures remain isolated.
   req('/rest/v1/notifications?user_id=eq.'+uid+'&news_id=not.is.null',method='DELETE')
   event=req('/rest/v1/events',{'title':'Annonce réservée au collectif de test','description':'Événement fictif isolé','starts_at':now,'city_id':'lyon','scope':'local','category':'Culture','importance':100,'organization_id':org_id,'location_id':loc['id'],'source_id':'civitas-matin','target_kind':'organization','news_body':'Une annonce importante pour le collectif temporaire.'})[0];fixtures.append(event['id']);new=rows('news','event_id=eq.'+event['id'])[0]
   with ThreadPoolExecutor(max_workers=5) as pool:list(pool.map(lambda _:rpc('publish_world_event',{'_event_id':event['id']}),range(5)))
   nf=rows('notifications','user_id=eq.'+uid+'&news_id=eq.'+new['id']);assert len(nf)==1;assert not rows('notifications','user_id=eq.'+s2['user']['id']+'&news_id=eq.'+new['id'])
   await page.goto('http://localhost:8080/tableau-de-bord');await page.get_by_role('link',name='Lire l’article',exact=True).click();await page.get_by_role('heading',name=new['title'],exact=True).wait_for();print('8 Notification ciblée, lien article, exactement une publication/alerte après cinq appels concurrents')
   assert new['published_at']==event['starts_at'];assert all(datetime.fromisoformat(a['published_at'].replace('Z','+00:00'))<=datetime.fromisoformat(state['world_now'].replace('Z','+00:00')) for a in state['articles']);print('9 Horloge du monde, dates exactes et génération idempotente')
   for t,q,d in [('news','id=eq.'+aid,{'title':'Faux titre','published_at':'2099-01-01T00:00:00Z'}),('news_sources','id=eq.civitas-matin',{'reputation':0})]:
    old=rows(t,q);requests.patch(BASE+'/rest/v1/'+t+'?'+q,json=d,headers=h);assert rows(t,q)==old
   for table in ['news_reads','news_bookmarks','user_settings','notifications']:assert rows(table,'user_id=eq.'+uid,h2)==[]
   for table in ['news_reads','news_bookmarks']:
    r=requests.post(BASE+'/rest/v1/'+table,json={'user_id':s2['user']['id'],'news_id':aid},headers=h);assert r.status_code>=400
   r=requests.post(BASE+'/rest/v1/rpc/publish_world_event',json={'_event_id':event['id']},headers=h);assert r.status_code>=400
   draft=req('/rest/v1/news',{'title':'Brouillon test','status':'draft','published_at':now})[0]
   try: assert rows('news','id=eq.'+draft['id'],h)==[];assert not any(a['id']==draft['id'] for a in rpc('news_state',{},h)['articles'])
   finally:req('/rest/v1/news?id=eq.'+draft['id'],method='DELETE')
   # Preferences suppress a future important fixture, without affecting other users.
   req('/rest/v1/user_settings?user_id=eq.'+uid,{'news_notifications':False,'news_personalized':False},h,method='PATCH')
   e2=req('/rest/v1/events',{'title':'Annonce sans alerte test','starts_at':now,'city_id':'lyon','importance':100,'organization_id':org_id,'source_id':'civitas-matin','target_kind':'organization'})[0];fixtures.append(e2['id']);n2=rows('news','event_id=eq.'+e2['id'])[0];assert not rows('notifications','user_id=eq.'+uid+'&news_id=eq.'+n2['id']);print('10 Sécurité : articles/sources/dates intacts, états privés, brouillons cachés, publication interdite, préférences respectées')
   await page.goto('http://localhost:8080/parametres');await page.get_by_role('main').get_by_role('button',name='Se déconnecter',exact=True).click();await page.wait_for_url('**/auth');session=req('/auth/v1/token?grant_type=password',{'email':email,'password':password},{'apikey':PUB,'Content-Type':'application/json'});await page.evaluate("async s=>{const {supabase}=await import('/src/integrations/supabase/client.ts');await supabase.auth.setSession(s)}",session)
   await page.goto('http://localhost:8080/actualites/'+aid);await page.get_by_role('button',name='Article lu',exact=True).wait_for();await page.get_by_role('button',name='Enregistré',exact=True).wait_for();after=rpc('news_state',{},h);assert after['preferences']=={'news_personalized':False,'news_notifications':False};assert len(rows('notifications','user_id=eq.'+uid+'&news_id=eq.'+new['id']))==1
   await page.set_viewport_size({'width':444,'height':803});await page.wait_for_timeout(800);await page.screenshot(path=str(OUT/'article-mobile.png'));assert not await page.evaluate('document.documentElement.scrollWidth>innerWidth')
   await page.goto('http://localhost:8080/actualites');await page.get_by_role('tab',name='Enregistrés',exact=True).click();await page.get_by_role('heading',name=linked['title'],exact=True).wait_for();await page.get_by_role('tab',name='À la une',exact=True).click();await page.get_by_role('textbox',name='Rechercher une actualité').fill('Lyon');await page.wait_for_timeout(250);assert await page.locator('article').count()>0;await page.screenshot(path=str(OUT/'feed-mobile.png'));assert not await page.evaluate('document.documentElement.scrollWidth>innerWidth')
   await page.get_by_role('textbox',name='Rechercher une actualité').fill('');await page.get_by_role('combobox',name='Portée des actualités').click();await page.get_by_role('option',name='Locales',exact=True).click();assert await page.locator('article').count()>0;assert all('Lyon' in t for t in await page.locator('article').all_text_contents());assert errors==[],errors;print('11 Reconnexion : lu/favori/notifications/préférences conservés; recherche/filtres, téléphone et ordinateur sans débordement ni erreur')
  finally:
   for eid in fixtures:
    req('/rest/v1/news?event_id=eq.'+eid,method='DELETE');req('/rest/v1/events?id=eq.'+eid,method='DELETE')
   for uid in users:
    req('/rest/v1/news_reads?user_id=eq.'+uid,method='DELETE');req('/rest/v1/news_bookmarks?user_id=eq.'+uid,method='DELETE')
    for c in rows('characters','user_id=eq.'+uid):
     for a in rows('accounts','character_id=eq.'+c['id']):req('/rest/v1/transactions?account_id=eq.'+a['id'],method='DELETE')
     for t in ['social_participations','social_interactions','social_relations','social_stats','membership_history','activities','job_applications','employments','study_enrollments','character_housing','character_positions','memberships','accounts']:req('/rest/v1/'+t+'?character_id=eq.'+c['id'],method='DELETE')
     req('/rest/v1/characters?id=eq.'+c['id'],method='DELETE')
    req('/auth/v1/admin/users/'+uid,method='DELETE')
   if org_id:req('/rest/v1/organizations?id=eq.'+org_id,method='DELETE')
   await browser.close()
asyncio.run(main())
