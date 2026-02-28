"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getRoomSnapshot } from "@/app/actions/room";
import { startMatch, endRound, nextRound } from "@/app/actions/round";
import { createQuestionSet, linkRoomToQuestionSet } from "@/app/actions/questions";
import type { RoomSnapshot } from "@/types/room";

function parseCSV(text: string): { prompt: string; a: string; b: string; c: string; d: string; correct: string; explanation?: string }[] {
  const lines = text.trim().split(/\r?\n/).filter(Boolean);
  if (lines.length < 2) return [];
  const rows: { prompt: string; a: string; b: string; c: string; d: string; correct: string; explanation?: string }[] = [];
  for (let i = 1; i < lines.length; i++) {
    const parts = lines[i].split(",").map((p) => p.trim().replace(/^"|"$/g, ""));
    if (parts.length >= 6) {
      rows.push({
        prompt: parts[0] ?? "",
        a: parts[1] ?? "",
        b: parts[2] ?? "",
        c: parts[3] ?? "",
        d: parts[4] ?? "",
        correct: (parts[5] ?? "a").toLowerCase().slice(0, 1),
        explanation: parts[6],
      });
    }
  }
  return rows;
}

export default function TeacherRoomPage() {
  const params = useParams();
  const code = (params.code as string)?.toUpperCase() ?? "";
  const [snapshot, setSnapshot] = useState<RoomSnapshot | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [csvText, setCsvText] = useState("");
  const [csvTitle, setCsvTitle] = useState("My questions");
  const [uploadSuccess, setUploadSuccess] = useState(false);

  const refresh = useCallback(async () => {
    if (!code) return;
    const result = await getRoomSnapshot(code);
    if (result.ok && result.snapshot) setSnapshot(result.snapshot);
    setLoading(false);
  }, [code]);

  useEffect(() => {
    refresh();
    const t = setInterval(refresh, 3000);
    return () => clearInterval(t);
  }, [refresh]);

  async function handleStart() {
    setError("");
    setActionLoading(true);
    const result = await startMatch(code);
    setActionLoading(false);
    if (result.ok && result.snapshot) setSnapshot(result.snapshot);
    else setError(result.error ?? "Failed to start");
  }

  async function handleEndRound() {
    setError("");
    setActionLoading(true);
    const result = await endRound(code);
    setActionLoading(false);
    if (result.ok && result.snapshot) setSnapshot(result.snapshot);
    else setError(result.error ?? "Failed to end round");
  }

  async function handleNextRound() {
    setError("");
    setActionLoading(true);
    const result = await nextRound(code);
    setActionLoading(false);
    if (result.ok && result.snapshot) setSnapshot(result.snapshot);
    else setError(result.error ?? "Failed to next round");
  }

  async function handleUploadCSV() {
    setError("");
    const questions = parseCSV(csvText);
    if (questions.length === 0) {
      setError("CSV must have header row and at least one question (columns: prompt,a,b,c,d,correct,explanation)");
      return;
    }
    setActionLoading(true);
    const result = await createQuestionSet(csvTitle, questions);
    if (!result.ok) {
      setActionLoading(false);
      setError(result.error ?? "Upload failed");
      return;
    }
    if (result.questionSetId) {
      const link = await linkRoomToQuestionSet(code, result.questionSetId);
      if (link.ok) {
        setUploadSuccess(true);
        setCsvText("");
        refresh();
      } else setError(link.error ?? "Link failed");
    }
    setActionLoading(false);
  }

  if (loading) return <div className="flex min-h-screen items-center justify-center">Loading room…</div>;
  if (!snapshot) return <div className="flex min-h-screen items-center justify-center">Room not found.</div>;

  const canStart = snapshot.state === "lobby" && snapshot.question_set_id;
  const canEndRound = snapshot.state === "playing";
  const canNextRound = snapshot.state === "round_reveal";

  return (
    <div className="min-h-screen bg-zinc-100 p-4 dark:bg-zinc-900">
      <div className="mx-auto max-w-4xl space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Room {code}</h1>
            <p className="text-zinc-600 dark:text-zinc-400">State: {snapshot.state}</p>
          </div>
          <div className="flex gap-2">
            <span className="rounded bg-zinc-200 px-2 py-1 dark:bg-zinc-700">Rope: {snapshot.rope_pos}</span>
            <Button variant="outline" size="sm" onClick={() => refresh()}>Refresh</Button>
          </div>
        </div>

        {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

        <Card>
          <CardHeader>
            <CardTitle>Upload questions (CSV)</CardTitle>
            <CardDescription>Header: prompt,a,b,c,d,correct,explanation. correct = a|b|c|d</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <Label>Set title</Label>
            <Input value={csvTitle} onChange={(e) => setCsvTitle(e.target.value)} placeholder="My set" />
            <Label>CSV content</Label>
            <textarea
              className="w-full rounded border border-zinc-300 bg-white p-2 font-mono text-sm dark:border-zinc-600 dark:bg-zinc-800"
              rows={6}
              value={csvText}
              onChange={(e) => setCsvText(e.target.value)}
              placeholder="prompt,a,b,c,d,correct,explanation&#10;What is 2+2?,3,4,5,6,a&#10;..."
            />
            {uploadSuccess && <p className="text-sm text-green-600">Questions linked to room.</p>}
            <Button onClick={handleUploadCSV} disabled={actionLoading}>Upload and link to room</Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Controls</CardTitle>
            <CardDescription>Start match, end round, next round</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            <Button onClick={handleStart} disabled={!canStart || actionLoading}>
              Start match
            </Button>
            <Button variant="secondary" onClick={handleEndRound} disabled={!canEndRound || actionLoading}>
              End round
            </Button>
            <Button variant="outline" onClick={handleNextRound} disabled={!canNextRound || actionLoading}>
              Next round
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Live stats</CardTitle>
            <CardDescription>Rope: {snapshot.rope_pos} | Round: {snapshot.current_round}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4">
              {snapshot.teams.map((t) => (
                <div key={t.id} className="rounded border p-2">
                  <span className="font-medium">Team {t.name}</span> — score: {t.score}, power: {t.power.toFixed(2)}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Players ({snapshot.players.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Team</TableHead>
                  <TableHead>Ready</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {snapshot.players.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell>{p.display_name}</TableCell>
                    <TableCell>{p.team_id ? snapshot.teams.find((t) => t.id === p.team_id)?.name ?? "—" : "—"}</TableCell>
                    <TableCell>{p.is_ready ? "Yes" : "No"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
