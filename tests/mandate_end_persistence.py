"""Isolated end-of-mandate regression. No shared clock changes; clean all fixtures."""
import asyncio, json, os, uuid, requests
from datetime import datetime, timedelta
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
from playwright.async_api import async_playwright
BASE=os.environ['SUPABASE_URL']; KEY=os.environ['SUPABASE_SERVICE_ROLE_KEY']; PUB=os.environ['SUPABASE_PUBLISHABLE_KEY']
ADMIN={'apikey':KEY,'Authorization':'Bearer '+KEY,'Content-Type':'application/json'}
created=[]; city='testend-'+uuid.uuid4().hex[:10]; checks=0

def req(path,data=None,h=None,method=None):
 r=requests.request(method or ('POST' if data is not None else 'GET'),BASE+path,json=data,headers=h or ADMIN,timeout=40)
 if r.status_code>=400: raise RuntimeError(str(r.status_code)+' '+r.text[:500])
 return r.json() if r.content else None

def rows(t,q):return req('/rest/v1/'+t+'?'+q)
def ins(t,d):return req('/rest/v1/'+t,d,{**ADMIN,'Prefer':'return=representation'})[0]
def patch(t,q,d):return req('/rest/v1/'+t+'?'+q,d,method='PATCH')
def rpc(n,d=None,h=None):return req('/rest/v1/rpc/'+n,d or {},h)
def delete(t,q):return req('/rest/v1/'+t+'?'+q,method='DELETE')
def check(ok,label):
 global checks
 assert ok,label
 checks+=1;print(str(checks)+' '+label,flush=True)
def denied(n,d,h):
 r=requests.post(BASE+'/rest/v1/rpc/'+n,json=d,headers=h,timeout=40);return r.status_code>=400

def prepare():
 c=rows('cities','id=eq.lyon')[0];c.update(id=city,name='Ville isolée de fin de mandat');ins('cities',c)
 d=rows('districts','city_id=eq.lyon')[0];d.update(id=str(uuid.uuid4()),city_id=city);ins('districts',d)
 mapping={}
 for l in rows('locations','city_id=eq.lyon&district_id=not.is.null'):
  old=l['id'];l.update(id=str(uuid.uuid4()),city_id=city,district_id=d['id'],illustration=None);ins('locations',l);mapping[old]=l['id']
 i=rows('institutions','city_id=eq.lyon&type=eq.Mairie')[0];i.update(id=str(uuid.uuid4()),institution_key=city+':mairie',city_id=city,location_id=mapping[i['location_id']]);ins('institutions',i)
 email='end-'+uuid.uuid4().hex+'@example.com'; password=uuid.uuid4().hex+'Aa7!'
 u=req('/auth/v1/admin/users',{'email':email,'password':password,'email_confirm':True});created.append(u['id'])
 ss=req('/auth/v1/token?grant_type=password',{'email':email,'password':password},{'apikey':PUB})
 h={'apikey':PUB,'Authorization':'Bearer '+ss['access_token'],'Content-Type':'application/json'}
 cid=rpc('create_character',{'_first_name':'Essai','_last_name':'FinMandat','_age':22,'_city_id':city,'_path_id':'young_worker','_appearance':{}},h)
 t=datetime.fromisoformat(rpc('game_now',h=h).replace('Z','+00:00'))
 template=rows('elections','city_id=eq.lyon')[0]; offsets=[7,6,5,4,3,2,1]
 e=ins('elections',dict(city_id=city,institution_id=i['id'],location_id=i['location_id'],election_key=city,name='Élection de fin de mandat',rules=template['rules'],eligible_voters=10000,**{key:(t-timedelta(hours=hours)).isoformat() for key,hours in zip(['starts_at','candidacy_ends_at','campaign_starts_at','debate_at','vote_starts_at','vote_ends_at','count_at'],offsets)}))
 ca=ins('candidacies',{'election_id':e['id'],'character_id':cid,'display_name':'Essai FinMandat','status':'validated','support':100,'visibility':100,'campaign_reputation':100,'base_reputation':100,'base_influence':100,'program_score':100})
 rpc('election_state',h=h);m=rows('municipal_mandates','election_id=eq.'+e['id'])[0]
 rpc('governance_state',h=h)
 # Change only isolated mandate deadlines; shared world clock remains unchanged.
 end=t-timedelta(minutes=10); begin=t-timedelta(days=1)
 patch('municipal_mandates','id=eq.'+m['id'],{'starts_at':begin.isoformat(),'ends_at':end.isoformat(),'governance_initialized_at':begin.isoformat(),'opening_politics':{'reputation':10,'influence':5}})
 return locals()

