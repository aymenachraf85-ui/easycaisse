"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Expense = {
  id: string;
  category: string;
  amount: number;
  description: string | null;
  created_at: string;
};

type Summary = {
  session_id?: string | null;
  session_open?: boolean;
  opening_amount?: number;
  opened_at?: string | null;
  cash_sales?: number;
  all_sales?: number;
  expenses_today?: number;
  expenses_list?: Expense[];
};

const EXPENSE_CATEGORIES = ["Loyer", "Salaires", "Électricité", "Eau", "Achats stock", "Transport", "Autre"];

function fmt(n: number | undefined) {
  return (Number(n) || 0).toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " MAD";
}

export default function CaisseJourClient({ initialSummary }: { initialSummary: Summary }) {
  const supabase = createClient();
  const [summary, setSummary] = useState<Summary>(initialSummary);
  const [busy, setBusy] = useState(false);

  // Ouverture
  const [openingAmount, setOpeningAmount] = useState("");
  // Clôture
  const [closingAmount, setClosingAmount] = useState("");
  // Dépense
  const [expCategory, setExpCategory] = useState("Loyer");
  const [expAmount, setExpAmount] = useState("");
  const [expDesc, setExpDesc] = useState("");

  async function refresh() {
    const { data } = await supabase.rpc("cash_day_summary");
    setSummary(data || {});
  }

  async function openSession() {
    setBusy(true);
    const { error } = await supabase.from("cash_sessions").insert({
      opening_amount: Number(openingAmount) || 0,
      status: "open",
    });
    setBusy(false);
    if (error) { alert("Erreur : " + error.message); return; }
    setOpeningAmount("");
    refresh();
  }

  async function closeSession() {
    if (!summary.session_id) return;
    setBusy(true);
    const { error } = await supabase.from("cash_sessions").update({
      closing_amount: Number(closingAmount) || 0,
      status: "closed",
      closed_at: new Date().toISOString(),
    }).eq("id", summary.session_id);
    setBusy(false);
    if (error) { alert("Erreur : " + error.message); return; }
    setClosingAmount("");
    refresh();
  }

  async function addExpense() {
    if (!expAmount || Number(expAmount) <= 0) { alert("Montant invalide"); return; }
    setBusy(true);
    const { error } = await supabase.from("expenses").insert({
      category: expCategory,
      amount: Number(expAmount),
      description: expDesc.trim() || null,
    });
    setBusy(false);
    if (error) { alert("Erreur : " + error.message); return; }
    setExpAmount("");
    setExpDesc("");
    refresh();
  }

  async function deleteExpense(id: string) {
    if (!confirm("Supprimer cette dépense ?")) return;
    await supabase.from("expenses").delete().eq("id", id);
    refresh();
  }

  // Ce qui devrait être dans le tiroir (espèces)
  const expectedCash = (summary.opening_amount || 0) + (summary.cash_sales || 0) - (summary.expenses_today || 0);
  const difference = closingAmount ? Number(closingAmount) - expectedCash : null;

  const input = "border border-neutral-300 rounded-lg px-3 py-2 w-full";

  return (
    <div className="p-4 sm:p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Caisse du jour</h1>

      {/* État de la session */}
      {!summary.session_open ? (
        <div className="bg-white border border-neutral-200 rounded-xl p-5 mb-4">
          <h2 className="font-semibold mb-2">Ouvrir la caisse</h2>
          <p className="text-sm text-neutral-500 mb-3">Saisissez le fond de caisse (argent présent dans le tiroir au début).</p>
          <div className="flex gap-2">
            <input type="number" inputMode="decimal" placeholder="Montant du fond (MAD)" value={openingAmount}
              onChange={(e) => setOpeningAmount(e.target.value)} className={input} />
            <button onClick={openSession} disabled={busy} className="bg-emerald-600 text-white rounded-lg px-6 py-2 font-semibold whitespace-nowrap disabled:opacity-50">
              Ouvrir
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 mb-4 flex justify-between items-center">
          <div>
            <div className="font-semibold text-emerald-800">Caisse ouverte</div>
            <div className="text-sm text-emerald-700">Fond initial : {fmt(summary.opening_amount)}</div>
          </div>
          <div className="text-xs text-emerald-600">
            {summary.opened_at ? new Date(summary.opened_at).toLocaleString("fr-FR") : ""}
          </div>
        </div>
      )}

      {summary.session_open && (
        <>
          {/* Résumé chiffré */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
            <div className="bg-white border border-neutral-200 rounded-xl p-4">
              <div className="text-xs text-neutral-500">Fond initial</div>
              <div className="text-lg font-bold">{fmt(summary.opening_amount)}</div>
            </div>
            <div className="bg-white border border-neutral-200 rounded-xl p-4">
              <div className="text-xs text-neutral-500">Ventes espèces</div>
              <div className="text-lg font-bold text-emerald-600">{fmt(summary.cash_sales)}</div>
            </div>
            <div className="bg-white border border-neutral-200 rounded-xl p-4">
              <div className="text-xs text-neutral-500">Dépenses</div>
              <div className="text-lg font-bold text-red-600">−{fmt(summary.expenses_today)}</div>
            </div>
            <div className="bg-neutral-900 text-white rounded-xl p-4">
              <div className="text-xs text-neutral-300">Attendu en caisse</div>
              <div className="text-lg font-bold">{fmt(expectedCash)}</div>
            </div>
          </div>

          {/* Ajout de dépense */}
          <div className="bg-white border border-neutral-200 rounded-xl p-5 mb-4">
            <h2 className="font-semibold mb-3">Ajouter une dépense</h2>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
              <select value={expCategory} onChange={(e) => setExpCategory(e.target.value)} className={input}>
                {EXPENSE_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
              <input type="number" inputMode="decimal" placeholder="Montant" value={expAmount}
                onChange={(e) => setExpAmount(e.target.value)} className={input} />
              <input type="text" placeholder="Description (optionnel)" value={expDesc}
                onChange={(e) => setExpDesc(e.target.value)} className={`${input} sm:col-span-1`} />
              <button onClick={addExpense} disabled={busy} className="bg-neutral-900 text-white rounded-lg px-4 py-2 font-medium disabled:opacity-50">
                Ajouter
              </button>
            </div>

            {/* Liste des dépenses du jour */}
            {summary.expenses_list && summary.expenses_list.length > 0 && (
              <div className="mt-4 space-y-2">
                {summary.expenses_list.map((exp) => (
                  <div key={exp.id} className="flex justify-between items-center text-sm border-b border-neutral-100 pb-2">
                    <div>
                      <span className="font-medium">{exp.category}</span>
                      {exp.description ? <span className="text-neutral-500"> — {exp.description}</span> : null}
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-red-600 font-medium">−{fmt(exp.amount)}</span>
                      <button onClick={() => deleteExpense(exp.id)} className="text-neutral-400 text-xs">✕</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Clôture */}
          <div className="bg-white border border-neutral-200 rounded-xl p-5">
            <h2 className="font-semibold mb-2">Clôturer la caisse</h2>
            <p className="text-sm text-neutral-500 mb-3">Comptez l&apos;argent réel dans le tiroir et saisissez-le pour vérifier.</p>
            <div className="flex gap-2 mb-3">
              <input type="number" inputMode="decimal" placeholder="Montant compté (MAD)" value={closingAmount}
                onChange={(e) => setClosingAmount(e.target.value)} className={input} />
              <button onClick={closeSession} disabled={busy} className="bg-red-600 text-white rounded-lg px-6 py-2 font-semibold whitespace-nowrap disabled:opacity-50">
                Clôturer
              </button>
            </div>
            {difference !== null && (
              <div className={`text-sm rounded-lg px-3 py-2 ${difference === 0 ? "bg-green-50 text-green-700" : "bg-orange-50 text-orange-700"}`}>
                {difference === 0
                  ? "✓ La caisse est équilibrée."
                  : difference > 0
                    ? `Excédent de ${fmt(difference)} (plus d'argent que prévu)`
                    : `Manque de ${fmt(Math.abs(difference))} (moins d'argent que prévu)`}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}