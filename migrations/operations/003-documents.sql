BEGIN;
CREATE TABLE IF NOT EXISTS fv_documents (
 id uuid PRIMARY KEY,
 project_id uuid NOT NULL REFERENCES fv_projects(id),
 uploaded_by text NOT NULL,
 filename text NOT NULL CHECK(length(filename) BETWEEN 1 AND 180),
 content_type text NOT NULL CHECK(content_type IN ('application/pdf','text/plain','text/csv')),
 byte_count integer NOT NULL CHECK(byte_count BETWEEN 1 AND 26214400),
 sha256 text NOT NULL CHECK(sha256 ~ '^[a-f0-9]{64}$'),
 storage_key text NOT NULL UNIQUE,
 state text NOT NULL DEFAULT 'quarantined' CHECK(state IN ('quarantined','scanning','available','rejected','revoked','deleted')),
 policy_version text NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(),
 expires_at timestamptz NOT NULL,
 scanned_at timestamptz,
 revoked_at timestamptz,
 deleted_at timestamptz,
 rejection_code text,
 storage_cleanup_pending boolean NOT NULL DEFAULT false,
 CHECK(expires_at > created_at),
 CHECK(state <> 'available' OR scanned_at IS NOT NULL),
 CHECK(state <> 'deleted' OR deleted_at IS NOT NULL)
);
CREATE INDEX IF NOT EXISTS fv_documents_project_idx ON fv_documents(project_id,created_at);
CREATE INDEX IF NOT EXISTS fv_documents_retention_idx ON fv_documents(expires_at) WHERE state<>'deleted' OR storage_cleanup_pending;
REVOKE ALL ON fv_documents FROM PUBLIC;
COMMIT;
