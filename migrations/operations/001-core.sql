BEGIN;
CREATE TABLE IF NOT EXISTS fv_staff (
 user_id text PRIMARY KEY, role text NOT NULL CHECK (role IN ('staff','admin')), active boolean NOT NULL DEFAULT true,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS fv_inquiries (
 id uuid PRIMARY KEY, reference text NOT NULL UNIQUE, idempotency_key uuid NOT NULL UNIQUE, payload_hash text NOT NULL,
 data jsonb NOT NULL, owner_id text, status text NOT NULL DEFAULT 'new' CHECK(status IN ('new','scoped','closed')),
 assigned_to text REFERENCES fv_staff(user_id), version integer NOT NULL DEFAULT 1,
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), expires_at timestamptz NOT NULL
);
CREATE TABLE IF NOT EXISTS fv_projects (
 id uuid PRIMARY KEY, reference text NOT NULL UNIQUE, owner_id text NOT NULL, idempotency_key uuid NOT NULL,
 payload_hash text NOT NULL, title text NOT NULL, description text NOT NULL, brief jsonb NOT NULL,
 status text NOT NULL DEFAULT 'new' CHECK(status IN ('new','scoped','quoted','accepted','in_progress','delivered','closed')),
 assigned_to text REFERENCES fv_staff(user_id), version integer NOT NULL DEFAULT 1,
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), expires_at timestamptz NOT NULL,
 deleted_at timestamptz, UNIQUE(owner_id,idempotency_key)
);
CREATE INDEX IF NOT EXISTS fv_projects_owner_idx ON fv_projects(owner_id,created_at);
CREATE TABLE IF NOT EXISTS fv_messages (
 id uuid PRIMARY KEY, project_id uuid NOT NULL REFERENCES fv_projects(id), author_id text NOT NULL,
 body text NOT NULL CHECK(length(body) BETWEEN 1 AND 4000), created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS fv_email_outbox (
 id uuid PRIMARY KEY, resource_id uuid NOT NULL, kind text NOT NULL, payload jsonb NOT NULL,
 state text NOT NULL DEFAULT 'pending' CHECK(state IN ('pending','sending','accepted','failed','unknown')),
 provider_id text, attempts integer NOT NULL DEFAULT 0, error_code text, last_attempt_at timestamptz,
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), UNIQUE(resource_id,kind)
);
CREATE TABLE IF NOT EXISTS fv_rate_limits (
 bucket text PRIMARY KEY, count integer NOT NULL DEFAULT 1, expires_at timestamptz NOT NULL
);
CREATE TABLE IF NOT EXISTS fv_audit (
 id uuid PRIMARY KEY, actor_id text, action text NOT NULL, resource_id text NOT NULL,
 metadata jsonb NOT NULL DEFAULT '{}'::jsonb, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS fv_audit_resource_idx ON fv_audit(resource_id,created_at);
CREATE INDEX IF NOT EXISTS fv_outbox_state_idx ON fv_email_outbox(state,created_at);
REVOKE ALL ON fv_staff,fv_inquiries,fv_projects,fv_messages,fv_email_outbox,fv_rate_limits,fv_audit FROM PUBLIC;
COMMIT;
