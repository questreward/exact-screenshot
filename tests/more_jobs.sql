\set ON_ERROR_STOP on
\ir tools/more_jobs_fixture.sql
\ir ../vps/migrations/0109_more_jobs.sql
BEGIN;
DO $$
DECLARE cid uuid; jid uuid; c public.characters; j public.jobs;
BEGIN
 IF (SELECT count(*) FROM jobs)<>54 THEN RAISE EXCEPTION 'Expected 27 jobs per city'; END IF;
 IF (SELECT salary FROM jobs WHERE title='Médecin' LIMIT 1)<>4500 OR (SELECT salary FROM jobs WHERE title='Facteur' LIMIT 1)<>1600 OR (SELECT salary FROM jobs WHERE title='Caissier' LIMIT 1)<>1450 THEN RAISE EXCEPTION 'Salary'; END IF;
 INSERT INTO characters(city_id,age,path_id) VALUES('paris',30,'young_worker') RETURNING id INTO cid;
 SELECT * INTO c FROM characters WHERE id=cid;
 SELECT * INTO j FROM jobs WHERE title='Médecin' AND city_id='paris'; jid:=j.id;
 IF public.career_job_eligible(c,j) IS NULL THEN RAISE EXCEPTION 'Diploma bypass'; END IF;
 BEGIN
  INSERT INTO employments(character_id,job_id,started_at) VALUES(cid,jid,now());
  RAISE EXCEPTION 'Employment bypass';
 EXCEPTION WHEN raise_exception THEN IF SQLERRM='Employment bypass' THEN RAISE; END IF; END;
 BEGIN
  INSERT INTO job_applications(character_id,job_id,applied_at,response_at) VALUES(cid,jid,now(),now());
  RAISE EXCEPTION 'Application bypass';
 EXCEPTION WHEN raise_exception THEN IF SQLERRM='Application bypass' THEN RAISE; END IF; END;
 INSERT INTO student_ledger(character_id,key,kind,label) VALUES(cid,'diplome:job-medecine','diplome','Diplôme');
 IF public.career_job_eligible(c,j) IS NOT NULL THEN RAISE EXCEPTION 'Diploma not recognized'; END IF;
 INSERT INTO employments(character_id,job_id,started_at) VALUES(cid,jid,now()); DELETE FROM employments;
 SELECT id INTO jid FROM jobs WHERE title='Chauffeur de bus' AND city_id='paris';
 IF public.more_jobs_requirement(cid,jid) IS NULL THEN RAISE EXCEPTION 'Licence bypass'; END IF;
 INSERT INTO driving_licenses VALUES(cid,now());
 IF public.more_jobs_requirement(cid,jid) IS NOT NULL THEN RAISE EXCEPTION 'Licence not recognized'; END IF;
 UPDATE characters SET age=17 WHERE id=cid;
 IF public.more_jobs_requirement(cid,jid) IS NULL THEN RAISE EXCEPTION 'Age bypass'; END IF;
 IF NOT (SELECT ARRAY['banque','mairie','universite','cafe','gare','station'] <@ allowed_kinds FROM life_rules WHERE id='work') THEN RAISE EXCEPTION 'Work locations'; END IF;
END $$;
ROLLBACK;
