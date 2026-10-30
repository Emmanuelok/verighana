-- Immutable commercial snapshots. No tariff, tax, deposit or cancellation defaults.
BEGIN;
CREATE TABLE IF NOT EXISTS fv_quotes (
  id uuid PRIMARY KEY,
  project_id uuid NOT NULL REFERENCES fv_projects(id),
  version integer NOT NULL CHECK (version > 0),
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'issued', 'accepted', 'superseded')),
  currency text NOT NULL DEFAULT 'GHS' CHECK (currency = 'GHS'),
  lines jsonb NOT NULL CHECK (jsonb_typeof(lines) = 'array'),
  terms jsonb NOT NULL CHECK (jsonb_typeof(terms) = 'object'),
  total_minor bigint NOT NULL CHECK (total_minor >= 0 AND total_minor <= 1000000000000),
  expires_at timestamptz NOT NULL,
  created_by text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  issued_at timestamptz,
  accepted_at timestamptz,
  accepted_by text,
  UNIQUE (project_id, version),
  CHECK ((status = 'accepted' AND accepted_at IS NOT NULL AND accepted_by IS NOT NULL)
    OR (status <> 'accepted' AND accepted_at IS NULL AND accepted_by IS NULL)),
  CHECK (status NOT IN ('issued', 'accepted') OR issued_at IS NOT NULL),
  CHECK (status <> 'draft' OR issued_at IS NULL)
);
CREATE INDEX IF NOT EXISTS fv_quotes_project_idx ON fv_quotes(project_id, version DESC);
CREATE UNIQUE INDEX IF NOT EXISTS fv_quotes_one_issued_idx ON fv_quotes(project_id) WHERE status = 'issued';
CREATE UNIQUE INDEX IF NOT EXISTS fv_quotes_one_accepted_idx ON fv_quotes(project_id) WHERE status = 'accepted';

CREATE OR REPLACE FUNCTION fv_preserve_quote_snapshot() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF ROW(NEW.id, NEW.project_id, NEW.version, NEW.currency, NEW.lines, NEW.terms, NEW.total_minor, NEW.expires_at, NEW.created_by, NEW.created_at)
     IS DISTINCT FROM
     ROW(OLD.id, OLD.project_id, OLD.version, OLD.currency, OLD.lines, OLD.terms, OLD.total_minor, OLD.expires_at, OLD.created_by, OLD.created_at) THEN
    RAISE EXCEPTION 'Quote snapshots are immutable; create a new version';
  END IF;
  IF NEW.status IS DISTINCT FROM OLD.status AND NOT (
    (OLD.status = 'draft' AND NEW.status IN ('issued', 'superseded')) OR
    (OLD.status = 'issued' AND NEW.status IN ('accepted', 'superseded'))
  ) THEN
    RAISE EXCEPTION 'Invalid quote status transition';
  END IF;
  IF OLD.issued_at IS NOT NULL AND NEW.issued_at IS DISTINCT FROM OLD.issued_at THEN
    RAISE EXCEPTION 'Issued timestamp is immutable';
  END IF;
  IF NEW.issued_at IS DISTINCT FROM OLD.issued_at AND NOT (OLD.status = 'draft' AND NEW.status = 'issued') THEN
    RAISE EXCEPTION 'Only issuance can set issued timestamp';
  END IF;
  IF ROW(NEW.accepted_at, NEW.accepted_by) IS DISTINCT FROM ROW(OLD.accepted_at, OLD.accepted_by)
    AND NOT (OLD.status = 'issued' AND NEW.status = 'accepted') THEN
    RAISE EXCEPTION 'Only acceptance can set acceptance evidence';
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS fv_quotes_snapshot_guard ON fv_quotes;
CREATE TRIGGER fv_quotes_snapshot_guard BEFORE UPDATE ON fv_quotes
FOR EACH ROW EXECUTE FUNCTION fv_preserve_quote_snapshot();
REVOKE ALL ON fv_quotes FROM PUBLIC;
COMMIT;
