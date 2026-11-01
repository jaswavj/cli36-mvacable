USE mvacable;

ALTER TABLE salon_expenses
  ADD COLUMN pay_mode VARCHAR(10) NOT NULL DEFAULT 'cash' AFTER expense_for;

ALTER TABLE salon_expenses
  ADD COLUMN customer_type VARCHAR(10) NOT NULL DEFAULT 'cable' AFTER pay_mode;
