"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { sb } from "@/lib/supabase";
import { Button, ErrorBox, Field, Input } from "@/components/ui";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const { error } = await sb().auth.signInWithPassword({ email: email.trim(), password });
    setBusy(false);
    if (error) setError(error.message === "Invalid login credentials" ? "Email atau password salah" : error.message);
    else router.replace("/");
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <form onSubmit={submit} className="w-full max-w-sm bg-white border border-line rounded-2xl p-6 shadow-sm">
        <div className="text-center mb-6">
          <div className="text-2xl font-extrabold text-brand">TIGA PUTRA</div>
          <div className="text-xs tracking-[0.35em] text-muted">SUPPLIER</div>
        </div>
        <ErrorBox error={error} />
        <div className="space-y-3">
          <Field label="Email">
            <Input type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          </Field>
          <Field label="Password">
            <Input type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} />
          </Field>
          <Button type="submit" className="w-full" disabled={busy}>{busy ? "Masuk…" : "Masuk"}</Button>
        </div>
      </form>
    </div>
  );
}
