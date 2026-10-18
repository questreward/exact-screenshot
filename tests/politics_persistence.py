"""Isolated Bloc 7 political regression with temporary accounts; only their own activity deadlines are accelerated."""
import asyncio, os, uuid, requests
from datetime import datetime, timedelta
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
from playwright.async_api import async_playwright
BASE=os.environ['SUPABASE_URL'];KEY=os.environ['SUPABASE_SERVICE_ROLE_KEY'];PUB=os.environ['SUPABASE_PUBLISHABLE_KEY'];OUT=Path('/tmp/browser/politics');OUT.mkdir(exist_ok=True,parents=True)
ADMIN={'apikey':KEY,'Authorization':'Bearer '+KEY,'Content-Type':'application/json'};users=[]
def req(path,data=None,headers=None,method=None):
    r=requests.request(method or ('POST' if data is not None else 'GET'),BASE+path,json=data,headers=headers or ADMIN);r.raise_for_status();return r.json() if r.content else None
def rows(t,q):return req('/rest/v1/'+t+'?'+q)
def patch(t,q,d):return req('/rest/v1/'+t+'?'+q,d,method='PATCH')
def rpc(n,d,h):return req('/rest/v1/rpc/'+n,d,h)
def denied(n,d,h):
    r=requests.post(BASE+'/rest/v1/rpc/'+n,json=d,headers=h);assert r.status_code>=400,(n,r.status_code,r.text);return r.text
def create(city='lyon'):
    email='politics-'+uuid.uuid4().hex+'@example.com';password=uuid.uuid4().hex+'Aa7!'
    u=req('/auth/v1/admin/users',{'email':email,'password':password,'email_confirm':True});users.append(u['id'])
    s=req('/auth/v1/token?grant_type=password',{'email':email,'password':password},{'apikey':PUB,'Content-Type':'application/json'})
    h={'apikey':PUB,'Authorization':'Bearer '+s['access_token'],'Content-Type':'application/json'}
    cid=rpc('create_character',{'_first_name':'Essai','_last_name':'Politique','_age':20,'_city_id':city,'_path_id':'student','_appearance':{}},h)
    return cid,s,h,email,password
async def login(page,session):
    await page.goto('http://localhost:8080');await page.evaluate("async s=>{const {supabase}=await import('/src/integrations/supabase/client.ts');await supabase.auth.setSession(s)}",session)
