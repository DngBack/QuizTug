"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { joinRoom } from "@/app/actions/room";
import { useRouter } from "next/navigation";

export default function Landing() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleJoin(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const result = await joinRoom(code.trim(), displayName.trim());
    setLoading(false);
    if (!result.ok) {
      setError(result.error ?? "Failed to join");
      return;
    }
    router.push(`/room/${result.snapshot!.code}?playerId=${result.playerId}`);
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-100 p-4 dark:bg-zinc-900">
      <main className="w-full max-w-md space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
            QuizTug
          </h1>
          <p className="mt-2 text-zinc-600 dark:text-zinc-400">
            Tug-of-war quiz: answer right, pull the rope.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Join room</CardTitle>
            <CardDescription>Enter the 6-letter code and your name</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleJoin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="code">Room code</Label>
                <Input
                  id="code"
                  placeholder="ABC123"
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  maxLength={6}
                  className="font-mono uppercase"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="name">Your name</Label>
                <Input
                  id="name"
                  placeholder="Student"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  required
                />
              </div>
              {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Joining…" : "Join"}
              </Button>
            </form>
          </CardContent>
        </Card>

        <div className="text-center">
          <Link href="/teacher">
            <Button variant="outline" className="w-full max-w-xs">
              Teacher: Create room
            </Button>
          </Link>
        </div>
      </main>
    </div>
  );
}
