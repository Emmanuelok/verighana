BEGIN;
-- Queue only. No status implies that project data or stored files have been erased.
CREATE TABLE IF NOT EXISTS fv_deletion_requests (
 id uuid PRIMARY KEY,
 project_id uuid NOT NULL UNIQUE REFERENCES fv_projects(id),
 requested_by text NOT NULL,
 status text NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','in_review')),
 version integer NOT NULL DEFAULT 1 CHECK(version>0),
 reviewed_by text,
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS fv_deletion_requests_status_idx ON fv_deletion_requests(status,created_at);
REVOKE ALL ON fv_deletion_requests FROM PUBLIC;
COMMIT;
