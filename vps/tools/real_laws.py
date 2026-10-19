# Génère vps/migrations/0055_real_french_laws.sql à partir de la bibliothèque ci-dessous.
# Effets : h logement, e emploi, t transport, v environnement, s sécurité, p services, c commerce, u culture, f satisfaction
# Étiquettes politiques : S social, L libéral, E écologie, A autorité, P progrès société, C consensus
import json, pathlib

K = {"h": "housing", "e": "employment", "t": "transport", "v": "environment", "s": "safety", "p": "services", "c": "commerce", "u": "culture", "f": "satisfaction"}

V = "vigueur"; R = "reforme"
LAWS = [
# --- Lois en vigueur (le député propose de les renforcer) ---
(V,"Loi SRU","Loi n° 2000-1208","Logement","Impose 25 % de logements sociaux dans les grandes communes.","h5 f1 c-1","S"),
(V,"Loi DALO","Loi n° 2007-290","Logement","Droit au logement opposable : l'État doit reloger les personnes prioritaires.","h4 p2 f1","S"),
(V,"Loi ALUR","Loi n° 2014-366","Logement","Encadre les loyers et protège les locataires.","h4 f1 c-2","S"),
(V,"Loi ELAN","Loi n° 2018-1021","Logement","Simplifie la construction et crée le bail mobilité.","h4 e1 v-1","L"),
(V,"Loi Climat et résilience","Loi n° 2021-1104","Environnement","Interdit progressivement la location des passoires thermiques et limite l'artificialisation.","v6 h-1 c-1","E"),
(V,"Loi de transition énergétique","Loi n° 2015-992","Énergie","Fixe la baisse des énergies fossiles et le développement des renouvelables.","v5 e1 c-1","E"),
(V,"Loi Énergie-climat","Loi n° 2019-1147","Énergie","Vise la neutralité carbone en 2050.","v5 c-1","E"),
(V,"Loi AGEC (anti-gaspillage)","Loi n° 2020-105","Environnement","Interdit la destruction des invendus et réduit le plastique jetable.","v4 c-1 f1","E"),
(V,"Loi Évin","Loi n° 91-32","Santé","Encadre la publicité pour l'alcool et le tabac.","p2 s1 c-2","A"),
(V,"Loi Kouchner (droits des malades)","Loi n° 2002-303","Santé","Garantit l'accès au dossier médical et le consentement du patient.","p4 f1","C"),
(V,"Loi Claeys-Leonetti","Loi n° 2016-87","Santé","Encadre la fin de vie et la sédation profonde.","p3 f1","C"),
(V,"Loi Veil (IVG)","Loi n° 75-17","Société","Autorise l'interruption volontaire de grossesse.","p3 f2","P"),
(V,"Mariage pour tous","Loi n° 2013-404","Société","Ouvre le mariage et l'adoption aux couples de même sexe.","f2 u1","P"),
(V,"Loi bioéthique (PMA pour toutes)","Loi n° 2021-1017","Société","Ouvre la procréation médicalement assistée à toutes les femmes.","p2 f1","P"),
(V,"PACS","Loi n° 99-944","Société","Crée le pacte civil de solidarité.","f2","P"),
(V,"Loi de 1905 (laïcité)","Loi du 9 décembre 1905","Institutions","Sépare les Églises et l'État.","p1 f1 u1","C"),
(V,"Loi confortant les principes républicains","Loi n° 2021-1109","Institutions","Renforce le contrôle des associations et la neutralité du service public.","s3 f-1","A"),
(V,"Loi Toubon","Loi n° 94-665","Culture","Impose l'usage du français dans le travail, la publicité et les services publics.","u3","A"),
(V,"Loi sur le prix unique du livre","Loi n° 81-766 (Lang)","Culture","Fixe un prix unique pour protéger les librairies.","u4 c1","C"),
(V,"Loi Hadopi","Loi n° 2009-669","Numérique","Lutte contre le téléchargement illégal.","u2 f-1","A"),
(V,"Loi pour une République numérique","Loi n° 2016-1321","Numérique","Open data, neutralité du net et droit à la mort numérique.","p2 c1","C"),
(V,"Loi Informatique et libertés","Loi n° 78-17","Numérique","Protège les données personnelles et crée la CNIL.","p2 f1","C"),
(V,"Loi Aubry (35 heures)","Loi n° 2000-37","Travail","Fixe la durée légale du travail à 35 heures par semaine.","e2 f2 c-2","S"),
(V,"Loi El Khomri (Travail)","Loi n° 2016-1088","Travail","Donne la priorité aux accords d'entreprise.","e3 c2 f-2","L"),
(V,"Ordonnances Travail","Ordonnances de 2017","Travail","Plafonne les indemnités prud'homales et fusionne les instances du personnel.","e3 c3 f-2","L"),
(V,"Loi Avenir professionnel","Loi n° 2018-771","Travail","Réforme l'apprentissage et le compte personnel de formation.","e4 p1","C"),
(V,"Loi Macron (croissance)","Loi n° 2015-990","Économie","Libéralise les cars, ouvre les commerces le dimanche.","c4 t2 e2 f-1","L"),
(V,"Loi PACTE","Loi n° 2019-486","Économie","Simplifie la création d'entreprise et développe l'épargne salariale.","c4 e2","L"),
(V,"Loi Hamon (consommation)","Loi n° 2014-344","Économie","Crée l'action de groupe et facilite la résiliation des contrats.","f2 c-1","S"),
(V,"Loi EGalim","Loi n° 2018-938","Agriculture","Mieux rémunérer les agriculteurs et plus de bio à la cantine.","e2 v2 c-1","C"),
(V,"Loi Sapin 2 (transparence)","Loi n° 2016-1691","Institutions","Protège les lanceurs d'alerte et lutte contre la corruption.","p2 f2","C"),
(V,"Lois sur la transparence de la vie publique","Lois de 2013","Institutions","Les élus déclarent leur patrimoine et leurs intérêts.","f3","C"),
(V,"Loi sur le non-cumul des mandats","Loi organique n° 2014-125","Institutions","Interdit à un parlementaire d'être aussi maire.","f2 p1","C"),
(V,"Loi sur la parité","Loi n° 2000-493","Institutions","Impose l'égalité femmes-hommes sur les listes électorales.","f2","P"),
(V,"Loi NOTRe","Loi n° 2015-991","Institutions","Redécoupe les régions et répartit les compétences locales.","p2 f-1","C"),
(V,"Loi Engagement et proximité","Loi n° 2019-1461","Institutions","Renforce le rôle des maires.","p2 f1","C"),
(V,"Loi d'orientation des mobilités","Loi n° 2019-1428","Transports","Favorise le vélo, le covoiturage et les transports à la demande.","t5 v2","E"),
(V,"Pacte ferroviaire","Loi n° 2018-515","Transports","Ouvre le rail à la concurrence et met fin au statut de cheminot.","t3 c2 f-2","L"),
(V,"Loi Littoral","Loi n° 86-2","Environnement","Limite les constructions en bord de mer.","v4 h-1 c-1","E"),
(V,"Loi Montagne","Loi n° 85-30","Environnement","Protège et développe les territoires de montagne.","v3 e1","C"),
(V,"Loi Biodiversité","Loi n° 2016-1087","Environnement","Crée l'Office de la biodiversité et interdit certains pesticides.","v5 c-1","E"),
(V,"Loi Sécurité globale","Loi n° 2021-646","Sécurité","Renforce les polices municipales et encadre l'usage des drones.","s5 f-1","A"),
(V,"Loi renseignement","Loi n° 2015-912","Sécurité","Encadre les techniques de surveillance des services de renseignement.","s4 f-1","A"),
(V,"Loi SILT (antiterrorisme)","Loi n° 2017-1510","Sécurité","Inscrit des mesures de l'état d'urgence dans le droit commun.","s5 f-1","A"),
(V,"Loi Asile et immigration","Loi n° 2018-778","Sécurité","Réduit les délais d'asile et allonge la rétention.","s3 f-1","A"),
(V,"Loi Immigration","Loi n° 2024-42","Sécurité","Durcit certaines conditions de séjour et facilite les expulsions.","s3 e1 f-1","A"),
(V,"Loi Dati (peines planchers)","Loi n° 2007-1198","Justice","Fixe des peines minimales pour les récidivistes.","s3 p-1","A"),
(V,"Loi de programmation de la justice","Loi n° 2019-222","Justice","Numérise la procédure et crée de nouvelles places de prison.","p3 s2","C"),
(V,"Loi Badinter (abolition)","Loi n° 81-908","Justice","Abolit la peine de mort.","f1","P"),
(V,"Loi Gayssot","Loi n° 90-615","Justice","Réprime les propos racistes et négationnistes.","f1 s1","P"),
(V,"Loi handicap","Loi n° 2005-102","Social","Accessibilité des lieux publics et droit à compensation.","p4 t1 f1","S"),
(V,"Loi sur la refondation de l'école","Loi n° 2013-595","Éducation","Priorité au primaire et création de postes d'enseignants.","p4 e1","S"),
(V,"Loi pour une école de la confiance","Loi n° 2019-791","Éducation","Instruction obligatoire dès 3 ans.","p4 f1","C"),
(V,"Loi ORE (Parcoursup)","Loi n° 2018-166","Éducation","Crée la plateforme d'accès à l'université.","p2 f-1","L"),
(V,"Loi Fioraso (universités)","Loi n° 2013-660","Éducation","Organise l'enseignement supérieur et la recherche.","p3 e1","C"),
(V,"Loi RSA","Loi n° 2008-1249","Social","Crée le revenu de solidarité active.","f3 e1","S"),
(V,"Couverture maladie universelle","Loi n° 99-641","Santé","Assure une couverture santé à tous les résidents.","p4 f2","S"),
(V,"Loi Ma santé 2022","Loi n° 2019-774","Santé","Supprime le numerus clausus et crée des hôpitaux de proximité.","p4 e1","C"),
(V,"Réforme des retraites 2023","Loi n° 2023-270","Retraites","Recule l'âge légal de départ à 64 ans.","e2 c2 f-3","L"),
(V,"Loi Grenelle II","Loi n° 2010-788","Environnement","Normes énergétiques des bâtiments et trames vertes.","v4 h1","E"),
# --- Grandes réformes débattues ---
(R,"Retour de la retraite à 62 ans","Proposition débattue","Retraites","Abroger le recul de l'âge légal à 64 ans.","f4 e-1 c-2","S"),
(R,"Hausse du SMIC à 1 600 € net","Proposition débattue","Travail","Augmenter fortement le salaire minimum.","f4 c-3 e-1","S"),
(R,"Semaine de 4 jours","Proposition débattue","Travail","Travailler 32 heures sans baisse de salaire.","f3 e1 c-2","S"),
(R,"Revenu universel","Proposition débattue","Social","Verser un revenu de base à chaque adulte.","f4 c1 e-1","S"),
(R,"Rétablir l'impôt sur la fortune","Proposition débattue","Fiscalité","Remplacer l'impôt sur la fortune immobilière par un ISF.","p3 f2 c-2","S"),
(R,"Baisse des impôts de production","Proposition débattue","Fiscalité","Réduire les taxes payées par les entreprises.","c4 e3 p-2","L"),
(R,"Suppression des droits de succession modestes","Proposition débattue","Fiscalité","Exonérer les héritages jusqu'à 300 000 €.","f2 p-2","L"),
(R,"TVA à 0 % sur les produits de première nécessité","Proposition débattue","Fiscalité","Supprimer la TVA sur les produits essentiels.","f3 c2 p-2","S"),
(R,"Taxe sur les superprofits","Proposition débattue","Fiscalité","Taxer les bénéfices exceptionnels des grandes entreprises.","p3 c-2","S"),
(R,"Encadrement des loyers partout","Proposition débattue","Logement","Étendre l'encadrement des loyers à toutes les villes.","h4 f2 c-2","S"),
(R,"Réquisition des logements vacants","Proposition débattue","Logement","Mobiliser les logements vides depuis longtemps.","h5 f1 c-2","S"),
(R,"Choc de construction","Proposition débattue","Logement","Alléger les normes pour construire massivement.","h5 e2 v-3","L"),
(R,"Rénovation thermique obligatoire","Proposition débattue","Logement","Aider et obliger la rénovation des logements.","v5 h2 e2 c-1","E"),
(R,"Sortie du nucléaire","Proposition débattue","Énergie","Fermer progressivement les centrales nucléaires.","v2 e-2 c-2","E"),
(R,"Relance du nucléaire (nouveaux EPR)","Proposition débattue","Énergie","Construire de nouveaux réacteurs.","e3 v1 c2","L"),
(R,"Interdiction du glyphosate","Proposition débattue","Agriculture","Interdire cet herbicide.","v4 e-1","E"),
(R,"Gratuité des transports en commun","Proposition débattue","Transports","Rendre les bus et trams gratuits.","t5 v2 p-1","E"),
(R,"Interdiction des vols intérieurs courts","Proposition débattue","Transports","Supprimer les vols remplaçables par le train.","v3 t-1 c-1","E"),
(R,"Plan vélo national","Proposition débattue","Transports","Financer des pistes cyclables partout.","t3 v3","E"),
(R,"Abaissement de la vitesse à 110 km/h","Proposition débattue","Transports","Réduire la vitesse sur autoroute.","v2 s1 f-2","E"),
(R,"Légalisation du cannabis","Proposition débattue","Société","Encadrer la vente du cannabis.","c2 s1 f1","P"),
(R,"Aide active à mourir","Proposition débattue","Santé","Autoriser l'aide à mourir sous conditions.","p2 f1","P"),
(R,"Constitutionnalisation de l'IVG","Révision de 2024","Société","Inscrire la liberté d'avorter dans la Constitution.","f2","P"),
(R,"Droit de vote des étrangers aux élections locales","Proposition débattue","Institutions","Les étrangers résidents votent aux municipales.","f1 u1","P"),
(R,"Vote obligatoire","Proposition débattue","Institutions","Rendre le vote obligatoire.","f-1 p1","A"),
(R,"Proportionnelle aux législatives","Proposition débattue","Institutions","Élire les députés à la proportionnelle.","f2","C"),
(R,"Référendum d'initiative citoyenne","Proposition débattue","Institutions","Les citoyens peuvent déclencher un référendum.","f3","S"),
(R,"Uniforme à l'école","Proposition débattue","Éducation","Imposer une tenue unique en classe.","s1 f-1","A"),
(R,"Gratuité de la cantine scolaire","Proposition débattue","Éducation","Repas gratuits pour tous les élèves.","p3 f2","S"),
(R,"Service national universel obligatoire","Proposition débattue","Société","Un mois de service pour tous les jeunes.","s2 p1 f-1","A"),
(R,"Perpétuité réelle pour les terroristes","Proposition débattue","Justice","Aucune libération possible.","s3","A"),
(R,"Plus de policiers de proximité","Proposition débattue","Sécurité","Recruter 10 000 policiers de terrain.","s5 p1","A"),
(R,"Quotas d'immigration","Proposition débattue","Sécurité","Fixer chaque année un nombre d'entrées.","s2 e-1 f-1","A"),
(R,"Régularisation des travailleurs sans papiers","Proposition débattue","Travail","Régulariser dans les métiers en tension.","e3 c2","P"),
(R,"Allocation autonomie jeunes","Proposition débattue","Social","Une aide mensuelle pour les 18-25 ans.","f3 p1","S"),
(R,"Contre les déserts médicaux","Proposition débattue","Santé","Obliger les jeunes médecins à s'installer où il en manque.","p5 f1","S"),
(R,"Interdiction des réseaux sociaux avant 15 ans","Proposition débattue","Numérique","Majorité numérique fixée à 15 ans.","s1 u1 f-1","A"),
(R,"Taxe carbone aux frontières","Proposition débattue","Environnement","Taxer les importations polluantes.","v3 e1 c-1","E"),
(R,"Réduction du nombre de parlementaires","Proposition débattue","Institutions","Diminuer d'un tiers les députés et sénateurs.","f2 p-1","L"),
(R,"Assurance chômage plus stricte","Proposition débattue","Travail","Raccourcir la durée d'indemnisation.","e2 c1 f-3","L"),
]
assert len(LAWS) == 100, len(LAWS)

