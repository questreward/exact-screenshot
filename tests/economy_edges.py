"""Isolated financial edge cases; advances only test-owned deadlines, never world_state."""
import uuid
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime,timedelta,timezone
from economy_persistence import prepare,cleanup,rows,rpc,patch,action,check,denied_action,req

def finish(cid,h):
 now=datetime.fromisoformat(rpc('personal_economy_state',h=h)['world_now']);a=rows('activities','character_id=eq.'+cid+'&status=eq.running')[0]
 patch('activities','id=eq.'+a['id'],{'start_time':(now-timedelta(hours=8)).isoformat(),'end_time':(now-timedelta(hours=1)).isoformat()})
 return rpc('personal_economy_state',h=h)

try:
 f=prepare();cid=f['cid'];h=f['h'];account=rows('accounts','character_id=eq.'+cid)[0]
 st=lambda:rpc('personal_economy_state',h=h)
 action(h,'goal',{'name':'Objectif atteint','kind':'saving','metric':'cash','target':200})
 goal=st()['goals'][0];rid=str(uuid.uuid4())
 with ThreadPoolExecutor(max_workers=5) as pool:list(pool.map(lambda _:action(h,'save',{'goal_id':goal['id'],'amount':200},rid),range(5)))
 check(st()['saved']==200 and st()['available']==2800,'Transfert concurrent : 200 € débités une seule fois')
 check(len(rows('notifications','user_id=eq.'+f['u']['id']+'&title=eq.Objectif d’épargne atteint'))==1,'Objectif atteint : une notification et statut acquis')
 action(h,'withdraw',{'goal_id':goal['id'],'amount':100});check(st()['saved']==100,'Retrait après objectif atteint disponible')
 check(denied_action(h,'withdraw',{'goal_id':goal['id'],'amount':101}) and denied_action(h,'save',{'goal_id':goal['id'],'amount':-1}),'Retraits excessifs et montants négatifs refusés')
 other=prepare();check(denied_action(other['h'],'withdraw',{'goal_id':goal['id'],'amount':50}),'Épargne d’un autre joueur inaccessible')
 check(req('/rest/v1/economy_goals?character_id=eq.'+cid,h=other['h'])==[],'Objectifs privés invisibles aux autres joueurs')
 rid=str(uuid.uuid4())
 with ThreadPoolExecutor(max_workers=3) as pool:list(pool.map(lambda _:action(h,'buy',{'catalog_id':'computer'},rid),range(3)))
 action(h,'buy',{'catalog_id':'study-kit'})
 check(st()['asset_value']==730 and st()['available']==2170,'Équipements : ordinateur 650 € et matériel d’étude 80 €, paiements uniques')
 check(denied_action(h,'buy',{'catalog_id':'car'}),'Voiture refusée sans permis')
 center=next(l for l in st()['locations'] if l['kind']=='universite')
 rpc('move_character',{'_location_id':center['id']},h)
 action(h,'training',{'catalog_id':'license'});finish(cid,h)
 check(st()['skills']['Permis']==1,'Permis : certification unique après formation')
 check(denied_action(h,'buy',{'catalog_id':'car'}),'Voiture refusée si solde insuffisant même avec permis')
 action(h,'buy',{'catalog_id':'bike'})
 # Two elapsed rents with insufficient funds: no debit, failure rows, no negative balance.
 now=datetime.fromisoformat(st()['world_now']);today=now.date();patch('accounts','id=eq.'+account['id'],{'balance':1})
 patch('personal_budgets','character_id=eq.'+cid,{'auto_rent':True,'next_rent':str(today-timedelta(days=1))})
 bike=rows('personal_assets','character_id=eq.'+cid+'&catalog_id=eq.bike')[0]
 patch('personal_assets','id=eq.'+bike['id'],{'next_maintenance':(now-timedelta(days=1)).isoformat()})
 with ThreadPoolExecutor(max_workers=5) as pool:list(pool.map(lambda _:st(),range(5)))
 check(st()['available']==1 and len([o for o in st()['operations'] if o['status']=='failed' and o['operation_key'].startswith('rent:')])==2,'Loyers impayés : deux échecs uniques, aucun découvert')
 check(next(a for a in st()['assets'] if a['catalog_id']=='bike')['condition']=='Entretien nécessaire','Entretien impayé : véhicule bloqué sans dette')
 dest=next(l for l in st()['locations'] if l['kind']=='logement')
 check(denied_action(h,'travel',{'catalog_id':'bike','location_id':dest['id']}),'Véhicule non entretenu : trajet refusé')
 patch('personal_budgets','character_id=eq.'+cid,{'auto_rent':False})
 # Test fixture top-up does not represent gameplay income.
 patch('accounts','id=eq.'+account['id'],{'balance':200})
 action(h,'maintain',{'catalog_id':'bike'});check(st()['available']==195 and next(a for a in st()['assets'] if a['catalog_id']=='bike')['condition']=='Bon état','Entretien manuel : coût serveur 5 €, état rétabli')
 def pay(_):
  try:rpc('pay_housing',h=h)
  except RuntimeError:pass
 with ThreadPoolExecutor(max_workers=4) as pool:list(pool.map(pay,range(4)))
 # After a preserved failure, the successful retry has its own key (rent:<date>:retry).
 check(st()['available']==165 and len(rows('transactions','account_id=eq.'+account['id']+'&operation_key=like.rent:'+str(today)+'*'))==1,'Logement manuel : quatre demandes, un débit de 30 €')
 # A failed scheduled date must not suppress an explicitly retried manual payment.
 check(rows('character_housing','character_id=eq.'+cid)[0]['last_paid_date']==str(today),'Logement : paiement réel enregistré après échec automatique')
 job=rows('jobs','city_id=eq.lyon&title=eq.Assistant administratif')[0]
 rpc('apply_job',{'_job_id':job['id']},h);patch('job_applications','character_id=eq.'+cid,{'response_at':'2000-01-01T00:00:00Z'});st()
 check(denied_action(h,'promotion',{}),'Promotion refusée sans compétences et expérience')
 action(h,'quit');check(not rows('employments','character_id=eq.'+cid) and not rows('activities','character_id=eq.'+cid+'&type=eq.work&status=eq.planned'),'Départ d’emploi : vacations futures annulées, historique conservé')
 check(any(v['kind']=='départ' for v in st()['history']),'Historique professionnel conserve le départ')
 job2=next(j for j in rows('jobs','city_id=eq.lyon') if j['id']!=job['id'] and not j.get('economy_skill'));rpc('apply_job',{'_job_id':job2['id']},h);patch('job_applications','character_id=eq.'+cid+'&job_id=eq.'+job2['id'],{'response_at':'2000-01-01T00:00:00Z'});st()
 check(len(rows('employments','character_id=eq.'+cid))==1 and st()['available']==165,'Nouvelle candidature : un emploi, aucun salaire anticipé')
 student=prepare('student',18);sh=student['h'];sc=student['cid']
 check(denied_action(sh,'career',{}),'Parcours étudiant : niveau requis non contournable')
 field=rpc('daily_life_state',h=sh)['fields'][0];rpc('enroll_studies',{'_field_id':field['id']},sh)
 patch('study_enrollments','character_id=eq.'+sc,{'progress':100});action(sh,'career')
 student_state=rpc('daily_life_state',h=sh)
 check(student_state['character']['path_id']=='student' and student_state['character']['progression']['career_active']==True,'Étudiant → actif : origine conservée et transition enregistrée')
 check(not rows('activities','character_id=eq.'+sc+'&type=eq.course&status=eq.planned'),'Transition : anciens cours futurs annulés')
 rpc('apply_job',{'_job_id':job['id']},sh);patch('job_applications','character_id=eq.'+sc,{'response_at':'2000-01-01T00:00:00Z'});rpc('daily_life_state',h=sh)
 check(len(rows('employments','character_id=eq.'+sc))==1,'Étudiant devenu actif : embauche autorisée après transition')
 minor=prepare('student',17);check(denied_action(minor['h'],'career',{}),'Mineur : transition professionnelle refusée')
finally:cleanup()