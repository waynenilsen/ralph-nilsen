"use client";

import { useState } from "react";
import { Plus, Check, Building2, AlertCircle } from "lucide-react";
import { trpc } from "@/client/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Spinner } from "@/components/ui/spinner";
import {
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
  EmptyDescription,
} from "@/components/ui/empty";
import { InviteMemberDialog } from "@/client/components/features/organizations/InviteMemberDialog";

function CreateOrgForm({ onSuccess }: { onSuccess: () => void }) {
  const [isOpen, setIsOpen] = useState(false);
  const [name, setName] = useState("");
  const [error, setError] = useState("");

  const createOrg = trpc.organizations.create.useMutation({
    onSuccess: () => {
      setName("");
      setIsOpen(false);
      onSuccess();
    },
    onError: (err) => {
      setError(err.message);
    },
  });

  if (!isOpen) {
    return (
      <Button onClick={() => setIsOpen(true)}>
        <Plus className="size-4" />
        Create Organization
      </Button>
    );
  }

  return (
    <Card className="w-80">
      <CardContent className="pt-6">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setError("");
            if (name.trim()) {
              createOrg.mutate({ name: name.trim() });
            }
          }}
          className="space-y-4"
        >
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="size-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          <Input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Organization name"
            autoFocus
          />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setIsOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={createOrg.isPending || !name.trim()}>
              {createOrg.isPending ? (
                <>
                  <Spinner className="size-4" />
                  Creating...
                </>
              ) : (
                "Create"
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

const roleVariants = {
  owner: "secondary" as const,
  admin: "default" as const,
  member: "outline" as const,
};

export default function OrganizationsPage() {
  const utils = trpc.useUtils();
  const { data: orgs, isLoading } = trpc.organizations.list.useQuery();
  const { data: currentOrg } = trpc.organizations.getCurrent.useQuery();

  const switchOrg = trpc.organizations.switch.useMutation({
    onSuccess: () => {
      window.location.reload();
    },
  });

  // Find current user's role in the current organization
  const currentOrgMembership = orgs?.find(
    (org) => org.tenant_id === currentOrg?.tenant?.id
  );
  const canInviteMembers =
    currentOrgMembership?.role === "owner" || currentOrgMembership?.role === "admin";

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Spinner className="size-8" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Organizations</h1>
          <p className="text-muted-foreground mt-1">
            Manage your organizations and switch between them.
          </p>
        </div>
        <div className="flex gap-2">
          {canInviteMembers && currentOrg?.tenant && (
            <InviteMemberDialog organizationName={currentOrg.tenant.name} />
          )}
          <CreateOrgForm onSuccess={() => utils.organizations.list.invalidate()} />
        </div>
      </div>

      {orgs && orgs.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {orgs.map((org) => {
            const isCurrent = currentOrg?.tenant?.id === org.tenant_id;
            return (
              <Card key={org.tenant_id} className={isCurrent ? "ring-2 ring-primary" : ""}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle>{org.tenant.name}</CardTitle>
                      <CardDescription>{org.tenant.slug}</CardDescription>
                    </div>
                    <Badge variant={roleVariants[org.role]}>{org.role}</Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  {isCurrent ? (
                    <div className="flex items-center gap-2 text-sm text-primary">
                      <Check className="size-4" />
                      Current organization
                    </div>
                  ) : (
                    <Button
                      variant="link"
                      className="p-0 h-auto"
                      onClick={() => switchOrg.mutate({ tenantId: org.tenant_id })}
                      disabled={switchOrg.isPending}
                    >
                      {switchOrg.isPending ? (
                        <>
                          <Spinner className="size-4 mr-1" />
                          Switching...
                        </>
                      ) : (
                        "Switch to this organization"
                      )}
                    </Button>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card>
          <Empty className="py-12">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <Building2 className="size-6" />
              </EmptyMedia>
              <EmptyTitle>No organizations</EmptyTitle>
              <EmptyDescription>Create your first organization to get started.</EmptyDescription>
            </EmptyHeader>
          </Empty>
        </Card>
      )}
    </div>
  );
}
