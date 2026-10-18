"""Bloc 13 — Messages, Civi, Monde : comptes temporaires isolés, supprimés à la fin."""
import uuid, requests
from concurrent.futures import ThreadPoolExecutor
from economy_persistence import prepare, cleanup, rows, rpc, patch, req, check, BASE, ADMIN
from admin_persistence_helpers import relogin, bal

def together(*calls):
  with ThreadPoolExecutor(max_workers=len(calls)) as p: return [f.result() for f in [p.submit(c) for c in calls]]
def call(h, name, data): return requests.post(BASE + '/rest/v1/rpc/' + name, json=data, headers=h, timeout=30)
def S(h): return rpc('communication_state', h=h)
def snapshot(cid):
  acc = rows('accounts', 'character_id=eq.' + cid)[0]
  return (bal(cid), len(rows('transactions', 'account_id=eq.' + acc['id'])), rows('social_stats', 'character_id=eq.' + cid),
          rows('political_stats', 'character_id=eq.' + cid), rows('civic_stats', 'character_id=eq.' + cid),
          rows('social_relations', 'character_id=eq.' + cid + '&select=npc_id,score&order=npc_id'), rows('characters', 'id=eq.' + cid + '&select=energy'))
def mine(t, h, q=''): return requests.get(BASE + '/rest/v1/' + t + '?' + q, headers=h, timeout=30).json()

