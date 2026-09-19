USE mvacable;

/* Create table (safe if it already exists) */
CREATE TABLE IF NOT EXISTS cable_customers (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  customer_type VARCHAR(10) NOT NULL,
  customer_id VARCHAR(50) NOT NULL,
  name VARCHAR(255) NOT NULL,
  mobile VARCHAR(20) DEFAULT NULL,
  address TEXT,
  area VARCHAR(255) DEFAULT NULL,
  joining_date DATE DEFAULT NULL,
  notes TEXT,
  monthly_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
  is_active TINYINT NOT NULL DEFAULT 1,
  uid INT DEFAULT NULL,
  shop_id VARCHAR(255) DEFAULT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_cable_customer_shop (shop_id, customer_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

/* If table already exists from an older version, add missing columns */
ALTER TABLE cable_customers
  ADD COLUMN IF NOT EXISTS customer_type VARCHAR(10) NOT NULL AFTER id,
  ADD COLUMN IF NOT EXISTS customer_id VARCHAR(50) NOT NULL AFTER customer_type,
  ADD COLUMN IF NOT EXISTS name VARCHAR(255) NOT NULL AFTER customer_id,
  ADD COLUMN IF NOT EXISTS mobile VARCHAR(20) DEFAULT NULL AFTER name,
  ADD COLUMN IF NOT EXISTS address TEXT AFTER mobile,
  ADD COLUMN IF NOT EXISTS area VARCHAR(255) DEFAULT NULL AFTER address,
  ADD COLUMN IF NOT EXISTS joining_date DATE DEFAULT NULL AFTER area,
  ADD COLUMN IF NOT EXISTS notes TEXT AFTER joining_date,
  ADD COLUMN IF NOT EXISTS monthly_amount DECIMAL(12,2) NOT NULL DEFAULT 0 AFTER notes,
  ADD COLUMN IF NOT EXISTS is_active TINYINT NOT NULL DEFAULT 1 AFTER monthly_amount,
  ADD COLUMN IF NOT EXISTS uid INT DEFAULT NULL AFTER is_active,
  ADD COLUMN IF NOT EXISTS shop_id VARCHAR(255) DEFAULT NULL AFTER uid,
  ADD COLUMN IF NOT EXISTS created_at DATETIME DEFAULT CURRENT_TIMESTAMP AFTER shop_id;

ALTER TABLE cable_customers
  ADD COLUMN disconnect_date DATE DEFAULT NULL AFTER is_active,
  ADD COLUMN disconnect_notes TEXT AFTER disconnect_date,
  ADD COLUMN reconnect_date DATE DEFAULT NULL AFTER disconnect_notes,
  ADD COLUMN reconnect_notes TEXT AFTER reconnect_date;

/* Menu module */
UPDATE user_modules SET module_name = 'Add Customer' WHERE id = 1;
INSERT INTO user_modules (id, module_name)
SELECT 1, 'Add Customer'
WHERE NOT EXISTS (SELECT 1 FROM user_modules WHERE id = 1);

/* Give Add Customer permission to existing users if missing */
INSERT INTO user_permission (module_id, uid, date, time)
SELECT 1, u.id, CURDATE(), CURTIME()
FROM users u
WHERE u.is_active = 1
  AND NOT EXISTS (
    SELECT 1 FROM user_permission p WHERE p.module_id = 1 AND p.uid = u.id
  );

/* Sample customer insert (change values as needed) */
INSERT INTO cable_customers
  (customer_type, customer_id, name, mobile, address, area, joining_date, notes, uid, shop_id)
VALUES
  ('cable', 'C001', 'Sample Customer', '9876543210', 'Main Street', 'Nagapattinam', CURDATE(), '', 1, 'S01');
