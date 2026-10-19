"""Génère vps/migrations/0057_legislatives_base_2024.sql et public/geo/legislatives-2024.json
depuis les résultats officiels (data.gouv.fr, Ministère de l'Intérieur, législatives 30 juin / 7 juillet 2024).
Les élus sont remplacés par des personnages inventés (jamais de vrais noms)."""
import csv, json, hashlib, collections, pathlib
ROOT = pathlib.Path(__file__).resolve().parents[2]
DATA = ROOT / "vps/tools/data"

PARTIES = [  # code nuance officiel, libellé, couleur, bloc
  ("EXG","Extrême gauche","#8b0000","gauche"), ("COM","Parti communiste","#c4161c","gauche"), ("FI","La France insoumise","#cc2443","gauche"),
  ("UG","Union de la gauche (Nouveau Front populaire)","#e4003a","gauche"), ("SOC","Parti socialiste","#ff8080","gauche"), ("RDG","Radicaux de gauche","#ffb3b3","gauche"),
  ("VEC","Les Écologistes","#2e8b57","gauche"), ("ECO","Écologistes","#5bb35b","gauche"), ("DVG","Divers gauche","#f4a3a3","gauche"),
  ("REG","Régionalistes","#c9a227","autre"), ("DIV","Divers","#9e9e9e","autre"),
  ("ENS","Ensemble (majorité présidentielle)","#ffc000","centre"), ("HOR","Horizons","#2b6cb0","centre"), ("DVC","Divers centre","#ffd966","centre"), ("UDI","UDI","#00a3e0","centre"),
  ("LR","Les Républicains","#0066cc","droite"), ("DVD","Divers droite","#6fa8dc","droite"), ("DSV","Droite souverainiste","#3d5a80","droite"),
  ("UXD","Union de l'extrême droite","#4a2c7a","extreme-droite"), ("RN","Rassemblement national","#0d1b4c","extreme-droite"),
  ("REC","Reconquête","#3b2f2f","extreme-droite"), ("EXD","Extrême droite","#1a1a1a","extreme-droite"),
]
FIRST_F = "Claire Sophie Camille Julie Laura Inès Manon Chloé Emma Léa Sarah Marion Pauline Elise Nadia Aïcha Yasmina Hélène Isabelle Nathalie Céline Agnès Mathilde Lucie Anaïs Fatou Sandrine Valérie Delphine Margaux".split()
FIRST_M = "Thomas Nicolas Julien Antoine Pierre Hugo Lucas Mehdi Karim Samuel Olivier Laurent Philippe Bruno Vincent Romain Maxime Alexandre Yanis Sébastien François Benoît Damien Rachid Mamadou Arnaud Cédric Fabien Gilles Etienne".split()
LAST = "Martin Bernard Roux Fournier Girard Bonnet Dupuis Lambert Fontaine Rousseau Vincent Muller Lefèvre Faure André Mercier Blanc Guérin Boyer Garnier Chevalier François Legrand Gauthier Garcia Perrin Robin Clément Morin Nicolas Henry Roussel Mathieu Gautier Masson Marchand Duval Denis Dumont Marie Lemaire Noël Meyer Dufour Meunier Brun Blanchard Giraud Joly Rivière Lucas Brunet Gaillard Barbier Arnaud Martinez Gérard Roche Renard Schmitt Roy Leroux Colin Vidal Caron Picard Roger Fabre Aubert Lemoine Renaud Dumas Lacroix Olivier Philippe Bourgeois Pierre Benoît Rey Leclerc Payet Rolland Leclercq Guillaume Lecomte Lopez Jean Dupuy Guillot Hubert Berger Carpentier Sanchez Dupont Moulin Louis Deschamps Huet Vasseur Perez Boucher Fleury Royer Klein Jacquet Adam Paris Poirier Marty Aubry Guyot Carré Charles Renault Charpentier Ménard Maillard Baron Bertin Bailly Hervé Schneider Fernandez Le Gall Collet Léger Bouvier Julien Prévost Millet Perrot Daniel Le Roux Cousin Germain Breton Besson Langlois Rémy Le Goff Pelletier Lévêque Perrier Leblanc Barré Lebrun Marchal Weber Mallet Hamon Boulanger Jacob Monnier Michaud Rodriguez Guichard Gillet Étienne Grondin Poulain Tessier Chevallier Collin Chauvin Da Silva Bouchet Gay Lemaître Bénard Maréchal Humbert Reynaud Antoine Hoarau Perret Barthélemy Cordier Pichon Lejeune Gilbert Lamy Delaunay Pasquier Carlier Laporte".split()

