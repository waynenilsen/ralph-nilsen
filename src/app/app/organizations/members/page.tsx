"use client";

import Link from "next/link";
import { ArrowLeft, Users } from "lucide-react";
import { trpc } from "@/client/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { InviteMemberDialog } from "@/client/components/features/organizations/InviteMemberDialog";
import { PendingInvitationsList } from "@/client/components/features/organizations/PendingInvitationsList";
import { MemberList } from "@/client/components/features/organizations/MemberList";
import {
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
  EmptyDescription,
} from "@/components/ui/empty";

export default function OrganizationMembersPage() {
  const { data: currentOrg, isLoading: isLoadingOrg } = trpc.organizations.getCurrent.useQuery();
  const { data: orgs, isLoading: isLoadingOrgs } = trpc.organizations.list.useQuery();
  const { data: user } = trpc.auth.me.useQuery();

  const isLoading = isLoadingOrg || isLoadingOrgs;

  // Find current user's role in the current organization
  const currentOrgMembership = orgs?.find((org) => org.tenant_id === currentOrg?.tenant?.id);
  const currentUserRole = currentOrgMembership?.role ?? "member";
  const canManageMembers = currentUserRole === "owner" || currentUserRole === "admin";

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Spinner className="size-8" />
      </div>
    );
  }

  if (!currentOrg?.tenant) {
    return (
      <div className="space-y-6">
        <div>
          <Link href="/app/organizations">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="size-4" />
              Back to Organizations
            </Button>
          </Link>
        </div>
        <Card>
          <Empty className="py-12">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <Users className="size-6" />
              </EmptyMedia>
              <EmptyTitle>No organization selected</EmptyTitle>
              <EmptyDescription>
                Please select an organization from the organizations page.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <Link href="/app/organizations">
            <Button variant="ghost" size="sm" className="mb-2">
              <ArrowLeft className="size-4" />
              Back to Organizations
            </Button>
          </Link>
          <h1 className="text-2xl font-bold">{currentOrg.tenant.name}</h1>
          <p className="text-muted-foreground mt-1">Manage organization members and invitations</p>
        </div>
        {canManageMembers && <InviteMemberDialog organizationName={currentOrg.tenant.name} />}
      </div>

      <Tabs defaultValue="members">
        <TabsList>
          <TabsTrigger value="members">Members</TabsTrigger>
          <TabsTrigger value="invitations">Pending Invitations</TabsTrigger>
        </TabsList>

        <TabsContent value="members" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Organization Members</CardTitle>
              <CardDescription>People who have access to this organization</CardDescription>
            </CardHeader>
            <CardContent>
              {user && (
                <MemberList
                  currentUserId={user.user.id}
                  currentUserRole={currentUserRole}
                  organizationName={currentOrg.tenant.name}
                />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="invitations" className="mt-4">
          {canManageMembers ? (
            <PendingInvitationsList />
          ) : (
            <Card>
              <Empty className="py-12">
                <EmptyHeader>
                  <EmptyMedia variant="icon">
                    <Users className="size-6" />
                  </EmptyMedia>
                  <EmptyTitle>Access restricted</EmptyTitle>
                  <EmptyDescription>
                    Only organization owners and admins can view pending invitations.
                  </EmptyDescription>
                </EmptyHeader>
              </Empty>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
