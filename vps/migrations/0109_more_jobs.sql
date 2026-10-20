-- 0109: extends jobs, interviews, applications, employments and existing work pay.
-- No locations created: health/social/justice/postal -> administration;
-- schools -> universite, workshops -> entreprise, pharmacy -> commerce.
-- Tips and state_pay indexation are display-only; existing frozen work rewards unchanged.
BEGIN;
CREATE TABLE public.more_jobs_catalog (
 title text PRIMARY KEY, salary integer NOT NULL CHECK(salary>0), category text NOT NULL,
 location_kind text NOT NULL, program_id text REFERENCES public.higher_ed_programs(id),
 needs_license boolean NOT NULL DEFAULT false, missions text[] NOT NULL CHECK(cardinality(missions) BETWEEN 2 AND 3)
);
ALTER TABLE public.more_jobs_catalog ENABLE ROW LEVEL SECURITY;
CREATE POLICY more_jobs_catalog_read ON public.more_jobs_catalog FOR SELECT TO authenticated USING(true);
GRANT SELECT ON public.more_jobs_catalog TO authenticated;
GRANT ALL ON public.more_jobs_catalog TO service_role;
INSERT INTO public.study_fields(id,name,description,skill) VALUES
 ('health','Santé et social','Soins et accompagnement.','Pratique sanitaire'),
 ('education','Éducation','Pédagogie et enseignement.','Pédagogie');
