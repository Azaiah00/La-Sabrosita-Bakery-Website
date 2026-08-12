-- =====================================================================
-- LA SABROSITA BAKERY — DEMO SEED
-- One command produces a fully working Bakery OS you can demo to the
-- client before they hand over a single credential.
--
-- ⚠️  EVERY PRICE AND COST BELOW IS A PLACEHOLDER PENDING CLIENT
--     CONFIRMATION. Product names and Spanish spellings are taken from
--     the client's own published menu (typos corrected). Ingredient
--     costs, recipe quantities, vendor prices, sales figures and
--     expenses are ILLUSTRATIVE DEMO DATA and are not claims about this
--     business. See §7 of 00-INTEL-AUDIT-PLAN.md.
-- =====================================================================

begin;

-- ---------------------------------------------------------------------
-- Business + location
-- ---------------------------------------------------------------------
insert into businesses (id, legal_name, dba_name, slug, timezone, default_locale, tax_rate)
values (
  '11111111-1111-1111-1111-111111111111',
  'La Sabrosita Bakery',            -- CONFIRM: legal entity name
  'La Sabrosita Bakery',
  'la-sabrosita',
  'America/New_York',
  'es',
  0.0600                            -- CONFIRM: Chesterfield County VA prepared-food rate
);

insert into locations (
  id, business_id, name, street1, street2, city, region, postal_code,
  phone_primary, phone_secondary, email, latitude, longitude
) values (
  '22222222-2222-2222-2222-222222222222',
  '11111111-1111-1111-1111-111111111111',
  'Midlothian Turnpike',
  '7730 Midlothian Turnpike', 'Ste A', 'Richmond', 'VA', '23235',
  '(804) 986-9695',                 -- CONFIRM: which number is primary
  '(804) 562-8937',
  'LaSabrositaBakery@gmail.com',
  37.4989876, -77.5400652
);

-- CONFIRM: four sources disagree. Google's set is seeded as the least-wrong default.
insert into opening_hours (location_id, dow, opens_at, closes_at) values
  ('22222222-2222-2222-2222-222222222222', 0, '07:00', '19:00'),  -- Sunday
  ('22222222-2222-2222-2222-222222222222', 1, '07:00', '20:00'),
  ('22222222-2222-2222-2222-222222222222', 2, '07:00', '20:00'),
  ('22222222-2222-2222-2222-222222222222', 3, '07:00', '20:00'),
  ('22222222-2222-2222-2222-222222222222', 4, '07:00', '20:00'),
  ('22222222-2222-2222-2222-222222222222', 5, '07:00', '20:00'),
  ('22222222-2222-2222-2222-222222222222', 6, '07:00', '20:00');

-- ---------------------------------------------------------------------
-- Units + conversions
-- ---------------------------------------------------------------------
insert into units (id, code, name_es, name_en, dimension, is_base) values
  ('a0000000-0000-0000-0000-000000000001','g','gramo','gram','mass',true),
  ('a0000000-0000-0000-0000-000000000002','kg','kilogramo','kilogram','mass',false),
  ('a0000000-0000-0000-0000-000000000003','lb','libra','pound','mass',false),
  ('a0000000-0000-0000-0000-000000000004','oz','onza','ounce','mass',false),
  ('a0000000-0000-0000-0000-000000000005','sack_50lb','saco 50 lb','50 lb sack','mass',false),
  ('a0000000-0000-0000-0000-000000000006','ml','mililitro','milliliter','volume',true),
  ('a0000000-0000-0000-0000-000000000007','l','litro','liter','volume',false),
  ('a0000000-0000-0000-0000-000000000008','gal','galón','gallon','volume',false),
  ('a0000000-0000-0000-0000-000000000009','ea','unidad','each','count',true),
  ('a0000000-0000-0000-0000-00000000000a','doz','docena','dozen','count',false),
  ('a0000000-0000-0000-0000-00000000000b','case_30ct','caja 30','case of 30','count',false);

insert into unit_conversions (from_unit_id, to_unit_id, factor) values
  ('a0000000-0000-0000-0000-000000000002','a0000000-0000-0000-0000-000000000001',1000),        -- kg -> g
  ('a0000000-0000-0000-0000-000000000003','a0000000-0000-0000-0000-000000000001',453.59237),   -- lb -> g
  ('a0000000-0000-0000-0000-000000000004','a0000000-0000-0000-0000-000000000001',28.349523125),-- oz -> g
  ('a0000000-0000-0000-0000-000000000005','a0000000-0000-0000-0000-000000000001',22679.6185),  -- 50 lb sack -> g
  ('a0000000-0000-0000-0000-000000000007','a0000000-0000-0000-0000-000000000006',1000),        -- l -> ml
  ('a0000000-0000-0000-0000-000000000008','a0000000-0000-0000-0000-000000000006',3785.411784), -- gal -> ml
  ('a0000000-0000-0000-0000-00000000000a','a0000000-0000-0000-0000-000000000009',12),          -- doz -> ea
  ('a0000000-0000-0000-0000-00000000000b','a0000000-0000-0000-0000-000000000009',30);          -- case -> ea

-- ---------------------------------------------------------------------
-- Menu categories
-- ---------------------------------------------------------------------
insert into menu_categories (id, business_id, slug, name_es, name_en, sort_order) values
  ('b0000000-0000-0000-0000-000000000001','11111111-1111-1111-1111-111111111111','pan-dulce','Pan Dulce','Sweet Bread',1),
  ('b0000000-0000-0000-0000-000000000002','11111111-1111-1111-1111-111111111111','pasteles','Pasteles y Postres','Cakes & Desserts',2),
  ('b0000000-0000-0000-0000-000000000003','11111111-1111-1111-1111-111111111111','quesadilla','Quesadilla Salvadoreña','Salvadoran Cheese Bread',3),
  ('b0000000-0000-0000-0000-000000000004','11111111-1111-1111-1111-111111111111','pan-salado','Pan Salado','Savory Breads',4),
  ('b0000000-0000-0000-0000-000000000005','11111111-1111-1111-1111-111111111111','hojaldres','Hojaldres','Puff Pastries',5),
  ('b0000000-0000-0000-0000-000000000006','11111111-1111-1111-1111-111111111111','donas-galletas','Donas y Galletas','Donuts & Cookies',6);

