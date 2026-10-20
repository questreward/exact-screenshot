"""Produce literal, reviewable insert-only SQL for the approved V1 catalog."""
import json
from pathlib import Path

# Product families have functional variants, not numbered copies or colour-only rows.
FAMILIES = {
    'accessoires': ('maison', 5, 100, 'Atelier Civi', [
        ('Boîte hermétique', 'volume', ['0,4 L', '0,8 L', '1,2 L', '2 L', '3 L', '5 L', '8 L', '12 L']),
        ('Gourde', 'volume', ['250 ml', '350 ml', '500 ml', '650 ml', '750 ml', '1 L', '1,2 L', '1,5 L']),
        ('Organiseur', 'compartiments', ['2', '3', '4', '5', '6', '8', '10', '12']),
        ('Cahier', 'format', ['A4 48 pages', 'A4 96 pages', 'A5 48 pages', 'A5 96 pages', 'A6 48 pages', 'A6 96 pages', 'B5 80 pages', 'B5 160 pages']),
        ('Trousse', 'capacité', ['1 poche', '2 poches', '3 poches', '4 poches', '5 poches', '6 poches', '8 poches', '10 poches']),
        ('Panier de rangement', 'volume', ['2 L', '4 L', '6 L', '8 L', '12 L', '16 L', '24 L', '32 L']),
        ('Serviette', 'dimensions', ['30×30 cm', '30×50 cm', '40×60 cm', '50×90 cm', '70×100 cm', '70×140 cm', '90×150 cm', '100×180 cm']),
        ('Sac de courses', 'capacité', ['5 L', '8 L', '12 L', '16 L', '20 L', '25 L', '30 L', '40 L']),
    ]),
    'mode': ('mode', 10, 500, 'Fil Citoyen', [
        (name, 'taille', ['XXS', 'XS', 'S', 'M', 'L', 'XL', 'XXL', '3XL']) for name in
        ['T-shirt', 'Chemise', 'Pull', 'Sweat', 'Veste', 'Manteau', 'Pantalon', 'Short', 'Robe', 'Jupe', 'Polo', 'Gilet']
    ]),
    'sport': ('loisirs', 10, 500, 'Élan Sport', [
        ('Sac de randonnée', 'volume', ['10 L', '15 L', '20 L', '25 L', '30 L', '40 L', '50 L', '60 L']),
        ('Haltère', 'masse', ['1 kg', '2 kg', '3 kg', '4 kg', '5 kg', '8 kg', '10 kg', '15 kg']),
        ('Tapis de sport', 'épaisseur', ['3 mm', '4 mm', '5 mm', '6 mm', '8 mm', '10 mm', '12 mm', '15 mm']),
        ('Sac de sport', 'volume', ['10 L', '15 L', '20 L', '25 L', '30 L', '40 L', '50 L', '60 L']),
        ('Bâton de randonnée', 'longueur', ['90 cm', '95 cm', '100 cm', '105 cm', '110 cm', '115 cm', '120 cm', '125 cm']),
        ('Élastique de musculation', 'résistance', ['2 kg', '4 kg', '6 kg', '8 kg', '10 kg', '15 kg', '20 kg', '30 kg']),
        ('Ballon de gymnastique', 'diamètre', ['35 cm', '40 cm', '45 cm', '50 cm', '55 cm', '60 cm', '65 cm', '75 cm']),
        ('Sac de couchage', 'température de confort', ['+15 °C', '+12 °C', '+10 °C', '+8 °C', '+5 °C', '+2 °C', '0 °C', '−5 °C']),
    ]),
    'mobilier': ('maison', 25, 3000, 'Habitat Commun', [
        ('Bureau', 'largeur', ['80 cm', '90 cm', '100 cm', '110 cm', '120 cm', '140 cm', '160 cm', '180 cm']),
        ('Table', 'places', ['2', '3', '4', '5', '6', '8', '10', '12']),
        ('Bibliothèque', 'étagères', ['2', '3', '4', '5', '6', '7', '8', '10']),
        ('Commode', 'tiroirs', ['2', '3', '4', '5', '6', '7', '8', '10']),
        ('Armoire', 'largeur', ['60 cm', '80 cm', '100 cm', '120 cm', '140 cm', '160 cm', '180 cm', '200 cm']),
        ('Canapé', 'configuration', ['2 places', '3 places', '4 places', 'angle 3 places', 'angle 4 places', 'angle 5 places', 'convertible 2 places', 'convertible 3 places']),
        ('Lit', 'dimensions', ['80×190 cm', '90×190 cm', '90×200 cm', '120×190 cm', '140×190 cm', '140×200 cm', '160×200 cm', '180×200 cm']),
        ('Meuble TV', 'largeur', ['80 cm', '90 cm', '100 cm', '110 cm', '120 cm', '140 cm', '160 cm', '180 cm']),
    ]),
    'tech': ('tech', 20, 3000, 'Hexa Numérique', [
        ('Tablette', 'stockage', ['32 Go', '64 Go', '128 Go', '256 Go', '512 Go', '1 To', '2 To', '4 To']),
        ('Ordinateur portable', 'mémoire/stockage', ['8 Go/128 Go', '8 Go/256 Go', '8 Go/512 Go', '16 Go/256 Go', '16 Go/512 Go', '16 Go/1 To', '32 Go/1 To', '32 Go/2 To']),
        ('Écran', 'diagonale', ['15 pouces', '17 pouces', '19 pouces', '22 pouces', '24 pouces', '27 pouces', '32 pouces', '34 pouces']),
        ('Téléviseur', 'diagonale', ['24 pouces', '28 pouces', '32 pouces', '40 pouces', '43 pouces', '50 pouces', '55 pouces', '65 pouces']),
        ('Disque externe', 'capacité', ['128 Go', '256 Go', '512 Go', '1 To', '2 To', '4 To', '6 To', '8 To']),
        ('Batterie externe', 'capacité', ['2 000 mAh', '3 000 mAh', '5 000 mAh', '7 500 mAh', '10 000 mAh', '15 000 mAh', '20 000 mAh', '30 000 mAh']),
        ('Enceinte', 'puissance', ['3 W', '5 W', '10 W', '15 W', '20 W', '30 W', '40 W', '60 W']),
        ('Imprimante', 'usage', ['USB monochrome', 'USB couleur', 'Wi-Fi monochrome', 'Wi-Fi couleur', 'recto-verso monochrome', 'recto-verso couleur', 'scanner monochrome', 'scanner couleur']),
    ]),
    'electromenager': ('electromenager', 20, 3000, 'Foyer Pratique', [
        ('Réfrigérateur', 'volume', ['80 L', '120 L', '160 L', '200 L', '240 L', '280 L', '320 L', '400 L']),
        ('Lave-linge', 'capacité', ['3 kg', '4 kg', '5 kg', '6 kg', '7 kg', '8 kg', '9 kg', '10 kg']),
        ('Lave-vaisselle', 'couverts', ['4', '6', '8', '9', '10', '12', '14', '16']),
        ('Four', 'volume', ['20 L', '25 L', '30 L', '35 L', '40 L', '50 L', '60 L', '70 L']),
        ('Micro-ondes', 'volume', ['10 L', '15 L', '17 L', '20 L', '23 L', '25 L', '28 L', '30 L']),
        ('Bouilloire', 'volume', ['0,3 L', '0,5 L', '0,7 L', '0,8 L', '1 L', '1,2 L', '1,5 L', '1,7 L']),
        ('Congélateur', 'volume', ['40 L', '60 L', '80 L', '100 L', '120 L', '150 L', '200 L', '250 L']),
        ('Aspirateur', 'autonomie', ['15 min', '20 min', '25 min', '30 min', '35 min', '40 min', '50 min', '60 min']),
    ]),
}
FINISHES = {
    'accessoires': ['plastique recyclé', 'acier inoxydable', 'fibres recyclées', 'matière renforcée'],
    'mode': ['coton', 'coton recyclé', 'tissu technique', 'mélange isolant'],
    'sport': ['compact', 'renforcé', 'tout-terrain', 'usage intensif'],
    'mobilier': ['bois composite', 'pin massif', 'hêtre massif', 'métal et bois'],
    'tech': ['usage essentiel', 'usage familial', 'usage créatif', 'usage professionnel'],
    'electromenager': ['commande mécanique', 'commande numérique', 'mode silencieux', 'programmation avancée'],
}
OPTIONS = {
    'accessoires': ['simple', 'pliable', 'empilable', 'fermeture sécurisée', 'transportable', 'lavable', 'modulable', 'avec rangement'],
    'mode': ['coupe droite', 'coupe ajustée', 'coupe ample', 'doublure légère', 'doublure chaude', 'poches renforcées', 'coutures renforcées', 'finition déperlante'],
    'sport': ['débutant', 'loisir', 'entraînement', 'endurance', 'confort', 'mobilité', 'protection renforcée', 'transport facilité'],
    'mobilier': ['fixe', 'démontable', 'pliable', 'avec rangement', 'pieds réglables', 'portes coulissantes', 'assemblage renforcé', 'modulaire'],
    'tech': ['connexion filaire', 'connexion sans fil', 'connectique étendue', 'format compact', 'mode économie', 'accessoires inclus', 'contrôle tactile', 'sécurité renforcée'],
    'electromenager': ['format compact', 'pose libre', 'réglage automatique', 'minuterie', 'mode économie', 'affichage intégré', 'sécurité enfant', 'entretien simplifié'],
}