INSERT INTO public.higher_ed_programs VALUES ('job-soins','École','Diplôme d’aide-soignant','health',1,10,'Diplôme d’aide-soignant');
INSERT INTO public.higher_ed_programs VALUES ('job-infirmier','École','Diplôme d’État infirmier','health',3,10,'Diplôme d’État infirmier');
INSERT INTO public.higher_ed_programs VALUES ('job-pharmacie','École','Diplôme de pharmacien','health',6,10,'Diplôme de pharmacien');
INSERT INTO public.higher_ed_programs VALUES ('job-medecine','École','Diplôme de médecin','health',10,10,'Diplôme de médecin');
INSERT INTO public.higher_ed_programs VALUES ('job-social','École','Diplôme d’assistant social','health',3,10,'Diplôme d’assistant social');
INSERT INTO public.higher_ed_programs VALUES ('job-enseignement','École','Diplôme d’enseignement','education',5,10,'Diplôme d’enseignement');
INSERT INTO public.higher_ed_programs VALUES ('job-avocat','École','Diplôme d’avocat et examen professionnel','law',7,10,'Diplôme d’avocat et examen professionnel');
INSERT INTO public.more_jobs_catalog VALUES ('Conseiller bancaire',1900,'Banque / assurance','banque',NULL,false,ARRAY['Accueillir les clients','Préparer un dossier de financement']);
INSERT INTO public.more_jobs_catalog VALUES ('Guichetier',1600,'Banque / assurance','banque',NULL,false,ARRAY['Vérifier les opérations','Orienter les clients']);
INSERT INTO public.more_jobs_catalog VALUES ('Conseiller en assurance',1850,'Banque / assurance','banque',NULL,false,ARRAY['Analyser les besoins','Expliquer les garanties']);
INSERT INTO public.more_jobs_catalog VALUES ('Agent de mairie',1650,'Fonction publique','mairie',NULL,false,ARRAY['Accueillir les habitants','Classer les dossiers']);
INSERT INTO public.more_jobs_catalog VALUES ('Agent des impôts',1900,'Fonction publique','administration',NULL,false,ARRAY['Vérifier les déclarations','Répondre aux contribuables']);
INSERT INTO public.more_jobs_catalog VALUES ('Guichet de préfecture',1650,'Fonction publique','administration',NULL,false,ARRAY['Contrôler les pièces','Recevoir les usagers']);
INSERT INTO public.more_jobs_catalog VALUES ('Facteur',1600,'Fonction publique','administration',NULL,false,ARRAY['Trier le courrier','Effectuer la tournée']);
INSERT INTO public.more_jobs_catalog VALUES ('Conseiller Espace Emploi',1850,'Fonction publique','administration',NULL,false,ARRAY['Relire les CV','Préparer les entretiens']);
INSERT INTO public.more_jobs_catalog VALUES ('Aide-soignant',1750,'Santé / social','administration','job-soins',false,ARRAY['Accompagner les patients','Préparer les soins']);
INSERT INTO public.more_jobs_catalog VALUES ('Infirmier',2100,'Santé / social','administration','job-infirmier',false,ARRAY['Réaliser les soins','Transmettre les observations']);
INSERT INTO public.more_jobs_catalog VALUES ('Pharmacien',3200,'Santé / social','commerce','job-pharmacie',false,ARRAY['Vérifier les ordonnances','Conseiller les patients']);
INSERT INTO public.more_jobs_catalog VALUES ('Médecin',4500,'Santé / social','administration','job-medecine',false,ARRAY['Examiner les patients','Assurer le suivi médical']);
INSERT INTO public.more_jobs_catalog VALUES ('Assistant social',1900,'Santé / social','administration','job-social',false,ARRAY['Évaluer les besoins','Accompagner les démarches']);
INSERT INTO public.more_jobs_catalog VALUES ('Professeur des écoles',2000,'Éducation','universite','job-enseignement',false,ARRAY['Préparer les leçons','Accompagner les élèves']);
INSERT INTO public.more_jobs_catalog VALUES ('Professeur de lycée',2200,'Éducation','universite','job-enseignement',false,ARRAY['Préparer les cours','Corriger les copies']);
INSERT INTO public.more_jobs_catalog VALUES ('Surveillant',1450,'Éducation','universite',NULL,false,ARRAY['Surveiller les récréations','Suivre les absences']);
INSERT INTO public.more_jobs_catalog VALUES ('Caissier',1450,'Commerce / artisanat','commerce',NULL,false,ARRAY['Encaisser les achats','Vérifier la caisse']);
INSERT INTO public.more_jobs_catalog VALUES ('Boulanger',1600,'Commerce / artisanat','commerce',NULL,false,ARRAY['Pétrir la pâte','Surveiller les cuissons']);
INSERT INTO public.more_jobs_catalog VALUES ('Serveur',1500,'Commerce / artisanat','cafe',NULL,false,ARRAY['Prendre les commandes','Préparer la salle']);
INSERT INTO public.more_jobs_catalog VALUES ('Cuisinier',1700,'Commerce / artisanat','cafe',NULL,false,ARRAY['Préparer les plats','Contrôler les stocks']);
INSERT INTO public.more_jobs_catalog VALUES ('Coiffeur',1550,'Commerce / artisanat','commerce',NULL,false,ARRAY['Conseiller une coupe','Préparer le matériel']);
INSERT INTO public.more_jobs_catalog VALUES ('Maçon',1800,'BTP / transport','entreprise',NULL,false,ARRAY['Préparer le chantier','Monter les murs']);
INSERT INTO public.more_jobs_catalog VALUES ('Électricien',1900,'BTP / transport','entreprise',NULL,false,ARRAY['Contrôler les circuits','Installer les équipements']);
INSERT INTO public.more_jobs_catalog VALUES ('Chauffeur de bus',1950,'BTP / transport','station',NULL,true,ARRAY['Contrôler le véhicule','Assurer la ligne']);
INSERT INTO public.more_jobs_catalog VALUES ('Conducteur de train',2600,'BTP / transport','gare',NULL,false,ARRAY['Vérifier les consignes','Assurer le trajet']);
INSERT INTO public.more_jobs_catalog VALUES ('Greffier',1900,'Justice','administration','lic-droit',false,ARRAY['Préparer les audiences','Tenir les dossiers']);
INSERT INTO public.more_jobs_catalog VALUES ('Avocat',3000,'Justice','administration','job-avocat',false,ARRAY['Étudier les dossiers','Préparer les plaidoiries']);
INSERT INTO public.jobs(title,city_id,salary,min_age,location_id,description,required_skill,skill_min)
SELECT c.title,ci.id,c.salary,18,l.id,array_to_string(c.missions,' · '),'',0
FROM public.cities ci CROSS JOIN public.more_jobs_catalog c
CROSS JOIN LATERAL (SELECT id FROM public.locations WHERE city_id=ci.id AND kind=c.location_kind AND district_id IS NOT NULL ORDER BY id LIMIT 1) l
WHERE NOT EXISTS(SELECT 1 FROM public.jobs j WHERE j.city_id=ci.id AND j.title=c.title);
DO $$ BEGIN
 IF EXISTS(SELECT 1 FROM public.cities ci CROSS JOIN public.more_jobs_catalog c WHERE NOT EXISTS(SELECT 1 FROM public.jobs j WHERE j.city_id=ci.id AND j.title=c.title)) THEN RAISE EXCEPTION 'Missing job location'; END IF;