-- ---------------------------------------------------------------------
-- Products + variants
-- Names from the client's own PRODUCTS page. PRICES ARE PLACEHOLDERS.
-- ---------------------------------------------------------------------
insert into products (id, business_id, category_id, slug, name_es, name_en, description_es, description_en, available_from, sort_order) values
  ('c0000000-0000-0000-0000-000000000001','11111111-1111-1111-1111-111111111111','b0000000-0000-0000-0000-000000000001','concha','Concha','Concha',
   'Pan de levadura suave con costra de azúcar rayada a mano. Sale del horno a las 7 de la mañana.',
   'Soft yeast bread under a hand-scored sugar shell. Out of the oven at 7 AM.','07:00',1),
  ('c0000000-0000-0000-0000-000000000002','11111111-1111-1111-1111-111111111111','b0000000-0000-0000-0000-000000000001','pan-dulce-guayaba','Pan Dulce con Guayaba','Guava Sweet Bread',
   'Relleno de guayaba, horneado cada mañana.','Filled with guava, baked every morning.','07:00',2),
  ('c0000000-0000-0000-0000-000000000003','11111111-1111-1111-1111-111111111111','b0000000-0000-0000-0000-000000000001','semita','Semita de Levadura','Sweet Yeast Bread',
   'Semita tradicional de levadura.','Traditional sweet yeast bread.','07:00',3),
  ('c0000000-0000-0000-0000-000000000004','11111111-1111-1111-1111-111111111111','b0000000-0000-0000-0000-000000000001','marranito','Marranito','Gingerbread Pig Cookie',
   'Galleta de jengibre en forma de cerdito.','Gingerbread cookie shaped like a little pig.',null,4),
  ('c0000000-0000-0000-0000-000000000005','11111111-1111-1111-1111-111111111111','b0000000-0000-0000-0000-000000000001','oreja','Oreja','Elephant Ear',
   'Hojaldre caramelizado, crujiente por fuera.','Caramelized puff pastry, crisp at the edges.',null,5),

  ('c0000000-0000-0000-0000-000000000010','11111111-1111-1111-1111-111111111111','b0000000-0000-0000-0000-000000000002','tres-leches','Tres Leches','Tres Leches',
   'Bizcocho remojado en leche evaporada, leche condensada y leche entera.',
   'Sponge cake soaked in evaporated milk, condensed milk and whole milk.',null,1),
  ('c0000000-0000-0000-0000-000000000011','11111111-1111-1111-1111-111111111111','b0000000-0000-0000-0000-000000000002','flan','Flan','Flan',
   'Flan de la casa, hecho cada mañana.','House flan, made fresh each morning.',null,2),
  ('c0000000-0000-0000-0000-000000000012','11111111-1111-1111-1111-111111111111','b0000000-0000-0000-0000-000000000002','budin-de-pan','Budín de Pan','Bread Pudding',
   'Budín de pan tradicional.','Traditional bread pudding.',null,3),
  ('c0000000-0000-0000-0000-000000000013','11111111-1111-1111-1111-111111111111','b0000000-0000-0000-0000-000000000002','torta-alemana','Torta Alemana','Pound Cake',
   'Torta alemana, por porción o entera.','Pound cake, by the slice or whole.',null,4),

  ('c0000000-0000-0000-0000-000000000020','11111111-1111-1111-1111-111111111111','b0000000-0000-0000-0000-000000000003','quesadilla-salvadorena','Quesadilla Salvadoreña','Salvadoran Cheese Bread',
   'Pan de queso salvadoreño. El más pedido de la casa.','Salvadoran cheese bread. The one people drive across town for.',null,1),

  ('c0000000-0000-0000-0000-000000000030','11111111-1111-1111-1111-111111111111','b0000000-0000-0000-0000-000000000004','pan-queso','Pan Queso','Cheese Bread',
   'Pan de queso, pequeño o grande.','Cheese bread, small or large.',null,1),
  ('c0000000-0000-0000-0000-000000000031','11111111-1111-1111-1111-111111111111','b0000000-0000-0000-0000-000000000004','pan-jalapeno','Pan con Queso y Jalapeño','Jalapeño & Cream Cheese Bread',
   'Pan francés con queso crema y jalapeño.','French bread with cream cheese and jalapeño.',null,2),

  ('c0000000-0000-0000-0000-000000000040','11111111-1111-1111-1111-111111111111','b0000000-0000-0000-0000-000000000005','chicharron-guayaba','Chicharrón de Guayaba','Guava Puff Pastry',
   'Hojaldre relleno de guayaba.','Puff pastry filled with guava.',null,1),
  ('c0000000-0000-0000-0000-000000000041','11111111-1111-1111-1111-111111111111','b0000000-0000-0000-0000-000000000005','quesito','Quesito Puertorriqueño','Puerto Rican Cheese Puff',
   'Hojaldre relleno de queso crema dulce.','Puff pastry filled with sweet cream cheese.',null,2),

  ('c0000000-0000-0000-0000-000000000050','11111111-1111-1111-1111-111111111111','b0000000-0000-0000-0000-000000000006','dona','Dona','Donut',
   'Azúcar, chocolate o glaseada.','Sugar, chocolate or glazed.','07:00',1),
  ('c0000000-0000-0000-0000-000000000051','11111111-1111-1111-1111-111111111111','b0000000-0000-0000-0000-000000000006','churro','Churro','Churro',
   'Sencillo, relleno de cajeta o de crema bávara.','Plain, caramel filled, or Bavarian cream.',null,2),
  ('c0000000-0000-0000-0000-000000000052','11111111-1111-1111-1111-111111111111','b0000000-0000-0000-0000-000000000006','polvoron','Polvorón','Mexican Shortbread Cookie',
   'Galleta mexicana de mantequilla.','Mexican butter shortbread cookie.',null,3);

