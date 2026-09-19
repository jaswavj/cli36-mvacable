USE mvacable;

DROP TABLE IF EXISTS quick_bill_logs;
DROP TABLE IF EXISTS quick_bills;
DROP TABLE IF EXISTS attendance;
DROP TABLE IF EXISTS incentives;

UPDATE user_modules SET module_name = 'Add Customer' WHERE id = 1;
DELETE FROM user_permission WHERE module_id IN (2, 3, 4, 5, 7, 8);
DELETE FROM user_modules WHERE id IN (2, 3, 4, 5, 7, 8);
