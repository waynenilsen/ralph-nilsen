-- Migration: Organization Invitations Table
-- Enables team collaboration by allowing organization owners/admins to invite users

CREATE TABLE IF NOT EXISTS organization_invitations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL DEFAULT 'member' CHECK (role IN ('admin', 'member')),
    token UUID UNIQUE NOT NULL DEFAULT gen_random_uuid(),
    invited_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'revoked')),
    accepted_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for fast token lookups (used when accepting/declining invitations)
CREATE INDEX IF NOT EXISTS idx_invitations_token ON organization_invitations(token);

-- Index for email lookups (check existing invitations for user)
CREATE INDEX IF NOT EXISTS idx_invitations_email ON organization_invitations(email);

-- Index for listing invitations by tenant
CREATE INDEX IF NOT EXISTS idx_invitations_tenant ON organization_invitations(tenant_id);

-- Partial unique index to prevent duplicate pending invites to same email for same org
CREATE UNIQUE INDEX IF NOT EXISTS idx_invitations_unique_pending
ON organization_invitations(tenant_id, email)
WHERE status = 'pending';

-- Grant permissions to app_user
GRANT SELECT, INSERT, UPDATE, DELETE ON organization_invitations TO app_user;
