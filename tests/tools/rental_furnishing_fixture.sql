-- Base jetable après la fixture 0089 uniquement. Jamais sur le VPS.
CREATE TABLE public.housing_leases(id uuid PRIMARY KEY,character_id uuid REFERENCES public.characters(id),property_id text REFERENCES public.economy_catalog(id),kind text,status text,ended_at timestamptz,title text,monthly integer,deposit integer);
GRANT SELECT ON public.housing_leases TO authenticated;
ALTER TABLE public.housing_leases ENABLE ROW LEVEL SECURITY;
CREATE POLICY lease_private ON public.housing_leases FOR SELECT TO authenticated USING(EXISTS(SELECT 1 FROM public.characters c WHERE c.id=character_id AND c.user_id=auth.uid()));
INSERT INTO public.housing_leases VALUES
('40000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000001','home','location','actif',null,'Maison louée',700,700),
('40000000-0000-0000-0000-000000000002','00000000-0000-0000-0000-000000000002',null,'location','actif',null,'Chambre louée',300,300);