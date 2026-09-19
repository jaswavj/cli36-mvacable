USE mvacable;

CREATE TABLE IF NOT EXISTS cable_collections (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  customer_pk INT NOT NULL,
  customer_id VARCHAR(50) NOT NULL,
  collection_month DATE NOT NULL,
  amount DECIMAL(12,2) NOT NULL,
  due_amount DECIMAL(12,2) DEFAULT NULL,
  pay_mode VARCHAR(10) NOT NULL,
  paid_date DATE NOT NULL,
  paid_time TIME NOT NULL,
  uid INT DEFAULT NULL,
  shop_id VARCHAR(255) DEFAULT NULL,
  notes TEXT,
  PRIMARY KEY (id),
  KEY idx_cable_collection_month (shop_id, customer_pk, collection_month)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

ALTER TABLE cable_collections DROP INDEX IF EXISTS uk_cable_collection_month;
ALTER TABLE cable_collections ADD COLUMN due_amount DECIMAL(12,2) DEFAULT NULL AFTER amount;
