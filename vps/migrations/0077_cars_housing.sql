-- CIVITAS – BOUTIQUE, VAGUE 2 : VOITURES, LOCATIONS, ACHAT IMMOBILIER
-- Uniquement des ajouts, tout ou rien. Seules fonctions remplacées : shop_buy et shop_state (créées par 0076).
--   docker exec -i civitas-db psql -v ON_ERROR_STOP=1 -U postgres -d civitas < vps/migrations/0077_cars_housing.sql
-- Voitures : nouvelles lignes du catalogue existant (kind 'vehicle'). Elles réutilisent tout l'existant :
--   permis et âge, entretien périodique, assurance auto, déplacements en ville. Neuves ou d'occasion.
-- Locations : aucun deuxième système de logement. Louer = changer character_housing (type + logement de la ville) ;
--   le loyer reste celui du type, prélevé par le système existant. Dépôt de garantie d'un mois, rendu au départ
--   (clé unique), frais de déménagement = prix existant du type. Bail fictif enregistré.
-- Achat immobilier : biens = lignes du catalogue (patrimoine existant), paiement comptant + frais de notaire 7,5 %
--   (crédit immobilier : phase 2). Y habiter = type de logement « Propriétaire » (charges courantes seulement).
BEGIN;

INSERT INTO public.housing_types (id, name, daily_cost) VALUES ('owner', 'Propriétaire', 3);

