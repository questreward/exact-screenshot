"""Bloc 8 real-account regression. Accelerates only isolated election/activity fixtures."""
import asyncio,os,uuid,requests,time
from datetime import datetime,timedelta
from pathlib import Path
from playwright.async_api import async_playwright
BASE=os.environ['SUPABASE_URL'];KEY=os.environ['SUPABASE_SERVICE_ROLE_KEY'];PUB=os.environ['SUPABASE_PUBLISHABLE_KEY'];ADMIN={'apikey':KEY,'Authorization':'Bearer '+KEY,'Content-Type':'application/json'}
users=[];fixtures=[];location_snapshots={};OUT=Path('/tmp/browser/elections');OUT.mkdir(parents=True,exist_ok=True)
def req(path,data=None,h=None,method=None):
 for attempt in range(3):
  try:
   r=requests.request(method or ('POST' if data is not None else 'GET'),BASE+path,json=data,headers=h or ADMIN);break
  except requests.exceptions.SSLError:
   if attempt==2:raise
   time.sleep(0.5)
 if r.status_code>=400:
  print('Database error:',r.json().get('message','error'))
 r.raise_for_status();return r.json() if r.content else None
def rows(t,q):return req('/rest/v1/'+t+'?'+q)
def patch(t,q,d):return req('/rest/v1/'+t+'?'+q,d,method='PATCH')
def insert(t,d):return req('/rest/v1/'+t,d,{**ADMIN,'Prefer':'return=representation'})[0]
def rpc(n,d,h):return req('/rest/v1/rpc/'+n,d,h)
def denied(n,d,h):
 r=requests.post(BASE+'/rest/v1/rpc/'+n,json=d,headers=h);assert r.status_code>=400,(n,r.status_code);return r.text
def create(age=20,city='lyon'):
 email='elect-'+uuid.uuid4().hex+'@example.com';password=uuid.uuid4().hex+'Aa7!';u=req('/auth/v1/admin/users',{'email':email,'password':password,'email_confirm':True});users.append(u['id']);s=req('/auth/v1/token?grant_type=password',{'email':email,'password':password},{'apikey':PUB,'Content-Type':'application/json'});h={'apikey':PUB,'Authorization':'Bearer '+s['access_token'],'Content-Type':'application/json'};cid=rpc('create_character',{'_first_name':'Essai','_last_name':'Municipal','_age':age,'_city_id':city,'_path_id':'student','_appearance':{}},h);return cid,s,h,email,password
async def login(page,s):
 await page.goto('http://localhost:8080');await page.evaluate("async s=>{const {supabase}=await import('/src/integrations/supabase/client.ts');await supabase.auth.setSession(s)}",s)
def fixture(now,city='lyon'):
 original=rows('elections','city_id=eq.'+city)[0];d={k:original[k] for k in ['city_id','institution_id','location_id','rules']};d.update(election_key='test-'+uuid.uuid4().hex,name='Municipales de vérification',starts_at=(now-timedelta(hours=1)).isoformat(),candidacy_ends_at=(now+timedelta(hours=1)).isoformat(),campaign_starts_at=(now+timedelta(hours=2)).isoformat(),debate_at=(now+timedelta(hours=4)).isoformat(),vote_starts_at=(now+timedelta(hours=5)).isoformat(),vote_ends_at=(now+timedelta(hours=6)).isoformat(),count_at=(now+timedelta(hours=7)).isoformat());e=insert('elections',d);fixtures.append(e['id']);location_snapshots[e['location_id']]={k:rows('locations','id=eq.'+e['location_id'])[0][k] for k in ['civic_state','civic_project']}
 for a in rows('candidacies','election_id=eq.'+original['id']):
  d={k:a[k] for k in ['npc_id','organization_id','display_name','slogan','program','program_score','base_reputation','base_influence','support','visibility','campaign_reputation','budget']};d.update(election_id=e['id'],status='validated');insert('candidacies',d)
 return e
