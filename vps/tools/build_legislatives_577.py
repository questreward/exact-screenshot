"""Génère vps/migrations/0058_legislatives_577.sql à partir du modèle et des fonctions actuelles du VPS."""
import pathlib, re, runpy, io, contextlib
ROOT = pathlib.Path(__file__).resolve().parents[2]
TOOLS = ROOT / "vps/tools"
with contextlib.redirect_stdout(io.StringIO()):
    laws = runpy.run_path(str(TOOLS / "real_laws.py"))["LAWS"]
BLOCS = {"gauche": "EXG COM FI UG SOC RDG VEC ECO DVG", "centre": "ENS HOR DVC UDI", "droite": "LR DVD DSV",
         "extreme-droite": "UXD RN REC EXD", "autre": "REG DIV"}
RULE = {"gauche": {"S","P","E"}, "centre": {"L","E","P"}, "droite": {"L","A"}, "extreme-droite": {"A"}, "autre": {"E","P","S"}}
pos = []
for i, law in enumerate(laws, 1):
    tags = set(law[6])
    for bloc, codes in BLOCS.items():
        v = "yes" if "C" in tags or tags & RULE[bloc] else "no"
        for code in codes.split(): pos.append(f"('fr-{i:03d}','{code}','{v}')")
assert len(pos) == 2200

src = (TOOLS / "data/parlement_vps.sql").read_text()
def fn(name):
    m = re.search(rf"CREATE OR REPLACE FUNCTION public\.{name}\(.*?\nEND \$function\$\n;", src, re.S)
    assert m, name
    return m.group(0)
def sub(text, old, new):
    assert old in text, old[:60]
    return text.replace(old, new, 1)

count = sub(fn("national_count_election"), " IF public.game_now()<e.vote_end_at THEN RAISE EXCEPTION 'Vote en cours'; END IF;\n",
  " IF public.game_now()<e.vote_end_at THEN RAISE EXCEPTION 'Vote en cours'; END IF;\n IF e.rules->>'model'='real577' THEN RETURN public.legislative_finalize(e.id); END IF; -- 577\n")
opn = sub(fn("national_open_session"), " count_seats:=CASE WHEN _chamber='assembly' THEN 50 ELSE 25 END;",
  " count_seats:=CASE WHEN _chamber='assembly' AND EXISTS(SELECT 1 FROM public.national_seats WHERE legislature_id=l.legislature_id AND constituency_code IS NOT NULL) THEN 577 WHEN _chamber='assembly' THEN 50 ELSE 25 END; -- 577")
opn = sub(opn, "CASE WHEN _chamber='assembly' THEN 26 ELSE 13 END", "CASE WHEN count_seats=577 THEN 289 WHEN _chamber='assembly' THEN 26 ELSE 13 END")
cls = sub(fn("national_close_session"), "SELECT ns.id, ns.character_id, g.organization_id FROM", "SELECT ns.id, ns.character_id, g.organization_id, g.party_code FROM")
cls = sub(cls, "p.party_key=COALESCE(st.organization_id::text,'divers')", "p.party_key=COALESCE(st.party_code, st.organization_id::text,'divers') /* 577 */")
tick = sub(fn("national_tick"), " PERFORM public.national_refresh();\n", " PERFORM public.legislative_refresh(); -- 577\n PERFORM public.national_refresh();\n")

# Sécurité : la formation du gouvernement mélange une variable et un alias nommés « x » ;
# on précise à PostgreSQL de lire l'alias, pour que la nouvelle Assemblée puisse former son gouvernement.
gov = sub(fn("national_form_government"), "AS $function$\n", "AS $function$\n#variable_conflict use_column\n")
tpl = (TOOLS / "legislatives_577.sql.tpl").read_text()
out = tpl.replace("{{POSITIONS}}", ",\n".join(pos)).replace("{{REPLACED}}", "\n".join([count, opn, cls, tick, gov]))
(ROOT / "vps/migrations/0058_legislatives_577.sql").write_text(out)
print("ok", len(pos))