INSERT INTO public.economy_catalog (id, name, kind, category, price, energy_cost, location_kind, config, sort_order) VALUES
('shop-car-clio','Clio V','vehicle','boutique',19990,0,'commerce','{"shop": true, "brand": "Renault", "section": "auto", "dep": 15, "condition": "neuf", "year": 2026, "km": 0, "fuel": "Essence", "conso": 5.3, "desc": "Essence, neuve, garantie constructeur.", "license": "Permis", "min_age": 18, "maintenance": 45, "maintenance_days": 30, "usage": 6, "travel_minutes": 5}',200),
('shop-car-208','208','vehicle','boutique',21500,0,'commerce','{"shop": true, "brand": "Peugeot", "section": "auto", "dep": 15, "condition": "neuf", "year": 2026, "km": 0, "fuel": "Essence", "conso": 5.4, "desc": "Essence, neuve, garantie constructeur.", "license": "Permis", "min_age": 18, "maintenance": 45, "maintenance_days": 30, "usage": 6, "travel_minutes": 5}',201),
('shop-car-sandero','Sandero','vehicle','boutique',13990,0,'commerce','{"shop": true, "brand": "Dacia", "section": "auto", "dep": 15, "condition": "neuf", "year": 2026, "km": 0, "fuel": "Essence", "conso": 5.6, "desc": "Essence, neuve, garantie constructeur.", "license": "Permis", "min_age": 18, "maintenance": 40, "maintenance_days": 30, "usage": 6, "travel_minutes": 5}',202),
('shop-car-yaris','Yaris Hybride','vehicle','boutique',23900,0,'commerce','{"shop": true, "brand": "Toyota", "section": "auto", "dep": 15, "condition": "neuf", "year": 2026, "km": 0, "fuel": "Hybride", "conso": 3.8, "desc": "Hybride, neuve, garantie constructeur.", "license": "Permis", "min_age": 18, "maintenance": 45, "maintenance_days": 30, "usage": 6, "travel_minutes": 5}',203),
('shop-car-model3','Model 3','vehicle','boutique',39990,0,'commerce','{"shop": true, "brand": "Tesla", "section": "auto", "dep": 15, "condition": "neuf", "year": 2026, "km": 0, "fuel": "Électrique", "conso": 0, "desc": "Électrique, neuve, garantie constructeur.", "license": "Permis", "min_age": 18, "maintenance": 35, "maintenance_days": 30, "usage": 4, "travel_minutes": 5}',204),
('shop-car-megane-e','Mégane E-Tech','vehicle','boutique',37900,0,'commerce','{"shop": true, "brand": "Renault", "section": "auto", "dep": 15, "condition": "neuf", "year": 2026, "km": 0, "fuel": "Électrique", "conso": 0, "desc": "Électrique, neuve, garantie constructeur.", "license": "Permis", "min_age": 18, "maintenance": 35, "maintenance_days": 30, "usage": 4, "travel_minutes": 5}',205),
('shop-car-golf','Golf 8','vehicle','boutique',31500,0,'commerce','{"shop": true, "brand": "Volkswagen", "section": "auto", "dep": 15, "condition": "neuf", "year": 2026, "km": 0, "fuel": "Essence", "conso": 5.9, "desc": "Essence, neuve, garantie constructeur.", "license": "Permis", "min_age": 18, "maintenance": 55, "maintenance_days": 30, "usage": 6, "travel_minutes": 5}',206),
('shop-car-3008','3008','vehicle','boutique',36900,0,'commerce','{"shop": true, "brand": "Peugeot", "section": "auto", "dep": 15, "condition": "neuf", "year": 2026, "km": 0, "fuel": "Hybride", "conso": 5.1, "desc": "Hybride, neuve, garantie constructeur.", "license": "Permis", "min_age": 18, "maintenance": 60, "maintenance_days": 30, "usage": 6, "travel_minutes": 5}',207),
('shop-occ-twingo','Twingo III (2017)','vehicle','boutique',6900,0,'commerce','{"shop": true, "brand": "Renault", "section": "auto", "dep": 10, "condition": "occasion", "year": 2017, "km": 98000, "fuel": "Essence", "conso": 4.9, "desc": "Essence · 2017 · 98 000 km", "license": "Permis", "min_age": 18, "maintenance": 55, "maintenance_days": 30, "usage": 6, "travel_minutes": 5}',208),
('shop-occ-c3','C3 (2019)','vehicle','boutique',9900,0,'commerce','{"shop": true, "brand": "Citroën", "section": "auto", "dep": 10, "condition": "occasion", "year": 2019, "km": 72000, "fuel": "Essence", "conso": 5.2, "desc": "Essence · 2019 · 72 000 km", "license": "Permis", "min_age": 18, "maintenance": 55, "maintenance_days": 30, "usage": 6, "travel_minutes": 5}',209),
('shop-occ-polo','Polo (2018)','vehicle','boutique',11500,0,'commerce','{"shop": true, "brand": "Volkswagen", "section": "auto", "dep": 10, "condition": "occasion", "year": 2018, "km": 85000, "fuel": "Essence", "conso": 5.4, "desc": "Essence · 2018 · 85 000 km", "license": "Permis", "min_age": 18, "maintenance": 60, "maintenance_days": 30, "usage": 6, "travel_minutes": 5}',210),
('shop-occ-zoe','Zoé (2020)','vehicle','boutique',10900,0,'commerce','{"shop": true, "brand": "Renault", "section": "auto", "dep": 10, "condition": "occasion", "year": 2020, "km": 54000, "fuel": "Électrique", "conso": 0, "desc": "Électrique · 2020 · 54 000 km", "license": "Permis", "min_age": 18, "maintenance": 40, "maintenance_days": 30, "usage": 4, "travel_minutes": 5}',211),
('shop-occ-duster','Duster (2016)','vehicle','boutique',8500,0,'commerce','{"shop": true, "brand": "Dacia", "section": "auto", "dep": 10, "condition": "occasion", "year": 2016, "km": 128000, "fuel": "Diesel", "conso": 4.8, "desc": "Diesel · 2016 · 128 000 km", "license": "Permis", "min_age": 18, "maintenance": 65, "maintenance_days": 30, "usage": 6, "travel_minutes": 5}',212),
('shop-occ-auris','Auris Hybride (2017)','vehicle','boutique',11900,0,'commerce','{"shop": true, "brand": "Toyota", "section": "auto", "dep": 10, "condition": "occasion", "year": 2017, "km": 110000, "fuel": "Hybride", "conso": 4.1, "desc": "Hybride · 2017 · 110 000 km", "license": "Permis", "min_age": 18, "maintenance": 55, "maintenance_days": 30, "usage": 6, "travel_minutes": 5}',213),
('shop-immo-paris-studio','Studio — Centre, Paris'::text,'item','immobilier',262000,0,'logement','{"shop": true, "realestate": true, "brand": "Immobilier", "section": "immobilier", "dep": 0, "city": "paris", "district": "Centre", "surface": 24, "rooms": 1, "dpe": "E", "charges_monthly": 90, "tax_yearly": 270, "desc": "Studio 24 m², 1 pièce · Centre, Paris · DPE E"}',300),
('shop-immo-paris-t2','Appartement T2 — Quartier des Batignolles, Paris'::text,'item','immobilier',399000,0,'logement','{"shop": true, "realestate": true, "brand": "Immobilier", "section": "immobilier", "dep": 0, "city": "paris", "district": "Quartier des Batignolles", "surface": 42, "rooms": 2, "dpe": "D", "charges_monthly": 140, "tax_yearly": 470, "desc": "Appartement T2 42 m², 2 pièces · Quartier des Batignolles, Paris · DPE D"}',301),
('shop-immo-paris-t3','Appartement T3 — Quartier universitaire, Paris'::text,'item','immobilier',618000,0,'logement','{"shop": true, "realestate": true, "brand": "Immobilier", "section": "immobilier", "dep": 0, "city": "paris", "district": "Quartier universitaire", "surface": 65, "rooms": 3, "dpe": "C", "charges_monthly": 190, "tax_yearly": 740, "desc": "Appartement T3 65 m², 3 pièces · Quartier universitaire, Paris · DPE C"}',302),
('shop-immo-paris-maison','Maison — Quartier de la gare, Paris'::text,'item','immobilier',898000,0,'logement','{"shop": true, "realestate": true, "brand": "Immobilier", "section": "immobilier", "dep": 0, "city": "paris", "district": "Quartier de la gare", "surface": 105, "rooms": 5, "dpe": "C", "charges_monthly": 120, "tax_yearly": 1190, "desc": "Maison 105 m², 5 pièces · Quartier de la gare, Paris · DPE C"}',303),
('shop-immo-lyon-studio','Studio — Presqu’île, Lyon'::text,'item','immobilier',132000,0,'logement','{"shop": true, "realestate": true, "brand": "Immobilier", "section": "immobilier", "dep": 0, "city": "lyon", "district": "Presqu’île", "surface": 24, "rooms": 1, "dpe": "E", "charges_monthly": 90, "tax_yearly": 130, "desc": "Studio 24 m², 1 pièce · Presqu’île, Lyon · DPE E"}',304),
('shop-immo-lyon-t2','Appartement T2 — Croix-Rousse, Lyon'::text,'item','immobilier',202000,0,'logement','{"shop": true, "realestate": true, "brand": "Immobilier", "section": "immobilier", "dep": 0, "city": "lyon", "district": "Croix-Rousse", "surface": 42, "rooms": 2, "dpe": "D", "charges_monthly": 140, "tax_yearly": 240, "desc": "Appartement T2 42 m², 2 pièces · Croix-Rousse, Lyon · DPE D"}',305),
('shop-immo-lyon-t3','Appartement T3 — Quartier universitaire, Lyon'::text,'item','immobilier',312000,0,'logement','{"shop": true, "realestate": true, "brand": "Immobilier", "section": "immobilier", "dep": 0, "city": "lyon", "district": "Quartier universitaire", "surface": 65, "rooms": 3, "dpe": "C", "charges_monthly": 190, "tax_yearly": 370, "desc": "Appartement T3 65 m², 3 pièces · Quartier universitaire, Lyon · DPE C"}',306),
('shop-immo-lyon-maison','Maison — Quartier de la gare, Lyon'::text,'item','immobilier',454000,0,'logement','{"shop": true, "realestate": true, "brand": "Immobilier", "section": "immobilier", "dep": 0, "city": "lyon", "district": "Quartier de la gare", "surface": 105, "rooms": 5, "dpe": "C", "charges_monthly": 120, "tax_yearly": 600, "desc": "Maison 105 m², 5 pièces · Quartier de la gare, Lyon · DPE C"}',307),
('shop-immo-marseille-studio','Studio — Vieux-Port, Marseille'::text,'item','immobilier',99000,0,'logement','{"shop": true, "realestate": true, "brand": "Immobilier", "section": "immobilier", "dep": 0, "city": "marseille", "district": "Vieux-Port", "surface": 24, "rooms": 1, "dpe": "E", "charges_monthly": 90, "tax_yearly": 100, "desc": "Studio 24 m², 1 pièce · Vieux-Port, Marseille · DPE E"}',308),
('shop-immo-marseille-t2','Appartement T2 — Le Panier, Marseille'::text,'item','immobilier',151000,0,'logement','{"shop": true, "realestate": true, "brand": "Immobilier", "section": "immobilier", "dep": 0, "city": "marseille", "district": "Le Panier", "surface": 42, "rooms": 2, "dpe": "D", "charges_monthly": 140, "tax_yearly": 180, "desc": "Appartement T2 42 m², 2 pièces · Le Panier, Marseille · DPE D"}',309),
('shop-immo-marseille-t3','Appartement T3 — Quartier universitaire, Marseille'::text,'item','immobilier',234000,0,'logement','{"shop": true, "realestate": true, "brand": "Immobilier", "section": "immobilier", "dep": 0, "city": "marseille", "district": "Quartier universitaire", "surface": 65, "rooms": 3, "dpe": "C", "charges_monthly": 190, "tax_yearly": 280, "desc": "Appartement T3 65 m², 3 pièces · Quartier universitaire, Marseille · DPE C"}',310),
('shop-immo-marseille-maison','Maison — Quartier de la gare, Marseille'::text,'item','immobilier',340000,0,'logement','{"shop": true, "realestate": true, "brand": "Immobilier", "section": "immobilier", "dep": 0, "city": "marseille", "district": "Quartier de la gare", "surface": 105, "rooms": 5, "dpe": "C", "charges_monthly": 120, "tax_yearly": 450, "desc": "Maison 105 m², 5 pièces · Quartier de la gare, Marseille · DPE C"}',311),
('shop-immo-bordeaux-studio','Studio — Centre historique, Bordeaux'::text,'item','immobilier',127000,0,'logement','{"shop": true, "realestate": true, "brand": "Immobilier", "section": "immobilier", "dep": 0, "city": "bordeaux", "district": "Centre historique", "surface": 24, "rooms": 1, "dpe": "E", "charges_monthly": 90, "tax_yearly": 130, "desc": "Studio 24 m², 1 pièce · Centre historique, Bordeaux · DPE E"}',312),
('shop-immo-bordeaux-t2','Appartement T2 — Chartrons, Bordeaux'::text,'item','immobilier',193000,0,'logement','{"shop": true, "realestate": true, "brand": "Immobilier", "section": "immobilier", "dep": 0, "city": "bordeaux", "district": "Chartrons", "surface": 42, "rooms": 2, "dpe": "D", "charges_monthly": 140, "tax_yearly": 230, "desc": "Appartement T2 42 m², 2 pièces · Chartrons, Bordeaux · DPE D"}',313),
('shop-immo-bordeaux-t3','Appartement T3 — Quartier universitaire, Bordeaux'::text,'item','immobilier',299000,0,'logement','{"shop": true, "realestate": true, "brand": "Immobilier", "section": "immobilier", "dep": 0, "city": "bordeaux", "district": "Quartier universitaire", "surface": 65, "rooms": 3, "dpe": "C", "charges_monthly": 190, "tax_yearly": 350, "desc": "Appartement T3 65 m², 3 pièces · Quartier universitaire, Bordeaux · DPE C"}',314),
('shop-immo-bordeaux-maison','Maison — Quartier de la gare, Bordeaux'::text,'item','immobilier',435000,0,'logement','{"shop": true, "realestate": true, "brand": "Immobilier", "section": "immobilier", "dep": 0, "city": "bordeaux", "district": "Quartier de la gare", "surface": 105, "rooms": 5, "dpe": "C", "charges_monthly": 120, "tax_yearly": 570, "desc": "Maison 105 m², 5 pièces · Quartier de la gare, Bordeaux · DPE C"}',315),
('shop-immo-lille-studio','Studio — Vieux-Lille, Lille'::text,'item','immobilier',97000,0,'logement','{"shop": true, "realestate": true, "brand": "Immobilier", "section": "immobilier", "dep": 0, "city": "lille", "district": "Vieux-Lille", "surface": 24, "rooms": 1, "dpe": "E", "charges_monthly": 90, "tax_yearly": 100, "desc": "Studio 24 m², 1 pièce · Vieux-Lille, Lille · DPE E"}',316),
('shop-immo-lille-t2','Appartement T2 — Vauban, Lille'::text,'item','immobilier',147000,0,'logement','{"shop": true, "realestate": true, "brand": "Immobilier", "section": "immobilier", "dep": 0, "city": "lille", "district": "Vauban", "surface": 42, "rooms": 2, "dpe": "D", "charges_monthly": 140, "tax_yearly": 170, "desc": "Appartement T2 42 m², 2 pièces · Vauban, Lille · DPE D"}',317),
('shop-immo-lille-t3','Appartement T3 — Quartier universitaire, Lille'::text,'item','immobilier',228000,0,'logement','{"shop": true, "realestate": true, "brand": "Immobilier", "section": "immobilier", "dep": 0, "city": "lille", "district": "Quartier universitaire", "surface": 65, "rooms": 3, "dpe": "C", "charges_monthly": 190, "tax_yearly": 270, "desc": "Appartement T3 65 m², 3 pièces · Quartier universitaire, Lille · DPE C"}',318),
('shop-immo-lille-maison','Maison — Quartier de la gare, Lille'::text,'item','immobilier',331000,0,'logement','{"shop": true, "realestate": true, "brand": "Immobilier", "section": "immobilier", "dep": 0, "city": "lille", "district": "Quartier de la gare", "surface": 105, "rooms": 5, "dpe": "C", "charges_monthly": 120, "tax_yearly": 440, "desc": "Maison 105 m², 5 pièces · Quartier de la gare, Lille · DPE C"}',319);

