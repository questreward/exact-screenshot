export const SLOGAN = 'Votre vie. Votre ville. Votre histoire.';
export const INTERESTS = ['Politique', 'Économie', 'Métiers', 'Annonces'];
export function safeText(value, max = 1000) {
  return String(value ?? '').replace(/@/g, '@\u200b').replace(/[<>]/g, '').slice(0, max);
}
export function ownerCanAnnounce(userId, ownerId, guildId, configuredGuild) {
  return Boolean(ownerId && guildId && userId === ownerId && guildId === configuredGuild);
}
export function publicPost(row, gameUrl) {
  // Explicit projection: no private fields, invented narrative, totals or player IDs.
  return {
    content: `**${safeText(row.title, 180)}**\n${safeText(row.summary, 1200)}\n${gameUrl}/decouvrir`,
    allowed_mentions: { parse: [] },
  };
}
export function welcome(gameUrl) {
  return `Bienvenue dans **CIVITAS** !\n${SLOGAN}\nDécouvrir : ${gameUrl}/decouvrir\nJouer : ${gameUrl}/auth\nMerci de respecter les règles du serveur, les autres membres et leur vie privée.`;
}
export function validateConfig(env) {
  const required = ['DISCORD_BOT_TOKEN', 'DISCORD_GUILD_ID', 'DISCORD_OWNER_ID', 'DISCORD_WELCOME_CHANNEL_ID', 'DISCORD_NEWS_CHANNEL_ID', 'DISCORD_ELECTION_CHANNEL_ID', 'DISCORD_ANNOUNCEMENT_CHANNEL_ID', 'DISCORD_DATABASE_URL', 'GAME_URL'];
  for (const key of required) if (!env[key]?.trim()) throw new Error(`Réglage manquant : ${key}`);
  for (const key of required.filter(k => k.endsWith('_ID'))) if (!/^\d{17,20}$/.test(env[key])) throw new Error(`Identifiant invalide : ${key}`);
  const url = new URL(env.GAME_URL);
  if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash) throw new Error('GAME_URL doit être une adresse HTTPS publique.');
  const db = new URL(env.DISCORD_DATABASE_URL);
  if (!['postgres:', 'postgresql:'].includes(db.protocol) || decodeURIComponent(db.username) !== 'civitas_discord') throw new Error('Utiliser uniquement le compte de lecture civitas_discord.');
  return { ...env, GAME_URL: url.origin };
}