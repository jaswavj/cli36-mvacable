USE mvacable;

/* Access codes / user_modules */
REPLACE INTO user_modules (id, module_name) VALUES
  (1, 'Add Customer'),
  (2, 'Active customer list'),
  (3, 'Collection entry'),
  (4, 'Collection report'),
  (5, 'Expense'),
  (6, 'Admin'),
  (7, 'Dashboard'),
  (8, 'Stock Management');

/* If old Expense was module 9, move those permissions to 5 */
INSERT INTO user_permission (module_id, uid, date, time)
SELECT 5, p.uid, CURDATE(), CURTIME()
FROM user_permission p
WHERE p.module_id = 9
  AND NOT EXISTS (
    SELECT 1 FROM user_permission x WHERE x.module_id = 5 AND x.uid = p.uid
  );

DELETE FROM user_permission WHERE module_id = 9;
DELETE FROM user_modules WHERE id = 9;

/* Users who already have Add Customer also get the new split menus */
INSERT INTO user_permission (module_id, uid, date, time)
SELECT m.id, u.id, CURDATE(), CURTIME()
FROM users u
JOIN user_modules m ON m.id IN (2, 3, 4, 7)
WHERE u.is_active = 1
  AND EXISTS (SELECT 1 FROM user_permission p WHERE p.uid = u.id AND p.module_id = 1)
  AND NOT EXISTS (SELECT 1 FROM user_permission p WHERE p.uid = u.id AND p.module_id = m.id);

INSERT INTO user_permission (module_id, uid, date, time)
SELECT 7, p.uid, CURDATE(), CURTIME()
FROM user_permission p
WHERE p.module_id = 6
  AND NOT EXISTS (SELECT 1 FROM user_permission x WHERE x.module_id = 7 AND x.uid = p.uid);

INSERT INTO user_permission (module_id, uid, date, time)
SELECT 8, p.uid, CURDATE(), CURTIME()
FROM user_permission p
WHERE p.module_id = 6
  AND NOT EXISTS (SELECT 1 FROM user_permission x WHERE x.module_id = 8 AND x.uid = p.uid);