CREATE TABLE public.rental_listings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  city_id text NOT NULL REFERENCES public.cities(id),
  district text NOT NULL,
  type_id text NOT NULL REFERENCES public.housing_types(id),
  title text NOT NULL,
  surface integer NOT NULL,
  dpe text NOT NULL,
  floor integer NOT NULL DEFAULT 1
);
CREATE TABLE public.housing_leases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  character_id uuid NOT NULL REFERENCES public.characters(id),
  listing_id uuid REFERENCES public.rental_listings(id),
  property_id text REFERENCES public.economy_catalog(id),
  kind text NOT NULL CHECK (kind IN ('location','propriete')),
  type_id text NOT NULL,
  location_id uuid NOT NULL,
  title text NOT NULL,
  monthly integer NOT NULL,
  deposit integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'actif' CHECK (status IN ('actif','terminé')),
  started_at timestamptz NOT NULL DEFAULT public.game_now(),
  ended_at timestamptz
);
CREATE UNIQUE INDEX housing_leases_one_active ON public.housing_leases (character_id) WHERE status = 'actif';
GRANT SELECT ON public.rental_listings TO authenticated;
GRANT SELECT ON public.housing_leases TO authenticated;
GRANT ALL ON public.rental_listings, public.housing_leases TO service_role;
ALTER TABLE public.rental_listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.housing_leases ENABLE ROW LEVEL SECURITY;
CREATE POLICY "annonces publiques" ON public.rental_listings FOR SELECT TO authenticated USING (true);
CREATE POLICY "mes baux" ON public.housing_leases FOR SELECT TO authenticated
  USING (character_id IN (SELECT id FROM public.characters WHERE user_id = auth.uid()));
