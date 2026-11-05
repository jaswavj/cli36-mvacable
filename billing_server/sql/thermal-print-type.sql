USE mvacable;

-- Add only if this column is missing.
ALTER TABLE company_details
  ADD COLUMN thermal_print_type TINYINT NOT NULL DEFAULT 2 AFTER print_type;