insert into product_variants (id, business_id, product_id, sku, label_es, label_en, price, is_default, track_stock, sort_order) values
  ('d0000000-0000-0000-0000-000000000001','11111111-1111-1111-1111-111111111111','c0000000-0000-0000-0000-000000000001','PAN-CONCHA','c/u','each',1.75,true,true,1),
  ('d0000000-0000-0000-0000-000000000002','11111111-1111-1111-1111-111111111111','c0000000-0000-0000-0000-000000000001','PAN-CONCHA-DOZ','docena','dozen',18.00,false,true,2),
  ('d0000000-0000-0000-0000-000000000003','11111111-1111-1111-1111-111111111111','c0000000-0000-0000-0000-000000000002','PAN-GUAYABA','c/u','each',2.25,true,false,1),
  ('d0000000-0000-0000-0000-000000000004','11111111-1111-1111-1111-111111111111','c0000000-0000-0000-0000-000000000003','PAN-SEMITA','c/u','each',1.75,true,false,1),
  ('d0000000-0000-0000-0000-000000000005','11111111-1111-1111-1111-111111111111','c0000000-0000-0000-0000-000000000004','PAN-MARRANITO','c/u','each',1.75,true,false,1),
  ('d0000000-0000-0000-0000-000000000006','11111111-1111-1111-1111-111111111111','c0000000-0000-0000-0000-000000000005','PAN-OREJA','c/u','each',1.95,true,false,1),

  ('d0000000-0000-0000-0000-000000000010','11111111-1111-1111-1111-111111111111','c0000000-0000-0000-0000-000000000010','PST-3LECHE-SLICE','porción','slice',5.99,true,true,1),
  ('d0000000-0000-0000-0000-000000000011','11111111-1111-1111-1111-111111111111','c0000000-0000-0000-0000-000000000010','PST-3LECHE-OREO','porción Oreo','Oreo slice',6.50,false,true,2),
  ('d0000000-0000-0000-0000-000000000012','11111111-1111-1111-1111-111111111111','c0000000-0000-0000-0000-000000000010','PST-3LECHE-BANANA','porción plátano','banana pudding slice',7.50,false,true,3),
  ('d0000000-0000-0000-0000-000000000013','11111111-1111-1111-1111-111111111111','c0000000-0000-0000-0000-000000000011','PST-FLAN','porción','portion',6.99,true,true,1),
  ('d0000000-0000-0000-0000-000000000014','11111111-1111-1111-1111-111111111111','c0000000-0000-0000-0000-000000000012','PST-BUDIN','porción','portion',3.25,true,false,1),
  ('d0000000-0000-0000-0000-000000000015','11111111-1111-1111-1111-111111111111','c0000000-0000-0000-0000-000000000013','PST-ALEMANA','porción','slice',3.99,true,false,1),

  ('d0000000-0000-0000-0000-000000000020','11111111-1111-1111-1111-111111111111','c0000000-0000-0000-0000-000000000020','QSD-PEQ','pequeña','small',2.50,false,false,1),
  ('d0000000-0000-0000-0000-000000000021','11111111-1111-1111-1111-111111111111','c0000000-0000-0000-0000-000000000020','QSD-CUARTO','1/4','quarter',4.25,false,false,2),
  ('d0000000-0000-0000-0000-000000000022','11111111-1111-1111-1111-111111111111','c0000000-0000-0000-0000-000000000020','QSD-MEDIA','1/2','half',7.99,false,true,3),
  ('d0000000-0000-0000-0000-000000000023','11111111-1111-1111-1111-111111111111','c0000000-0000-0000-0000-000000000020','QSD-ENTERA','entera','full',13.99,true,true,4),

  ('d0000000-0000-0000-0000-000000000030','11111111-1111-1111-1111-111111111111','c0000000-0000-0000-0000-000000000030','SAL-PANQUESO-P','pequeño','small',2.50,true,false,1),
  ('d0000000-0000-0000-0000-000000000031','11111111-1111-1111-1111-111111111111','c0000000-0000-0000-0000-000000000030','SAL-PANQUESO-G','grande','large',4.50,false,false,2),
  ('d0000000-0000-0000-0000-000000000032','11111111-1111-1111-1111-111111111111','c0000000-0000-0000-0000-000000000031','SAL-JALAPENO','c/u','each',2.75,true,false,1),

  ('d0000000-0000-0000-0000-000000000040','11111111-1111-1111-1111-111111111111','c0000000-0000-0000-0000-000000000040','HOJ-GUAYABA','c/u','each',2.50,true,false,1),
  ('d0000000-0000-0000-0000-000000000041','11111111-1111-1111-1111-111111111111','c0000000-0000-0000-0000-000000000041','HOJ-QUESITO','c/u','each',2.50,true,false,1),

  ('d0000000-0000-0000-0000-000000000050','11111111-1111-1111-1111-111111111111','c0000000-0000-0000-0000-000000000050','DON-SENCILLA','c/u','each',1.50,true,true,1),
  ('d0000000-0000-0000-0000-000000000051','11111111-1111-1111-1111-111111111111','c0000000-0000-0000-0000-000000000050','DON-DOZ','docena','dozen',15.00,false,true,2),
  ('d0000000-0000-0000-0000-000000000052','11111111-1111-1111-1111-111111111111','c0000000-0000-0000-0000-000000000051','DON-CHURRO','c/u','each',2.25,true,false,1),
  ('d0000000-0000-0000-0000-000000000053','11111111-1111-1111-1111-111111111111','c0000000-0000-0000-0000-000000000052','DON-POLVORON','c/u','each',1.50,true,false,1);

-- ---------------------------------------------------------------------
-- Ingredients (DEMO COSTS)
-- ---------------------------------------------------------------------
insert into ingredients (id, business_id, sku, name_es, name_en, stock_unit_id, purchase_unit_id, purchase_pack_qty, last_unit_cost, reorder_point, par_level, is_perishable, shelf_life_days) values
  ('e0000000-0000-0000-0000-000000000001','11111111-1111-1111-1111-111111111111','ING-HARINA','Harina de trigo','Bread flour',
   'a0000000-0000-0000-0000-000000000001','a0000000-0000-0000-0000-000000000005',22679.6185,0.0011,45000,180000,false,null),
  ('e0000000-0000-0000-0000-000000000002','11111111-1111-1111-1111-111111111111','ING-AZUCAR','Azúcar','Granulated sugar',
   'a0000000-0000-0000-0000-000000000001','a0000000-0000-0000-0000-000000000005',22679.6185,0.0013,22000,90000,false,null),
  ('e0000000-0000-0000-0000-000000000003','11111111-1111-1111-1111-111111111111','ING-MANTEQUILLA','Mantequilla','Butter',
   'a0000000-0000-0000-0000-000000000001','a0000000-0000-0000-0000-000000000003',453.59237,0.0095,9000,27000,true,60),
  ('e0000000-0000-0000-0000-000000000004','11111111-1111-1111-1111-111111111111','ING-HUEVO','Huevos','Eggs',
   'a0000000-0000-0000-0000-000000000009','a0000000-0000-0000-0000-00000000000b',30,0.2400,180,900,true,28),
  ('e0000000-0000-0000-0000-000000000005','11111111-1111-1111-1111-111111111111','ING-LECHE','Leche entera','Whole milk',
   'a0000000-0000-0000-0000-000000000006','a0000000-0000-0000-0000-000000000008',3785.411784,0.0013,7500,30000,true,10),
  ('e0000000-0000-0000-0000-000000000006','11111111-1111-1111-1111-111111111111','ING-LECHE-COND','Leche condensada','Condensed milk',
   'a0000000-0000-0000-0000-000000000006','a0000000-0000-0000-0000-000000000007',1000,0.0042,4000,16000,false,null),
  ('e0000000-0000-0000-0000-000000000007','11111111-1111-1111-1111-111111111111','ING-LECHE-EVAP','Leche evaporada','Evaporated milk',
   'a0000000-0000-0000-0000-000000000006','a0000000-0000-0000-0000-000000000007',1000,0.0034,4000,16000,false,null),
  ('e0000000-0000-0000-0000-000000000008','11111111-1111-1111-1111-111111111111','ING-QUESO','Queso duro','Hard cheese',
   'a0000000-0000-0000-0000-000000000001','a0000000-0000-0000-0000-000000000003',453.59237,0.0132,7000,23000,true,45),
  ('e0000000-0000-0000-0000-000000000009','11111111-1111-1111-1111-111111111111','ING-GUAYABA','Pasta de guayaba','Guava paste',
   'a0000000-0000-0000-0000-000000000001','a0000000-0000-0000-0000-000000000003',453.59237,0.0068,3000,11000,false,null),
  ('e0000000-0000-0000-0000-00000000000a','11111111-1111-1111-1111-111111111111','ING-LEVADURA','Levadura','Yeast',
   'a0000000-0000-0000-0000-000000000001','a0000000-0000-0000-0000-000000000003',453.59237,0.0088,900,3600,false,null),
  ('e0000000-0000-0000-0000-00000000000b','11111111-1111-1111-1111-111111111111','ING-CANELA','Canela molida','Ground cinnamon',
   'a0000000-0000-0000-0000-000000000001','a0000000-0000-0000-0000-000000000003',453.59237,0.0210,450,1800,false,null),
  ('e0000000-0000-0000-0000-00000000000c','11111111-1111-1111-1111-111111111111','ING-CAJA-PAST','Caja de pastel 10"','10" cake box',
   'a0000000-0000-0000-0000-000000000009','a0000000-0000-0000-0000-00000000000b',30,0.6500,60,300,false,null);