INSERT INTO public.rental_listings (city_id, district, type_id, title, surface, dpe, floor) VALUES
('paris','Centre','room','Chambre 11 m² — Centre',11,'E',1),
('paris','Centre','studio','Studio 20 m² — Centre',20,'E',1),
('paris','Centre','flat','Appartement 45 m² — Centre',45,'D',1),
('paris','Centre','house','Maison 90 m² — Centre',90,'C',1),
('paris','Quartier des Batignolles','room','Chambre 13 m² — Quartier des Batignolles',13,'E',2),
('paris','Quartier des Batignolles','studio','Studio 22 m² — Quartier des Batignolles',22,'E',2),
('paris','Quartier des Batignolles','flat','Appartement 47 m² — Quartier des Batignolles',47,'D',2),
('paris','Quartier des Batignolles','house','Maison 92 m² — Quartier des Batignolles',92,'C',2),
('paris','Quartier universitaire','room','Chambre 15 m² — Quartier universitaire',15,'E',3),
('paris','Quartier universitaire','studio','Studio 24 m² — Quartier universitaire',24,'E',3),
('paris','Quartier universitaire','flat','Appartement 49 m² — Quartier universitaire',49,'D',3),
('paris','Quartier universitaire','house','Maison 94 m² — Quartier universitaire',94,'C',3),
('paris','Quartier de la gare','room','Chambre 17 m² — Quartier de la gare',17,'E',4),
('paris','Quartier de la gare','studio','Studio 26 m² — Quartier de la gare',26,'E',4),
('paris','Quartier de la gare','flat','Appartement 51 m² — Quartier de la gare',51,'D',4),
('paris','Quartier de la gare','house','Maison 96 m² — Quartier de la gare',96,'C',4),
('lyon','Presqu’île','room','Chambre 11 m² — Presqu’île',11,'E',1),
('lyon','Presqu’île','studio','Studio 20 m² — Presqu’île',20,'E',1),
('lyon','Presqu’île','flat','Appartement 45 m² — Presqu’île',45,'D',1),
('lyon','Presqu’île','house','Maison 90 m² — Presqu’île',90,'C',1),
('lyon','Croix-Rousse','room','Chambre 13 m² — Croix-Rousse',13,'E',2),
('lyon','Croix-Rousse','studio','Studio 22 m² — Croix-Rousse',22,'E',2),
('lyon','Croix-Rousse','flat','Appartement 47 m² — Croix-Rousse',47,'D',2),
('lyon','Croix-Rousse','house','Maison 92 m² — Croix-Rousse',92,'C',2),
('lyon','Quartier universitaire','room','Chambre 15 m² — Quartier universitaire',15,'E',3),
('lyon','Quartier universitaire','studio','Studio 24 m² — Quartier universitaire',24,'E',3),
('lyon','Quartier universitaire','flat','Appartement 49 m² — Quartier universitaire',49,'D',3),
('lyon','Quartier universitaire','house','Maison 94 m² — Quartier universitaire',94,'C',3),
('lyon','Quartier de la gare','room','Chambre 17 m² — Quartier de la gare',17,'E',4),
('lyon','Quartier de la gare','studio','Studio 26 m² — Quartier de la gare',26,'E',4),
('lyon','Quartier de la gare','flat','Appartement 51 m² — Quartier de la gare',51,'D',4),
('lyon','Quartier de la gare','house','Maison 96 m² — Quartier de la gare',96,'C',4),
('marseille','Vieux-Port','room','Chambre 11 m² — Vieux-Port',11,'E',1),
('marseille','Vieux-Port','studio','Studio 20 m² — Vieux-Port',20,'E',1),
('marseille','Vieux-Port','flat','Appartement 45 m² — Vieux-Port',45,'D',1),
('marseille','Vieux-Port','house','Maison 90 m² — Vieux-Port',90,'C',1),
('marseille','Le Panier','room','Chambre 13 m² — Le Panier',13,'E',2),
('marseille','Le Panier','studio','Studio 22 m² — Le Panier',22,'E',2),
('marseille','Le Panier','flat','Appartement 47 m² — Le Panier',47,'D',2),
('marseille','Le Panier','house','Maison 92 m² — Le Panier',92,'C',2),
('marseille','Quartier universitaire','room','Chambre 15 m² — Quartier universitaire',15,'E',3),
('marseille','Quartier universitaire','studio','Studio 24 m² — Quartier universitaire',24,'E',3),
('marseille','Quartier universitaire','flat','Appartement 49 m² — Quartier universitaire',49,'D',3),
('marseille','Quartier universitaire','house','Maison 94 m² — Quartier universitaire',94,'C',3),
('marseille','Quartier de la gare','room','Chambre 17 m² — Quartier de la gare',17,'E',4),
('marseille','Quartier de la gare','studio','Studio 26 m² — Quartier de la gare',26,'E',4),
('marseille','Quartier de la gare','flat','Appartement 51 m² — Quartier de la gare',51,'D',4),
('marseille','Quartier de la gare','house','Maison 96 m² — Quartier de la gare',96,'C',4),
('bordeaux','Centre historique','room','Chambre 11 m² — Centre historique',11,'E',1),
('bordeaux','Centre historique','studio','Studio 20 m² — Centre historique',20,'E',1),
('bordeaux','Centre historique','flat','Appartement 45 m² — Centre historique',45,'D',1),
('bordeaux','Centre historique','house','Maison 90 m² — Centre historique',90,'C',1),
('bordeaux','Chartrons','room','Chambre 13 m² — Chartrons',13,'E',2),
('bordeaux','Chartrons','studio','Studio 22 m² — Chartrons',22,'E',2),
('bordeaux','Chartrons','flat','Appartement 47 m² — Chartrons',47,'D',2),
('bordeaux','Chartrons','house','Maison 92 m² — Chartrons',92,'C',2),
('bordeaux','Quartier universitaire','room','Chambre 15 m² — Quartier universitaire',15,'E',3),
('bordeaux','Quartier universitaire','studio','Studio 24 m² — Quartier universitaire',24,'E',3),
('bordeaux','Quartier universitaire','flat','Appartement 49 m² — Quartier universitaire',49,'D',3),
('bordeaux','Quartier universitaire','house','Maison 94 m² — Quartier universitaire',94,'C',3),
('bordeaux','Quartier de la gare','room','Chambre 17 m² — Quartier de la gare',17,'E',4),
('bordeaux','Quartier de la gare','studio','Studio 26 m² — Quartier de la gare',26,'E',4),
('bordeaux','Quartier de la gare','flat','Appartement 51 m² — Quartier de la gare',51,'D',4),
('bordeaux','Quartier de la gare','house','Maison 96 m² — Quartier de la gare',96,'C',4),
('lille','Vieux-Lille','room','Chambre 11 m² — Vieux-Lille',11,'E',1),
('lille','Vieux-Lille','studio','Studio 20 m² — Vieux-Lille',20,'E',1),
('lille','Vieux-Lille','flat','Appartement 45 m² — Vieux-Lille',45,'D',1),
('lille','Vieux-Lille','house','Maison 90 m² — Vieux-Lille',90,'C',1),
('lille','Vauban','room','Chambre 13 m² — Vauban',13,'E',2),
('lille','Vauban','studio','Studio 22 m² — Vauban',22,'E',2),
('lille','Vauban','flat','Appartement 47 m² — Vauban',47,'D',2),
('lille','Vauban','house','Maison 92 m² — Vauban',92,'C',2),
('lille','Quartier universitaire','room','Chambre 15 m² — Quartier universitaire',15,'E',3),
('lille','Quartier universitaire','studio','Studio 24 m² — Quartier universitaire',24,'E',3),
('lille','Quartier universitaire','flat','Appartement 49 m² — Quartier universitaire',49,'D',3),
('lille','Quartier universitaire','house','Maison 94 m² — Quartier universitaire',94,'C',3),
('lille','Quartier de la gare','room','Chambre 17 m² — Quartier de la gare',17,'E',4),
('lille','Quartier de la gare','studio','Studio 26 m² — Quartier de la gare',26,'E',4),
('lille','Quartier de la gare','flat','Appartement 51 m² — Quartier de la gare',51,'D',4),
('lille','Quartier de la gare','house','Maison 96 m² — Quartier de la gare',96,'C',4);