async def verify(f):
 h=f['h'];m=f['m'];cid=f['cid'];e=f['e'];end=f['end'];i=f['i'];t=f['t']
 before=(end-timedelta(minutes=1)).isoformat();after=(end+timedelta(minutes=1)).isoformat()
 def decision(key,completed):
  return ins('public_decisions',{'decision_key':city+key,'institution_id':i['id'],'city_id':city,'district_id':f['d']['id'],'location_id':rows('locations','city_id=eq.'+city+'&kind=eq.'+('station' if key=='Avant clôture' else 'universite'))[0]['id'],'title':key,'description':'Décision isolée de vérification','mandate_id':m['id'],'workflow':'running','cost':100,'funded_at':before,'voted_at':before,'council_result':{'adopted':True},'rule_snapshot':{'indicator':'services','reputation_gain':3,'influence_gain':1},'completed_at':None})
 pre=decision('Avant clôture',before);post=decision('Après clôture',after)
 for dd,due,value in [(pre,before,2),(post,after,9)]:ins('governance_effects',{'decision_id':dd['id'],'effect_key':city+dd['id'],'due_at':due,'deltas':{'services':value},'kind':'completion'})
 ins('political_rewards',{'character_id':cid,'reward_key':city+'late','kind':'governance','reputation':50,'influence':50,'label':'Après fin','occurred_at':after})
 base=rows('city_indicators','city_id=eq.'+city+'&indicator=eq.services')[0]['value']
 rpc('refresh_governance_world');closed=rows('municipal_mandates','id=eq.'+m['id'])[0]
 check(closed['status']=='ended' and closed['closed_at']==closed['ends_at'],'Clôture à la date de fin exacte')
 check(closed['closing_indicators']['services']==base+2 and rows('city_indicators','city_id=eq.'+city+'&indicator=eq.services')[0]['value']==base+11,'Bilan exclut les effets postérieurs, ville continue à évoluer')
 check(closed['final_report']['completed']==1 and closed['final_report']['spent']==200,'Comptage et dépenses figés à la date de fin')
 check(closed['closing_politics']=={'reputation':13,'influence':6},'Réputation et influence sans récompense postérieure')
 check([d['workflow'] for d in closed['final_report']['decisions']]==['completed','running'] or sorted(d['workflow'] for d in closed['final_report']['decisions'])==['completed','running'],'Décisions importantes conservent leur état à la clôture')
 check(denied('set_mandate_priorities',{'_mandate_id':m['id'],'_priorities':['services']},h),'Pouvoirs du mandat expiré refusés')
 with ThreadPoolExecutor(max_workers=5) as p:list(p.map(lambda _:rpc('governance_state',h=h),range(5)))
 check(rows('municipal_mandates','id=eq.'+m['id'])[0]==closed,'Bilan inchangé après cinq consultations concurrentes')
 try:patch('municipal_mandates','id=eq.'+m['id'],{'final_report':{}});frozen=False
 except RuntimeError:frozen=True
 check(frozen,'Modification du bilan final refusée')
 successors=rows('elections','predecessor_election_id=eq.'+e['id']);check(len(successors)==1,'Une seule réélection après consultations concurrentes')
 re=successors[0];check(datetime.fromisoformat(re['starts_at'])==end and datetime.fromisoformat(re['count_at'])-end==timedelta(hours=6),'Réélection dans le calendrier existant, mêmes durées')
 collision={k:re[k] for k in ['name','city_id','institution_id','location_id','starts_at','candidacy_ends_at','campaign_starts_at','debate_at','vote_starts_at','vote_ends_at','count_at','predecessor_election_id']};collision['election_key']=city+'collision'
 try:ins('elections',collision);blocked=False
 except RuntimeError:blocked=True
 check(blocked,'Élection concurrente refusée')
 # Return to normal life immediately after the mandate ends.
 housing=rows('character_housing','character_id=eq.'+cid)[0];rpc('move_character',{'_location_id':housing['location_id']},h)
 aid=rpc('start_life_activity',{'_type':'rest'},h);check(rows('activities','id=eq.'+aid)[0]['status']=='running','Repos normal accessible après le mandat')
 a=rows('activities','id=eq.'+aid)[0];patch('activities','id=eq.'+aid,{'end_time':before,'start_time':(end-timedelta(hours=2)).isoformat()});rpc('daily_life_state',h=h)
 async with async_playwright() as pw:
  b=await pw.chromium.launch(headless=True);context=await b.new_context(viewport={'width':1280,'height':1800});page=await context.new_page();errors=[];page.on('pageerror',lambda x:errors.append(str(x)))
  await page.goto('http://localhost:8080');await page.evaluate("async s=>{const {supabase}=await import('/src/integrations/supabase/client.ts');await supabase.auth.setSession(s)}",f['ss'])
  await page.goto('http://localhost:8080/mandat');await page.get_by_text('Mandat terminé',exact=False).wait_for();await page.get_by_role('tab',name='Bilan',exact=True).click();await page.get_by_role('heading',name='Bilan factuel du mandat',exact=True).wait_for()
  Path('/tmp/browser/mandate-end').mkdir(parents=True,exist_ok=True);await page.screenshot(path='/tmp/browser/mandate-end/bilan.png')
  for _ in range(3):await page.reload()
  await page.goto('http://localhost:8080/elections');await page.get_by_text('Réélection municipale',exact=False).first.wait_for();await page.screenshot(path='/tmp/browser/mandate-end/calendrier.png')
  await page.goto('http://localhost:8080/parametres');await page.get_by_role('main').get_by_role('button',name='Se déconnecter',exact=True).click();await page.wait_for_url('**/auth*')
  ss=req('/auth/v1/token?grant_type=password',{'email':f['email'],'password':f['password']},{'apikey':PUB});await page.evaluate("async s=>{const {supabase}=await import('/src/integrations/supabase/client.ts');await supabase.auth.setSession(s)}",ss)
  await page.goto('http://localhost:8080/vie');await page.get_by_role('heading',level=1).first.wait_for();check(rows('municipal_mandates','id=eq.'+m['id'])[0]==closed and not errors,'Reconnexion, vie normale et bilan persistants sans erreur')
  await b.close()
 # Complete the sole successor and its mandate on this isolated town.
 keys=['starts_at','candidacy_ends_at','campaign_starts_at','debate_at','vote_starts_at','vote_ends_at','count_at']
 patch('elections','id=eq.'+re['id'],{key:(end+timedelta(minutes=idx)).isoformat() for idx,key in enumerate(keys)})
 ins('candidacies',{'election_id':re['id'],'character_id':cid,'display_name':'Essai FinMandat','status':'validated','support':100})
 rpc('election_state',h=h);second=rows('municipal_mandates','election_id=eq.'+re['id'])[0]
 patch('municipal_mandates','id=eq.'+second['id'],{'starts_at':(end+timedelta(minutes=7)).isoformat(),'ends_at':(end+timedelta(minutes=8)).isoformat()})
 for _ in range(3):rpc('governance_state',h=h)
 check(rows('municipal_mandates','id=eq.'+second['id'])[0]['status']=='ended' and len(rows('elections','city_id=eq.'+city))==2,'Second mandat terminé sans troisième élection')
 collision['election_key']=city+'third';collision['predecessor_election_id']=re['id']
 try:ins('elections',collision);third=False
 except RuntimeError:third=True
 check(third,'Troisième élection explicitement refusée')
 check(denied('prepare_municipal_reelection',{'_mandate':m['id']},h),'Préparation directe interdite au joueur')

