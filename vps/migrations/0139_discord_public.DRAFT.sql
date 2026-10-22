-- PROPOSITION À APPROUVER. Ne pas appliquer automatiquement.
-- Accès additionnels de lecture, aucun solde, vote, compte ou échéance modifié.
-- Prérequis : monde, news, élections municipales/nationales, TV, jauges, social_stats.
BEGIN;
CREATE ROLE civitas_discord_views NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOBYPASSRLS;
CREATE ROLE civitas_discord LOGIN PASSWORD NULL NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOBYPASSRLS;
GRANT CONNECT ON DATABASE civitas TO civitas_discord;
GRANT USAGE ON SCHEMA public TO civitas_discord, civitas_discord_views;
ALTER ROLE civitas_discord SET default_transaction_read_only = on;
ALTER ROLE civitas_discord SET statement_timeout = '10s';
GRANT SELECT ON public.world_state, public.news_settings, public.cities, public.districts, public.district_gauges, public.elections, public.national_elections, public.tv_broadcasts TO civitas_discord_views;
GRANT SELECT (id, title, summary, published_at, status, importance, event_id, election_id) ON public.news TO civitas_discord_views;
GRANT SELECT (id, title, city_id, starts_at, ends_at, status, character_id) ON public.events TO civitas_discord_views;
GRANT SELECT (id, first_name, last_name) ON public.characters TO civitas_discord_views;
GRANT SELECT (character_id, reputation, influence) ON public.social_stats TO civitas_discord_views;
GRANT EXECUTE ON FUNCTION public.game_now() TO civitas_discord_views;
CREATE POLICY discord_world ON public.world_state FOR SELECT TO civitas_discord_views USING (true);
CREATE POLICY discord_settings ON public.news_settings FOR SELECT TO civitas_discord_views USING (true);
CREATE POLICY discord_cities ON public.cities FOR SELECT TO civitas_discord_views USING (true);
CREATE POLICY discord_districts ON public.districts FOR SELECT TO civitas_discord_views USING (true);
CREATE POLICY discord_gauges ON public.district_gauges FOR SELECT TO civitas_discord_views USING (true);
CREATE POLICY discord_municipal ON public.elections FOR SELECT TO civitas_discord_views USING (true);
CREATE POLICY discord_national ON public.national_elections FOR SELECT TO civitas_discord_views USING (true);
CREATE POLICY discord_tv ON public.tv_broadcasts FOR SELECT TO civitas_discord_views USING (created_at <= public.game_now());
CREATE POLICY discord_news ON public.news FOR SELECT TO civitas_discord_views USING (status IN ('published','archived') AND published_at <= public.game_now());
CREATE POLICY discord_events ON public.events FOR SELECT TO civitas_discord_views USING (character_id IS NULL AND status='published' AND starts_at <= public.game_now());
CREATE POLICY discord_names ON public.characters FOR SELECT TO civitas_discord_views USING (true);
CREATE POLICY discord_social_scores ON public.social_stats FOR SELECT TO civitas_discord_views USING (true);

CREATE VIEW public.discord_clock WITH (security_barrier=true) AS SELECT public.game_now() AS world_now, time_speed AS speed FROM public.world_state LIMIT 1;
CREATE VIEW public.discord_events WITH (security_barrier=true) AS
 SELECT e.title, c.name AS city, e.starts_at FROM public.events e JOIN public.cities c ON c.id=e.city_id
 WHERE e.character_id IS NULL AND e.status='published' AND e.starts_at<=public.game_now() AND (e.ends_at IS NULL OR e.ends_at>public.game_now());
CREATE VIEW public.discord_districts WITH (security_barrier=true) AS
 SELECT c.name AS city, d.name AS district,
 max(g.value) FILTER (WHERE g.gauge='cadre') AS cadre,
 max(g.value) FILTER (WHERE g.gauge='tranquillite') AS tranquillite,
 max(g.value) FILTER (WHERE g.gauge='animation') AS animation
 FROM public.district_gauges g JOIN public.districts d ON d.id=g.district_id JOIN public.cities c ON c.id=d.city_id GROUP BY c.name,d.id,d.name;