try:
  A = prepare(); h = A['h']; cid = A['cid']
  B = prepare(); hb = B['h']; cidb = B['cid']
  # Rencontre réelle d'un personnage fictif (système existant du Bloc 4)
  npc = None
  for n in rows('social_npcs', 'city_id=eq.lyon&location_id=not.is.null&select=id,first_name,location_id&order=id&limit=40'):
    if call(h, 'move_character', {'_location_id': n['location_id']}).status_code < 400:
      npc = n; break
  rpc('social_interact', {'_npc_id': npc['id'], '_action_id': 'introduce'}, h)

  # 1. Message entrant créé une seule fois (recharges, reconnexion)
  together(*[lambda: S(h)] * 4); S(h)
  h2, _ = relogin(A); S(h2)
  meet = rows('messages', f'character_id=eq.{cid}&source_key=eq.meet:{npc["id"]}')
  notif = rows('notifications', f'user_id=eq.{A["u"]["id"]}&title=eq.Nouveau message')
  check(len(meet) == 1 and len(notif) == 1, '1 Message de rencontre unique et une seule notification après 5 recharges simultanées/successives et une reconnexion')

  # 2. Réponse fermée : une seule fois, sans aucun effet de jeu
  before = snapshot(cid)
  r = together(*[lambda: call(h2, 'reply_message', {'_message': meet[0]['id'], '_reply': 'warm'})] * 4)
  replies = rows('messages', f'character_id=eq.{cid}&sender=eq.player')
  check(sum(x.status_code < 400 for x in r) == 1 and len(replies) == 1, '2a Quatre clics sur une réponse : une seule réponse enregistrée')
  check(snapshot(cid) == before, '2b Réponse sans effet : argent, transactions, réputation, influence, engagement, relation et énergie inchangés')
  check(call(h2, 'reply_message', {'_message': meet[0]['id'], '_reply': 'xx'}).status_code >= 400, '2c Réponse inconnue ou déjà donnée : refusée')

  # 3. Proposition de rendez-vous -> Agenda via social_interact (inchangé)
  patch('social_relations', f'character_id=eq.{cid}&npc_id=eq.{npc["id"]}', {'score': 45, 'last_interaction': '2000-01-01T00:00:00Z'})  # fixture sur la ligne de test
  S(h2); S(h2)
  offer = rows('messages', f'character_id=eq.{cid}&source_key=eq.invite_offer:{npc["id"]}')
  check(len(offer) == 1, '3a Proposition de rendez-vous reçue une seule fois (relation ≥ 40)')
  r = together(*[lambda: call(h2, 'social_interact', {'_npc_id': npc['id'], '_action_id': 'invite'})] * 3)
  acts = rows('activities', f'character_id=eq.{cid}&type=eq.social&social_npc_id=eq.{npc["id"]}')
  check(sum(x.status_code < 400 for x in r) == 1 and len(acts) == 1, '3b Trois clics « Proposer un rendez-vous » : un seul rendez-vous dans l’Agenda')
  S(h2); S(h2)
  check(len(rows('messages', f'character_id=eq.{cid}&source_key=eq.reminder:{acts[0]["id"]}')) == 1, '3c Rappel du rendez-vous reçu une seule fois')

  # 4. Lu / non lu persistant
  st = S(h2); th = rows('message_threads', 'character_id=eq.' + cid)
  check(st['unread'] >= 2 and len(th) == 1, f'4a Pastille : {st["unread"]} messages non lus, une seule conversation')
  rpc('read_message_thread', {'_thread': th[0]['id']}, h2)
  h3, _ = relogin(A)
  check(S(h3)['unread'] == 0, '4b Conversation lue : 0 non lu, conservé après reconnexion')

  # 5. Fil Civi alimenté sans doublon
  n1 = len(rows('social_posts', 'character_id=is.null&select=id')); S(h3); S(hb)
  keys = [p['source_key'] for p in rows('social_posts', 'select=source_key')]
  check(len(keys) == len(set(keys)) and len(rows('social_posts', 'character_id=is.null&select=id')) == n1 and n1 > 0, f'5a Fil Civi : {n1} publications issues des actualités/événements, aucune en double')
  priv = rows('social_posts', 'event_id=not.is.null&select=event_id')
  ev = rows('events', 'character_id=not.is.null&select=id')
  check(not ({p['event_id'] for p in priv} & {e['id'] for e in ev}), '5b Aucun événement personnel publié dans le fil')

  # 6. Publications : simple, clics simultanés, recharge, reconnexion, 3 par jour, aucune récompense
  before = snapshot(cid)
  p1 = rpc('civi_post', {'_template': 'city_love', '_request_id': str(uuid.uuid4())}, h3)
  mine1 = rows('social_posts', 'character_id=eq.' + cid)
  check(len(mine1) == 1 and mine1[0]['id'] == p1 and 'Lyon' in mine1[0]['body'] and S(h3)['posts_today'] == 1, 'P1 Publication simple créée et visible')
  rid = str(uuid.uuid4())
  r = together(*[lambda: call(h3, 'civi_post', {'_template': 'work_day', '_request_id': rid})] * 4)
  check(all(x.status_code < 400 for x in r) and len({x.text for x in r}) == 1 and len(rows('social_posts', 'character_id=eq.' + cid)) == 2, 'P2 Quatre clics simultanés : une seule publication')
  S(h3); S(h3); call(h3, 'civi_post', {'_template': 'work_day', '_request_id': rid})
  check(len(rows('social_posts', 'character_id=eq.' + cid)) == 2 and S(h3)['posts_today'] == 2, 'P3 Recharges et renvoi de la même demande : aucun doublon')
  h4, _ = relogin(A); call(h4, 'civi_post', {'_template': 'work_day', '_request_id': rid})
  check(len(rows('social_posts', 'character_id=eq.' + cid)) == 2 and len(mine('social_posts', h4, 'character_id=eq.' + cid)) == 2, 'P4 Déconnexion/reconnexion : publications conservées, aucun doublon')
  rpc('civi_post', {'_template': 'civic', '_request_id': str(uuid.uuid4())}, h4)
  r4 = call(h4, 'civi_post', {'_template': 'study_day', '_request_id': str(uuid.uuid4())})
  check(len(rows('social_posts', 'character_id=eq.' + cid)) == 3 and r4.status_code >= 400 and 'Limite' in r4.text and S(h4)['posts_today'] == 3, 'P5 Quatrième publication du jour refusée (maximum 3)')
  ops = rows('economy_operations', f'character_id=eq.{cid}&operation_key=like.civi:*')
  check(snapshot(cid) == before and len(ops) == 3 and all(o['amount'] == 0 for o in ops), 'P6 Aucune récompense : argent, transactions, réputation, influence, engagement, relation et énergie inchangés')
  post = rows('social_posts', 'character_id=eq.' + cid + '&limit=1')[0]; fic = rows('social_posts', 'character_id=is.null&limit=1')[0]
  together(*[lambda: call(h4, 'civi_react', {'_post': fic['id'], '_kind': 'like', '_on': True})] * 3)
  together(*[lambda: call(h4, 'civi_react', {'_post': post['id'], '_kind': 'share', '_on': True})] * 3)
  check(len(rows('social_post_reactions', f'character_id=eq.{cid}&post_id=eq.{fic["id"]}')) == 1 and len(rows('social_post_reactions', f'character_id=eq.{cid}&post_id=eq.{post["id"]}')) == 1 and snapshot(cid) == before,
    'P8 J’aime et partage : une seule réaction chacun malgré 3 clics, aucune récompense')

  # 7. Confidentialité entre personnages
  check(mine('messages', hb) == [] and mine('message_threads', hb) == [] and mine('social_post_reactions', hb) == [], '7a Le second compte ne voit ni messages, ni conversations, ni réactions du premier')
  check(not [p for p in mine('social_posts', hb, 'select=character_id') if p['character_id']], 'P7 Le second compte ne voit aucune publication du premier')
  check(all(x.status_code >= 400 for x in [call(hb, 'reply_message', {'_message': offer[0]['id'], '_reply': 'later'}),
    call(hb, 'read_message_thread', {'_thread': th[0]['id']}), call(hb, 'civi_react', {'_post': post['id'], '_kind': 'like', '_on': True})]),
    '7c Le second compte ne peut ni répondre, ni lire, ni réagir aux contenus privés du premier')

  # 8. Monde cohérent avec les données existantes
  w = rpc('world_overview', h=h4); cities = rows('cities', 'select=id,name')
  wx = {x['city_id']: x for x in rows('city_weather', 'select=city_id,temperature')}
  check(len(w['cities']) == len(cities) and all((c['weather'] or {}).get('temperature') == wx.get(c['id'], {}).get('temperature') for c in w['cities']), f'8 Monde : {len(cities)} villes, météo identique à la Carte')

  # 9. Écritures directes refusées
  def denied(method, path, data=None):
    x = requests.request(method, BASE + '/rest/v1/' + path, json=data, headers={**h4, 'Prefer': 'return=representation'}, timeout=30)
    return x.status_code >= 400 or x.text in ('', '[]')
  check(all([denied('POST', 'messages', {'thread_id': th[0]['id'], 'character_id': cid, 'sender': 'npc', 'body': 'x', 'source_key': 'x'}),
    denied('PATCH', 'messages?character_id=eq.' + cid, {'read_at': None}), denied('DELETE', 'messages?character_id=eq.' + cid),
    denied('POST', 'social_posts', {'author_kind': 'player', 'author_label': 'x', 'character_id': cid, 'body': 'x', 'source_key': 'y'}),
    denied('DELETE', 'social_posts?character_id=eq.' + cid), denied('POST', 'social_post_reactions', {'post_id': fic['id'], 'character_id': cid, 'kind': 'share'}),
    denied('PATCH', 'communication_settings?id=eq.1', {'daily_post_limit': 10}), denied('POST', 'message_templates', {'id': 'z', 'trigger_kind': 'meet', 'body': 'x'}),
    call(h4, 'comm_push', {'_cid': cid, '_npc': npc['id'], '_key': 'z', '_tpl': 'meet_1', '_place': None, '_org': None}).status_code >= 400,
    call(h4, 'comm_generate', {'_cid': cidb}).status_code >= 400, call(h4, 'civi_refresh', {'_city': 'lyon'}).status_code >= 400]),
    '9 Écritures directes et fonctions internes refusées')
  check(len(rows('messages', 'character_id=eq.' + cid + '&read_at=is.null&sender=eq.npc')) == 0 and len(rows('social_posts', 'character_id=eq.' + cid)) == 3, '9b Données intactes après les tentatives')
finally:
  for f in [x for x in ('A', 'B') if x in dir()]:
    pass
  for c in rows('characters', 'last_name=eq.Economie&select=id'):
    if c['id'] in [globals().get('cid'), globals().get('cidb')]:
      req('/rest/v1/social_participations?character_id=eq.' + c['id'], method='DELETE')
      req('/rest/v1/economy_operations?character_id=eq.' + c['id'], method='DELETE')
  cleanup()
print(f'{len(__import__("economy_persistence").checks)} vérifications réussies')