-- ---------------------------------------------------------------------
-- Recipes / BOM (DEMO QUANTITIES)
-- ---------------------------------------------------------------------
insert into recipes (id, business_id, variant_id, name_es, name_en, yield_qty, yield_unit_id, labor_minutes) values
  ('f0000000-0000-0000-0000-000000000001','11111111-1111-1111-1111-111111111111','d0000000-0000-0000-0000-000000000001',
   'Masa de concha — tanda','Concha dough — batch',48,'a0000000-0000-0000-0000-000000000009',95),
  ('f0000000-0000-0000-0000-000000000002','11111111-1111-1111-1111-111111111111','d0000000-0000-0000-0000-000000000010',
   'Tres leches — molde','Tres leches — sheet',24,'a0000000-0000-0000-0000-000000000009',75),
  ('f0000000-0000-0000-0000-000000000003','11111111-1111-1111-1111-111111111111','d0000000-0000-0000-0000-000000000023',
   'Quesadilla Salvadoreña entera','Full Salvadoran cheese bread',6,'a0000000-0000-0000-0000-000000000009',60),
  -- Sub-recipe: no variant_id, consumed by others.
  ('f0000000-0000-0000-0000-000000000004','11111111-1111-1111-1111-111111111111',null,
   'Costra de azúcar','Sugar shell topping',1200,'a0000000-0000-0000-0000-000000000001',20);

insert into recipe_items (recipe_id, ingredient_id, sub_recipe_id, qty, unit_id, sort_order) values
  -- Concha dough (48 conchas)
  ('f0000000-0000-0000-0000-000000000001','e0000000-0000-0000-0000-000000000001',null,3000,'a0000000-0000-0000-0000-000000000001',1),
  ('f0000000-0000-0000-0000-000000000001','e0000000-0000-0000-0000-000000000002',null,600,'a0000000-0000-0000-0000-000000000001',2),
  ('f0000000-0000-0000-0000-000000000001','e0000000-0000-0000-0000-000000000003',null,1.5,'a0000000-0000-0000-0000-000000000003',3),
  ('f0000000-0000-0000-0000-000000000001','e0000000-0000-0000-0000-000000000004',null,12,'a0000000-0000-0000-0000-000000000009',4),
  ('f0000000-0000-0000-0000-000000000001','e0000000-0000-0000-0000-000000000005',null,1.2,'a0000000-0000-0000-0000-000000000007',5),
  ('f0000000-0000-0000-0000-000000000001','e0000000-0000-0000-0000-00000000000a',null,90,'a0000000-0000-0000-0000-000000000001',6),
  ('f0000000-0000-0000-0000-000000000001',null,'f0000000-0000-0000-0000-000000000004',960,'a0000000-0000-0000-0000-000000000001',7),

  -- Sugar shell sub-recipe (yields 1200 g)
  ('f0000000-0000-0000-0000-000000000004','e0000000-0000-0000-0000-000000000002',null,500,'a0000000-0000-0000-0000-000000000001',1),
  ('f0000000-0000-0000-0000-000000000004','e0000000-0000-0000-0000-000000000003',null,300,'a0000000-0000-0000-0000-000000000001',2),
  ('f0000000-0000-0000-0000-000000000004','e0000000-0000-0000-0000-000000000001',null,400,'a0000000-0000-0000-0000-000000000001',3),

  -- Tres leches (24 slices)
  ('f0000000-0000-0000-0000-000000000002','e0000000-0000-0000-0000-000000000001',null,900,'a0000000-0000-0000-0000-000000000001',1),
  ('f0000000-0000-0000-0000-000000000002','e0000000-0000-0000-0000-000000000002',null,750,'a0000000-0000-0000-0000-000000000001',2),
  ('f0000000-0000-0000-0000-000000000002','e0000000-0000-0000-0000-000000000004',null,18,'a0000000-0000-0000-0000-000000000009',3),
  ('f0000000-0000-0000-0000-000000000002','e0000000-0000-0000-0000-000000000006',null,1.2,'a0000000-0000-0000-0000-000000000007',4),
  ('f0000000-0000-0000-0000-000000000002','e0000000-0000-0000-0000-000000000007',null,1.2,'a0000000-0000-0000-0000-000000000007',5),
  ('f0000000-0000-0000-0000-000000000002','e0000000-0000-0000-0000-000000000005',null,600,'a0000000-0000-0000-0000-000000000006',6),
  ('f0000000-0000-0000-0000-000000000002','e0000000-0000-0000-0000-00000000000c',null,1,'a0000000-0000-0000-0000-000000000009',7),

  -- Quesadilla Salvadoreña (6 full)
  ('f0000000-0000-0000-0000-000000000003','e0000000-0000-0000-0000-000000000001',null,1400,'a0000000-0000-0000-0000-000000000001',1),
  ('f0000000-0000-0000-0000-000000000003','e0000000-0000-0000-0000-000000000008',null,2.2,'a0000000-0000-0000-0000-000000000003',2),
  ('f0000000-0000-0000-0000-000000000003','e0000000-0000-0000-0000-000000000002',null,900,'a0000000-0000-0000-0000-000000000001',3),
  ('f0000000-0000-0000-0000-000000000003','e0000000-0000-0000-0000-000000000003',null,1.1,'a0000000-0000-0000-0000-000000000003',4),
  ('f0000000-0000-0000-0000-000000000003','e0000000-0000-0000-0000-000000000004',null,14,'a0000000-0000-0000-0000-000000000009',5),
  ('f0000000-0000-0000-0000-000000000003','e0000000-0000-0000-0000-000000000005',null,500,'a0000000-0000-0000-0000-000000000006',6);

