USE mvacable;

REPLACE INTO user_modules (id, module_name) VALUES (8, 'Stock Management');

CREATE TABLE IF NOT EXISTS stock_products (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  name VARCHAR(150) NOT NULL,
  rate DECIMAL(12,2) NOT NULL DEFAULT 0,
  notes TEXT,
  qty DECIMAL(12,3) NOT NULL DEFAULT 0,
  uid INT DEFAULT NULL,
  shop_id VARCHAR(255) DEFAULT NULL,
  PRIMARY KEY (id),
  KEY idx_stock_product_shop (shop_id, name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS stock_ins (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  product_id INT NOT NULL,
  qty DECIMAL(12,3) NOT NULL,
  rate DECIMAL(12,2) NOT NULL,
  notes TEXT,
  entry_date DATE NOT NULL,
  entry_time TIME NOT NULL,
  uid INT DEFAULT NULL,
  shop_id VARCHAR(255) DEFAULT NULL,
  PRIMARY KEY (id),
  KEY idx_stock_in_shop (shop_id, entry_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS stock_sales (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  product_id INT NOT NULL,
  qty DECIMAL(12,3) NOT NULL,
  rate DECIMAL(12,2) NOT NULL,
  amount DECIMAL(12,2) NOT NULL,
  notes TEXT,
  sale_date DATE NOT NULL,
  sale_time TIME NOT NULL,
  uid INT DEFAULT NULL,
  shop_id VARCHAR(255) DEFAULT NULL,
  is_cancelled TINYINT NOT NULL DEFAULT 0,
  PRIMARY KEY (id),
  KEY idx_stock_sale_shop (shop_id, sale_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS stock_sale_logs (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  sale_id INT NOT NULL,
  action VARCHAR(20) NOT NULL,
  product_id INT DEFAULT NULL,
  old_qty DECIMAL(12,3) DEFAULT NULL,
  new_qty DECIMAL(12,3) DEFAULT NULL,
  old_rate DECIMAL(12,2) DEFAULT NULL,
  new_rate DECIMAL(12,2) DEFAULT NULL,
  old_amount DECIMAL(12,2) DEFAULT NULL,
  new_amount DECIMAL(12,2) DEFAULT NULL,
  reason TEXT,
  uid INT DEFAULT NULL,
  shop_id VARCHAR(255) DEFAULT NULL,
  log_date DATE DEFAULT NULL,
  log_time TIME DEFAULT NULL,
  PRIMARY KEY (id),
  KEY idx_stock_sale_log (shop_id, log_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

INSERT INTO user_permission (module_id, uid, date, time)
SELECT 8, p.uid, CURDATE(), CURTIME()
FROM user_permission p
WHERE p.module_id = 6
  AND NOT EXISTS (SELECT 1 FROM user_permission x WHERE x.module_id = 8 AND x.uid = p.uid);
