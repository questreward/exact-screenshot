# 0109 implementation report

## Files
- `vps/migrations/0109_more_jobs.sql`: atomic schema, seeds, hiring gates, work-location compatibility.
- `src/game/jobs-catalog.ts` and `.test.ts`: presentation catalogue, requirement labels, grouping and salary tests.
- `src/routes/_authenticated/_game/carriere.tsx`: grouped offers, prerequisites, daily missions and payroll caveats.
- `tests/tools/more_jobs_fixture.sql`, `tests/more_jobs.sql`: disposable PostgreSQL fixtures and assertions.
- `AGENTS.md`: one catalogue architecture rule.

## Tables and functions
New read-only configuration table: `more_jobs_catalog` (27 titles).
New internal functions: `more_jobs_requirement(uuid,uuid)` and trigger function `more_jobs_guard()`; PUBLIC execution revoked.
Existing `career_job_eligible(characters,jobs)` starts from 0075's latest definition and adds one requirement check; all existing guards preserved.
New triggers on `job_applications` and `employments` enforce gates for legacy applications and direct/interview hiring, locking the character first.
Existing data additions: `jobs` (one role per city, deterministic existing location), `study_fields` (health/education), `higher_ed_programs` (seven diploma courses).
Existing `life_rules.work.allowed_kinds` extended for actual workplaces. No payroll functions, activities, career ledger or existing salaries changed.

## Wired versus display-only
- Wired: existing jobs, delayed applications, career interviews, employments and existing work agenda/payroll; existing hiring history/ledger unchanged.
- Diploma evidence uses 0099 `student_ledger` keys, not a client flag or generic enrollment progress. New courses use existing student settlement and curriculum years (medicine: ten years). Lawyer course includes the professional exam in its existing curriculum/diploma, not a separate new exam engine.
- Minimum age: 18. Bus driving uses 0095's actual licence predicate; it does not model a separate bus-category licence.
- Missions: two per role, narrative only. Server tips are narrative only; no extra rewards.
- State pay indexation: explicitly display-only/not applied; fixed base salaries and existing frozen shift rewards remain unchanged.
- Location substitutions: health/social/justice/post -> administration; schools -> universite; workshops -> entreprise; pharmacy -> commerce. No locations created. Missing required city location aborts the entire migration.

## Verification
Fresh disposable PostgreSQL fixture passed: 54 offers across two cities; salaries, diploma rejection/acceptance, direct employment/application bypass rejection, driving licence, minimum age and work-location compatibility.
Full Vitest suite and TypeScript check run locally; no remote databases touched. User must apply the migration manually.