-- Clôt le bail actif (dépôt rendu une seule fois) si le joueur l'a quitté ou en change.
CREATE FUNCTION public.housing_close_lease(_cid uuid, _force boolean) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE l public.housing_leases; h public.character_housing;
BEGIN
  SELECT * INTO l FROM public.housing_leases WHERE character_id = _cid AND status = 'actif' FOR UPDATE;
  IF NOT FOUND THEN RETURN; END IF;
  SELECT * INTO h FROM public.character_housing WHERE character_id = _cid;
  IF _force OR h.character_id IS NULL OR h.type_id IS DISTINCT FROM l.type_id OR h.location_id IS DISTINCT FROM l.location_id THEN
    UPDATE public.housing_leases SET status = 'terminé', ended_at = public.game_now() WHERE id = l.id;
    IF l.deposit > 0 THEN
      PERFORM public.economy_cash(_cid, 'lease-refund:' || l.id, l.deposit, 'Dépôt de garantie rendu — ' || l.title, 'logement');
    END IF;
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.shop_buy(_catalog_id text, _request_id uuid) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE cid uuid; c public.characters; cat public.economy_catalog; o public.shop_orders; ref text; fees integer := 0; t timestamptz := public.game_now();
BEGIN
  cid := public.prepare_daily_life();
  SELECT * INTO c FROM public.characters WHERE id = cid FOR UPDATE;
  SELECT * INTO o FROM public.shop_orders WHERE character_id = cid AND request_id = _request_id;
  IF FOUND THEN RETURN jsonb_build_object('reference', o.reference, 'already', true); END IF;
  SELECT * INTO cat FROM public.economy_catalog WHERE id = _catalog_id AND COALESCE(config->>'shop', 'false') = 'true';
  IF NOT FOUND THEN RAISE EXCEPTION 'Produit introuvable'; END IF;
  IF EXISTS (SELECT 1 FROM public.personal_assets WHERE character_id = cid AND catalog_id = cat.id) THEN RAISE EXCEPTION 'Vous possédez déjà ce produit'; END IF;
  IF c.age < COALESCE((cat.config->>'min_age')::integer, 16) THEN RAISE EXCEPTION 'Âge insuffisant'; END IF;
  IF cat.config ? 'license' AND COALESCE((c.progression->>(cat.config->>'license'))::integer, 0) < 1 THEN RAISE EXCEPTION 'Permis requis'; END IF;
  IF COALESCE(cat.config->>'realestate', 'false') = 'true' THEN fees := ceil(cat.price * 0.075)::integer; END IF;
  IF COALESCE((SELECT balance FROM public.accounts WHERE character_id = cid), 0) < cat.price + fees THEN RAISE EXCEPTION 'Solde insuffisant'; END IF;
  ref := 'CIV-' || upper(substr(md5(cid::text || _request_id::text), 1, 8));
  PERFORM public.economy_cash(cid, 'shop:' || _request_id, -cat.price, 'Boutique — ' || (cat.config->>'brand') || ' ' || cat.name, 'achat',
    jsonb_build_object('catalog_id', cat.id, 'reference', ref));
  IF fees > 0 THEN
    PERFORM public.economy_cash(cid, 'shop-notary:' || _request_id, -fees, 'Frais de notaire — ' || cat.name, 'logement', jsonb_build_object('reference', ref));
  END IF;
  INSERT INTO public.personal_assets (character_id, catalog_id, purchase_price, next_maintenance)
  VALUES (cid, cat.id, cat.price, CASE WHEN cat.kind = 'vehicle' THEN t + COALESCE((cat.config->>'maintenance_days')::integer, 30) * interval '1 day' END);
  INSERT INTO public.shop_orders (character_id, catalog_id, name, brand, price, request_id, reference)
  VALUES (cid, cat.id, cat.name, cat.config->>'brand', cat.price + fees, _request_id, ref);
  RETURN jsonb_build_object('reference', ref, 'already', false, 'fees', fees);