def cleanup():
 for uid in created:
  for c in rows('characters','user_id=eq.'+uid):delete('activities','character_id=eq.'+c['id'])
 for n in rows('news','city_id=eq.'+city):
  for t in ['notifications','news_reads','news_bookmarks']:delete(t,'news_id=eq.'+n['id'])
 delete('governance_reactions','city_id=eq.'+city)
 for t in ['municipal_mandates','consultations','public_decisions','public_issues','elections','news','events']:delete(t,'city_id=eq.'+city)
 for uid in created:
  for c in rows('characters','user_id=eq.'+uid):
   cid=c['id']
   for t in ['political_rewards','political_stats','civic_stats','social_stats','character_housing','character_positions']:delete(t,'character_id=eq.'+cid)
   for a in rows('accounts','character_id=eq.'+cid):delete('transactions','account_id=eq.'+a['id'])
   delete('accounts','character_id=eq.'+cid);delete('characters','id=eq.'+cid)
  req('/auth/v1/admin/users/'+uid,method='DELETE')
 for t in ['municipal_ledger','indicator_history','governance_periods','municipal_treasuries','city_indicators','institutions','locations','districts']:delete(t,'city_id=eq.'+city)
 delete('cities','id=eq.'+city);check(not rows('cities','id=eq.'+city),'Ville et données de test supprimées')

if __name__=='__main__':
 try:asyncio.run(verify(prepare()))
 finally:cleanup()
 print('Lot fin de mandat: '+str(checks)+' vérifications réussies, horloge commune inchangée.')
