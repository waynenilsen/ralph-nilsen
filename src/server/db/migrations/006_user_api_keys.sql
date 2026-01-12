-- Migration: Add user_id to api_keys table
-- This enables API keys to be associated with users (not just tenants)
-- allowing for unified authentication where both sessions and API keys
-- provide user context.

-- Add user_id column to api_keys table
ALTER TABLE api_keys
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id) ON DELETE CASCADE;

-- Create index for efficient user lookups
CREATE INDEX IF NOT EXISTS idx_api_keys_user_id ON api_keys(user_id);

-- Note: Existing API keys will have NULL user_id
-- New API keys should require user_id (enforced in application code)
-- This enables API keys to provide the same context as sessions: user + tenant