def vote(party, tags):
    if "C" in tags: return "yes"
    t = set(tags)
    if party == "avenir":  return "yes" if t & {"S","P","E"} else "no"
    if party == "init":    return "yes" if t & {"L","A"} else "no"
    if party == "terr":    return "yes" if t & {"E","P","S"} else "no"
    if party == "concorde":return "yes" if t & {"L","E","P"} else "no"
    return "yes" if t & {"A","L"} else "no"  # divers

PARTIES = [("7a7a0000-0000-4000-8000-000000000001","avenir"),("7a7a0000-0000-4000-8000-000000000002","init"),
           ("7a7a0000-0000-4000-8000-000000000003","terr"),("7a7a0000-0000-4000-8000-000000000004","concorde"),("divers","divers")]

def q(s): return "'" + s.replace("'", "''") + "'"

rows, pos = [], []
for i, (kind, title, ref, cat, summary, eff, tags) in enumerate(LAWS, 1):
    lid = f"fr-{i:03d}"
    effects = {K[x[0]]: int(x[1:]) for x in eff.split()}
    shown = f"Renforcer : {title}" if kind == V else title
    assert 3 <= len(shown) <= 120
    rows.append(f"({q(lid)},{q(shown)},{q(cat)},{q(json.dumps(effects))}::jsonb,12000,1440,'{{}}'::jsonb,true,{q(kind)},{q(ref)},{q(summary)})")
    for pid, pk in PARTIES: pos.append(f"({q(lid)},{q(pid)},{q(vote(pk, tags))})")

