# Product Requirements Document: Team Collaboration & Invitations

## 1. Executive Summary

This document outlines requirements for adding team collaboration features to the multi-tenant todo application. Users will be able to invite others to their organizations, manage team members, and collaborate on todos.

**Purpose**: Transform single-user organizations into collaborative team workspaces with proper role management.

**Status**: Draft

## 2. Goals and Objectives

### Primary Goals

- Enable users to invite others to their organizations via email
- Implement invitation flow with acceptance/rejection
- Add organization member management (view, remove, change roles)
- Support role-based permissions (owner, admin, member)
- Send invitation and notification emails

### Learning Objectives

- Implement invitation token system (similar to password reset)
- Design multi-user organization UX patterns
- Handle edge cases (duplicate invites, expired tokens, etc.)
- Build role-based access control UI

## 3. User Stories

### As an Organization Owner/Admin

- **US-1**: I can invite new users to my organization via email
- **US-2**: I can see pending invitations I've sent
- **US-3**: I can cancel/revoke pending invitations
- **US-4**: I can view all members in my organization
- **US-5**: I can change a member's role (admin can promote to admin, owner can do anything)
- **US-6**: I can remove members from my organization
- **US-7**: I cannot remove myself as owner (owner must transfer ownership first)

### As an Invited User (New)

- **US-8**: I receive an email invitation with a link to join
- **US-9**: I can click the link and sign up to join the organization
- **US-10**: After signup, I'm automatically added to the invited organization

### As an Invited User (Existing)

- **US-11**: I receive an email invitation with a link
- **US-12**: I can click the link while signed in to accept the invitation
- **US-13**: The new organization appears in my organization list
- **US-14**: I can decline an invitation

### As an Organization Member