async def main():
 async with async_playwright() as pw:
  browser=await pw.chromium.launch(headless=True)
  try:
   cid,session,h,email,password=create();minor,_,hm,_,_=create(16);_,_,ho,_,_=create(city='lille');now=datetime.fromisoformat(rpc('game_now',{},h).replace('Z','+00:00'));e=fixture(now);eid=e['id'];state=lambda:next(x for x in rpc('election_state',{},h)['elections'] if x['id']==eid)
   assert state()['status']=='candidacies';assert state()['city_id']=='lyon';print('1 Élection: calendrier et ville')
   # Real engagement/opinion/party progression; prepare eligibility fixture values for campaign scenario.
   rpc('political_state',{},h);rpc('civic_state',{},h);patch('political_stats','character_id=eq.'+cid,{'reputation':10,'influence':5});patch('civic_stats','character_id=eq.'+cid,{'engagement':20})
   ctx=await browser.new_context(viewport={'width':1280,'height':1800});page=await ctx.new_page();errors=[];page.on('pageerror',lambda x:errors.append(str(x)));await login(page,session);await page.goto('http://localhost:8080/elections/'+eid);await page.get_by_role('tab',name='Ma candidature',exact=True).click();await page.get_by_role('button',name='Soumettre ma candidature').click();await page.get_by_text('Candidature validée par le système',exact=True).wait_for();ca=next(x for x in state()['candidates'] if x.get('mine'));aid=ca['id'];assert ca['budget']==1200;denied('submit_candidacy',{'_election_id':eid},h);print('2 Candidature valide, unique, budget indépendant')
   reject=rpc('submit_candidacy',{'_election_id':eid},hm);r=rows('candidacies','id=eq.'+reject)[0];assert r['status']=='rejected' and 'Âge' in r['refusal_reason'] and r['budget']==0;assert rows('campaign_actions','candidacy_id=eq.'+reject)==[];denied('submit_candidacy',{'_election_id':eid},ho);print('3 Refus motivé, autre ville, aucune campagne active')
   await page.get_by_role('textbox',name='Slogan',exact=True).fill('Des transports pour tous');await page.get_by_role('textbox',name='Titre 1',exact=True).fill('Créer trois lignes de bus');await page.get_by_role('textbox',name='Description 1',exact=True).fill('Créer trois lignes de bus pour relier les quartiers aux services municipaux.');await page.get_by_role('spinbutton',name='cost 1',exact=True).fill('4000000');await page.get_by_role('button',name='Enregistrer le programme').click();await page.get_by_text('Programme enregistré',exact=True).wait_for();ca=rows('candidacies','id=eq.'+aid)[0];assert len(ca['program']['priorities'])==3 and ca['program']['proposals'][0]['cost']==4000000 and ca['slogan']=='Des transports pour tous';print('4 Programme sauvegardé: trois priorités, proposition coût 4 M€, délai 18 mois, impact 12')
   recruit=next(n for n in rpc('election_state',{},h)['recruits'] if n['location']['kind']!='logement');rpc('move_character',{'_location_id':recruit['location']['id']},h);rpc('social_interact',{'_npc_id':recruit['id'],'_action_id':'introduce'},h)
   await page.get_by_role('tab',name='Campagne',exact=True).click();await page.get_by_role('combobox',name='Contact à recruter').select_option(recruit['id']);await page.get_by_role('button',name='Recruter',exact=True).click();await page.get_by_text('Compétence',exact=False).first.wait_for();await page.get_by_role('button',name='Lancer ma campagne').click();await page.get_by_text('Campagne mise à jour',exact=True).first.wait_for();assert rows('campaign_teams','candidacy_id=eq.'+aid);bank=rows('accounts','character_id=eq.'+cid)[0]['balance'];denied('save_candidate_program',{'_candidacy_id':aid,'_slogan':'autre','_program':ca['program']},h);print('5 Équipe recrutée, financement distinct, programme verrouillé')
   # Start campaign period on this isolated election, preserving ordered deadlines.
   patch('elections','id=eq.'+eid,{'starts_at':(now-timedelta(days=2)).isoformat(),'candidacy_ends_at':(now-timedelta(days=1,hours=1)).isoformat(),'campaign_starts_at':(now-timedelta(days=1)).isoformat(),'debate_at':(now+timedelta(hours=1)).isoformat(),'vote_starts_at':(now+timedelta(hours=2)).isoformat(),'vote_ends_at':(now+timedelta(hours=3)).isoformat(),'count_at':(now+timedelta(hours=4)).isoformat()});rpc('move_character',{'_location_id':e['location_id']},h)
   before=rows('characters','id=eq.'+cid)[0]['energy'];budget=rows('candidacies','id=eq.'+aid)[0]['budget'];act=rpc('start_campaign_action',{'_candidacy_id':aid,'_rule_id':'terrain'},h);assert rows('characters','id=eq.'+cid)[0]['energy']==before-10;assert rows('candidacies','id=eq.'+aid)[0]['budget']==budget-40;denied('start_campaign_action',{'_candidacy_id':aid,'_rule_id':'terrain'},h);patch('activities','id=eq.'+act,{'start_time':(now-timedelta(hours=1)).isoformat(),'end_time':(now-timedelta(minutes=1)).isoformat()});state();ac=rows('campaign_actions','activity_id=eq.'+act)[0];assert ac['rewarded_at'];snap=rows('candidacies','id=eq.'+aid)[0];state();assert rows('candidacies','id=eq.'+aid)[0]==snap;assert rows('accounts','character_id=eq.'+cid)[0]['balance']==bank;patch('characters','id=eq.'+cid,{'energy':0});denied('start_campaign_action',{'_candidacy_id':aid,'_rule_id':'terrain'},h);patch('characters','id=eq.'+cid,{'energy':80});print('6 Énergie, budget, chevauchement, gains uniques, banque inchangée')
   debate=rpc('start_campaign_action',{'_candidacy_id':aid,'_rule_id':'debate','_choices':{'Transports':'prioritaire','Logement':'progressif','Environnement':'maintien'}},h);denied('start_campaign_action',{'_candidacy_id':aid,'_rule_id':'debate','_choices':{}},h);rpc('move_character',{'_location_id':e['location_id']},h);patch('activities','id=eq.'+debate,{'start_time':(now-timedelta(minutes=1)).isoformat(),'end_time':(now+timedelta(minutes=29)).isoformat()});rpc('start_life_activity',{'_activity_id':debate},h);patch('activities','id=eq.'+debate,{'end_time':(now-timedelta(seconds=1)).isoformat()});state();assert rows('campaign_actions','activity_id=eq.'+debate)[0]['rewarded_at'];print('7 Débat, choix, agenda et récompenses')
   polls=state()['polls'];assert len(polls)>=1;assert polls[0]['margin']==3.5 and polls[0]['sample_size']==800;assert rows('campaign_actions','candidacy_id=eq.'+state()['candidates'][0]['id']);print('8 Sondages évolutifs, PNJ actifs')
   for _ in range(3):rpc('manage_campaign',{'_candidacy_id':aid,'_command':'donation'},h)
   denied('manage_campaign',{'_candidacy_id':aid,'_command':'donation'},h)
   patch('elections','id=eq.'+eid,{'debate_at':(now-timedelta(hours=2)).isoformat(),'vote_starts_at':(now-timedelta(hours=1)).isoformat(),'vote_ends_at':(now+timedelta(hours=1)).isoformat(),'count_at':(now+timedelta(hours=2)).isoformat()})
   await page.goto('http://localhost:8080/elections/'+eid);await page.get_by_role('tab',name='Vote',exact=True).click();await page.get_by_role('radio').filter(has_text='Essai Municipal').click();await page.get_by_role('button',name='Confirmer mon vote').click();await page.get_by_role('button',name='Enregistrer mon vote').click();await page.get_by_text('Vote enregistré. Votre choix reste privé et définitif.',exact=True).wait_for();denied('cast_election_vote',{'_election_id':eid,'_candidacy_id':aid},h);denied('cast_election_vote',{'_election_id':eid,'_candidacy_id':aid},hm);print('9 Vote réel confirmé, unique, immuable, âge contrôlé')
   await page.screenshot(path=str(OUT/'vote-desktop.png'));await page.goto('http://localhost:8080/parametres');await page.get_by_role('main').get_by_role('button',name='Se déconnecter',exact=True).click();await page.wait_for_url('**/auth*');s2=req('/auth/v1/token?grant_type=password',{'email':email,'password':password},{'apikey':PUB,'Content-Type':'application/json'});await login(page,s2);await page.goto('http://localhost:8080/elections/'+eid);await page.get_by_role('tab',name='Vote',exact=True).click();await page.get_by_text('Vote enregistré. Votre choix reste privé et définitif.',exact=True).wait_for();assert state()['voted'];print('10 Reconnexion: programme équipe campagne et vote conservés')
   # Keep polls untouched: result must not read them. Make player weak, NPC wins.
   patch('candidacies','id=eq.'+aid,{'support':0,'visibility':0,'campaign_reputation':0,'base_reputation':0,'base_influence':0,'program_score':0});patch('elections','id=eq.'+eid,{'vote_starts_at':(now-timedelta(hours=1)).isoformat(),'vote_ends_at':(now-timedelta(minutes=2)).isoformat(),'count_at':(now-timedelta(minutes=1)).isoformat()});result=state();assert result['status']=='completed' and result['winner_id']!=aid;assert sum(r['votes'] for r in result['results'])==result['participation'];assert result['participation']+result['abstention']==result['eligible_voters'];snap=result['results'];assert state()['results']==snap;print('11 Dépouillement serveur, totaux, PNJ gagnant, défaite possible, idempotence')
   m=result['mandate'];assert m and m['function']=='Maire';d=rows('public_decisions','id=eq.'+m['decision_id'])[0];assert d['applied_at'] and rows('locations','id=eq.'+d['location_id'])[0]['civic_project'];assert rows('news','election_id=eq.'+eid);await page.goto('http://localhost:8080/elections/'+eid);await page.get_by_role('tab',name='Résultats',exact=True).click();await page.get_by_text('Vous n’avez pas remporté cette élection. La vie politique continue.',exact=True).wait_for();await page.screenshot(path=str(OUT/'results-desktop.png'));print('12 Mandat, décision, actualité et projet réel sur la ville')
   for t,q,d in [('election_votes','election_id=eq.'+eid,{'candidacy_id':result['winner_id']}),('candidacies','id=eq.'+aid,{'budget':99999,'support':100}),('election_results','election_id=eq.'+eid,{'votes':99999}),('election_polls','election_id=eq.'+eid,{'estimates':[]}),('elections','id=eq.'+eid,{'winner_id':aid}),('municipal_mandates','election_id=eq.'+eid,{'candidacy_id':aid})]:
    before=rows(t,q);requests.patch(BASE+'/rest/v1/'+t+'?'+q,json=d,headers=h);assert rows(t,q)==before,t
   assert req('/rest/v1/election_votes?election_id=eq.'+eid,h=ho)==[];assert requests.post(BASE+'/rest/v1/municipal_mandates',json={'election_id':eid,'candidacy_id':aid,'city_id':'lyon'},headers=h).status_code>=400;denied('refresh_election',{'_election':eid},h);denied('election_state',{},{'apikey':PUB});print('13 Écritures forgées sans effet, bulletins privés, mandat impossible à forger')
   # A second isolated count verifies the real-player victory path and unique rewards.
   win=fixture(now);wid=win['id'];winner=rpc('submit_candidacy',{'_election_id':wid},h)
   patch('candidacies','id=eq.'+winner,{'support':100,'visibility':100,'campaign_reputation':100,'base_reputation':100,'base_influence':100,'program_score':100,'program':ca['program']})
   for rival in rows('candidacies','election_id=eq.'+wid+'&npc_id=not.is.null'):
    patch('candidacies','id=eq.'+rival['id'],{'support':0,'visibility':0,'campaign_reputation':0,'base_reputation':0,'base_influence':0,'program_score':0})
   patch('elections','id=eq.'+wid,{'starts_at':(now-timedelta(hours=7)).isoformat(),'candidacy_ends_at':(now-timedelta(hours=6)).isoformat(),'campaign_starts_at':(now-timedelta(hours=5)).isoformat(),'debate_at':(now-timedelta(hours=4)).isoformat(),'vote_starts_at':(now-timedelta(hours=3)).isoformat(),'vote_ends_at':(now-timedelta(hours=2)).isoformat(),'count_at':(now-timedelta(hours=1)).isoformat()})
   won=next(x for x in rpc('election_state',{},h)['elections'] if x['id']==wid);assert won['winner_id']==winner and won['mandate']['candidacy_id']==winner
   rewards=rows('political_rewards','character_id=eq.'+cid+'&reward_key=eq.election:'+wid);assert len(rewards)==1 and rewards[0]['reputation']==8
   rpc('election_state',{},h);assert rows('political_rewards','character_id=eq.'+cid+'&reward_key=eq.election:'+wid)==rewards
   await page.goto('http://localhost:8080/elections/'+wid);await page.get_by_role('tab',name='Résultats',exact=True).click();await page.get_by_text('Vous avez remporté le mandat municipal.',exact=True).wait_for();print('Complément: joueur élu maire, résultat visible et récompense unique')
   await page.set_viewport_size({'width':390,'height':844})
   for path in ['/elections','/elections/'+eid,'/politique','/ma-ville']:
    await page.goto('http://localhost:8080'+path);await page.wait_for_timeout(700);assert not await page.evaluate('document.documentElement.scrollWidth>innerWidth'),path
   await page.goto('http://localhost:8080/elections/'+eid);await page.get_by_role('tab',name='Résultats',exact=True).click();await page.screenshot(path=str(OUT/'results-mobile.png'));assert not errors,errors
  finally:
   # Test-only decisions/news and location metadata restoration.
   for eid in fixtures:
    for m in rows('municipal_mandates','election_id=eq.'+eid):
     if m['decision_id']:
      decision=rows('public_decisions','id=eq.'+m['decision_id'])[0];req('/rest/v1/municipal_mandates?id=eq.'+m['id'],method='DELETE');req('/rest/v1/public_decisions?id=eq.'+m['decision_id'],method='DELETE')
      if decision['news_id']:
       n=rows('news','id=eq.'+decision['news_id'])[0]
       for t in ['notifications','news_reads','news_bookmarks']:req('/rest/v1/'+t+'?news_id=eq.'+n['id'],method='DELETE')
       req('/rest/v1/news?id=eq.'+n['id'],method='DELETE');req('/rest/v1/events?id=eq.'+n['event_id'],method='DELETE')
    news=rows('news','election_id=eq.'+eid)
    for n in news:
     req('/rest/v1/notifications?news_id=eq.'+n['id'],method='DELETE');req('/rest/v1/news_reads?news_id=eq.'+n['id'],method='DELETE');req('/rest/v1/news_bookmarks?news_id=eq.'+n['id'],method='DELETE')
    req('/rest/v1/news?election_id=eq.'+eid,method='DELETE');req('/rest/v1/events?event_key=like.election:'+eid+'*',method='DELETE');req('/rest/v1/elections?id=eq.'+eid,method='DELETE')
   for lid,data in location_snapshots.items():patch('locations','id=eq.'+lid,data)
   for uid in users:
    cs=rows('characters','user_id=eq.'+uid)
    for c in cs:
     cid=c['id']
     for t in ['campaign_actions','candidacies','social_interactions','social_participations','social_relations','membership_history','memberships','political_rewards','political_opinions','political_stats','civic_rewards','civic_stats','citizen_reports','consultation_participations','activities','job_applications','study_enrollments','employments','character_housing','character_positions']:
      req('/rest/v1/'+t+'?character_id=eq.'+cid,method='DELETE')
     for acc in rows('accounts','character_id=eq.'+cid):req('/rest/v1/transactions?account_id=eq.'+acc['id'],method='DELETE')
     req('/rest/v1/accounts?character_id=eq.'+cid,method='DELETE');req('/rest/v1/characters?id=eq.'+cid,method='DELETE')
    req('/rest/v1/notifications?user_id=eq.'+uid,method='DELETE');req('/auth/v1/admin/users/'+uid,method='DELETE')
   await browser.close()
asyncio.run(main())
