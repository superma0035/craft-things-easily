-- Drop the existing unique constraint
ALTER TABLE tables DROP CONSTRAINT IF EXISTS tables_restaurant_id_table_number_key;

-- Create a new partial unique constraint that only applies to active tables
CREATE UNIQUE INDEX tables_restaurant_id_table_number_active_key 
ON tables (restaurant_id, table_number) 
WHERE is_active = true;