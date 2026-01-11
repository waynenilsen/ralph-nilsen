"use client";

import Link from "next/link";
import { trpc } from "@/client/lib/trpc";

export default function SettingsPage() {
  const { data: meData, isLoading } = trpc.auth.me.useQuery();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!meData) {
    return null;
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900">Settings</h1>
        <p className="text-zinc-600 mt-1">Manage your account settings.</p>
      </div>

      <div className="bg-white rounded-lg border border-zinc-200 divide-y divide-zinc-200">
        <div className="p-4">
          <h2 className="text-lg font-semibold text-zinc-900 mb-4">Profile</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-1">Username</label>
              <p className="text-zinc-900">{meData.user.username}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-1">Email</label>
              <div className="flex items-center gap-2">
                <p className="text-zinc-900">{meData.user.email}</p>
                {meData.user.email_verified ? (
                  <span className="text-xs px-2 py-0.5 bg-green-100 text-green-800 rounded-full">
                    Verified
                  </span>
                ) : (
                  <span className="text-xs px-2 py-0.5 bg-yellow-100 text-yellow-800 rounded-full">
                    Not verified
                  </span>
                )}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-1">Member since</label>
              <p className="text-zinc-900">
                {new Date(meData.user.created_at).toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </p>
            </div>
          </div>
        </div>

        <div className="p-4">
          <h2 className="text-lg font-semibold text-zinc-900 mb-4">Current Organization</h2>
          {meData.tenant ? (
            <div className="space-y-2">
              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-1">Name</label>
                <p className="text-zinc-900">{meData.tenant.name}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-1">Slug</label>
                <p className="text-zinc-500 font-mono text-sm">{meData.tenant.slug}</p>
              </div>
            </div>
          ) : (
            <p className="text-zinc-500">No organization selected</p>
          )}
        </div>

        <div className="p-4">
          <h2 className="text-lg font-semibold text-zinc-900 mb-2">Security</h2>
          <p className="text-zinc-600 text-sm mb-4">Manage your password and security settings.</p>
          <Link
            href="/reset-password"
            className="text-blue-600 hover:text-blue-800 text-sm font-medium"
          >
            Change password
          </Link>
        </div>
      </div>
    </div>
  );
}
