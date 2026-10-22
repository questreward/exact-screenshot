import { Client, GatewayIntentBits, Events, REST, Routes, SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags } from 'discord.js';
import postgres from 'postgres';
import { validateConfig, welcome, publicPost, safeText, ownerCanAnnounce, INTERESTS } from './public-data.mjs';
import { Journal } from './journal.mjs';

const config = validateConfig(process.env);
const sql = postgres(config.DISCORD_DATABASE_URL, { max: 1, connect_timeout: 10, idle_timeout: 20 });
const journal = new Journal(config.DISCORD_DATA_DIR || '/app/data');
await journal.load();
const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers], allowedMentions: { parse: [] } });
const commands = [
  new SlashCommandBuilder().setName('heure').setDescription('Date et heure partagées du jeu'),
  new SlashCommandBuilder().setName('ville').setDescription('Informations publiques d’une ville').addStringOption(o => o.setName('nom').setDescription('Nom de la ville').setRequired(true).setMaxLength(80)),
  new SlashCommandBuilder().setName('elections').setDescription('Calendriers électoraux enregistrés'),
  new SlashCommandBuilder().setName('classement').setDescription('Classements publics et consentis'),
  new SlashCommandBuilder().setName('jouer').setDescription('Découvrir CIVITAS et rejoindre le jeu'),
  new SlashCommandBuilder().setName('annonce').setDescription('Publier une annonce — propriétaire uniquement').addStringOption(o => o.setName('texte').setDescription('Annonce ou maintenance').setRequired(true).setMaxLength(1500)),
];
const roleButtons = new ActionRowBuilder().addComponents(INTERESTS.map((name, i) => new ButtonBuilder().setCustomId(`interest:${i}`).setLabel(name).setStyle(ButtonStyle.Secondary)));
const roleIds = [config.DISCORD_POLITIQUE_ROLE_ID, config.DISCORD_ECONOMIE_ROLE_ID, config.DISCORD_METIERS_ROLE_ID, config.DISCORD_ANNONCES_ROLE_ID];
const date = value => new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Europe/Paris' }).format(new Date(value));
async function channel(id) {
  const c = await client.channels.fetch(id);
  if (!c?.isTextBased() || !('send' in c) || c.guildId !== config.DISCORD_GUILD_ID) throw new Error('Salon inaccessible ou hors du serveur configuré.');
  return c;
}

client.on(Events.GuildMemberAdd, member => {
  if (member.guild.id !== config.DISCORD_GUILD_ID || member.user.bot) return;
  // Serial journal writes; no user profiles or account linkage are stored.
  queue = queue.then(async () => {
    const c = await channel(config.DISCORD_WELCOME_CHANNEL_ID);
    await c.send({ content: `${safeText(member.displayName, 80)}, ${welcome(config.GAME_URL)}`, components: [roleButtons] });
  }).catch(() => console.error('Accueil indisponible : vérifier le salon et les permissions.'));
});