async def main():
    async with async_playwright() as pw:
        browser=await pw.chromium.launch(headless=True)
        try:
            cid,session,h,email,password=create();_,_,h2,_,_=create('lille')
            ctx=await browser.new_context(viewport={'width':1280,'height':1800});page=await ctx.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
            await login(page,session)
            # 1 Discovery
            await page.goto('http://localhost:8080/politique');await page.wait_for_timeout(4000);await page.screenshot(path=str(OUT/'debug.png'));print(errors, (await page.inner_text('body'))[:600]);await page.get_by_role('heading',name='Mouvements politiques').wait_for()
            for name in ['Horizon Citoyen','Mouvement Civique','Renouveau Local']:await page.get_by_role('heading',name=name,exact=True).wait_for()
            await page.get_by_text('Démocratie').first.wait_for();await page.get_by_text('Réputation').first.wait_for()
            s=rpc('political_state',{},h);assert len([o for o in s['organizations'] if o['kind']=='movement'])==5 and len([o for o in s['organizations'] if o['kind']=='party'])==4
            print('1 Découverte : mouvements, valeurs, priorités, réputation, influence')
            # 2 Party page
            party=next(o for o in s['organizations'] if o['name']=='Union Territoires & Nature')
            await page.goto('http://localhost:8080/politique/'+party['id']);await page.get_by_role('heading',name='Positionnement').wait_for();await page.get_by_text('Environnement',exact=True).first.wait_for();await page.get_by_role('heading',name='Activités').wait_for();await page.get_by_text('Membres',exact=True).wait_for()
            await page.screenshot(path=str(OUT/'parti-desktop.png'));print('2 Parti : description, idéologie, valeurs, priorités, membres, activités')
            # 3 Comparator
            other=next(o for o in s['organizations'] if o['name']=='Alliance pour l’Initiative')
            await page.goto(f"http://localhost:8080/politique?tab=comparer&a={party['id']}&b={other['id']}");await page.get_by_role('heading',name='Positions sur chaque axe').wait_for();await page.get_by_text('Forte différence').first.wait_for()
            assert await page.get_by_text('meilleur',exact=False).count()==1  # only the neutrality notice
            print('3 Comparateur : axes, valeurs, différences, sans classement')
            # 4 Opinions
            await page.goto('http://localhost:8080/politique?tab=opinions');fs=page.locator('fieldset').filter(has_text='Environnement');await fs.get_by_role('button',name='Forte').click();await fs.get_by_role('button',name='Forte',pressed=True).wait_for()
            rpc('set_political_opinion',{'_topic_id':'depenses','_stance':'strong'},h)
            denied('set_political_opinion',{'_topic_id':'environnement','_stance':'extreme'},h)
            st=rpc('political_state',{},h);ops={o['topic_id']:o['stance'] for o in st['opinions']};assert ops=={'environnement':'strong','depenses':'strong'},ops;assert st['stats']['interest']==4
            await page.get_by_role('heading',name='Vos affinités (indicatives)').wait_for()
            rpc('set_political_opinion',{'_topic_id':'environnement','_stance':'weak'},h);assert rpc('political_state',{},h)['stats']['interest']==4
            print('4 Opinions sauvegardées, contradictions acceptées, affinité recalculée, intérêt non farmable')
            # 8a Meet militant before joining
            hz=next(o for o in st['organizations'] if o['name']=='Horizon Citoyen');mil=next(p for p in st['personalities'] if p['organization'] and p['organization']['id']==hz['id'] and p['political_role']=='Militant')
            denied('social_interact',{'_npc_id':mil['id'],'_action_id':'introduce'},h)
            rpc('move_character',{'_location_id':mil['location']['id']},h)
            await page.goto('http://localhost:8080/politique?tab=personnalites');card=page.locator('article').filter(has_text=mil['first_name']+' '+mil['last_name']);await card.get_by_role('button',name='Se présenter').click();await card.get_by_text('Contact ·').wait_for()
            print('8a Militant rencontré au bon lieu, relation créée')
            # 5 Join
            await page.goto('http://localhost:8080/politique/'+hz['id']);await page.get_by_role('button',name='Rejoindre',exact=True).click();await page.get_by_text('Rôle : Membre').wait_for()
            m=rows('memberships','character_id=eq.'+cid+'&organization_id=eq.'+hz['id'])[0];assert m['role']=='member' and m['status']=='active'
            rpc('change_political_membership',{'_organization_id':party['id'],'_join':True},h);t=denied('change_political_membership',{'_organization_id':other['id'],'_join':True},h);assert 'déjà membre du parti' in t
            loc=next(o for o in st['organizations'] if o['name']=='Renouveau Local');denied('change_political_membership',{'_organization_id':loc['id'],'_join':True},h)
            denied('change_membership',{'_organization_id':hz['id'],'_join':False},h)
            await page.goto('http://localhost:8080/personnage');await page.get_by_role('link',name='☀ Horizon Citoyen · Membre').wait_for()
            print('5 Adhésion : membership actif, rôle Membre, profil; un seul parti; mouvement local protégé')
            # 6 Leave party
            await page.goto('http://localhost:8080/politique/'+party['id']);await page.get_by_role('button',name='Quitter l’organisation').click();await page.get_by_role('button',name='Rejoindre',exact=True).wait_for()
            assert rows('memberships','character_id=eq.'+cid+'&organization_id=eq.'+party['id'])[0]['status']=='former';assert not any(x['organization_id']==party['id'] and x['status']=='active' for x in rpc('political_state',{},h)['memberships'])
            rpc('change_political_membership',{'_organization_id':party['id'],'_join':True},h);rpc('change_political_membership',{'_organization_id':party['id'],'_join':False},h)
            assert rpc('political_state',{},h)['stats']['engagement']==6  # one join bonus per organization only
            print('6 Départ : adhésion inactive et organisation retirée; réadhésion sans gain doublé')
            # 7 Activity
            ev=next(e for e in hz['events'] if e['political_kind']=='reunion')
            await page.goto('http://localhost:8080/politique/'+hz['id']);await page.locator('article').filter(has_text=ev['title']).get_by_role('button',name='Participer').click();await page.get_by_role('link',name='Voir dans l’agenda').first.wait_for()
            aid=rows('activities','character_id=eq.'+cid+'&organization_event_id=eq.'+ev['id'])[0]['id'];a=rows('activities','id=eq.'+aid)[0];assert a['political_reputation_gain']==ev['political_reputation_gain']
            denied('reserve_political_event',{'_event_id':ev['id']},h)
            r=requests.patch(BASE+'/rest/v1/activities?id=eq.'+aid,json={'political_reputation_gain':99},headers=h);assert rows('activities','id=eq.'+aid)[0]['political_reputation_gain']==ev['political_reputation_gain']
            await page.goto('http://localhost:8080/agenda');await page.get_by_role('button',name='Semaine',exact=True).click();await page.get_by_text(ev['title']).first.wait_for()
            now=datetime.fromisoformat(rpc('game_now',{},h).replace('Z','+00:00'));rpc('move_character',{'_location_id':ev['location']['id']},h) if rows('character_positions','character_id=eq.'+cid)[0]['location_id']!=ev['location']['id'] else None
            patch('activities','id=eq.'+aid,{'start_time':(now-timedelta(minutes=1)).isoformat(),'end_time':(now+timedelta(minutes=59)).isoformat()});rpc('start_life_activity',{'_activity_id':aid},h)
            patch('activities','id=eq.'+aid,{'start_time':(now-timedelta(hours=1)).isoformat(),'end_time':(now-timedelta(minutes=1)).isoformat()})
            with ThreadPoolExecutor(max_workers=5) as pool:list(pool.map(lambda _:rpc('political_state',{},h),range(5)))
            st=rpc('political_state',{},h);assert rows('activities','id=eq.'+aid)[0]['status']=='completed';assert st['stats']['reputation']==ev['political_reputation_gain'] and st['stats']['influence']==ev['political_influence_gain'],st['stats']
            assert st['stats']['engagement']==6+ev['political_engagement_gain'];assert next(x for x in st['memberships'] if x['organization_id']==hz['id'])['progress']==1
            print('7 Activité : agenda, participation, réputation et influence politiques uniques')
            # 8b Responsible met through relations
            rel=next(p for p in st['personalities'] if p['id']==mil['id'])['relation'];assert rel and rel['score']>5
            lead=next(p for p in st['personalities'] if p['organization'] and p['organization']['id']==hz['id'] and p['political_role']=='Responsable de mouvement');assert lead['relation'] is not None
            print('8 Personnalités : contact, relation renforcée, affiliation affichée')
            # 9 News
            news=next(n for n in rpc('news_state',{},h)['articles'] if n['title']=='Horizon Citoyen réunit ses premiers membres')
            await page.goto('http://localhost:8080/actualites/'+news['id']);await page.get_by_role('heading',name='Personnalité liée').wait_for();await page.get_by_text('Ville : Lyon').wait_for();await page.get_by_role('link',name='Horizon Citoyen').click();await page.wait_for_url('**/politique/'+hz['id'])
            print('9 Actualité politique : organisation, personnalité et ville liées')
            # 10 Map
            await page.locator('section').filter(has_text='Implantation').get_by_role('link',name='Voir sur la carte').first.click();await page.wait_for_url('**location='+hz['location']['id']+'*');print('10 Carte au bon lieu')
            # 11 Reconnect
            snap=rpc('political_state',{},h)
            await page.goto('http://localhost:8080/parametres');await page.get_by_role('main').get_by_role('button',name='Se déconnecter',exact=True).click();await page.wait_for_url('**/auth*')
            s2=req('/auth/v1/token?grant_type=password',{'email':email,'password':password},{'apikey':PUB,'Content-Type':'application/json'});h3={**h,'Authorization':'Bearer '+s2['access_token']};await login(page,s2)
            after=rpc('political_state',{},h3)
            for k in ['opinions','stats','memberships','history','activities']:assert snap[k]==after[k],k
            assert [p['relation'] for p in snap['personalities']]==[p['relation'] for p in after['personalities']]
            await page.goto('http://localhost:8080/politique?tab=profil');await page.get_by_text('Réputation politique').first.wait_for();await page.screenshot(path=str(OUT/'profil-desktop.png'))
            print('11 Reconnexion : opinions, affinités, adhésions, rôle, réputation, influence, relations, agenda conservés')
            # 12 Security
            for t,d,q in [('political_stats',{'reputation':100,'influence':100},'character_id=eq.'+cid),('memberships',{'role':'leader'},'id=eq.'+m['id']),('political_profiles',{'ideology':{}},'organization_id=eq.'+hz['id']),('organizations',{'name':'Pirate'},'id=eq.'+hz['id'])]:
                before=rows(t,q);requests.patch(BASE+'/rest/v1/'+t+'?'+q,json=d,headers=h3);assert rows(t,q)==before,t
            for t,d in [('organizations',{'name':'Mon parti','kind':'party','city_id':'lyon'}),('memberships',{'character_id':cid,'organization_id':other['id'],'role':'leader'}),('political_rewards',{'character_id':cid,'reward_key':'x','kind':'x','reputation':50}),('political_opinions',{'character_id':cid,'topic_id':'logement','stance':'strong'})]:
                assert requests.post(BASE+'/rest/v1/'+t,json=d,headers=h3).status_code>=400,t
            denied('award_political',{'_cid':cid,'_key':'k','_kind':'k','_rep':50,'_inf':50,'_eng':0,'_interest':0,'_label':''},h3)
            for t in ['political_stats','political_opinions','political_rewards']:assert req('/rest/v1/'+t+'?character_id=eq.'+cid,headers=h2)==[]
            denied('political_state',{},{'apikey':PUB,'Content-Type':'application/json'})
            assert rpc('political_state',{},h3)['stats']==after['stats']
            await page.set_viewport_size({'width':390,'height':844})
            for path in ['/politique','/politique?tab=comparer','/politique/'+hz['id'],'/telephone']:
                await page.goto('http://localhost:8080'+path);await page.wait_for_timeout(900);assert not await page.evaluate('document.documentElement.scrollWidth>innerWidth'),path
            await page.screenshot(path=str(OUT/'telephone-mobile.png'));await page.goto('http://localhost:8080/politique?tab=comparer');await page.wait_for_timeout(600);await page.screenshot(path=str(OUT/'comparer-mobile.png'))
            assert errors==[],errors
            print('12 Sécurité : rôle, réputation, influence, partis et membres non modifiables; données privées protégées; mobile sans débordement')
        finally:
            for uid in users:
                for c in rows('characters','user_id=eq.'+uid):
                    for a in rows('accounts','character_id=eq.'+c['id']):req('/rest/v1/transactions?account_id=eq.'+a['id'],method='DELETE')
                    for t in ['political_rewards','political_opinions','political_stats','civic_rewards','civic_stats','citizen_reports','consultation_participations','social_participations','social_interactions','social_relations','social_stats','membership_history','activities','job_applications','employments','study_enrollments','character_housing','character_positions','memberships','accounts']:
                        req('/rest/v1/'+t+'?character_id=eq.'+c['id'],method='DELETE')
                    req('/rest/v1/characters?id=eq.'+c['id'],method='DELETE')
                req('/auth/v1/admin/users/'+uid,method='DELETE')
            await browser.close()
asyncio.run(main())
