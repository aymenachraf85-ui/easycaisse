"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";

export default function SignupPage() {
  const router = useRouter();
  const supabase = createClient();
  const [shopName, setShopName] = useState("");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSignup() {
    setError("");
    setLoading(true);

    // 1. Créer le compte utilisateur
    const { data, error: signErr } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName } },
    });

    console.log("SIGNUP RESULT:", { data, signErr });

    if (signErr) {
      setLoading(false);
      setError("Erreur signUp: " + signErr.message);
      return;
    }
    if (!data.user) {
      setLoading(false);
      setError("Pas d'utilisateur retourné (vérifier Confirm email)");
      return;
    }

    // 2. Créer la boutique via la route serveur
    const res = await fetch("/api/onboard", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: data.user.id, shopName }),
    });

    const result = await res.json();
    console.log("ONBOARD RESULT:", result);

    setLoading(false);
    if (!res.ok) {
      setError("Onboard: " + (result.error || "échec inconnu"));
      return;
    }
    router.push("/redirect");
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-neutral-50 px-4">
      <div className="w-full max-w-sm bg-white rounded-xl shadow-sm border border-neutral-200 p-6">
        <h1 className="text-2xl font-bold mb-1">Créer votre boutique</h1>
        <p className="text-sm text-neutral-500 mb-6">Quelques infos pour démarrer</p>

        <label className="block text-sm font-medium mb-1">Nom de la boutique</label>
        <input value={shopName} onChange={(e) => setShopName(e.target.value)}
          className="w-full border border-neutral-300 rounded-lg px-3 py-2 mb-3" placeholder="Ma Boutique" />

        <label className="block text-sm font-medium mb-1">Votre nom</label>
        <input value={fullName} onChange={(e) => setFullName(e.target.value)}
          className="w-full border border-neutral-300 rounded-lg px-3 py-2 mb-3" placeholder="Prénom Nom" />

        <label className="block text-sm font-medium mb-1">Email</label>
        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
          className="w-full border border-neutral-300 rounded-lg px-3 py-2 mb-3" placeholder="vous@exemple.com" />

        <label className="block text-sm font-medium mb-1">Mot de passe</label>
        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
          className="w-full border border-neutral-300 rounded-lg px-3 py-2 mb-3" placeholder="••••••" />

        {error && <p className="text-sm text-red-600 mb-3">{error}</p>}

        <button onClick={handleSignup} disabled={loading}
          className="w-full bg-neutral-900 text-white rounded-lg py-2.5 font-medium disabled:opacity-50">
          {loading ? "Création…" : "Créer ma boutique"}
        </button>

        <p className="text-sm text-center text-neutral-500 mt-4">
          Déjà un compte ?{" "}
          <Link href="/login" className="text-neutral-900 font-medium underline">Se connecter</Link>
        </p>
      </div>
    </div>
  );
}