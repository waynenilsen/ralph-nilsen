"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import {
  ChevronDown,
  Check,
  Plus,
  Settings,
  LogOut,
  ClipboardCheck,
  Building2,
} from "lucide-react";
import { TRPCSessionProvider } from "@/client/components/TRPCSessionProvider";
import { trpc } from "@/client/lib/trpc";
import { Toaster } from "@/components/ui/sonner";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Spinner } from "@/components/ui/spinner";
import type { UserOrganization, UserPublic, Tenant } from "@/shared/types";

function OrgSwitcher({
  organizations,
  currentTenant,
  onSwitch,
}: {
  organizations: UserOrganization[];
  currentTenant: Tenant | null;
  onSwitch: (tenantId: string) => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="secondary" size="sm" className="gap-2">
          <span className="font-medium truncate max-w-[150px]">
            {currentTenant?.name || "Select Organization"}
          </span>
          <ChevronDown className="size-4 text-muted-foreground" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-64">
        <DropdownMenuLabel className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          Switch Organization
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {organizations.map((org) => (
          <DropdownMenuItem
            key={org.tenant_id}
            onClick={() => onSwitch(org.tenant_id)}
            className={currentTenant?.id === org.tenant_id ? "bg-primary/10 text-primary" : ""}
          >
            <span className="truncate flex-1">{org.tenant.name}</span>
            {currentTenant?.id === org.tenant_id && <Check className="size-4 text-primary" />}
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/app/organizations" className="text-primary flex items-center gap-2">
            <Plus className="size-4" />
            Manage Organizations
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function UserMenu({ user, onSignOut }: { user: UserPublic; onSignOut: () => void }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="rounded-full">
          <Avatar>
            <AvatarFallback className="bg-primary text-primary-foreground text-sm font-medium">
              {user.username.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="font-medium text-sm">{user.username}</p>
            <p className="text-xs text-muted-foreground truncate">{user.email}</p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/app/settings" className="flex items-center gap-2">
            <Settings className="size-4" />
            Settings
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem
          variant="destructive"
          onClick={onSignOut}
          className="flex items-center gap-2"
        >
          <LogOut className="size-4" />
          Sign Out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function AppLayoutContent({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();

  const { data: meData, isLoading, error } = trpc.auth.me.useQuery();
  const { data: orgs } = trpc.organizations.list.useQuery(undefined, {
    enabled: !!meData,
  });

  const switchOrg = trpc.organizations.switch.useMutation({
    onSuccess: () => {
      window.location.reload();
    },
  });

  const signout = trpc.auth.signout.useMutation({
    onSuccess: () => {
      document.cookie = "session_token=; path=/; max-age=0";
      router.push("/signin");
    },
  });

  useEffect(() => {
    if (error?.data?.code === "UNAUTHORIZED") {
      document.cookie = "session_token=; path=/; max-age=0";
      router.push("/signin");
    }
  }, [error, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-muted/30 flex items-center justify-center">
        <Spinner className="size-8 text-primary" />
      </div>
    );
  }

  if (error || !meData) {
    return null;
  }

  const navItems = [
    { href: "/app/todos", label: "Todos", icon: ClipboardCheck },
    { href: "/app/organizations", label: "Organizations", icon: Building2 },
    { href: "/app/settings", label: "Settings", icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-muted/30">
      {/* Header */}
      <header className="bg-background border-b sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-6">
              <Link href="/app/todos" className="flex items-center gap-2">
                <div className="size-8 bg-primary rounded-lg flex items-center justify-center">
                  <ClipboardCheck className="size-5 text-primary-foreground" />
                </div>
                <span className="font-bold text-xl hidden sm:inline">Todo App</span>
              </Link>

              {orgs && (
                <OrgSwitcher
                  organizations={orgs}
                  currentTenant={meData.tenant}
                  onSwitch={(tenantId) => switchOrg.mutate({ tenantId })}
                />
              )}
            </div>

            <nav className="hidden md:flex items-center gap-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                return (
                  <Button
                    key={item.href}
                    variant={pathname === item.href ? "secondary" : "ghost"}
                    size="sm"
                    asChild
                    className={pathname === item.href ? "bg-primary/10 text-primary" : ""}
                  >
                    <Link href={item.href}>
                      <Icon className="size-4" />
                      {item.label}
                    </Link>
                  </Button>
                );
              })}
            </nav>

            <UserMenu user={meData.user} onSignOut={() => signout.mutate()} />
          </div>
        </div>
      </header>

      {/* Mobile Navigation */}
      <nav className="md:hidden bg-background border-b px-4 py-2">
        <div className="flex gap-1 overflow-x-auto">
          {navItems.map((item) => (
            <Button
              key={item.href}
              variant={pathname === item.href ? "secondary" : "ghost"}
              size="sm"
              asChild
              className={
                pathname === item.href
                  ? "bg-primary/10 text-primary whitespace-nowrap"
                  : "whitespace-nowrap"
              }
            >
              <Link href={item.href}>{item.label}</Link>
            </Button>
          ))}
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {meData.tenant ? (
          children
        ) : (
          <div className="text-center py-12">
            <h2 className="text-xl font-semibold mb-2">No organization selected</h2>
            <p className="text-muted-foreground mb-4">
              Please select or create an organization to continue.
            </p>
            <Button asChild>
              <Link href="/app/organizations">Manage Organizations</Link>
            </Button>
          </div>
        )}
      </main>
    </div>
  );
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <TRPCSessionProvider>
      <AppLayoutContent>{children}</AppLayoutContent>
      <Toaster />
    </TRPCSessionProvider>
  );
}
