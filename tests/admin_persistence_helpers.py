import uuid, requests
from economy_persistence import rows, rpc, patch, req, BASE, PUB
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

