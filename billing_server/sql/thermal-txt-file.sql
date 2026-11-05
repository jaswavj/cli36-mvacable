USE mvacable;

-- Add only if this column is missing.
-- 0 = do not save txt, 1 = save .txt in bills folder if local thermal print fails
ALTER TABLE company_details
  ADD COLUMN thermal_txt_file TINYINT NOT NULL DEFAULT 0 AFTER thermal_print_type;
