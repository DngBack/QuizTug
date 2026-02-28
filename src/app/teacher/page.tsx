"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { signInWithMagicLink } from "@/app/actions/auth";
import { createRoom } from "@/app/actions/room";
import { createClient } from "@/lib/supabase/client";

export default function TeacherPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [authSent, setAuthSent] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");
  const [isSignedIn, setIsSignedIn] = useState<boolean | null>(null);

  useEffect(() => {
    createClient().auth.getSession().then(({ data: { session } }) => {
      setIsSignedIn(!!session);
    });
  }, []);

  async function handleMagicLink(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const result = await signInWithMagicLink(email.trim());
    if (result.ok) setAuthSent(true);
    else setError(result.error ?? "Failed to send link");
  }

  async function handleCreateRoom() {
    setError("");
    setCreating(true);
    const result = await createRoom("accuracy_battle", 10, null);
    setCreating(false);
    if (!result.ok) {
      setError(result.error ?? "Failed to create room");
      return;
    }
    if (result.code) router.push(`/teacher/room/${result.code}`);
  }

  if (isSignedIn === null) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-zinc-500">Loading…</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-100 p-4 dark:bg-zinc-900">
      <main className="w-full max-w-md space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
            Teacher
          </h1>
          <p className="mt-2 text-zinc-600 dark:text-zinc-400">
            {isSignedIn ? "Create a room and run a match." : "Sign in to create a room."}
          </p>
        </div>

        {isSignedIn ? (
          <Card>
            <CardHeader>
              <CardTitle>Create room</CardTitle>
              <CardDescription>Mode: Team Accuracy Battle. Add questions in the room dashboard.</CardDescription>
            </CardHeader>
            <CardContent>
              {error && <p className="mb-2 text-sm text-red-600 dark:text-red-400">{error}</p>}
              <Button className="w-full" onClick={handleCreateRoom} disabled={creating}>
                {creating ? "Creating…" : "Create room"}
              </Button>
            </CardContent>
          </Card>
        ) : !authSent ? (
          <Card>
            <CardHeader>
              <CardTitle>Sign in</CardTitle>
              <CardDescription>We&apos;ll send you a magic link</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleMagicLink} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@school.edu"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
                {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
                <Button type="submit" className="w-full">
                  Send magic link
                </Button>
              </form>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Check your email</CardTitle>
              <CardDescription>
                Click the link we sent to {email} to sign in, then come back here.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="outline" className="w-full" onClick={() => setAuthSent(false)}>
                Use another email
              </Button>
            </CardContent>
          </Card>
        )}

        <div className="text-center">
          <Button variant="ghost" asChild>
            <a href="/">Back to home</a>
          </Button>
        </div>
      </main>
    </div>
  );
}
