"""Final isolated work-payment regression. Clock advancement is confined to
one admin SQL transaction that restores world_state before commit. No game
rule, activity duration or reward is modified. Run prepare, apply the printed
non-secret IDs with the documented SQL test, then run verify (always cleans up).
"""
import asyncio
import json
import os
import uuid
from pathlib import Path

import requests
from playwright.async_api import async_playwright

OUT = Path('/tmp/browser/final-work-payment')
STATE = OUT / 'session.json'
BASE = os.environ['SUPABASE_URL']
PUB = os.environ['SUPABASE_PUBLISHABLE_KEY']
KEY = os.environ['SUPABASE_SERVICE_ROLE_KEY']
ADMIN = {'apikey': KEY, 'Authorization': 'Bearer ' + KEY, 'Content-Type': 'application/json'}


def api(path, data=None, headers=None, method=None):
    response = requests.request(method or ('POST' if data is not None else 'GET'), BASE + path,
                                headers=headers or ADMIN, json=data, timeout=30)
    response.raise_for_status()
    return response.json() if response.content else None


def rows(table, query):
    return api('/rest/v1/' + table + '?' + query)


def cleanup(s):
    for account in rows('accounts', 'character_id=eq.' + s['cid']):
        api('/rest/v1/transactions?account_id=eq.' + account['id'], method='DELETE')
    for table in ['activities', 'job_applications', 'employments', 'character_housing', 'character_positions', 'accounts']:
        api('/rest/v1/' + table + '?character_id=eq.' + s['cid'], method='DELETE')
    api('/rest/v1/characters?id=eq.' + s['cid'], method='DELETE')
    api('/auth/v1/admin/users/' + s['uid'], method='DELETE')
    assert rows('characters', 'id=eq.' + s['cid']) == []
    STATE.unlink(missing_ok=True)
    print('Compte temporaire et données supprimés.')


def prepare():
    OUT.mkdir(parents=True, exist_ok=True)
    assert not STATE.exists(), 'Existing test must be cleaned up first'
    email = 'final-work-' + uuid.uuid4().hex + '@example.com'
    password = uuid.uuid4().hex + 'Aa7!'
    user = api('/auth/v1/admin/users', {'email': email, 'password': password, 'email_confirm': True})
    session = api('/auth/v1/token?grant_type=password', {'email': email, 'password': password}, {'apikey': PUB})
    headers = {'apikey': PUB, 'Authorization': 'Bearer ' + session['access_token']}
    cid = api('/rest/v1/rpc/create_character', {'_first_name': 'Essai', '_last_name': 'Vacation', '_age': 18,
              '_city_id': 'lyon', '_path_id': 'young_worker', '_appearance': {}}, headers)
    s = {'uid': user['id'], 'cid': cid, 'email': email, 'password': password, 'session': session}
    STATE.write_text(json.dumps(s))
    STATE.chmod(0o600)
    job = rows('jobs', 'city_id=eq.lyon&title=eq.Assistant administratif')[0]
    api('/rest/v1/rpc/apply_job', {'_job_id': job['id']}, headers)
    print('Prepared temporary IDs:', json.dumps({'uid': s['uid'], 'cid': cid}))


async def verify():
    s = json.loads(STATE.read_text())
    async with async_playwright() as pw:
        browser = await pw.chromium.launch(headless=True)
        try:
            context = await browser.new_context(viewport={'width': 1280, 'height': 1800})
            page = await context.new_page()
            errors = []
            page.on('pageerror', lambda e: errors.append(str(e)))
            await page.goto('http://localhost:8080')
            await page.evaluate("async s => {const {supabase}=await import('/src/integrations/supabase/client.ts');const {error}=await supabase.auth.setSession(s);if(error)throw new Error(error.message)}", s['session'])

            def check():
                account = rows('accounts', 'character_id=eq.' + s['cid'])[0]
                wages = rows('transactions', 'account_id=eq.' + account['id'] + '&label=eq.Salaire — Assistant administratif')
                assert account['balance'] == 1580, account['balance']
                assert len(wages) == 1, len(wages)
                assert wages[0]['amount'] == 80, wages[0]['amount']
                activity = rows('activities', 'character_id=eq.' + s['cid'] + '&type=eq.work&status=eq.completed')
                assert len(activity) == 1
                from datetime import datetime
                a = activity[0]
                assert (datetime.fromisoformat(a['end_time']) - datetime.fromisoformat(a['start_time'])).total_seconds() == 14400
                assert rows('characters', 'id=eq.' + s['cid'])[0]['energy'] == 70
                assert rows('employments', 'character_id=eq.' + s['cid'])[0]['progress'] == 10
                return wages[0]['id']

            transaction_id = check()
            await page.goto('http://localhost:8080/telephone?app=banque')
            await page.get_by_text('Salaire — Assistant administratif', exact=True).wait_for()
            assert await page.get_by_text('Salaire — Assistant administratif', exact=True).count() == 1
            await page.screenshot(path=str(OUT / '1-banque-salaire.png'))
            print('Vacation 08:00–12:00 complète, énergie 70, progression 10, salaire 80 €, solde 1 580 €, une transaction visible.')
            for i in range(5):
                await page.reload()
                await page.get_by_text('Salaire — Assistant administratif', exact=True).wait_for()
                assert check() == transaction_id
            await page.screenshot(path=str(OUT / '2-cinq-recharges.png'))
            print('Cinq recharges : même solde et même transaction unique.')
            await page.goto('http://localhost:8080/parametres')
            await page.get_by_role('main').get_by_role('button', name='Se déconnecter', exact=True).click()
            await page.wait_for_url('**/auth*')
            await page.screenshot(path=str(OUT / '3-deconnexion.png'))
            restored = api('/auth/v1/token?grant_type=password', {'email': s['email'], 'password': s['password']}, {'apikey': PUB})
            await page.evaluate("async s=>{const {supabase}=await import('/src/integrations/supabase/client.ts');const {error}=await supabase.auth.setSession(s);if(error)throw new Error(error.message)}", restored)
            await page.goto('http://localhost:8080/telephone?app=banque')
            await page.get_by_text('Salaire — Assistant administratif', exact=True).wait_for()
            assert check() == transaction_id
            headers = {'apikey': PUB, 'Authorization': 'Bearer ' + restored['access_token']}
            from concurrent.futures import ThreadPoolExecutor
            with ThreadPoolExecutor(max_workers=5) as pool:
                list(pool.map(lambda _: api('/rest/v1/rpc/daily_life_state', {}, headers), range(5)))
            assert check() == transaction_id
            await page.reload()
            await page.get_by_text('Salaire — Assistant administratif', exact=True).wait_for()
            assert check() == transaction_id
            await page.screenshot(path=str(OUT / '4-reconnexion-paiement-unique.png'))
            assert errors == [], errors
            print('Reconnexion et cinq consultations concurrentes : aucun double paiement, une seule transaction, aucune erreur de page.')
        finally:
            await browser.close()
            cleanup(s)


if __name__ == '__main__':
    import sys
    if sys.argv[1] == 'prepare':
        prepare()
    elif sys.argv[1] == 'verify':
        asyncio.run(verify())
    elif sys.argv[1] == 'cleanup':
        cleanup(json.loads(STATE.read_text()))