END $$;

CREATE FUNCTION public.housing_action(_command text, _input jsonb, _request_id uuid) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE cid uuid; c public.characters; li public.rental_listings; ht public.housing_types; home uuid; cat public.economy_catalog;
  move_cost integer; deposit integer; lease public.housing_leases;
BEGIN
  cid := public.prepare_daily_life();
  SELECT * INTO c FROM public.characters WHERE id = cid FOR UPDATE;
  IF EXISTS (SELECT 1 FROM public.housing_leases WHERE character_id = cid AND started_at = public.game_now()) THEN
    RAISE EXCEPTION 'Un seul changement de logement à la fois'; END IF;
  IF EXISTS (SELECT 1 FROM public.activities WHERE character_id = cid AND status = 'running') THEN RAISE EXCEPTION 'Terminez votre activité'; END IF;
  SELECT id INTO home FROM public.locations WHERE city_id = c.city_id AND kind = 'logement' ORDER BY created_at LIMIT 1;
  IF home IS NULL THEN RAISE EXCEPTION 'Aucun logement disponible dans cette ville'; END IF;
  PERFORM public.housing_close_lease(cid, false);

  IF _command = 'rent' THEN
    SELECT * INTO li FROM public.rental_listings WHERE id = (_input->>'listing_id')::uuid AND city_id = c.city_id;
    IF NOT FOUND THEN RAISE EXCEPTION 'Annonce introuvable dans votre ville'; END IF;
    SELECT * INTO ht FROM public.housing_types WHERE id = li.type_id;
    IF EXISTS (SELECT 1 FROM public.housing_leases WHERE character_id = cid AND status = 'actif' AND listing_id = li.id) THEN RAISE EXCEPTION 'Vous louez déjà ce logement'; END IF;
    move_cost := COALESCE((SELECT price FROM public.economy_catalog WHERE kind = 'housing' AND config->>'type_id' = li.type_id AND COALESCE(config->>'shop','false') <> 'true' LIMIT 1), 0);
    deposit := ht.daily_cost * 30;
    IF COALESCE((SELECT balance FROM public.accounts WHERE character_id = cid), 0) < move_cost + deposit THEN RAISE EXCEPTION 'Solde insuffisant (dépôt + déménagement : % €)', move_cost + deposit; END IF;
    PERFORM public.housing_close_lease(cid, true);
    IF move_cost > 0 THEN PERFORM public.economy_cash(cid, 'lease-move:' || _request_id, -move_cost, 'Déménagement — ' || li.title, 'logement'); END IF;
    PERFORM public.economy_cash(cid, 'lease-deposit:' || _request_id, -deposit, 'Dépôt de garantie — ' || li.title, 'logement');
    INSERT INTO public.character_housing (character_id, type_id, location_id) VALUES (cid, li.type_id, home)
      ON CONFLICT (character_id) DO UPDATE SET type_id = EXCLUDED.type_id, location_id = EXCLUDED.location_id;
    INSERT INTO public.housing_leases (character_id, listing_id, kind, type_id, location_id, title, monthly, deposit)
    VALUES (cid, li.id, 'location', li.type_id, home, li.title, ht.daily_cost * 30, deposit) RETURNING * INTO lease;
    RETURN jsonb_build_object('lease_id', lease.id, 'deposit', deposit, 'move', move_cost);

  ELSIF _command = 'move_in' THEN
    SELECT ec.* INTO cat FROM public.economy_catalog ec JOIN public.personal_assets a ON a.catalog_id = ec.id AND a.character_id = cid
      WHERE ec.id = _input->>'property_id' AND COALESCE(ec.config->>'realestate','false') = 'true';
    IF NOT FOUND THEN RAISE EXCEPTION 'Bien introuvable dans votre patrimoine'; END IF;
    IF cat.config->>'city' IS DISTINCT FROM c.city_id THEN RAISE EXCEPTION 'Ce bien est dans une autre ville'; END IF;
    IF EXISTS (SELECT 1 FROM public.housing_leases WHERE character_id = cid AND status = 'actif' AND property_id = cat.id) THEN RAISE EXCEPTION 'Vous habitez déjà ici'; END IF;
    PERFORM public.housing_close_lease(cid, true);
    INSERT INTO public.character_housing (character_id, type_id, location_id) VALUES (cid, 'owner', home)
      ON CONFLICT (character_id) DO UPDATE SET type_id = 'owner', location_id = EXCLUDED.location_id;
    INSERT INTO public.housing_leases (character_id, property_id, kind, type_id, location_id, title, monthly)
    VALUES (cid, cat.id, 'propriete', 'owner', home, cat.name, (SELECT daily_cost * 30 FROM public.housing_types WHERE id = 'owner')) RETURNING * INTO lease;
    RETURN jsonb_build_object('lease_id', lease.id);
  END IF;
  RAISE EXCEPTION 'Action inconnue';
