import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { publicPost, ownerCanAnnounce, safeText, validateConfig } from '../src/public-data.mjs';
import { Journal } from '../src/journal.mjs';
test('ne publie aucun champ privé ajouté à une source publique', () => {
  const result = JSON.stringify(publicPost({ title: 'Élection', summary: 'Vote ouvert', email: 'private@example.org', balance: 987654, character_id: 'private-player' }, 'https://civitas-simulator.com'));
  for (const secret of ['private@example.org', '987654', 'private-player']) assert.equal(result.includes(secret), false);
});
test('annonce réservée au propriétaire dans son serveur', () => {
  assert.equal(ownerCanAnnounce('alex', 'alex', 'server', 'server'), true);
  assert.equal(ownerCanAnnounce('other', 'alex', 'server', 'server'), false);
  assert.equal(ownerCanAnnounce('alex', 'alex', 'other', 'server'), false);
  assert.equal(ownerCanAnnounce('', '', 'server', 'server'), false);
});
test('mentions neutralisées', () => assert.equal(safeText('@everyone').includes('@everyone'), false));
test('refuse un compte de base administrateur et une adresse non sécurisée', () => {
  const env = { DISCORD_BOT_TOKEN: 'test-only', DISCORD_GUILD_ID: '111111111111111111', DISCORD_OWNER_ID: '111111111111111112', DISCORD_WELCOME_CHANNEL_ID: '111111111111111113', DISCORD_NEWS_CHANNEL_ID: '111111111111111114', DISCORD_ELECTION_CHANNEL_ID: '111111111111111115', DISCORD_ANNOUNCEMENT_CHANNEL_ID: '111111111111111116', DISCORD_DATABASE_URL: 'postgres://civitas_discord@localhost/civitas', GAME_URL: 'https://civitas-simulator.com' };
  assert.equal(validateConfig(env).GAME_URL, 'https://civitas-simulator.com');
  assert.throws(() => validateConfig({ ...env, DISCORD_DATABASE_URL: 'postgres://postgres@localhost/civitas' }), /lecture/);
  assert.throws(() => validateConfig({ ...env, GAME_URL: 'http://civitas-simulator.com' }), /HTTPS/);
});
test('message confirmé ou incertain jamais renvoyé automatiquement après redémarrage', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'civitas-discord-'));
  try {
    const journal = new Journal(dir); await journal.load(); let sends = 0;
    await journal.sendOnce('news:1', async () => { sends++; return { id: 'm1' }; });
    await assert.rejects(journal.sendOnce('news:2', async () => { sends++; throw new Error('réponse perdue'); }));
    const restored = new Journal(dir); await restored.load();
    assert.equal(await restored.sendOnce('news:1', async () => { sends++; }), false);
    assert.equal(await restored.sendOnce('news:2', async () => { sends++; }), false);
    assert.equal(sends, 2);
  } finally { await rm(dir, { recursive: true, force: true }); }
});