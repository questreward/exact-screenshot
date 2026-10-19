-- PROPOSITION NON APPLIQUÉE — initialisation nationale, une seule instruction atomique.
WITH
seed_settings AS (
INSERT INTO public.national_settings(id,rules) VALUES(1,'{
 "voting_age":18,"candidate_age":18,"civic_min":20,"reputation_min":15,
 "influence_min":10,"session_minutes":60,"session_energy":10,
 "fictional_vote_unit":100,"initial_budget":100000,
 "candidacy_days":7,"frozen_days":1,"voting_days":2,"term_days":28,
 "successor_preparation_days":10,"law_cost":12000,"law_delay_minutes":1440,
 "currency":"crédits","independent_candidacies":false
}'::jsonb)
RETURNING 1
),
seed_treasury AS (
INSERT INTO public.national_treasury(id,balance) VALUES(1,100000)
RETURNING 1
),
seed_party_profiles AS (
INSERT INTO public.national_party_profiles(organization_id,simulation_weight) VALUES
('7a7a0000-0000-4000-8000-000000000001',1),
('7a7a0000-0000-4000-8000-000000000002',1),
('7a7a0000-0000-4000-8000-000000000003',1),
('7a7a0000-0000-4000-8000-000000000004',1)
RETURNING 1
),
seed_law_templates AS (
INSERT INTO public.national_law_templates(id,title,category,effects,cost,delay_minutes,budget_allocations,active) VALUES
('law-01','','','{}',12000,1440,'{}',false),
('law-02','','','{}',12000,1440,'{}',false),
('law-03','','','{}',12000,1440,'{}',false),
('law-04','','','{}',12000,1440,'{}',false),
('law-05','','','{}',12000,1440,'{}',false)
RETURNING 1
)
INSERT INTO public.national_constituencies(city_id,name) VALUES
('paris','Circonscription de Paris'),('lyon','Circonscription de Lyon'),
('marseille','Circonscription de Marseille'),('lille','Circonscription de Lille'),
('bordeaux','Circonscription de Bordeaux')
RETURNING city_id,name,seats;
