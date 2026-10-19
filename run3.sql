\set A '''22222222-2222-2222-2222-222222222222'''
select set_config('test.uid','22222222-2222-2222-2222-222222222222',false); update accounts set balance=3000 where character_id='11111111-1111-1111-1111-111111111111';
select 'magasins', count(*) from city_stores;
select 'fnac paris', store_buy('paris-fnac','shop-iphone','00000000-0000-0000-0000-00000000f001')->>'price';
select 'double', store_buy('paris-fnac','shop-iphone','00000000-0000-0000-0000-00000000f001')->>'already', (select balance from accounts where character_id='11111111-1111-1111-1111-111111111111');
select 'autre ville', store_buy('lyon-fnac','shop-ps5',gen_random_uuid());
select 'mauvais rayon', store_buy('paris-ikea','shop-ps5',gen_random_uuid());
select 'annonce', market_list((select id from personal_assets where catalog_id='shop-iphone'),900,'Très bon état') is not null;
select 'trop cher', market_list((select id from personal_assets where catalog_id='shop-iphone'),5000,'');
-- Cyr fait une offre, Alex accepte
select set_config('test.uid','66666666-6666-6666-6666-666666666666',false);
select 'offre basse', market_offer((select id from market_listings),300);
select 'offre', market_offer((select id from market_listings),700) is not null;
select set_config('test.uid','44444444-4444-4444-4444-444444444444',false);
select 'bea achete reserve?', market_offer((select id from market_listings),650) is not null;
select set_config('test.uid','22222222-2222-2222-2222-222222222222',false);
select 'accepte', market_offer_answer((select id from market_offers where amount=700),true);
select 'statuts', string_agg(status,',' order by amount) from market_offers;
select set_config('test.uid','44444444-4444-4444-4444-444444444444',false);
select 'bea bloquee', market_buy((select id from market_listings),gen_random_uuid());
select set_config('test.uid','66666666-6666-6666-6666-666666666666',false);
select 'cyr paie', market_buy((select id from market_listings),'00000000-0000-0000-0000-00000000f101')->>'price';
select 'double', market_buy((select id from market_listings),'00000000-0000-0000-0000-00000000f101')->>'already', (select balance from accounts where character_id='55555555-5555-5555-5555-555555555555'), (select count(*) from personal_assets where character_id='55555555-5555-5555-5555-555555555555');
select set_config('test.uid','22222222-2222-2222-2222-222222222222',false);
select 'encaisse', market_state()->>'collected';
select 'solde alex', balance from accounts where character_id='11111111-1111-1111-1111-111111111111';
select 'pas 2 fois', market_state()->>'collected';
-- commerce de Bea
select set_config('test.uid','44444444-4444-4444-4444-444444444444',false);
select 'stock prix fou', business_restock('bbbbbbbb-0000-0000-0000-000000000001','shop-ps5',5,2000,gen_random_uuid());
select 'stock', business_restock('bbbbbbbb-0000-0000-0000-000000000001','shop-ps5',5,549,'00000000-0000-0000-0000-00000000f201')->>'cost', (select balance from business_treasuries);
select 'propre achat', business_stock_buy((select id from business_stock),gen_random_uuid());
select set_config('test.uid','22222222-2222-2222-2222-222222222222',false);
select 'alex achete vitrine', business_stock_buy((select id from business_stock),'00000000-0000-0000-0000-00000000f301')->>'already';
select 'caisse', balance from business_treasuries; select 'qte', quantity from business_stock;
update world_state set now=now+interval '14 days';
select 'clients fictifs', market_state() is not null; select 'qte apres', quantity, sold_npc from business_stock; select 'caisse', balance from business_treasuries;
select 'relit', market_state() is not null; select 'caisse stable', balance from business_treasuries;
-- blocage
insert into player_blocks values('33333333-3333-3333-3333-333333333333','11111111-1111-1111-1111-111111111111');
select 'annonce ps5', market_list((select id from personal_assets where catalog_id='shop-ps5' and character_id='11111111-1111-1111-1111-111111111111'),500,'') is not null;
select set_config('test.uid','44444444-4444-4444-4444-444444444444',false);
select 'offre bloquee', market_offer((select id from market_listings where status='open'),400);
select 'vitrine bloquee', jsonb_array_length(market_state()->'listings');
