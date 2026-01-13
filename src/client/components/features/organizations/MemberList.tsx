"use client";

import { useState } from "react";
import { Users, MoreHorizontal, Shield, Crown, UserMinus, LogOut, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/client/lib/trpc";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import type { OrganizationMember, UserRole } from "@/shared/types";

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

const roleVariants = {
  owner: "secondary" as const,
  admin: "default" as const,
  member: "outline" as const,
};

const roleIcons = {
  owner: Crown,
  admin: Shield,
  member: Users,
};

function getInitials(email: string, username: string): string {
  return (username || email).slice(0, 2).toUpperCase();
}

function MemberSkeleton() {
  return (
    <TableRow>
      <TableCell>
        <div className="flex items-center gap-3">
          <Skeleton className="size-8 rounded-full" />
          <div className="space-y-1">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-3 w-32" />
          </div>
        </div>
      </TableCell>
      <TableCell>
        <Skeleton className="h-5 w-16" />
      </TableCell>
      <TableCell>
        <Skeleton className="h-4 w-24" />
      </TableCell>
      <TableCell>
        <Skeleton className="h-8 w-8" />
      </TableCell>
    </TableRow>
  );
}

interface MemberListProps {
  currentUserId: string;
  currentUserRole: UserRole;
  organizationName: string;
}

export function MemberList({ currentUserId, currentUserRole, organizationName }: MemberListProps) {
  const [memberToRemove, setMemberToRemove] = useState<OrganizationMember | null>(null);
  const [memberToChangeRole, setMemberToChangeRole] = useState<OrganizationMember | null>(null);
  const [memberToTransfer, setMemberToTransfer] = useState<OrganizationMember | null>(null);
  const [showLeaveDialog, setShowLeaveDialog] = useState(false);
  const [newRole, setNewRole] = useState<"admin" | "member">("member");
  const [confirmOrgName, setConfirmOrgName] = useState("");

  const utils = trpc.useUtils();
  const { data: members, isLoading, error } = trpc.organizations.getMembers.useQuery();

  const removeMember = trpc.organizations.removeMember.useMutation({
    onSuccess: () => {
      toast.success("Member removed", {
        description: `${memberToRemove?.email} has been removed from the organization.`,
      });
      setMemberToRemove(null);
      utils.organizations.getMembers.invalidate();
    },
    onError: (err) => {
      toast.error("Failed to remove member", {
        description: err.message,
      });
    },
  });

  const updateRole = trpc.organizations.updateMemberRole.useMutation({
    onSuccess: () => {
      toast.success("Role updated", {
        description: `${memberToChangeRole?.email} is now ${newRole === "admin" ? "an admin" : "a member"}.`,
      });
      setMemberToChangeRole(null);
      utils.organizations.getMembers.invalidate();
    },
    onError: (err) => {
      toast.error("Failed to update role", {
        description: err.message,
      });
    },
  });

  const transferOwnership = trpc.organizations.transferOwnership.useMutation({
    onSuccess: () => {
      toast.success("Ownership transferred", {
        description: `${memberToTransfer?.email} is now the owner of ${organizationName}.`,
      });
      setMemberToTransfer(null);
      setConfirmOrgName("");
      utils.organizations.getMembers.invalidate();
    },
    onError: (err) => {
      toast.error("Failed to transfer ownership", {
        description: err.message,
      });
    },
  });

  const leaveOrganization = trpc.organizations.leave.useMutation({
    onSuccess: (data) => {
      toast.success("Left organization", {
        description: `You have left ${organizationName}.`,
      });
      setShowLeaveDialog(false);
      if (data.newActiveTenant) {
        window.location.reload();
      } else {
        window.location.href = "/app/organizations";
      }
    },
    onError: (err) => {
      toast.error("Failed to leave organization", {
        description: err.message,
      });
    },
  });

  const handleRemove = () => {
    if (memberToRemove) {
      removeMember.mutate({ userId: memberToRemove.id });
    }
  };

  const handleChangeRole = () => {
    if (memberToChangeRole) {
      updateRole.mutate({ userId: memberToChangeRole.id, role: newRole });
    }
  };

  const handleTransfer = () => {
    if (memberToTransfer && confirmOrgName === organizationName) {
      transferOwnership.mutate({ userId: memberToTransfer.id });
    }
  };

  const handleLeave = () => {
    leaveOrganization.mutate();
  };

  const canManageMembers = currentUserRole === "owner" || currentUserRole === "admin";
  const isOwner = currentUserRole === "owner";

  if (isLoading) {
    return (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Member</TableHead>
            <TableHead>Role</TableHead>
            <TableHead>Joined</TableHead>
            <TableHead className="w-[50px]"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <MemberSkeleton />
          <MemberSkeleton />
          <MemberSkeleton />
        </TableBody>
      </Table>
    );
  }

  if (error) {
    return (
      <Empty className="py-8">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <AlertCircle className="size-6" />
          </EmptyMedia>
          <EmptyTitle>Failed to load members</EmptyTitle>
          <EmptyDescription>{error.message}</EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  if (!members || members.length === 0) {
    return (
      <Empty className="py-8">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <Users className="size-6" />
          </EmptyMedia>
          <EmptyTitle>No members</EmptyTitle>
          <EmptyDescription>There are no members in this organization.</EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  // Sort members: owner first, then admins, then members
  const sortedMembers = [...members].sort((a, b) => {
    const roleOrder = { owner: 0, admin: 1, member: 2 };
    return roleOrder[a.role] - roleOrder[b.role];
  });

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Member</TableHead>
            <TableHead>Role</TableHead>
            <TableHead>Joined</TableHead>
            <TableHead className="w-[50px]"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedMembers.map((member) => {
            const isCurrentUser = member.id === currentUserId;
            const RoleIcon = roleIcons[member.role];

            // Determine what actions are available for this member
            const canChangeRole =
              canManageMembers &&
              !isCurrentUser &&
              member.role !== "owner" &&
              // Admins can only promote members to admin
              (isOwner || member.role === "member");

            const canRemove =
              canManageMembers &&
              !isCurrentUser &&
              member.role !== "owner" &&
              // Admins cannot remove other admins
              (isOwner || member.role !== "admin");

            const canTransfer = isOwner && !isCurrentUser;

            const hasActions = canChangeRole || canRemove || canTransfer;

            return (
              <TableRow key={member.id} className={isCurrentUser ? "bg-muted/50" : undefined}>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <Avatar className="size-8">
                      <AvatarFallback className="text-xs">
                        {getInitials(member.email, member.username)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="font-medium">
                        {member.username || member.email}
                        {isCurrentUser && (
                          <span className="ml-2 text-xs text-muted-foreground">(you)</span>
                        )}
                      </div>
                      <div className="text-sm text-muted-foreground">{member.email}</div>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant={roleVariants[member.role]} className="capitalize">
                    <RoleIcon className="size-3 mr-1" />
                    {member.role}
                  </Badge>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {formatRelativeTime(member.joinedAt)}
                </TableCell>
                <TableCell>
                  {hasActions && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon-sm">
                          <MoreHorizontal className="size-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {canChangeRole && (
                          <DropdownMenuItem
                            onClick={() => {
                              setMemberToChangeRole(member);
                              setNewRole(member.role === "admin" ? "member" : "admin");
                            }}
                          >
                            <Shield className="size-4" />
                            Change Role
                          </DropdownMenuItem>
                        )}
                        {canTransfer && (
                          <DropdownMenuItem onClick={() => setMemberToTransfer(member)}>
                            <Crown className="size-4" />
                            Transfer Ownership
                          </DropdownMenuItem>
                        )}
                        {(canChangeRole || canTransfer) && canRemove && <DropdownMenuSeparator />}
                        {canRemove && (
                          <DropdownMenuItem
                            onClick={() => setMemberToRemove(member)}
                            className="text-destructive focus:text-destructive"
                          >
                            <UserMinus className="size-4" />
                            Remove from Organization
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>

      {/* Leave Organization Button for non-owners */}
      {!isOwner && (
        <div className="mt-6 pt-6 border-t">
          <Button variant="outline" onClick={() => setShowLeaveDialog(true)}>
            <LogOut className="size-4" />
            Leave Organization
          </Button>
        </div>
      )}

      {/* Remove Member Confirmation Dialog */}
      <AlertDialog
        open={!!memberToRemove}
        onOpenChange={(open) => !open && setMemberToRemove(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Member</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove{" "}
              <span className="font-medium">{memberToRemove?.email}</span> from {organizationName}?
              They will lose access to all organization data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={removeMember.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRemove}
              disabled={removeMember.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {removeMember.isPending ? (
                <>
                  <Spinner className="size-4" />
                  Removing...
                </>
              ) : (
                "Remove Member"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Change Role Dialog */}
      <Dialog
        open={!!memberToChangeRole}
        onOpenChange={(open) => {
          if (!open) {
            setMemberToChangeRole(null);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change Member Role</DialogTitle>
            <DialogDescription>Change the role for {memberToChangeRole?.email}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="role">New Role</Label>
              <Select value={newRole} onValueChange={(v) => setNewRole(v as "admin" | "member")}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select a role" />
                </SelectTrigger>
                <SelectContent>
                  {(isOwner || memberToChangeRole?.role === "member") && (
                    <SelectItem value="admin">
                      <div className="flex flex-col items-start">
                        <span>Admin</span>
                        <span className="text-xs text-muted-foreground">
                          Can manage organization members and settings
                        </span>
                      </div>
                    </SelectItem>
                  )}
                  {isOwner && (
                    <SelectItem value="member">
                      <div className="flex flex-col items-start">
                        <span>Member</span>
                        <span className="text-xs text-muted-foreground">
                          Can view and manage their own todos
                        </span>
                      </div>
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setMemberToChangeRole(null)}>
              Cancel
            </Button>
            <Button onClick={handleChangeRole} disabled={updateRole.isPending}>
              {updateRole.isPending ? (
                <>
                  <Spinner className="size-4" />
                  Updating...
                </>
              ) : (
                "Update Role"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Transfer Ownership Dialog */}
      <Dialog
        open={!!memberToTransfer}
        onOpenChange={(open) => {
          if (!open) {
            setMemberToTransfer(null);
            setConfirmOrgName("");
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Transfer Ownership</DialogTitle>
            <DialogDescription>
              Transfer ownership of {organizationName} to{" "}
              <span className="font-medium">{memberToTransfer?.email}</span>
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="rounded-md bg-destructive/10 p-4 text-sm text-destructive">
              <p className="font-medium">Warning: This action cannot be undone</p>
              <p className="mt-1">
                You will become an admin and lose owner privileges. Only the new owner can transfer
                ownership back to you.
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-org-name">
                Type <span className="font-medium">{organizationName}</span> to confirm
              </Label>
              <Input
                id="confirm-org-name"
                value={confirmOrgName}
                onChange={(e) => setConfirmOrgName(e.target.value)}
                placeholder={organizationName}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => {
                setMemberToTransfer(null);
                setConfirmOrgName("");
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleTransfer}
              disabled={transferOwnership.isPending || confirmOrgName !== organizationName}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {transferOwnership.isPending ? (
                <>
                  <Spinner className="size-4" />
                  Transferring...
                </>
              ) : (
                "Transfer Ownership"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Leave Organization Dialog */}
      <AlertDialog open={showLeaveDialog} onOpenChange={setShowLeaveDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Leave Organization</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to leave {organizationName}? You will lose access to all
              organization data. An admin will need to invite you again to rejoin.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={leaveOrganization.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleLeave}
              disabled={leaveOrganization.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {leaveOrganization.isPending ? (
                <>
                  <Spinner className="size-4" />
                  Leaving...
                </>
              ) : (
                "Leave Organization"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