def h(s): return int(hashlib.sha1(s.encode()).hexdigest(), 16)
def invented(code, sex):
    firsts = FIRST_F if sex == "FEMININ" else FIRST_M
    return f"{firsts[h(code+'f') % len(firsts)]} {LAST[h(code+'l') % len(LAST)]}"
def q(s): return "'" + str(s).replace("'", "''") + "'"
def rows(f): return list(csv.reader(open(f, encoding="utf-8-sig"), delimiter=";"))[1:]
OVERSEAS = {"971": "ZA", "972": "ZB", "973": "ZC", "974": "ZD", "975": "ZS", "976": "ZM", "986": "ZW", "987": "ZP", "988": "ZN"}
def key(dep, circ):
    num = int(circ[len(dep):]) if circ.startswith(dep) else int(circ[-2:])
    return f"{OVERSEAS.get(dep, dep.zfill(2))}{num:02d}", num

def parse(f):
    out = {}
    for r in rows(f):
        dep, depname, circ, label = r[0], r[1], r[2], r[3]
        code, num = key(dep, circ)
        cands = []
        for i in range(18, len(r) - 8, 9):
            if not r[i+1]: continue
            cands.append({"nuance": r[i+1], "sex": r[i+4], "votes": int(r[i+5] or 0), "elected": r[i+8].strip().upper() in ("ELU", "QUALIF T2") and r[i+8].strip().upper() == "ELU"})
        out[code] = {"dep": OVERSEAS.get(dep, dep.zfill(2)), "depname": depname, "num": num, "label": label, "registered": int(r[4]), "expressed": int(r[9]), "cands": cands}
    return out

t1 = parse(DATA / "legislatives2024_t1.csv"); t2 = parse(DATA / "legislatives2024_t2.csv")
assert len(t1) == 577, len(t1)
codes = {p[0] for p in PARTIES}
geo = json.load(open(ROOT / "public/geo/circonscriptions.json"))
on_map = {f["properties"]["codeCirconscription"] for f in geo["features"]}

seats, baseline, mapjson = [], [], {}
for code in sorted(t1):
    c1 = t1[code]; c2 = t2.get(code)
    final = c2 if c2 else c1
    winner = next((c for c in final["cands"] if c["elected"]), None) or max(final["cands"], key=lambda c: c["votes"])
    assert winner["nuance"] in codes, winner["nuance"]
    name = invented(code, winner["sex"])
    seats.append((code, c1["dep"], c1["depname"], c1["num"], c1["label"], c1["registered"], winner["nuance"], name, code in on_map))
    for rnd, data in ((1, c1), (2, c2)):
        if not data: continue
        agg = collections.Counter()
        for c in data["cands"]: agg[c["nuance"]] += c["votes"]
        for n, v in agg.items(): baseline.append((code, rnd, n, v))
    mapjson[code] = {"n": winner["nuance"], "d": name}

assert len(seats) == 577
(ROOT / "public/geo/legislatives-2024.json").write_text(json.dumps({"parties": {p[0]: {"label": p[1], "color": p[2], "bloc": p[3]} for p in PARTIES}, "seats": mapjson}, ensure_ascii=False, separators=(",", ":")))

