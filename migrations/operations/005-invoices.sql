BEGIN;
CREATE TABLE IF NOT EXISTS fv_invoices (
 id uuid PRIMARY KEY, project_id uuid NOT NULL REFERENCES fv_projects(id), quote_id uuid NOT NULL UNIQUE REFERENCES fv_quotes(id),
 reference text NOT NULL UNIQUE, total_minor bigint NOT NULL CHECK(total_minor>=0), currency text NOT NULL CHECK(currency='GHS'),
 due_date date NOT NULL, status text NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','issued','void')),
 snapshot jsonb NOT NULL, created_by text NOT NULL, created_at timestamptz NOT NULL DEFAULT now(), issued_at timestamptz, voided_at timestamptz
);
REVOKE ALL ON fv_invoices FROM PUBLIC;
COMMIT;
