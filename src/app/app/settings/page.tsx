"use client";

import Link from "next/link";
import { trpc } from "@/client/lib/trpc";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Spinner } from "@/components/ui/spinner";

export default function SettingsPage() {
  const { data: meData, isLoading } = trpc.auth.me.useQuery();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Spinner className="size-8" />
      </div>
    );
  }

  if (!meData) {
    return null;
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-muted-foreground mt-1">Manage your account settings.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label className="mb-1">Username</Label>
            <p>{meData.user.username}</p>
          </div>
          <div>
            <Label className="mb-1">Email</Label>
            <div className="flex items-center gap-2">
              <p>{meData.user.email}</p>
              {meData.user.email_verified ? (
                <Badge className="bg-green-100 text-green-800 border-green-200 hover:bg-green-100">
                  Verified
                </Badge>
              ) : (
                <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200 hover:bg-yellow-100">
                  Not verified
                </Badge>
              )}
            </div>
          </div>
          <div>
            <Label className="mb-1">Member since</Label>
            <p>
              {new Date(meData.user.created_at).toLocaleDateString("en-US", {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </p>
          </div>
        </CardContent>

        <Separator />

        <CardHeader>
          <CardTitle>Current Organization</CardTitle>
        </CardHeader>
        <CardContent>
          {meData.tenant ? (
            <div className="space-y-4">
              <div>
                <Label className="mb-1">Name</Label>
                <p>{meData.tenant.name}</p>
              </div>
              <div>
                <Label className="mb-1">Slug</Label>
                <p className="text-muted-foreground font-mono text-sm">
                  {meData.tenant.slug}
                </p>
              </div>
            </div>
          ) : (
            <p className="text-muted-foreground">No organization selected</p>
          )}
        </CardContent>

        <Separator />

        <CardHeader>
          <CardTitle>Security</CardTitle>
          <CardDescription>
            Manage your password and security settings.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="link" asChild className="p-0 h-auto">
            <Link href="/reset-password">Change password</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