END $$;

CREATE FUNCTION public.housing_state() RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE cid uuid; c public.characters; salary integer;
BEGIN
  cid := public.prepare_daily_life();
  PERFORM public.housing_close_lease(cid, false);
  SELECT * INTO c FROM public.characters WHERE id = cid;
  SELECT j.salary + e.salary_bonus INTO salary FROM public.employments e JOIN public.jobs j ON j.id = e.job_id WHERE e.character_id = cid;
  RETURN jsonb_build_object(
    'city', c.city_id, 'balance', COALESCE((SELECT balance FROM public.accounts WHERE character_id = cid), 0), 'salary', COALESCE(salary, 0),
    'current', (SELECT jsonb_build_object('type', ht.name, 'type_id', h.type_id, 'monthly', ht.daily_cost * 30) FROM public.character_housing h JOIN public.housing_types ht ON ht.id = h.type_id WHERE h.character_id = cid),
    'lease', (SELECT to_jsonb(l) FROM public.housing_leases l WHERE l.character_id = cid AND l.status = 'actif'),
    'past_leases', COALESCE((SELECT jsonb_agg(to_jsonb(l) ORDER BY l.started_at DESC) FROM public.housing_leases l WHERE l.character_id = cid AND l.status = 'terminé'), '[]'),
    'rentals', COALESCE((SELECT jsonb_agg(jsonb_build_object('id', r.id, 'title', r.title, 'district', r.district, 'type', ht.name, 'type_id', r.type_id,
        'surface', r.surface, 'dpe', r.dpe, 'floor', r.floor, 'monthly', ht.daily_cost * 30, 'deposit', ht.daily_cost * 30,
        'move', COALESCE((SELECT price FROM public.economy_catalog ec WHERE ec.kind = 'housing' AND ec.config->>'type_id' = r.type_id AND COALESCE(ec.config->>'shop','false') <> 'true' LIMIT 1), 0))
        ORDER BY ht.daily_cost, r.district) FROM public.rental_listings r JOIN public.housing_types ht ON ht.id = r.type_id WHERE r.city_id = c.city_id), '[]'),
    'owned', COALESCE((SELECT jsonb_agg(jsonb_build_object('id', ec.id, 'name', ec.name, 'city', ec.config->>'city', 'price', a.purchase_price)) FROM public.personal_assets a
        JOIN public.economy_catalog ec ON ec.id = a.catalog_id WHERE a.character_id = cid AND COALESCE(ec.config->>'realestate','false') = 'true'), '[]'));
