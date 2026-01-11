"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { TRPCSessionProvider } from "@/client/components/TRPCSessionProvider";
import { trpc } from "@/client/lib/trpc";
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
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-1.5 text-sm bg-zinc-100 hover:bg-zinc-200 rounded-lg transition-colors"
      >
        <span className="font-medium truncate max-w-[150px]">
          {currentTenant?.name || "Select Organization"}
        </span>
        <svg className="w-4 h-4 text-zinc-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)} />
          <div className="absolute left-0 mt-2 w-64 bg-white rounded-lg shadow-lg border border-zinc-200 py-1 z-20">
            <div className="px-3 py-2 text-xs font-semibold text-zinc-500 uppercase tracking-wider border-b border-zinc-100">
              Switch Organization
            </div>
            {organizations.map((org) => (
              <button
                key={org.tenant_id}
                onClick={() => {
                  onSwitch(org.tenant_id);
                  setIsOpen(false);
                }}
                className={`w-full px-3 py-2 text-left text-sm hover:bg-zinc-50 flex items-center justify-between ${
                  currentTenant?.id === org.tenant_id ? "bg-blue-50 text-blue-700" : "text-zinc-700"
                }`}
              >
                <span className="truncate">{org.tenant.name}</span>
                {currentTenant?.id === org.tenant_id && (
                  <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </button>
            ))}
            <div className="border-t border-zinc-100 mt-1 pt-1">
              <Link
                href="/app/organizations"
                onClick={() => setIsOpen(false)}
                className="w-full px-3 py-2 text-left text-sm text-blue-600 hover:bg-zinc-50 flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Manage Organizations
              </Link>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function UserMenu({ user, onSignOut }: { user: UserPublic; onSignOut: () => void }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 p-1 hover:bg-zinc-100 rounded-lg transition-colors"
      >
        <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white text-sm font-medium">
          {user.username.charAt(0).toUpperCase()}
        </div>
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)} />
          <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-zinc-200 py-1 z-20">
            <div className="px-3 py-2 border-b border-zinc-100">
              <p className="font-medium text-zinc-900">{user.username}</p>
              <p className="text-sm text-zinc-500 truncate">{user.email}</p>
            </div>
            <Link
              href="/app/settings"
              onClick={() => setIsOpen(false)}
              className="block px-3 py-2 text-sm text-zinc-700 hover:bg-zinc-50"
            >
              Settings
            </Link>
            <button
              onClick={() => {
                onSignOut();
                setIsOpen(false);
              }}
              className="w-full px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50"
            >
              Sign Out
            </button>
          </div>
        </>
      )}
    </div>
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
      <div className="min-h-screen bg-zinc-50 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !meData) {
    return null;
  }

  const navItems = [
    { href: "/app/todos", label: "Todos", icon: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" },
    { href: "/app/organizations", label: "Organizations", icon: "M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" },
    { href: "/app/settings", label: "Settings", icon: "M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z" },
  ];

  return (
    <div className="min-h-screen bg-zinc-50">
      {/* Header */}
      <header className="bg-white border-b border-zinc-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-6">
              <Link href="/app/todos" className="flex items-center gap-2">
                <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                  </svg>
                </div>
                <span className="font-bold text-xl text-zinc-900 hidden sm:inline">Todo App</span>
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
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                    pathname === item.href
                      ? "bg-blue-50 text-blue-700"
                      : "text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100"
                  }`}
                >
                  {item.label}
                </Link>
              ))}
            </nav>

            <UserMenu user={meData.user} onSignOut={() => signout.mutate()} />
          </div>
        </div>
      </header>

      {/* Mobile Navigation */}
      <nav className="md:hidden bg-white border-b border-zinc-200 px-4 py-2">
        <div className="flex gap-1 overflow-x-auto">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`px-3 py-1.5 text-sm font-medium rounded-lg whitespace-nowrap ${
                pathname === item.href
                  ? "bg-blue-50 text-blue-700"
                  : "text-zinc-600 hover:bg-zinc-100"
              }`}
            >
              {item.label}
            </Link>
          ))}
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {meData.tenant ? (
          children
        ) : (
          <div className="text-center py-12">
            <h2 className="text-xl font-semibold text-zinc-900 mb-2">No organization selected</h2>
            <p className="text-zinc-600 mb-4">Please select or create an organization to continue.</p>
            <Link
              href="/app/organizations"
              className="inline-block bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors"
            >
              Manage Organizations
            </Link>
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
    </TRPCSessionProvider>
  );
}
