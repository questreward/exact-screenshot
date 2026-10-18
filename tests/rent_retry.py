"""Eight authorized rent regressions on one isolated temporary account.

Only fixture-owned balances/deadlines are changed. The shared clock is never changed.
No existing player's data is written. Credentials are kept in memory, never printed.
"""
import asyncio
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
from economy_persistence import prepare, cleanup, rows, rpc, patch, checks
from playwright.async_api import async_playwright

OUT = Path('/tmp/browser/rent-retry')
OUT.mkdir(parents=True, exist_ok=True)
results = []

def passed(number, condition, label):
    assert condition, f'TEST {number}: {label}'
    results.append(number)
    print(f'PASS TEST {number}: {label}', flush=True)

async def run():
    f = prepare()
    cid, h = f['cid'], f['h']
    account = rows('accounts', 'character_id=eq.' + cid)[0]
    aid = account['id']
    today = rpc('personal_economy_state', h=h)['world_now'][:10]
    base = 'rent:' + today
    retry = base + ':retry'

    def operations():
        return sorted(rows('economy_operations', 'character_id=eq.' + cid + '&kind=eq.logement'), key=lambda o:o['operation_key'])

    def transactions():
        return rows('transactions', 'account_id=eq.' + aid + '&category=eq.logement')

    def balance():
        return rows('accounts', 'id=eq.' + aid)[0]['balance']

    def snapshot():
        return {'balance': balance(), 'operations': operations(), 'transactions': transactions()}

    # Automatic failure first, then explicit insufficient-funds attempt, same date.
    patch('accounts', 'id=eq.' + aid, {'balance': 1})
    patch('personal_budgets', 'character_id=eq.' + cid, {'auto_rent': True, 'next_rent': today})
    rpc('personal_economy_state', h=h)
    failed = next(o for o in operations() if o['operation_key'] == base)
    patch('personal_budgets', 'character_id=eq.' + cid, {'auto_rent': False})
    result = rpc('pay_housing_attempt', h=h)
    passed(1, result['status'] == 'insufficient_funds' and balance() == 1 and failed['status'] == 'failed' and failed['amount'] == -30 and not transactions(), 'Échec faute d’argent : aucun débit, aucune transaction, échec conservé')

    # Reproduce the old phantom paid-date defect on this test-owned housing only.
    patch('character_housing', 'character_id=eq.' + cid, {'last_paid_date': today})
    async with async_playwright() as pw:
        browser = await pw.chromium.launch(headless=True)
        context = await browser.new_context(viewport={'width': 1280, 'height': 1800})
        page = await context.new_page()
        errors = []
        page.on('pageerror', lambda e: errors.append(str(e)))
        await page.goto('http://localhost:8080')
        await page.evaluate("async s=>{const {supabase}=await import('/src/integrations/supabase/client.ts');await supabase.auth.setSession(s)}", f['ss'])
        await page.goto('http://localhost:8080/vie')
        button = page.get_by_role('button', name='Payer le logement', exact=True)
        await button.wait_for()
        assert await button.is_enabled(), 'Ancienne date erronée : paiement doit rester possible'
        await button.click()
        await page.get_by_text('Solde insuffisant. Échec conservé, aucun débit.', exact=True).wait_for()
        await page.get_by_role('heading', name='Mon logement', exact=True).locator('..').screenshot(path=str(OUT/'1-echec.png'))
        assert next(o for o in operations() if o['operation_key'] == base) == failed

        # Test-only top-up, not a gameplay income or price override.
        patch('accounts', 'id=eq.' + aid, {'balance': 200})
        await page.reload()
        await button.wait_for()
        await button.click()
        paid_button = page.get_by_role('button', name='Payé aujourd’hui', exact=True)
        await paid_button.wait_for()
        success = next(o for o in operations() if o['status'] == 'done')
        passed(2, balance() == 170 and len(transactions()) == 1 and transactions()[0]['amount'] == -30 and success['operation_key'] == retry and success['operation_key'] != failed['operation_key'], 'Nouvelle tentative le même jour : une réussite distincte, une transaction de −30 €, solde 170 €')
        await page.get_by_role('heading', name='Mon logement', exact=True).locator('..').screenshot(path=str(OUT/'2-paiement.png'))

        before = snapshot()
        # Real simultaneous requests independently of the disabled browser control.
        with ThreadPoolExecutor(max_workers=4) as pool:
            replies = list(pool.map(lambda _: rpc('pay_housing_attempt', h=h), range(4)))
        passed(3, all(r['status'] == 'already_paid' for r in replies) and snapshot() == before and len([o for o in operations() if o['status'] == 'done']) == 1, 'Clics multiples simultanés : aucune seconde réussite et aucun second débit')

        for _ in range(3):
            await page.reload()
            await paid_button.wait_for()
            assert await paid_button.is_disabled()
        await page.goto('http://localhost:8080/telephone?app=banque')
        bank_line = page.get_by_text('Logement — ' + today, exact=True)
        await bank_line.wait_for()
        await page.get_by_role('main').screenshot(path=str(OUT/'4-banque.png'))
        passed(4, await bank_line.count() == 1 and snapshot() == before, 'Trois recharges : solde 170 € et une transaction visible dans Banque')

        await page.goto('http://localhost:8080/parametres')
        await page.get_by_role('main').get_by_role('button', name='Se déconnecter', exact=True).click()
        await page.wait_for_url('**/auth*')
        # Authenticate through the real sign-in form. Never screenshot credentials.
        await page.get_by_label('E-mail', exact=True).fill(f['email'])
        await page.get_by_label('Mot de passe', exact=True).fill(f['password'])
        await page.get_by_role('button', name='Se connecter', exact=True).click()
        await page.wait_for_url('**/tableau-de-bord')
        await page.goto('http://localhost:8080/vie')
        await paid_button.wait_for()
        passed(5, await paid_button.is_disabled() and snapshot() == before, 'Déconnexion puis reconnexion réelle : aucun second paiement')
        await page.get_by_role('heading', name='Mon logement', exact=True).locator('..').screenshot(path=str(OUT/'5-reconnexion.png'))

        result = rpc('pay_housing_attempt', h=h)
        passed(6, result['status'] == 'already_paid' and snapshot() == before, 'Tentative après paiement : déjà payé, données financières inchangées')
        passed(7, next(o for o in operations() if o['operation_key'] == base) == failed and len(operations()) == 2, 'Historique : toutes les valeurs de l’échec initial conservées avec la réussite distincte')
        passed(8, success['payload']['previous_failure_key'] == base and success['payload']['rent_date'] == today and rows('character_housing', 'character_id=eq.' + cid)[0]['last_paid_date'] == today and balance() == 170 and not errors, 'Échec automatique et ancienne date erronée : paiement manuel réussi, échec conservé, aucune erreur de page')
        await browser.close()
    assert sorted(results) == list(range(1, 9)), 'Les huit tests doivent être terminés'

if __name__ == '__main__':
    try:
        asyncio.run(run())
    finally:
        cleanup()
    print('8/8 tests réussis ; compte temporaire nettoyé.', flush=True)