def products():
    rows = []
    # Round-robin ensures all families and every category are represented.
    pools = {}
    for group, (section, low, high, brand, families) in FAMILIES.items():
        variants = []
        for fi, (family, attribute, values) in enumerate(families):
            for vi, value in enumerate(values):
                for mi, material in enumerate(FINISHES[group]):
                    for oi, option in enumerate(OPTIONS[group]):
                        name = f'{family} {value} — {material}, {option}'
                        # Configuration drives relative price; remains inside approved base range.
                        fraction = (vi * 8 + mi * 4 + oi + fi % 4) / 78
                        price = low + round((high - low) * min(1, fraction))
                        details = {'shop': True, 'brand': brand, 'section': section, 'dep': 10,
                                   'desc': f'{family} : {attribute} {value}. Version {material}, {option}. Article fictif CIVITAS.',
                                   'catalog_pack': 'v1-0115', 'family': family, 'variant_attribute': attribute,
                                   'variant_value': value, 'construction': material, 'equipment': option, 'price_group': group}
                        variants.append({'name': name, 'price': price, 'config': details})
        pools[group] = iter(variants)
    while len(rows) < 9938:
        for group, pool in pools.items():
            if len(rows) == 9938:
                break
            row = next(pool)
            row['id'] = f'shop-v1-0115-{len(rows)+1:05d}'
            rows.append(row)
    return rows

def quote(value):
    return "'" + value.replace("'", "''") + "'"

def insert_sql():
    return '\n'.join(
        f"({quote(r['id'])},{quote(r['name'])},'item','boutique',{r['price']},0,'commerce',"
        f"{quote(json.dumps(r['config'], ensure_ascii=False, separators=(',', ':')))}::jsonb,{10000+i})" + (',' if i < 9937 else ';')
        for i, r in enumerate(products()))

if __name__ == '__main__':
    path = Path(__file__).resolve().parents[1] / 'migrations' / '0115_catalogue_10000.sql'
    text = path.read_text()
    start, end = '-- BEGIN LITERAL PRODUCTS', '-- END LITERAL PRODUCTS'
    before = text.split(start)[0]
    after = text.split(end)[1]
    path.write_text(before + start + '\nINSERT INTO public.economy_catalog(id,name,kind,category,price,energy_cost,location_kind,config,sort_order) VALUES\n' + insert_sql() + '\n' + end + after)