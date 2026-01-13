"use client";

import { useState, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CheckCircle, XCircle, Mail, Users, Shield } from "lucide-react";
import { TRPCSessionProvider } from "@/client/components/TRPCSessionProvider";
import { trpc } from "@/client/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Spinner } from "@/components/ui/spinner";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

function InvitationContent({ token }: { token: string }) {
  const router = useRouter();
  const [isAccepting, setIsAccepting] = useState(false);
  const [isDeclining, setIsDeclining] = useState(false);

  // Check if user is logged in
  const { data: meData } = trpc.auth.me.useQuery();
  const isLoggedIn = !!meData;

  // Get invitation details (public endpoint, no auth required)
  const { data: invitation, isLoading, error } = trpc.invitations.getByToken.useQuery({ token });

  // Accept invitation mutation
  const acceptInvitation = trpc.invitations.accept.useMutation({
    onSuccess: (data) => {
      setIsAccepting(false);
      // Redirect to the organization's todos page
      router.push("/app/todos");
    },
    onError: (error) => {
      setIsAccepting(false);
      alert(`Failed to accept invitation: ${error.message}`);
    },
  });

  // Decline invitation mutation
  const declineInvitation = trpc.invitations.decline.useMutation({
    onSuccess: () => {
      setIsDeclining(false);
      router.push("/");
    },
    onError: (error) => {
      setIsDeclining(false);
      alert(`Failed to decline invitation: ${error.message}`);
    },
  });

  const handleAccept = () => {
    setIsAccepting(true);
    acceptInvitation.mutate({ token });
  };

  const handleDecline = () => {
    if (confirm("Are you sure you want to decline this invitation?")) {
      setIsDeclining(true);
      declineInvitation.mutate({ token });
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="text-center py-8">
        <Spinner className="size-8 mx-auto mb-4" />
        <p className="text-muted-foreground">Loading invitation details...</p>
      </div>
    );
  }

  // Invalid or error state
  if (error || !invitation) {
    return (
      <div className="text-center">
        <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <XCircle className="w-6 h-6 text-red-600" />
        </div>
        <h2 className="text-xl font-semibold text-foreground mb-2">Invalid invitation</h2>
        <p className="text-muted-foreground mb-4">
          This invitation link is invalid or has been removed.
        </p>
        <Button asChild>
          <Link href="/">Go to Homepage</Link>
        </Button>
      </div>
    );
  }

  // Invitation expired
  if (invitation.isExpired) {
    return (
      <div className="text-center">
        <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <XCircle className="w-6 h-6 text-red-600" />
        </div>
        <h2 className="text-xl font-semibold text-foreground mb-2">Invitation expired</h2>
        <p className="text-muted-foreground mb-4">
          This invitation has expired. Please contact {invitation.organizationName} for a new invitation.
        </p>
        <Button asChild>
          <Link href="/">Go to Homepage</Link>
        </Button>
      </div>
    );
  }

  // Invitation already accepted
  if (invitation.status === "accepted") {
    return (
      <div className="text-center">
        <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <CheckCircle className="w-6 h-6 text-green-600" />
        </div>
        <h2 className="text-xl font-semibold text-foreground mb-2">Already accepted</h2>
        <p className="text-muted-foreground mb-4">
          This invitation has already been accepted.
        </p>
        {isLoggedIn ? (
          <Button asChild>
            <Link href="/app/todos">Go to Dashboard</Link>
          </Button>
        ) : (
          <Button asChild>
            <Link href="/signin">Sign In</Link>
          </Button>
        )}
      </div>
    );
  }

  // Invitation declined
  if (invitation.status === "declined") {
    return (
      <div className="text-center">
        <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <XCircle className="w-6 h-6 text-gray-600" />
        </div>
        <h2 className="text-xl font-semibold text-foreground mb-2">Invitation declined</h2>
        <p className="text-muted-foreground mb-4">
          This invitation was declined.
        </p>
        <Button asChild>
          <Link href="/">Go to Homepage</Link>
        </Button>
      </div>
    );
  }

  // Invitation revoked
  if (invitation.status === "revoked") {
    return (
      <div className="text-center">
        <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <XCircle className="w-6 h-6 text-gray-600" />
        </div>
        <h2 className="text-xl font-semibold text-foreground mb-2">Invitation cancelled</h2>
        <p className="text-muted-foreground mb-4">
          This invitation has been cancelled by the organization.
        </p>
        <Button asChild>
          <Link href="/">Go to Homepage</Link>
        </Button>
      </div>
    );
  }

  // Valid pending invitation - show different UI based on auth state
  const roleDescription =
    invitation.role === "admin"
      ? "You'll have full administrative access to manage the organization."
      : "You'll be able to collaborate with the team.";

  if (!isLoggedIn) {
    // User not logged in - show signup/signin options
    return (
      <div className="space-y-4">
        {/* Invitation Details Card */}
        <div className="bg-primary/5 border border-primary/20 rounded-lg p-6 space-y-4">
          <div className="flex items-start gap-4">
            <Avatar className="w-12 h-12">
              <AvatarFallback className="bg-primary text-primary-foreground text-lg">
                {invitation.organizationName.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <h3 className="font-semibold text-lg">{invitation.organizationName}</h3>
              <p className="text-sm text-muted-foreground">
                {invitation.inviterName} has invited you to join
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 text-sm">
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-muted-foreground" />
              <span className="font-medium capitalize">{invitation.role}</span>
            </div>
            <span className="text-muted-foreground">•</span>
            <span className="text-muted-foreground">{roleDescription}</span>
          </div>
        </div>

        <Alert>
          <Mail className="h-4 w-4" />
          <AlertDescription>
            To accept this invitation, you need to sign in or create an account.
          </AlertDescription>
        </Alert>

        <div className="space-y-2">
          <Button asChild className="w-full" size="lg">
            <Link href={`/signup?invite=${token}`}>Sign Up & Join</Link>
          </Button>
          <Button asChild variant="outline" className="w-full" size="lg">
            <Link href={`/signin?invite=${token}`}>Sign In & Join</Link>
          </Button>
        </div>

        <p className="text-center text-sm text-muted-foreground">
          By accepting, you agree to join {invitation.organizationName}
        </p>
      </div>
    );
  }

  // User is logged in - show accept/decline options
  return (
    <div className="space-y-4">
      {/* Invitation Details Card */}
      <div className="bg-primary/5 border border-primary/20 rounded-lg p-6 space-y-4">
        <div className="flex items-start gap-4">
          <Avatar className="w-12 h-12">
            <AvatarFallback className="bg-primary text-primary-foreground text-lg">
              {invitation.organizationName.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <h3 className="font-semibold text-lg">{invitation.organizationName}</h3>
            <p className="text-sm text-muted-foreground">
              {invitation.inviterName} has invited you to join
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 text-sm">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-muted-foreground" />
            <span className="font-medium capitalize">{invitation.role}</span>
          </div>
          <span className="text-muted-foreground">•</span>
          <span className="text-muted-foreground">{roleDescription}</span>
        </div>
      </div>

      <Alert>
        <Users className="h-4 w-4" />
        <AlertDescription>
          You're signed in as <strong>{meData?.user.email}</strong>
        </AlertDescription>
      </Alert>

      <div className="space-y-2">
        <Button
          onClick={handleAccept}
          disabled={isAccepting || isDeclining}
          className="w-full"
          size="lg"
        >
          {isAccepting ? (
            <>
              <Spinner className="mr-2" />
              Accepting...
            </>
          ) : (
            "Accept Invitation"
          )}
        </Button>
        <Button
          onClick={handleDecline}
          disabled={isAccepting || isDeclining}
          variant="outline"
          className="w-full"
          size="lg"
        >
          {isDeclining ? (
            <>
              <Spinner className="mr-2" />
              Declining...
            </>
          ) : (
            "Decline"
          )}
        </Button>
      </div>

      <p className="text-center text-sm text-muted-foreground">
        By accepting, you'll be added to {invitation.organizationName}
      </p>
    </div>
  );
}

export default function InvitationPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);

  return (
    <TRPCSessionProvider>
      <main className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <Link href="/" className="inline-flex items-center gap-2 mb-4">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                <Users className="w-5 h-5 text-primary-foreground" />
              </div>
              <span className="font-bold text-xl text-foreground">Todo App</span>
            </Link>
          </div>

          <Card>
            <CardHeader className="text-center">
              <CardTitle className="text-2xl">You've been invited!</CardTitle>
              <CardDescription>Join your team and start collaborating</CardDescription>
            </CardHeader>
            <CardContent>
              <InvitationContent token={token} />
            </CardContent>
          </Card>
        </div>
      </main>
    </TRPCSessionProvider>
  );
}