-- ---------------------------------------------------------------------
-- Vendors
-- ---------------------------------------------------------------------
insert into vendors (id, business_id, name, contact_name, phone, lead_time_days, min_order) values
  ('01000000-0000-0000-0000-000000000001','11111111-1111-1111-1111-111111111111','Restaurant Depot','Counter','(804) 555-0111',1,250.00),
  ('01000000-0000-0000-0000-000000000002','11111111-1111-1111-1111-111111111111','Dairy distributor','Route driver','(804) 555-0122',2,150.00),
  ('01000000-0000-0000-0000-000000000003','11111111-1111-1111-1111-111111111111','Packaging supplier','Sales rep','(804) 555-0133',5,300.00);

insert into vendor_ingredients (vendor_id, ingredient_id, purchase_unit_id, purchase_pack_qty, pack_price, is_preferred) values
  ('01000000-0000-0000-0000-000000000001','e0000000-0000-0000-0000-000000000001','a0000000-0000-0000-0000-000000000005',22679.6185,24.95,true),
  ('01000000-0000-0000-0000-000000000001','e0000000-0000-0000-0000-000000000002','a0000000-0000-0000-0000-000000000005',22679.6185,29.50,true),
  ('01000000-0000-0000-0000-000000000002','e0000000-0000-0000-0000-000000000003','a0000000-0000-0000-0000-000000000003',453.59237,4.31,true),
  ('01000000-0000-0000-0000-000000000002','e0000000-0000-0000-0000-000000000004','a0000000-0000-0000-0000-00000000000b',30,7.20,true),
  ('01000000-0000-0000-0000-000000000002','e0000000-0000-0000-0000-000000000005','a0000000-0000-0000-0000-000000000008',3785.411784,4.92,true),
  ('01000000-0000-0000-0000-000000000003','e0000000-0000-0000-0000-00000000000c','a0000000-0000-0000-0000-00000000000b',30,19.50,true);

-- ---------------------------------------------------------------------
-- Opening inventory (a receipt for each ingredient)
-- ---------------------------------------------------------------------
insert into inventory_transactions (business_id, location_id, ingredient_id, txn_type, qty_delta, unit_cost, reference_type, note)
select
  '11111111-1111-1111-1111-111111111111',
  '22222222-2222-2222-2222-222222222222',
  id, 'receipt', par_level, last_unit_cost, 'seed', 'Opening count — demo seed'
from ingredients
where business_id = '11111111-1111-1111-1111-111111111111';

-- Draw some down so the low-stock queue has something in it.
insert into inventory_transactions (business_id, location_id, ingredient_id, txn_type, qty_delta, unit_cost, reference_type, note) values
  ('11111111-1111-1111-1111-111111111111','22222222-2222-2222-2222-222222222222','e0000000-0000-0000-0000-000000000003','production_draw',-19000,0.0095,'seed','Week of production'),
  ('11111111-1111-1111-1111-111111111111','22222222-2222-2222-2222-222222222222','e0000000-0000-0000-0000-00000000000b','production_draw',-1400,0.0210,'seed','Week of production'),
  ('11111111-1111-1111-1111-111111111111','22222222-2222-2222-2222-222222222222','e0000000-0000-0000-0000-000000000004','production_draw',-740,0.2400,'seed','Week of production');

-- ---------------------------------------------------------------------
-- Cake configurator options
-- ---------------------------------------------------------------------
insert into cake_sizes (id, business_id, label_es, label_en, servings_min, servings_max, base_price, min_lead_hours, max_tiers, sort_order) values
  ('02000000-0000-0000-0000-000000000001','11111111-1111-1111-1111-111111111111','1/4 de plancha','Quarter sheet',15,20,45.00,48,1,1),
  ('02000000-0000-0000-0000-000000000002','11111111-1111-1111-1111-111111111111','1/2 plancha','Half sheet',30,40,75.00,48,1,2),
  ('02000000-0000-0000-0000-000000000003','11111111-1111-1111-1111-111111111111','Plancha entera','Full sheet',60,80,135.00,72,1,3),
  ('02000000-0000-0000-0000-000000000004','11111111-1111-1111-1111-111111111111','2 pisos','Two tier',50,70,195.00,168,2,4),
  ('02000000-0000-0000-0000-000000000005','11111111-1111-1111-1111-111111111111','3 pisos','Three tier',90,120,325.00,168,3,5);

insert into cake_options (business_id, option_group, slug, label_es, label_en, price_delta, extra_lead_hours, sort_order) values
  ('11111111-1111-1111-1111-111111111111','flavor','tres-leches','Tres leches','Tres leches',0,0,1),
  ('11111111-1111-1111-1111-111111111111','flavor','vainilla','Vainilla','Vanilla',0,0,2),
  ('11111111-1111-1111-1111-111111111111','flavor','chocolate','Chocolate','Chocolate',0,0,3),
  ('11111111-1111-1111-1111-111111111111','flavor','marmol','Mármol','Marble',5.00,0,4),
  ('11111111-1111-1111-1111-111111111111','filling','fresa','Fresa','Strawberry',0,0,1),
  ('11111111-1111-1111-1111-111111111111','filling','durazno','Durazno','Peach',0,0,2),
  ('11111111-1111-1111-1111-111111111111','filling','cajeta','Cajeta','Dulce de leche',5.00,0,3),
  ('11111111-1111-1111-1111-111111111111','filling','guayaba','Guayaba','Guava',5.00,0,4),
  ('11111111-1111-1111-1111-111111111111','frosting','crema','Crema batida','Whipped cream',0,0,1),
  ('11111111-1111-1111-1111-111111111111','frosting','buttercream','Buttercream','Buttercream',0,0,2),
  ('11111111-1111-1111-1111-111111111111','frosting','fondant','Fondant','Fondant',35.00,72,3),
  ('11111111-1111-1111-1111-111111111111','finish','sencillo','Sencillo','Simple',0,0,1),
  ('11111111-1111-1111-1111-111111111111','finish','flores','Flores de crema','Piped flowers',15.00,0,2),
  ('11111111-1111-1111-1111-111111111111','finish','foto','Foto comestible','Edible photo',20.00,24,3);