- **US-15**: I can see other members in my organization
- **US-16**: I can leave an organization (unless I'm the owner)

## 4. Functional Requirements

### 4.1 Invitation System

- **FR-1**: Invitations table stores: email, organization, role, token, expiration, status
- **FR-2**: Invitation tokens expire after 7 days
- **FR-3**: Duplicate invitations to same email for same org are prevented
- **FR-4**: Invitations can be revoked by sender or admin
- **FR-5**: Accepting invitation adds user to organization with specified role

### 4.2 Email Notifications

- **FR-6**: Send email when user is invited (includes invite link)
- **FR-7**: Send email when invitation is accepted (to inviter)
- **FR-8**: Email includes organization name and inviter's name

### 4.3 Role-Based Permissions

- **FR-9**: Owners can: invite, manage members, change any role, delete org
- **FR-10**: Admins can: invite, manage members (except owners), change member roles
- **FR-11**: Members can: view members, leave organization
- **FR-12**: Each organization must have exactly one owner

### 4.4 Member Management

- **FR-13**: Organization settings page shows member list
- **FR-14**: Member list shows: name, email, role, joined date
- **FR-15**: Owners can transfer ownership to another member
- **FR-16**: Removing a member removes their access to org's todos

### 4.5 Invitation Acceptance

- **FR-17**: New users: invite link leads to signup with pre-filled email
- **FR-18**: Existing users: invite link leads to accept/decline page
- **FR-19**: Accepting while signed out prompts signin first
- **FR-20**: User can accept invitation for different email (signed in as different user)

## 5. Technical Requirements

### 5.1 Database Schema

#### Organization Invitations Table

```sql
CREATE TABLE organization_invitations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL DEFAULT 'member' CHECK (role IN ('admin', 'member')),
    token UUID UNIQUE NOT NULL DEFAULT gen_random_uuid(),
    invited_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'revoked')),
    accepted_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(tenant_id, email, status) -- Prevent duplicate pending invites
);

CREATE INDEX idx_invitations_token ON organization_invitations(token);
CREATE INDEX idx_invitations_email ON organization_invitations(email);
CREATE INDEX idx_invitations_tenant ON organization_invitations(tenant_id);
```

### 5.2 API Endpoints (tRPC)

#### Invitations Router (`src/server/trpc/routers/invitations.ts`)

- `invitations.create` - Create and send invitation
  - Input: email, role (optional, default 'member')
  - Requires: owner or admin role
  - Sends invitation email

- `invitations.list` - List invitations for current organization
  - Returns: pending, accepted, declined invitations
  - Requires: owner or admin role

- `invitations.revoke` - Cancel pending invitation
  - Input: invitation ID
  - Requires: owner or admin role

- `invitations.getByToken` - Get invitation details by token (public)
  - Input: token
  - Returns: organization name, role, expiration status

- `invitations.accept` - Accept invitation
  - Input: token
  - Requires: authenticated user (session)
  - Adds user to organization

- `invitations.decline` - Decline invitation
  - Input: token
  - Requires: authenticated user (session)

#### Organizations Router Extensions

- `organizations.getMembers` - List organization members
  - Requires: any member
  - Returns: user info, role, joined date

- `organizations.removeMember` - Remove member from organization
  - Input: user ID
  - Requires: owner or admin (cannot remove owner)

- `organizations.updateMemberRole` - Change member role
  - Input: user ID, new role
  - Requires: owner (for admin changes) or admin (for member changes)

- `organizations.transferOwnership` - Transfer owner role
  - Input: user ID
  - Requires: current owner

- `organizations.leave` - Leave organization
  - Requires: member (non-owner)

### 5.3 Pages & Routes

- `/app/organizations/[id]/members` - Member management page
- `/app/organizations/[id]/invitations` - Pending invitations
- `/invite/[token]` - Invitation acceptance page (public route with auth check)

### 5.4 Email Templates

- `invitation.tsx` - Invitation email template
- `invitation-accepted.tsx` - Notification to inviter

## 6. UI Components

### 6.1 Member List Component

- Shows avatar/initials, name, email, role badge
- Action menu: change role, remove (if permitted)
- Owner badge with "Transfer" option

### 6.2 Invite Member Dialog

- Email input with validation
- Role selector (Member, Admin)
- Send button with loading state

### 6.3 Pending Invitations List

- Shows email, role, sent date, expiration
- Revoke button
- Resend option (creates new invitation)

### 6.4 Invitation Acceptance Page

- Shows organization name and inviter
- Accept/Decline buttons
- Prompts signup if new user
- Prompts signin if logged out

## 7. Implementation Phases

### Phase 1: Database & Core Infrastructure
- Create migration for invitations table
- Create invitations router with CRUD operations
- Add invitation validation helpers

### Phase 2: Invitation Flow
- Implement create invitation endpoint
- Implement invitation email sending
- Implement accept/decline endpoints
- Add user to organization on acceptance

### Phase 3: Member Management
- Implement getMembers endpoint
- Implement removeMember endpoint
- Implement updateMemberRole endpoint
- Implement transferOwnership endpoint
- Implement leave organization endpoint

### Phase 4: UI - Invitation Management
- Create invite member dialog component
- Create pending invitations list
- Integrate with organizations page

### Phase 5: UI - Member Management
- Create member list component
- Create member management page
- Add role change and remove actions

### Phase 6: Invitation Acceptance UI
- Create /invite/[token] page
- Handle new user flow (signup redirect)
- Handle existing user flow (accept/decline)

### Phase 7: Testing
- Unit tests for invitation logic
- Integration tests for invitation flow
- E2E tests for full invitation journey

## 8. Security Considerations

- **SEC-1**: Invitation tokens must be single-use
- **SEC-2**: Expired tokens cannot be accepted
- **SEC-3**: Only permitted roles can invite/manage members
- **SEC-4**: Users cannot escalate their own role
- **SEC-5**: Owner cannot be removed without ownership transfer
- **SEC-6**: Rate limit invitation creation to prevent abuse

## 9. Success Criteria

- Users can invite others to organizations
- Invitations expire after 7 days
- Invitation emails are sent successfully
- New users can sign up via invitation
- Existing users can accept invitations
- Organization owners can manage members
- Role-based permissions are enforced
- All tests pass

## 10. Out of Scope

- Real-time member presence
- Organization chat/messaging
- Todo assignment to specific members
- Permission inheritance within todos

---

**Document Version**: 1.0
**Last Updated**: 2026-01-12
**Status**: Draft
