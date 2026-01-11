"use client";

import { useState } from "react";
import { trpc } from "@/client/lib/trpc";

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
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
        Create Organization
      </button>
    );
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        setError("");
        if (name.trim()) {
          createOrg.mutate({ name: name.trim() });
        }
      }}
      className="bg-white rounded-lg border border-zinc-200 p-4 space-y-3"
    >
      {error && (
        <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
          {error}
        </div>
      )}
      <input
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Organization name"
        className="w-full px-3 py-2 border border-zinc-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        autoFocus
      />
      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={() => setIsOpen(false)}
          className="px-4 py-2 text-zinc-600 hover:text-zinc-900"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={createOrg.isPending || !name.trim()}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
        >
          {createOrg.isPending ? "Creating..." : "Create"}
        </button>
      </div>
    </form>
  );
}

const roleColors = {
  owner: "bg-purple-100 text-purple-800",
  admin: "bg-blue-100 text-blue-800",
  member: "bg-zinc-100 text-zinc-800",
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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">Organizations</h1>
          <p className="text-zinc-600 mt-1">Manage your organizations and switch between them.</p>
        </div>
        <CreateOrgForm onSuccess={() => utils.organizations.list.invalidate()} />
      </div>

      {orgs && orgs.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {orgs.map((org) => (
            <div
              key={org.tenant_id}
              className={`bg-white rounded-lg border p-4 ${
                currentOrg?.tenant?.id === org.tenant_id
                  ? "border-blue-500 ring-1 ring-blue-500"
                  : "border-zinc-200"
              }`}
            >
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-semibold text-zinc-900">{org.tenant.name}</h3>
                  <p className="text-sm text-zinc-500">{org.tenant.slug}</p>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full ${roleColors[org.role]}`}>
                  {org.role}
                </span>
              </div>

              {currentOrg?.tenant?.id === org.tenant_id ? (
                <div className="flex items-center gap-2 text-sm text-blue-600">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Current organization
                </div>
              ) : (
                <button
                  onClick={() => switchOrg.mutate({ tenantId: org.tenant_id })}
                  disabled={switchOrg.isPending}
                  className="text-sm text-blue-600 hover:text-blue-800 font-medium disabled:opacity-50"
                >
                  {switchOrg.isPending ? "Switching..." : "Switch to this organization"}
                </button>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12 bg-white rounded-lg border border-zinc-200">
          <svg className="w-12 h-12 text-zinc-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
          </svg>
          <h3 className="text-lg font-medium text-zinc-900 mb-1">No organizations</h3>
          <p className="text-zinc-500">Create your first organization to get started.</p>
        </div>
      )}
    </div>
  );
}