sql = ["-- CIVITAS – LÉGISLATIVES RÉELLES, partie 1 : base 2024 (577 circonscriptions)",
"-- Uniquement des ajouts. Tout ou rien. Aucune table ni fonction existante modifiée (le Parlement de 50 sièges reste intact).",
"--   docker exec -i civitas-db psql -v ON_ERROR_STOP=1 -U postgres -d civitas < vps/migrations/0057_legislatives_base_2024.sql",
"-- Source : Ministère de l'Intérieur, résultats définitifs des 30 juin et 7 juillet 2024 (data.gouv.fr). Élus remplacés par des personnages inventés.",
"BEGIN;", "",
"CREATE TABLE public.legislative_parties (code text PRIMARY KEY, label text NOT NULL, color text NOT NULL, bloc text NOT NULL CHECK (bloc IN ('gauche','centre','droite','extreme-droite','autre')), organization_id uuid REFERENCES public.organizations(id));",
"CREATE TABLE public.legislative_constituencies (code text PRIMARY KEY CHECK (code ~ '^[0-9A-Z]{2,3}[0-9]{2}$'), department_code text NOT NULL, department_name text NOT NULL, number integer NOT NULL CHECK (number > 0), label text NOT NULL, registered integer NOT NULL CHECK (registered > 0), on_map boolean NOT NULL, city_id text REFERENCES public.cities(id), UNIQUE (department_code, number));",
"CREATE TABLE public.legislative_baseline_2024 (constituency_code text NOT NULL REFERENCES public.legislative_constituencies(code), round integer NOT NULL CHECK (round IN (1,2)), party_code text NOT NULL REFERENCES public.legislative_parties(code), votes integer NOT NULL CHECK (votes >= 0), PRIMARY KEY (constituency_code, round, party_code));",
"CREATE TABLE public.legislative_deputies_2024 (constituency_code text PRIMARY KEY REFERENCES public.legislative_constituencies(code), party_code text NOT NULL REFERENCES public.legislative_parties(code), display_name text NOT NULL);",
"GRANT SELECT ON public.legislative_parties, public.legislative_constituencies, public.legislative_baseline_2024, public.legislative_deputies_2024 TO authenticated;",
"GRANT ALL ON public.legislative_parties, public.legislative_constituencies, public.legislative_baseline_2024, public.legislative_deputies_2024 TO service_role;",
]
for t in ("legislative_parties", "legislative_constituencies", "legislative_baseline_2024", "legislative_deputies_2024"):
    sql += [f"ALTER TABLE public.{t} ENABLE ROW LEVEL SECURITY;", f"CREATE POLICY {t}_read ON public.{t} FOR SELECT TO authenticated USING (true);"]
sql.append("INSERT INTO public.legislative_parties (code, label, color, bloc) VALUES\n" + ",\n".join(f"({q(c)},{q(l)},{q(col)},{q(b)})" for c, l, col, b in PARTIES) + ";")
sql.append("INSERT INTO public.legislative_constituencies (code, department_code, department_name, number, label, registered, on_map) VALUES\n" + ",\n".join(f"({q(s[0])},{q(s[1])},{q(s[2])},{s[3]},{q(s[4])},{s[5]},{'true' if s[8] else 'false'})" for s in seats) + ";")
sql.append("INSERT INTO public.legislative_baseline_2024 (constituency_code, round, party_code, votes) VALUES\n" + ",\n".join(f"({q(b[0])},{b[1]},{q(b[2])},{b[3]})" for b in baseline) + ";")
sql.append("INSERT INTO public.legislative_deputies_2024 (constituency_code, party_code, display_name) VALUES\n" + ",\n".join(f"({q(s[0])},{q(s[6])},{q(s[7])})" for s in seats) + ";")
counts = collections.Counter(s[6] for s in seats)
sql.append(f"""DO $$ BEGIN
  IF (SELECT count(*) FROM public.legislative_constituencies) <> 577 THEN RAISE EXCEPTION 'il faut 577 circonscriptions'; END IF;
  IF (SELECT count(*) FROM public.legislative_deputies_2024) <> 577 THEN RAISE EXCEPTION 'il faut 577 députés'; END IF;
  IF (SELECT count(*) FROM public.legislative_deputies_2024 WHERE party_code = 'RN') <> {counts['RN']} THEN RAISE EXCEPTION 'répartition RN inattendue'; END IF;
  IF (SELECT count(*) FROM public.legislative_baseline_2024) <> {len(baseline)} THEN RAISE EXCEPTION 'résultats incomplets'; END IF;
END $$;""")
sql.append("COMMIT;")
(ROOT / "vps/migrations/0057_legislatives_base_2024.sql").write_text("\n".join(sql) + "\n")
print("sièges par nuance :", dict(counts.most_common()))
print("lignes de résultats :", len(baseline), "· hors carte :", sum(1 for s in seats if not s[8]))