insert into lead_time_rules (business_id, applies_to, min_tiers, min_servings, requires_finish_slug, min_lead_hours, max_advance_days, priority) values
  ('11111111-1111-1111-1111-111111111111','cake',null,null,null,48,180,0),
  ('11111111-1111-1111-1111-111111111111','cake',null,60,null,72,180,10),
  ('11111111-1111-1111-1111-111111111111','cake',2,null,null,168,365,20),
  ('11111111-1111-1111-1111-111111111111','cake',null,null,'foto',72,180,15),
  ('11111111-1111-1111-1111-111111111111','pickup',null,null,null,12,30,0),
  ('11111111-1111-1111-1111-111111111111','catering',null,null,null,72,180,0);

insert into pickup_capacity_rules (business_id, location_id, applies_to, dow, window_start, window_end, slot_minutes, max_per_slot)
select '11111111-1111-1111-1111-111111111111','22222222-2222-2222-2222-222222222222','pickup', d, '07:00','19:00',30,12
from generate_series(0,6) as d;

insert into pickup_capacity_rules (business_id, location_id, applies_to, dow, window_start, window_end, slot_minutes, max_per_slot)
select '11111111-1111-1111-1111-111111111111','22222222-2222-2222-2222-222222222222','cake', d, '09:00','18:00',60,4
from generate_series(0,6) as d;

-- ---------------------------------------------------------------------
-- Expense categories
-- ---------------------------------------------------------------------
insert into expense_categories (business_id, slug, name_es, name_en, is_cogs, is_labor, sort_order) values
  ('11111111-1111-1111-1111-111111111111','ingredientes','Ingredientes','Ingredients',true,false,1),
  ('11111111-1111-1111-1111-111111111111','empaque','Empaque','Packaging',true,false,2),
  ('11111111-1111-1111-1111-111111111111','nomina','Nómina','Payroll',false,true,3),
  ('11111111-1111-1111-1111-111111111111','renta','Renta','Rent',false,false,4),
  ('11111111-1111-1111-1111-111111111111','servicios','Servicios','Utilities',false,false,5),
  ('11111111-1111-1111-1111-111111111111','equipo','Equipo y reparación','Equipment & repair',false,false,6),
  ('11111111-1111-1111-1111-111111111111','marketing','Publicidad','Marketing',false,false,7),
  ('11111111-1111-1111-1111-111111111111','seguro','Seguro','Insurance',false,false,8),
  ('11111111-1111-1111-1111-111111111111','combustible','Combustible y reparto','Fuel & delivery',false,false,9);

-- ---------------------------------------------------------------------
-- Wholesale
-- ---------------------------------------------------------------------
insert into price_lists (id, business_id, name, is_default) values
  ('03000000-0000-0000-0000-000000000001','11111111-1111-1111-1111-111111111111','Mayoreo estándar',true);

insert into price_list_items (price_list_id, variant_id, unit_price, case_qty, min_qty) values
  ('03000000-0000-0000-0000-000000000001','d0000000-0000-0000-0000-000000000001',0.95,24,24),
  ('03000000-0000-0000-0000-000000000001','d0000000-0000-0000-0000-000000000003',1.20,24,24),
  ('03000000-0000-0000-0000-000000000001','d0000000-0000-0000-0000-000000000004',0.95,24,24),
  ('03000000-0000-0000-0000-000000000001','d0000000-0000-0000-0000-000000000023',8.50,6,6),
  ('03000000-0000-0000-0000-000000000001','d0000000-0000-0000-0000-000000000040',1.35,24,24),
  ('03000000-0000-0000-0000-000000000001','d0000000-0000-0000-0000-000000000050',0.80,36,36);

insert into wholesale_accounts (id, business_id, store_name, contact_name, email, phone, street1, city, region, postal_code, price_list_id, delivery_dow, delivery_route, credit_terms_days, status, approved_at) values
  ('04000000-0000-0000-0000-000000000001','11111111-1111-1111-1111-111111111111','Tienda La Esperanza','Gerente','esperanza@example.com','(804) 555-0201','1200 Hull Street','Richmond','VA','23224','03000000-0000-0000-0000-000000000001',2,'Richmond South',14,'approved',now() - interval '2 years'),
  ('04000000-0000-0000-0000-000000000002','11111111-1111-1111-1111-111111111111','Supermercado El Progreso','Gerente','progreso@example.com','(804) 555-0202','450 Main Street','Petersburg','VA','23803','03000000-0000-0000-0000-000000000001',4,'Tri-Cities',14,'approved',now() - interval '3 years'),
  ('04000000-0000-0000-0000-000000000003','11111111-1111-1111-1111-111111111111','Mercado Del Valle','Gerente','delvalle@example.com','(757) 555-0203','88 Ocean Highway','Onley','VA','23418','03000000-0000-0000-0000-000000000001',5,'Eastern Shore',21,'approved',now() - interval '1 year'),
  ('04000000-0000-0000-0000-000000000004','11111111-1111-1111-1111-111111111111','Carniceria Los Primos','Gerente','primos@example.com','(252) 555-0204','15 Elizabeth Street','Elizabeth City','NC','27909',null,null,null,0,'pending',null);

insert into standing_orders (id, business_id, wholesale_account_id, dow) values
  ('05000000-0000-0000-0000-000000000001','11111111-1111-1111-1111-111111111111','04000000-0000-0000-0000-000000000001',2),
  ('05000000-0000-0000-0000-000000000002','11111111-1111-1111-1111-111111111111','04000000-0000-0000-0000-000000000002',4);

insert into standing_order_items (standing_order_id, variant_id, qty) values
  ('05000000-0000-0000-0000-000000000001','d0000000-0000-0000-0000-000000000001',96),
  ('05000000-0000-0000-0000-000000000001','d0000000-0000-0000-0000-000000000040',48),
  ('05000000-0000-0000-0000-000000000001','d0000000-0000-0000-0000-000000000023',12),
  ('05000000-0000-0000-0000-000000000002','d0000000-0000-0000-0000-000000000001',72),
  ('05000000-0000-0000-0000-000000000002','d0000000-0000-0000-0000-000000000050',72);