client.on(Events.InteractionCreate, async interaction => {
  if (interaction.guildId !== config.DISCORD_GUILD_ID) return;
  try {
    if (interaction.isButton() && /^interest:[0-3]$/.test(interaction.customId)) {
      await interaction.deferReply({ flags: MessageFlags.Ephemeral });
      const index = Number(interaction.customId.split(':')[1]), roleId = roleIds[index];
      if (!roleId || !interaction.guild) return await interaction.editReply('Ce rôle n’est pas encore configuré.');
      const role = await interaction.guild.roles.fetch(roleId);
      // Roles of interest must never grant administration or other privileges.
      if (!role || role.managed || role.id === interaction.guildId || role.permissions.bitfield !== 0n) return await interaction.editReply('Rôle d’intérêt indisponible : il doit être sans permission particulière.');
      const member = await interaction.guild.members.fetch(interaction.user.id);
      const remove = member.roles.cache.has(roleId);
      if (remove) await member.roles.remove(roleId); else await member.roles.add(roleId);
      return await interaction.editReply(`${INTERESTS[index]} : ${remove ? 'retiré' : 'ajouté'}.`);
    }
    if (!interaction.isChatInputCommand()) return;
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    let content;
    switch (interaction.commandName) {
      case 'jouer': content = welcome(config.GAME_URL); break;
      case 'heure': {
        const [clock] = await sql`select world_now, speed from public.discord_clock`;
        content = clock ? `${date(clock.world_now)} · vitesse commune ×${clock.speed}\nLes voyages VIP sont accélérés ×8 ; l’horloge reste commune.` : 'Horloge indisponible.'; break;
      }
      case 'ville': {
        const name = interaction.options.getString('nom', true);
        const gauges = await sql`select city, district, cadre, tranquillite, animation from public.discord_districts where lower(city) = lower(${name}) order by district limit 8`;
        const events = await sql`select title from public.discord_events where lower(city) = lower(${name}) order by starts_at desc limit 4`;
        content = gauges.length ? `**${safeText(gauges[0].city)}**\n${gauges.map(g => `${safeText(g.district, 80)} : cadre ${g.cadre ?? '—'}/100 · tranquillité ${g.tranquillite ?? '—'}/100 · animation ${g.animation ?? '—'}/100`).join('\n')}\n${events.map(e => `• ${safeText(e.title, 120)}`).join('\n')}` : 'Ville non trouvée ou informations indisponibles.'; break;
      }
      case 'elections': {
        const rows = await sql`select label, stage, vote_at from public.discord_elections order by vote_at limit 8`;
        content = rows.length ? rows.map(e => `• ${safeText(e.label, 100)} · ${safeText(e.stage, 70)} · ${date(e.vote_at)}`).join('\n') : 'Aucun scrutin dans le calendrier public.'; break;
      }
      case 'classement': {
        const rows = await sql`select category, label, score from public.discord_rankings order by category, score desc limit 12`;
        content = rows.length ? rows.map(r => `${safeText(r.category, 40)} · ${safeText(r.label, 80)} : ${r.score}`).join('\n') : 'Aucun classement public disponible.'; break;
      }
      case 'annonce': {
        if (!ownerCanAnnounce(interaction.user.id, config.DISCORD_OWNER_ID, interaction.guildId, config.DISCORD_GUILD_ID)) { content = 'Cette commande est réservée au propriétaire.'; break; }
        const c = await channel(config.DISCORD_ANNOUNCEMENT_CHANNEL_ID);
        const text = safeText(interaction.options.getString('texte', true), 1500);
        await new Promise((resolve, reject) => {
          queue = queue.then(async () => { await journal.sendOnce(`announcement:${interaction.id}`, () => c.send({ content: `**CIVITAS — Annonce**\n${text}` })); }).then(resolve, reject);
        });
        content = 'Annonce publiée.'; break;
      }
      default: content = 'Commande inconnue.';
    }
    await interaction.editReply({ content: content.slice(0, 1950), allowedMentions: { parse: [] } });
  } catch {
    console.error('Commande indisponible : vérifier les accès publics, salons et rôles.');
    if (interaction.deferred || interaction.replied) await interaction.editReply('Impossible de confirmer cette action. Vérifie le salon avant de réessayer une annonce.').catch(() => {});
  }
});

let queue = Promise.resolve(), timer, blocked = false;
async function poll() {
  if (blocked) return;
  try {
    const rows = await sql`select post_key, kind, title, summary from public.discord_feed order by published_at desc, post_key limit 100`;
    // On first start remember existing items: do not flood Discord with old news.
    if (!journal.rows.initialized) {
      for (const row of rows) await journal.record(row.post_key, { state: 'baseline' });
      await journal.record('initialized', { state: 'ready' });
      console.log('Historique initial repéré ; prochaines informations uniquement.');
      return;
    }
    for (const row of rows) {
      if (journal.rows[row.post_key]) continue;
      const c = await channel(row.kind === 'election' ? config.DISCORD_ELECTION_CHANNEL_ID : config.DISCORD_NEWS_CHANNEL_ID);
      await journal.sendOnce(row.post_key, () => c.send(publicPost(row, config.GAME_URL)));
    }
  } catch (error) {
    // No raw errors: connection URLs and database/server details can contain secrets.
    if ([401, 403, 404].includes(error.status)) { blocked = true; console.error('Publications arrêtées : vérifier les accès Discord puis redémarrer.'); }
    else console.error('Publication non confirmée ; journal conservé, nouvelle lecture au prochain passage.');
  }
}
client.once(Events.ClientReady, async ready => {
  try {
    await sql`select world_now from public.discord_clock`;
    for (const id of [config.DISCORD_WELCOME_CHANNEL_ID, config.DISCORD_NEWS_CHANNEL_ID, config.DISCORD_ELECTION_CHANNEL_ID, config.DISCORD_ANNOUNCEMENT_CHANNEL_ID]) await channel(id);
    await new REST({ version: '10' }).setToken(config.DISCORD_BOT_TOKEN).put(Routes.applicationGuildCommands(ready.user.id, config.DISCORD_GUILD_ID), { body: commands.map(c => c.toJSON()) });
    console.log('Bot CIVITAS connecté ; commandes installées.');
    queue = queue.then(poll);
    timer = setInterval(() => { queue = queue.then(poll).catch(() => console.error('Lecture publique indisponible.')); }, 300000);
  } catch { console.error('Démarrage incomplet : vérifier installation SQL, invitation et permissions.'); await stop(1); }
});
client.on(Events.Error, () => console.error('Connexion Discord interrompue.'));
async function stop(code = 0) { clearInterval(timer); client.destroy(); await sql.end({ timeout: 5 }); process.exit(code); }
process.on('SIGTERM', () => void stop());
process.on('SIGINT', () => void stop());
await client.login(config.DISCORD_BOT_TOKEN).catch(async () => { console.error('Connexion Discord refusée : vérifier le jeton et les options du bot.'); await stop(1); });