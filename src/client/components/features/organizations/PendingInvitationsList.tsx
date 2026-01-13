"use client";

import { useState } from "react";
import { Mail, XCircle, Clock } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/client/lib/trpc";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
  EmptyDescription,
} from "@/components/ui/empty";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import type { OrganizationInvitationWithInviter } from "@/shared/types";

function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - new Date(date).getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffMinutes = Math.floor(diffMs / (1000 * 60));

  if (diffMinutes < 1) return "just now";
  if (diffMinutes < 60) return `${diffMinutes} minute${diffMinutes === 1 ? "" : "s"} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours === 1 ? "" : "s"} ago`;
  if (diffDays === 1) return "yesterday";
  if (diffDays < 7) return `${diffDays} days ago`;
  const weeks = Math.floor(diffDays / 7);
  if (diffDays < 30) return `${weeks} week${weeks === 1 ? "" : "s"} ago`;
  const months = Math.floor(diffDays / 30);
  return `${months} month${months === 1 ? "" : "s"} ago`;
}

function formatExpiresIn(date: Date): string {
  const now = new Date();
  const diffMs = new Date(date).getTime() - now.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));

  if (diffMs < 0) return "expired";
  if (diffHours < 1) return "less than an hour";
  if (diffHours < 24) return `${diffHours} hour${diffHours === 1 ? "" : "s"}`;
  if (diffDays === 1) return "1 day";
  return `${diffDays} days`;
}

const roleVariants = {
  admin: "default" as const,
  member: "outline" as const,
};

function InvitationsTableHeader() {
  return (
    <TableHeader>
      <TableRow>
        <TableHead>Email</TableHead>
        <TableHead>Role</TableHead>
        <TableHead>Sent</TableHead>
        <TableHead>Expires</TableHead>
        <TableHead>Invited by</TableHead>
        <TableHead>Actions</TableHead>
      </TableRow>
    </TableHeader>
  );
}

function InvitationSkeleton() {
  return (
    <TableRow>
      <TableCell>
        <Skeleton className="h-4 w-40" />
      </TableCell>
      <TableCell>
        <Skeleton className="h-5 w-16" />
      </TableCell>
      <TableCell>
        <Skeleton className="h-4 w-24" />
      </TableCell>
      <TableCell>
        <Skeleton className="h-4 w-20" />
      </TableCell>
      <TableCell>
        <Skeleton className="h-4 w-24" />
      </TableCell>
      <TableCell>
        <Skeleton className="h-8 w-20" />
      </TableCell>
    </TableRow>
  );
}

export function PendingInvitationsList() {
  const [invitationToRevoke, setInvitationToRevoke] =
    useState<OrganizationInvitationWithInviter | null>(null);

  const utils = trpc.useUtils();
  const { data: invitations, isLoading } = trpc.invitations.list.useQuery();

  const revokeInvitation = trpc.invitations.revoke.useMutation({
    onSuccess: () => {
      toast.success("Invitation revoked", {
        description: `The invitation to ${invitationToRevoke?.email} has been revoked.`,
      });
      setInvitationToRevoke(null);
      utils.invitations.list.invalidate();
    },
    onError: (err) => {
      toast.error("Failed to revoke invitation", {
        description: err.message,
      });
    },
  });

  const pendingInvitations = invitations?.filter((inv) => inv.status === "pending") ?? [];

  const handleRevoke = () => {
    if (invitationToRevoke) {
      revokeInvitation.mutate({ invitationId: invitationToRevoke.id });
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Pending Invitations</CardTitle>
          <CardDescription>Invitations waiting to be accepted</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <InvitationsTableHeader />
            <TableBody>
              <InvitationSkeleton />
              <InvitationSkeleton />
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Pending Invitations</CardTitle>
          <CardDescription>Invitations waiting to be accepted</CardDescription>
        </CardHeader>
        <CardContent>
          {pendingInvitations.length === 0 ? (
            <Empty className="py-8">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <Mail className="size-6" />
                </EmptyMedia>
                <EmptyTitle>No pending invitations</EmptyTitle>
                <EmptyDescription>
                  When you invite new members, their invitations will appear here.
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : (
            <Table>
              <InvitationsTableHeader />
              <TableBody>
                {pendingInvitations.map((invitation) => {
                  const expiresIn = formatExpiresIn(invitation.expires_at);
                  const isExpired = expiresIn === "expired";

                  return (
                    <TableRow key={invitation.id}>
                      <TableCell className="font-medium">{invitation.email}</TableCell>
                      <TableCell>
                        <Badge variant={roleVariants[invitation.role]}>{invitation.role}</Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {formatRelativeTime(invitation.created_at)}
                      </TableCell>
                      <TableCell>
                        <span className={isExpired ? "text-destructive" : "text-muted-foreground"}>
                          {isExpired ? (
                            <span className="flex items-center gap-1">
                              <XCircle className="size-3" />
                              Expired
                            </span>
                          ) : (
                            <span className="flex items-center gap-1">
                              <Clock className="size-3" />
                              {expiresIn}
                            </span>
                          )}
                        </span>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {invitation.inviter_name}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setInvitationToRevoke(invitation)}
                          disabled={isExpired}
                        >
                          Revoke
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <AlertDialog
        open={!!invitationToRevoke}
        onOpenChange={(open) => !open && setInvitationToRevoke(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Revoke Invitation</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to revoke the invitation to {invitationToRevoke?.email}? They
              will no longer be able to join this organization using this link.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={revokeInvitation.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleRevoke} disabled={revokeInvitation.isPending}>
              {revokeInvitation.isPending ? "Revoking..." : "Revoke"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