-- ---------------------------------------------------------------------
-- Daily stock for the next 14 days (tracked variants only)
-- ---------------------------------------------------------------------
insert into daily_stock (business_id, location_id, variant_id, for_date, qty_available)
select
  '11111111-1111-1111-1111-111111111111',
  '22222222-2222-2222-2222-222222222222',
  pv.id,
  d::date,
  case pv.sku
    when 'PAN-CONCHA'         then 180
    when 'PAN-CONCHA-DOZ'     then 15
    when 'PST-3LECHE-SLICE'   then 48
    when 'PST-3LECHE-OREO'    then 24
    when 'PST-3LECHE-BANANA'  then 24
    when 'PST-FLAN'           then 30
    when 'QSD-MEDIA'          then 20
    when 'QSD-ENTERA'         then 18
    when 'DON-SENCILLA'       then 120
    when 'DON-DOZ'            then 10
    else 40
  end
from product_variants pv
cross join generate_series(current_date, current_date + interval '13 days', interval '1 day') as d
where pv.track_stock and pv.business_id = '11111111-1111-1111-1111-111111111111';

-- ---------------------------------------------------------------------
-- Customers
-- ---------------------------------------------------------------------
insert into customers (id, business_id, email, phone, full_name, locale, email_opt_in, sms_opt_in, sms_opt_in_at, is_vip, lifetime_orders, lifetime_value) values
  ('06000000-0000-0000-0000-000000000001','11111111-1111-1111-1111-111111111111','maria@example.com','(804) 555-0301','María Hernández','es',true,true,now() - interval '400 days',true,23,1240.55),
  ('06000000-0000-0000-0000-000000000002','11111111-1111-1111-1111-111111111111','james@example.com','(804) 555-0302','James Whitfield','en',true,false,null,false,4,89.40),
  ('06000000-0000-0000-0000-000000000003','11111111-1111-1111-1111-111111111111','rosa@example.com','(804) 555-0303','Rosa Martínez','es',true,true,now() - interval '90 days',false,9,415.20),
  ('06000000-0000-0000-0000-000000000004','11111111-1111-1111-1111-111111111111','dan@example.com','(804) 555-0304','Danielle Cole','en',false,false,null,false,1,13.99);

-- ---------------------------------------------------------------------
-- A week of demo orders via the race-safe RPC (so reservations are real)
-- ---------------------------------------------------------------------
do $$
declare
  v_order uuid;
  v_pickup timestamptz;
  i integer;
begin
  for i in 0..6 loop
    v_pickup := (((current_date + i)::timestamp + time '10:00') at time zone 'America/New_York');

    v_order := place_order(
      '11111111-1111-1111-1111-111111111111',
      '22222222-2222-2222-2222-222222222222',
      'pickup', 'María Hernández', '(804) 555-0301', 'maria@example.com', 'es',
      v_pickup,
      jsonb_build_array(
        jsonb_build_object('variant_id','d0000000-0000-0000-0000-000000000001','qty', 6 + i),
        jsonb_build_object('variant_id','d0000000-0000-0000-0000-000000000010','qty', 2)
      ),
      'Sin nuez por favor', 'Alergia a la nuez'
    );
    update orders set status = 'confirmed', customer_id = '06000000-0000-0000-0000-000000000001',
                      confirmed_at = now(), amount_paid = total
     where id = v_order;

    v_order := place_order(
      '11111111-1111-1111-1111-111111111111',
      '22222222-2222-2222-2222-222222222222',
      'pickup', 'James Whitfield', '(804) 555-0302', 'james@example.com', 'en',
      v_pickup + interval '3 hours',
      jsonb_build_array(
        jsonb_build_object('variant_id','d0000000-0000-0000-0000-000000000023','qty', 1),
        jsonb_build_object('variant_id','d0000000-0000-0000-0000-000000000050','qty', 4)
      ),
      null, null
    );
    update orders set status = 'confirmed', customer_id = '06000000-0000-0000-0000-000000000002',
                      confirmed_at = now(), amount_paid = total
     where id = v_order;
  end loop;
end;
$$;

-- One cake order with a deposit, so the cake pipeline demos too.
do $$
declare v_order uuid;
begin
  v_order := place_order(
    '11111111-1111-1111-1111-111111111111',
    '22222222-2222-2222-2222-222222222222',
    'cake', 'Rosa Martínez', '(804) 555-0303', 'rosa@example.com', 'es',
    (((current_date + 9)::timestamp + time '14:00') at time zone 'America/New_York'),
    jsonb_build_array(jsonb_build_object('variant_id','d0000000-0000-0000-0000-000000000010','qty',1)),
    'Quinceañera de Sofía — listones color vino', null, 'web'
  );

  update orders
     set status = 'confirmed', customer_id = '06000000-0000-0000-0000-000000000003',
         subtotal = 195.00, tax = 11.70, total = 206.70,
         deposit_due = 62.01, amount_paid = 62.01,
         occasion = 'quinceañera', confirmed_at = now()
   where id = v_order;

  insert into cake_order_details (order_id, size_id, tiers, inscription, inscription_lang, color_notes, serves_estimate)
  values (v_order, '02000000-0000-0000-0000-000000000004', 2,
          'Felices 15, Sofía', 'es', 'Vino y oro', 60);
end;
$$;

-- ---------------------------------------------------------------------
-- 90 days of sales + expenses so the P&L and dashboards have shape
-- ---------------------------------------------------------------------
insert into sales_days (
  business_id, location_id, business_date, gross_sales, tax_collected,
  cash_expected, cash_counted, card_total, online_total, wholesale_total,
  marketplace_total, marketplace_fees, transaction_count, closed_at
)
select
  '11111111-1111-1111-1111-111111111111',
  '22222222-2222-2222-2222-222222222222',
  d::date,
  base, round(base * 0.06, 2),
  round(base * 0.30, 2), round(base * 0.30, 2) - (case when extract(day from d)::int % 11 = 0 then 4.25 else 0 end),
  round(base * 0.46, 2), round(base * 0.09, 2), round(base * 0.12, 2),
  round(base * 0.03, 2), round(base * 0.03 * 0.25, 2),
  (base / 14)::int,
  d + interval '21 hours'
from (
  select d,
         round((1850
           + case extract(dow from d)::int when 0 then 620 when 6 then 840 when 5 then 410 else 0 end
           + ((extract(doy from d)::int * 37) % 260))::numeric, 2) as base
  from generate_series(current_date - interval '89 days', current_date - interval '1 day', interval '1 day') as d
) s;

-- Ingredients + packaging land WEEKLY and scale with sales, so food-cost %
-- lands in the 26-32% band a real bakery actually runs at.
insert into expenses (business_id, location_id, category_id, spent_on, amount, method, description)
select
  '11111111-1111-1111-1111-111111111111',
  '22222222-2222-2222-2222-222222222222',
  ec.id,
  w.week_start,
  case ec.slug
    when 'ingredientes' then round(w.week_sales * 0.265, 2)
    when 'empaque'      then round(w.week_sales * 0.021, 2)
  end,
  'card'::expense_method,
  ec.name_en || ' — weekly purchase (demo)'