sql = f"""-- CIVITAS – VRAIES LOIS FRANÇAISES : 60 lois en vigueur + 40 grandes réformes débattues.
-- Tout ou rien : la moindre erreur annule l'ensemble.
--   docker exec -i civitas-db psql -v ON_ERROR_STOP=1 -U postgres -d civitas < vps/migrations/0055_real_french_laws.sql
-- Touche : national_law_templates (3 colonnes ajoutées, 100 lignes ajoutées, 5 lois fictives désactivées
-- mais conservées pour l'historique), national_law_positions (500 positions de vote ajoutées).
-- Aucune fonction modifiée. Coût 12 000 et délai 24 h inchangés (règle existante).
BEGIN;

ALTER TABLE public.national_law_templates
  ADD COLUMN IF NOT EXISTS kind text NOT NULL DEFAULT 'fictive' CHECK (kind IN ('fictive','vigueur','reforme')),
  ADD COLUMN IF NOT EXISTS reference text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS summary text NOT NULL DEFAULT '';

UPDATE public.national_law_templates SET active = false WHERE id IN ('law-01','law-02','law-03','law-04','law-05');

INSERT INTO public.national_law_templates (id,title,category,effects,cost,delay_minutes,budget_allocations,active,kind,reference,summary) VALUES
{",\n".join(rows)};

INSERT INTO public.national_law_positions (template_id, party_key, vote) VALUES
{",\n".join(pos)};

DO $$ BEGIN
 IF (SELECT count(*) FROM public.national_law_templates WHERE active) <> 100 THEN RAISE EXCEPTION 'Contrôle : 100 lois actives attendues'; END IF;
 IF (SELECT count(*) FROM public.national_law_templates WHERE active AND kind='vigueur') <> 60 THEN RAISE EXCEPTION 'Contrôle : 60 lois en vigueur attendues'; END IF;
 IF (SELECT count(*) FROM public.national_law_positions WHERE template_id LIKE 'fr-%') <> 500 THEN RAISE EXCEPTION 'Contrôle : 500 positions attendues'; END IF;
 IF (SELECT count(*) FROM public.national_law_templates WHERE id LIKE 'law-0%') <> 5 THEN RAISE EXCEPTION 'Contrôle : les 5 lois fictives doivent rester dans l''historique'; END IF;
END $$;

COMMIT;
"""
pathlib.Path(__file__).resolve().parents[1].joinpath("migrations/0055_real_french_laws.sql").write_text(sql)
print("ok", len(rows), len(pos))
