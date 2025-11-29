"use client";

import { useRouter, useParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AppShell } from "@/components/sidebar";

interface Invite {
  id: string;
  email: string;
  teamId: string;
  expiresAt: string;
  team?: { name: string };
}

export default function InvitePage() {
  const params = useParams();
  const router = useRouter();
  const { data: session } = useSession();
  const token = String(params.token);

  const [invite, setInvite] = useState<Invite | null>(null);
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch invite details
  useEffect(() => {
    const fetchInvite = async () => {
      try {
        const res = await fetch(`/api/invites/${token}`);
        if (!res.ok) {
          setError("Invitation not found or expired");
          setLoading(false);
          return;
        }
        const data = await res.json();
        setInvite(data.invite);
      } catch (err) {
        setError("Failed to load invitation");
      } finally {
        setLoading(false);
      }
    };

    if (token) {
      fetchInvite();
    }
  }, [token]);

  const handleAccept = async () => {
    setError(null);
    setAccepting(true);

    try {
      const res = await fetch(`/api/invites/${token}/accept`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || "Failed to accept invitation");
        setAccepting(false);
        return;
      }

      // Redirect to teams page after successful acceptance
      router.push("/teams?success=invite-accepted");
    } catch (err) {
      setError("Failed to accept invitation");
      setAccepting(false);
    }
  };

  const handleSignup = () => {
    if (invite) {
      router.push(`/register?inviteToken=${encodeURIComponent(token)}&email=${encodeURIComponent(invite.email)}`);
    }
  };

  if (loading) {
    return (
      <AppShell>
        <main className="max-w-xl mx-auto py-6">
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">Loading invitation...</div>
            </CardContent>
          </Card>
        </main>
      </AppShell>
    );
  }

  if (!invite) {
    return (
      <AppShell>
        <main className="max-w-xl mx-auto py-6">
          <Card>
            <CardContent className="pt-6">
              <Alert>
                <AlertDescription>{error || "Invitation not found"}</AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </main>
      </AppShell>
    );
  }

  if (new Date(invite.expiresAt) < new Date()) {
    return (
      <AppShell>
        <main className="max-w-xl mx-auto py-6">
          <Card>
            <CardHeader>
              <CardTitle>Invitation Expired</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p>This invitation has expired. Please ask the team owner to send a new invitation.</p>
              <Button variant="outline" className="w-full" onClick={() => router.push("/teams")}>
                Back to Teams
              </Button>
            </CardContent>
          </Card>
        </main>
      </AppShell>
    );
  }

  // User is logged in
  if (session) {
    return (
      <AppShell>
        <main className="max-w-xl mx-auto py-6">
          <Card>
            <CardHeader>
              <CardTitle>Accept Team Invitation</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm text-gray-600">You are signed in as:</p>
                <p className="font-semibold">{session.user?.email}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Team:</p>
                <p className="font-semibold text-lg">{invite.team?.name || "Unknown Team"}</p>
              </div>
              {error && (
                <Alert>
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
              <div className="space-y-3">
                <Button onClick={handleAccept} className="w-full" disabled={accepting}>
                  {accepting ? "Accepting..." : "Accept Invitation"}
                </Button>
                <Button variant="outline" className="w-full" onClick={() => router.push("/teams")} disabled={accepting}>
                  Back to Teams
                </Button>
              </div>
            </CardContent>
          </Card>
        </main>
      </AppShell>
    );
  }

  // User is not logged in - show signup/login options
  return (
    <AppShell>
      <main className="max-w-xl mx-auto py-6">
        <Card>
          <CardHeader>
            <CardTitle>Team Invitation</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm text-gray-600">You're invited to join:</p>
              <p className="font-semibold text-lg">{invite.team?.name || "Unknown Team"}</p>
            </div>
            <p className="text-sm text-gray-700">
              This invitation is valid for the email: <strong>{invite.email}</strong>
            </p>
            {error && (
              <Alert>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            <div className="space-y-3">
              <Button onClick={handleSignup} className="w-full" disabled={accepting}>
                Create Account & Join Team
              </Button>
              <Button variant="outline" className="w-full" onClick={() => router.push("/login")} disabled={accepting}>
                Already have account? Sign in
              </Button>
            </div>
            <p className="text-xs text-gray-500 text-center mt-4">
              Invitation expires: {new Date(invite.expiresAt).toLocaleDateString()}
            </p>
          </CardContent>
        </Card>
      </main>
    </AppShell>
  );
}