from (
  select date_trunc('week', business_date)::date as week_start,
         sum(gross_sales) as week_sales
    from sales_days
   group by 1
) w
cross join expense_categories ec
where ec.business_id = '11111111-1111-1111-1111-111111111111'
  and ec.slug in ('ingredientes','empaque');

-- Fixed and periodic overheads land monthly.
insert into expenses (business_id, location_id, category_id, spent_on, amount, method, description)
select
  '11111111-1111-1111-1111-111111111111',
  '22222222-2222-2222-2222-222222222222',
  ec.id,
  m::date,
  case ec.slug
    when 'nomina'      then 17800.00
    when 'renta'       then 5200.00
    when 'servicios'   then 2150.00
    when 'equipo'      then 640.00
    when 'marketing'   then 450.00
    when 'seguro'      then 780.00
    when 'combustible' then 1250.00
  end,
  (case ec.slug when 'nomina' then 'ach' when 'renta' then 'check' else 'card' end)::expense_method,
  ec.name_en || ' — monthly (demo)'
from expense_categories ec
cross join generate_series(
  date_trunc('month', current_date - interval '89 days'),
  date_trunc('month', current_date),
  interval '1 month'
) as m
where ec.business_id = '11111111-1111-1111-1111-111111111111'
  and ec.slug in ('nomina','renta','servicios','equipo','marketing','seguro','combustible');

insert into labor_costs (business_id, location_id, period_start, period_end, total_hours, gross_wages, payroll_taxes, headcount)
select
  '11111111-1111-1111-1111-111111111111',
  '22222222-2222-2222-2222-222222222222',
  d::date,
  (d + interval '6 days')::date,
  462, 4100.00, 380.00, 11
from generate_series(
  date_trunc('week', current_date - interval '89 days'),
  date_trunc('week', current_date - interval '7 days'),
  interval '1 week'
) as d;

-- ---------------------------------------------------------------------
-- Waste log (a week), so the shrink report is not empty
-- ---------------------------------------------------------------------
insert into waste_log (business_id, location_id, variant_id, qty, unit_id, reason, est_value, occurred_at)
select
  '11111111-1111-1111-1111-111111111111',
  '22222222-2222-2222-2222-222222222222',
  'd0000000-0000-0000-0000-000000000001',
  (6 + (extract(doy from d)::int % 9)),
  'a0000000-0000-0000-0000-000000000009',
  'end_of_day',
  round((6 + (extract(doy from d)::int % 9)) * 1.75, 2),
  d + interval '20 hours'
from generate_series(current_date - interval '6 days', current_date - interval '1 day', interval '1 day') as d;

-- ---------------------------------------------------------------------
-- Wholesale invoices — so the aging report has real buckets
-- ---------------------------------------------------------------------
insert into invoices (id, business_id, wholesale_account_id, invoice_number, status, issue_date, due_date, subtotal, tax, total, amount_paid)
values
  ('07000000-0000-0000-0000-000000000001','11111111-1111-1111-1111-111111111111','04000000-0000-0000-0000-000000000001',
   'INV-005001','paid',    current_date - 62, current_date - 48, 486.40, 0, 486.40, 486.40),
  ('07000000-0000-0000-0000-000000000002','11111111-1111-1111-1111-111111111111','04000000-0000-0000-0000-000000000001',
   'INV-005002','sent',    current_date - 20, current_date - 6,  512.75, 0, 512.75, 0),
  ('07000000-0000-0000-0000-000000000003','11111111-1111-1111-1111-111111111111','04000000-0000-0000-0000-000000000002',
   'INV-005003','partial', current_date - 55, current_date - 41, 738.20, 0, 738.20, 300.00),
  ('07000000-0000-0000-0000-000000000004','11111111-1111-1111-1111-111111111111','04000000-0000-0000-0000-000000000003',
   'INV-005004','overdue', current_date - 118, current_date - 97, 1042.60, 0, 1042.60, 0),
  ('07000000-0000-0000-0000-000000000005','11111111-1111-1111-1111-111111111111','04000000-0000-0000-0000-000000000002',
   'INV-005005','sent',    current_date - 5,  current_date + 9,  655.00, 0, 655.00, 0);

insert into invoice_items (invoice_id, description, qty, unit_price, line_total) values
  ('07000000-0000-0000-0000-000000000001','Conchas — caso 24', 96, 0.95, 91.20),
  ('07000000-0000-0000-0000-000000000001','Quesadilla entera', 12, 8.50, 102.00),
  ('07000000-0000-0000-0000-000000000002','Conchas — caso 24', 96, 0.95, 91.20),
  ('07000000-0000-0000-0000-000000000003','Donas — caso 36', 144, 0.80, 115.20),
  ('07000000-0000-0000-0000-000000000004','Chicharrón de guayaba', 96, 1.35, 129.60),
  ('07000000-0000-0000-0000-000000000005','Conchas — caso 24', 72, 0.95, 68.40);

insert into invoice_payments (invoice_id, amount, method, reference, received_at) values
  ('07000000-0000-0000-0000-000000000001', 486.40, 'check','CK 4412', now() - interval '46 days'),
  ('07000000-0000-0000-0000-000000000003', 300.00, 'check','CK 8890', now() - interval '30 days');

-- ---------------------------------------------------------------------
-- Announcement
-- ---------------------------------------------------------------------
insert into announcements (business_id, body_es, body_en, link_url) values
  ('11111111-1111-1111-1111-111111111111',
   'Pedidos de pasteles de quinceañera: 7 días de anticipación.',
   'Quinceañera cake orders: 7 days'' notice.',
   '/es/pasteles/quinceanera');

-- ---------------------------------------------------------------------
-- Settings
-- ---------------------------------------------------------------------
insert into settings (business_id, key, value) values
  ('11111111-1111-1111-1111-111111111111','deposit_policy',
   '{"cake_deposit_pct":30,"cancel_full_refund_hours":72,"cancel_partial_refund_hours":48,"partial_refund_pct":50}'::jsonb),
  ('11111111-1111-1111-1111-111111111111','notifications',
   '{"reminder_email_hours":24,"reminder_sms_hours":3,"quiet_hours_start":"21:00","quiet_hours_end":"08:00"}'::jsonb),
  ('11111111-1111-1111-1111-111111111111','marketplace_rates',
   '{"doordash_delivery_pct":25,"doordash_pickup_pct":15,"grubhub_pct":25,"stripe_pct":2.9,"stripe_fixed":0.30,"note":"CONFIRM against the client merchant statements"}'::jsonb);

commit;
