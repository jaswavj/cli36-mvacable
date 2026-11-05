USE mvacable;

-- Add only if this column is missing.
-- 58 = 32-char compact slip, 80 = 48-char slip
ALTER TABLE company_details
  ADD COLUMN thermal_paper_mm SMALLINT NOT NULL DEFAULT 58 AFTER printer_name;