CREATE VIEW public.discord_elections WITH (security_barrier=true) AS
 SELECT name AS label, CASE status WHEN 'preparation' THEN 'Préparation' WHEN 'candidacies' THEN 'Candidatures' WHEN 'campaign' THEN 'Campagne' WHEN 'vote' THEN 'Vote' WHEN 'counting' THEN 'Dépouillement' ELSE 'Résultats enregistrés' END AS stage, vote_starts_at AS vote_at
 FROM public.elections WHERE status<>'completed'
 UNION ALL SELECT name, CASE status WHEN 'scheduled' THEN 'Préparation' WHEN 'candidacies' THEN 'Candidatures' WHEN 'frozen' THEN 'Candidatures closes' WHEN 'vote' THEN 'Vote' ELSE status END, vote_at
 FROM public.national_elections WHERE status NOT IN ('completed','cancelled');
-- Pas de fortune sur Discord : l'accord d'affichage dans le jeu n'est pas étendu implicitement.
CREATE VIEW public.discord_rankings WITH (security_barrier=true) AS
 SELECT category, label, score FROM (
 SELECT s.category, c.first_name || ' ' || c.last_name AS label, s.score,
 row_number() OVER (PARTITION BY s.category ORDER BY s.score DESC, c.id) AS rank
 FROM public.social_stats st JOIN public.characters c ON c.id=st.character_id
 CROSS JOIN LATERAL (VALUES ('Réputation',st.reputation::bigint), ('Influence',st.influence::bigint)) s(category,score)
 ) r WHERE rank<=5;
CREATE VIEW public.discord_feed WITH (security_barrier=true) AS
 SELECT 'news:'||n.id::text AS post_key, CASE WHEN n.election_id IS NOT NULL THEN 'election' ELSE 'news' END AS kind,
 n.title, n.summary, n.published_at
 FROM public.news n LEFT JOIN public.events e ON e.id=n.event_id
 WHERE n.status IN ('published','archived') AND n.published_at<=public.game_now()
 AND n.published_at>public.game_now()-interval '7 days'
 AND (n.event_id IS NULL OR (e.id IS NOT NULL AND e.character_id IS NULL))
 AND (n.election_id IS NOT NULL OR n.importance >= (SELECT important_threshold FROM public.news_settings WHERE id=1))
 UNION ALL SELECT 'tv:'||t.id::text, 'tv', 'JT CIVITAS — '||t.broadcast_date::text,
 'Édition nationale enregistrée dans le jeu.', t.created_at
 FROM public.tv_broadcasts t WHERE t.scope='national' AND t.created_at<=public.game_now() AND t.created_at>public.game_now()-interval '7 days';

-- PostgreSQL exige CREATE sur le schéma pour le transfert de propriété.
GRANT CREATE ON SCHEMA public TO civitas_discord_views;
ALTER VIEW public.discord_clock OWNER TO civitas_discord_views;
ALTER VIEW public.discord_events OWNER TO civitas_discord_views;
ALTER VIEW public.discord_districts OWNER TO civitas_discord_views;
ALTER VIEW public.discord_elections OWNER TO civitas_discord_views;
ALTER VIEW public.discord_rankings OWNER TO civitas_discord_views;
ALTER VIEW public.discord_feed OWNER TO civitas_discord_views;
REVOKE CREATE ON SCHEMA public FROM civitas_discord_views;
REVOKE ALL ON public.discord_clock, public.discord_events, public.discord_districts, public.discord_elections, public.discord_rankings, public.discord_feed FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.discord_clock, public.discord_events, public.discord_districts, public.discord_elections, public.discord_rankings, public.discord_feed TO civitas_discord;
-- Aucun rôle applicatif n'est attribué au compte du bot. Vérifier aussi les droits
-- historiques accordés à PUBLIC sur les fonctions du VPS avant mise en service.
COMMIT;