USE mvacable;

-- Add only if this column is missing. Skip if salon_expenses already has is_cancelled.
ALTER TABLE salon_expenses
  ADD COLUMN is_cancelled TINYINT NOT NULL DEFAULT 0 AFTER exp_time;

CREATE TABLE IF NOT EXISTS salon_expense_logs (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  expense_id INT NOT NULL,
  action VARCHAR(20) NOT NULL,
  old_amount DECIMAL(12,2) DEFAULT NULL,
  new_amount DECIMAL(12,2) DEFAULT NULL,
  old_expense_for VARCHAR(255) DEFAULT NULL,
  new_expense_for VARCHAR(255) DEFAULT NULL,
  reason TEXT,
  uid INT DEFAULT NULL,
  shop_id VARCHAR(255) DEFAULT NULL,
  log_date DATE DEFAULT NULL,
  log_time TIME DEFAULT NULL,
  PRIMARY KEY (id),
  KEY idx_salon_expense_log (shop_id, log_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
