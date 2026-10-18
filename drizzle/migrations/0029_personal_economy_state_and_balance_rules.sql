CREATE TABLE public.economy_settings(id integer PRIMARY KEY DEFAULT 1 CHECK(id=1),max_goals integer NOT NULL DEFAULT 8,low_balance integer NOT NULL DEFAULT 50,promotion_progress integer NOT NULL DEFAULT 100,promotion_skill text NOT NULL DEFAULT 'Communication',promotion_level integer NOT NULL DEFAULT 2,promotion_raise integer NOT NULL DEFAULT 200);
GRANT SELECT ON public.economy_settings TO authenticated; GRANT ALL ON public.economy_settings TO service_role; ALTER TABLE public.economy_settings ENABLE ROW LEVEL SECURITY; CREATE POLICY settings_read ON public.economy_settings FOR SELECT TO authenticated USING(true);
CREATE FUNCTION public.personal_economy_state() RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ DECLARE cid uuid; BEGIN cid:=public.prepare_daily_life(); RETURN jsonb_build_object(
'world_now',public.game_now(),'settings',COALESCE((SELECT to_jsonb(s) FROM public.economy_settings s WHERE id=1),'{}'),
'available',(SELECT balance FROM public.accounts WHERE character_id=cid),
'saved',COALESCE((SELECT sum(saved) FROM public.economy_goals WHERE character_id=cid AND kind='saving'),0),
'asset_value',COALESCE((SELECT sum(purchase_price) FROM public.personal_assets WHERE character_id=cid),0),
'goals',COALESCE((SELECT jsonb_agg(to_jsonb(g)||jsonb_build_object('current',CASE WHEN kind='saving' THEN saved ELSE public.economy_progress(cid,metric) END) ORDER BY created_at) FROM public.economy_goals g WHERE character_id=cid),'[]'),
'assets',COALESCE((SELECT jsonb_agg(to_jsonb(a)||jsonb_build_object('catalog',to_jsonb(ec))) FROM public.personal_assets a JOIN public.economy_catalog ec ON ec.id=a.catalog_id WHERE character_id=cid),'[]'),
'catalog',COALESCE((SELECT jsonb_agg(ec ORDER BY sort_order) FROM public.economy_catalog ec),'[]'),
'locations',COALESCE((SELECT jsonb_agg(to_jsonb(l)||jsonb_build_object('district_name',d.name)) FROM public.locations l JOIN public.districts d ON d.id=l.district_id WHERE l.city_id=(SELECT city_id FROM public.characters WHERE id=cid) AND l.accessible AND d.available),'[]'),
'budget',(SELECT to_jsonb(b) FROM public.personal_budgets b WHERE character_id=cid),
'skills',(SELECT progression FROM public.characters WHERE id=cid),
'history',COALESCE((SELECT jsonb_agg(h ORDER BY occurred_at DESC) FROM public.career_history h WHERE character_id=cid),'[]'),
'operations',COALESCE((SELECT jsonb_agg(o ORDER BY occurred_at DESC) FROM public.economy_operations o WHERE character_id=cid AND kind<>'notification'),'[]'),
'month_transactions',COALESCE((SELECT jsonb_agg(to_jsonb(tr)||jsonb_build_object('category',CASE WHEN tr.category<>'autres' THEN tr.category WHEN tr.label LIKE 'Logement%' THEN 'logement' WHEN tr.label='Manger' THEN 'alimentation' WHEN tr.label LIKE 'Transport%' THEN 'transport' ELSE 'autres' END)) FROM public.transactions tr JOIN public.accounts a ON a.id=tr.account_id WHERE a.character_id=cid AND COALESCE(tr.world_at,tr.created_at)>=date_trunc('month',public.game_now())),'[]')
); END $$; REVOKE ALL ON FUNCTION public.personal_economy_state() FROM PUBLIC; GRANT EXECUTE ON FUNCTION public.personal_economy_state() TO authenticated;
DO $$ DECLARE def text; BEGIN
SELECT pg_get_functiondef('public.personal_economy_action(text,uuid,jsonb)'::regprocedure) INTO def;
def:=replace(def,'>=8 THEN','>=(SELECT max_goals FROM public.economy_settings WHERE id=1) THEN');
def:=replace(def,'emp.progress<100','emp.progress<(SELECT promotion_progress FROM public.economy_settings WHERE id=1)');
def:=replace(def,'c.progression->>''Communication''','c.progression->>(SELECT promotion_skill FROM public.economy_settings WHERE id=1)');
def:=replace(def,'::integer,0)<2 THEN','::integer,0)<(SELECT promotion_level FROM public.economy_settings WHERE id=1) THEN');
def:=replace(def,'salary_bonus=200','salary_bonus=(SELECT promotion_raise FROM public.economy_settings WHERE id=1)');
def:=replace(def,'(j.salary+200)','(j.salary+(SELECT promotion_raise FROM public.economy_settings WHERE id=1))'); EXECUTE def;
SELECT pg_get_functiondef('public.settle_personal_economy(uuid)'::regprocedure) INTO def;
def:=replace(def,'<50 THEN','<(SELECT low_balance FROM public.economy_settings WHERE id=1) THEN'); EXECUTE def;
END $$;
COMMENT ON FUNCTION public.personal_economy_state() IS 'Owner-only real financial data; no second wallet, no municipal budget. Read settles existing agenda and exactly-once personal deadlines.';