END $$;
CREATE FUNCTION public.more_jobs_requirement(_cid uuid, _job uuid) RETURNS text
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
 SELECT CASE
 WHEN ch.age<j.min_age THEN 'Âge minimum : '||j.min_age||' ans'
 WHEN cfg.program_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.student_ledger sl WHERE sl.character_id=_cid AND sl.kind='diplome' AND sl.key='diplome:'||cfg.program_id) THEN 'Diplôme requis : '||(SELECT diploma FROM public.higher_ed_programs WHERE id=cfg.program_id)
 WHEN cfg.needs_license AND NOT public.has_driving_license(_cid) THEN 'Permis de conduire requis'
 ELSE NULL END
 FROM public.jobs j JOIN public.more_jobs_catalog cfg ON cfg.title=j.title JOIN public.characters ch ON ch.id=_cid WHERE j.id=_job
$$;
REVOKE ALL ON FUNCTION public.more_jobs_requirement(uuid,uuid) FROM PUBLIC;
CREATE OR REPLACE FUNCTION public.career_job_eligible(_c public.characters, _j public.jobs) RETURNS text
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT CASE
    WHEN _j.id IS NULL OR _j.city_id IS DISTINCT FROM _c.city_id OR _j.location_id IS NULL THEN 'Offre inaccessible'
    WHEN _c.path_id NOT IN ('young_worker','early_career') AND COALESCE(_c.progression->>'career_active','false') <> 'true' THEN 'Réservé aux parcours professionnels'
    WHEN _c.age < _j.min_age THEN 'Âge minimum non atteint'
    WHEN _j.economy_skill IS NOT NULL AND COALESCE((_c.progression->>_j.economy_skill)::integer, 0) < _j.economy_level THEN 'Formation requise : ' || _j.economy_skill || ' niveau ' || _j.economy_level
    WHEN EXISTS (SELECT 1 FROM public.employments WHERE character_id = _c.id AND job_id = _j.id) THEN 'C''est déjà votre emploi'
    WHEN public.more_jobs_requirement(_c.id,_j.id) IS NOT NULL THEN public.more_jobs_requirement(_c.id,_j.id)
    ELSE NULL END
$$;
-- Guard both legacy delayed applications and interview hires, including settlement rechecks.
CREATE FUNCTION public.more_jobs_guard() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE reason text;
BEGIN
 PERFORM 1 FROM public.characters WHERE id=NEW.character_id FOR UPDATE;
 reason:=public.more_jobs_requirement(NEW.character_id,NEW.job_id);
 IF reason IS NOT NULL THEN RAISE EXCEPTION '%',reason; END IF;
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.more_jobs_guard() FROM PUBLIC;
CREATE TRIGGER more_jobs_application_guard BEFORE INSERT OR UPDATE OF job_id,status ON public.job_applications FOR EACH ROW WHEN (NEW.status IN ('pending','accepted')) EXECUTE FUNCTION public.more_jobs_guard();
CREATE TRIGGER more_jobs_employment_guard BEFORE INSERT OR UPDATE OF job_id ON public.employments FOR EACH ROW EXECUTE FUNCTION public.more_jobs_guard();
-- Existing work activities must accept these real locations; do not alter other rules.
UPDATE public.life_rules SET allowed_kinds=ARRAY(SELECT DISTINCT unnest(allowed_kinds||ARRAY['banque','mairie','universite','cafe','gare','station'])) WHERE id='work';
COMMIT;