END $$;

CREATE OR REPLACE FUNCTION public.shop_state() RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE cid uuid; t timestamptz; c public.characters;
BEGIN
  cid := public.prepare_daily_life();
  t := public.game_now();
  SELECT * INTO c FROM public.characters WHERE id = cid;
  RETURN jsonb_build_object(
    'balance', COALESCE((SELECT balance FROM public.accounts WHERE character_id = cid), 0),
    'license', COALESCE((c.progression->>'Permis')::integer, 0) >= 1, 'age', c.age, 'city', c.city_id,
    'products', COALESCE((SELECT jsonb_agg(jsonb_build_object('id', ec.id, 'name', ec.name, 'price', ec.price, 'kind', ec.kind,
        'brand', ec.config->>'brand', 'section', ec.config->>'section', 'desc', ec.config->>'desc', 'dep', (ec.config->>'dep')::integer,
        'details', ec.config - 'shop' - 'desc' - 'brand' - 'section' - 'dep',
        'owned', EXISTS (SELECT 1 FROM public.personal_assets a WHERE a.character_id = cid AND a.catalog_id = ec.id),
        'sales', (SELECT count(*) FROM public.shop_orders so WHERE so.catalog_id = ec.id)) ORDER BY ec.sort_order)
      FROM public.economy_catalog ec WHERE COALESCE(ec.config->>'shop', 'false') = 'true'), '[]'),
    'orders', COALESCE((SELECT jsonb_agg(jsonb_build_object('reference', so.reference, 'name', so.name, 'brand', so.brand, 'price', so.price, 'at', so.ordered_at) ORDER BY so.ordered_at DESC)
      FROM public.shop_orders so WHERE so.character_id = cid), '[]'),
    'assets', COALESCE((SELECT jsonb_agg(jsonb_build_object('name', ec.name, 'kind', ec.kind, 'brand', ec.config->>'brand', 'price', a.purchase_price, 'acquired_at', a.acquired_at,
        'value', floor(a.purchase_price * power(1 - COALESCE((ec.config->>'dep')::numeric, 10) / 100, GREATEST(0, extract(epoch FROM t - a.acquired_at) / 31557600)))::integer)
        ORDER BY a.purchase_price DESC)
      FROM public.personal_assets a JOIN public.economy_catalog ec ON ec.id = a.catalog_id WHERE a.character_id = cid), '[]'));
END $$;

REVOKE ALL ON FUNCTION public.housing_close_lease(uuid, boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.housing_action(text, jsonb, uuid), public.housing_state() TO authenticated;

COMMIT;
