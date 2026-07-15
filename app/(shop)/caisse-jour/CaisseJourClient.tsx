"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import NumPad from "../NumPad";

type Expense = {
  id: string;
  category: string;
  amount: number;
  description: string | null;
  created_at: string;
  employee_name: string | null;
};

type Employee = { id: string; name: string; active: boolean };

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

const EXPENSE_CATEGORIES = ["Loyer", "Salaires", "Électricité", "Eau", "Achats stock", "Transport", "Retrait employé", "Autre"];

function fmt(n: number | undefined) {
  return (Number(n) || 0).toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " MAD";
}

export default function CaisseJourClient({
  initialSummary,
  initialEmployees,
}: {
  initialSummary: Summary;
  initialEmployees: Employee[];
}) {
  const supabase = createClient();
  const [summary, setSummary] = useState<Summary>(initialSummary);
  const [employees, setEmployees] = useState<Employee[]>(initialEmployees);
  const [busy, setBusy] = useState(false);

  const [openingAmount, setOpeningAmount] = useState("");
  const [closingAmount, setClosingAmount] = useState("");
  const [expCategory, setExpCategory] = useState("Loyer");
  const [expAmount, setExpAmount] = useState("");
  const [expDesc, setExpDesc] = useState("");
  const [expEmployee, setExpEmployee] = useState("");

  const [pad, setPad] = useState<null | "opening" | "closing" | "expense">(null);

  // Gestion employés
  const [showEmpManager, setShowEmpManager] = useState(false);
  const [newEmpName, setNewEmpName] = useState("");

  async function refresh() {
    const { data } = await supabase.rpc("cash_day_summary");
    setSummary(data || {});
  }

  async function refreshEmployees() {
    const { data } = await supabase.from("employees").select("id, name, active").eq("active", true).order("name");
    setEmployees(data || []);
  }

  async function addEmployee() {
    if (!newEmpName.trim()) return;
    setBusy(true);
    const { error } = await supabase.from("employees").insert({ name: newEmpName.trim() });
    setBusy(false);
    if (error) { alert("Erreur : " + error.message); return; }
    setNewEmpName("");
    refreshEmployees();
  }

  async function removeEmployee(id: string) {
    if (!confirm("Retirer cet employé de la liste ?")) return;
    await supabase.from("employees").update({ active: false }).eq("id", id);
    refreshEmployees();
  }

  async function openSession() {
    setBusy(true);
    const { error } = await supabase.from("cash_sessions").insert({ opening_amount: Number(openingAmount) || 0, status: "open" });
    setBusy(false);
    if (error) { alert("Erreur : " + error.message); return; }
    setOpeningAmount("");
    refresh();
  }

  async function closeSession() {
    if (!summary.session_id) return;
    setBusy(true);
    const { error } = await supabase.from("cash_sessions").update({
      closing_amount: Number(closingAmount) || 0, status: "closed", closed_at: new Date().toISOString(),
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
      employee_id: expEmployee || null,
    });
    setBusy(false);
    if (error) { alert("Erreur : " + error.message); return; }
    setExpAmount(""); setExpDesc(""); setExpEmployee("");
    refresh();
  }

  async function deleteExpense(id: string) {
    if (!confirm("Supprimer cette dépense ?")) return;
    await supabase.from("expenses").delete().eq("id", id);
    refresh();
  }

  const expectedCash = (summary.opening_amount || 0) + (summary.cash_sales || 0) - (summary.expenses_today || 0);
  const difference = closingAmount ? Number(closingAmount) - expectedCash : null;

  const input = "border border-neutral-300 rounded-lg px-3 py-2 w-full";
  const padField = "border border-neutral-300 rounded-lg px-3 py-2 w-full text-left bg-white cursor-pointer";

  return (
    <div className="p-4 sm:p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">Caisse du jour</h1>
        <button onClick={() => setShowEmpManager(!showEmpManager)} className="text-sm border border-neutral-300 rounded-lg px-3 py-2 font-medium">
          {showEmpManager ? "Fermer" : "Gérer les employés"}
        </button>
      </div>

      {/* Gestion des employés */}
      {showEmpManager && (
        <div className="bg-white border border-neutral-200 rounded-xl p-4 mb-4">
          <h2 className="font-semibold mb-3">Employés</h2>
          <div className="flex gap-2 mb-3">
            <input placeholder="Nom de l'employé" value={newEmpName} onChange={(e) => setNewEmpName(e.target.value)} className={input} />
            <button onClick={addEmployee} disabled={busy} className="bg-neutral-900 text-white rounded-lg px-4 py-2 font-medium whitespace-nowrap disabled:opacity-50">
              Ajouter
            </button>
          </div>
          {employees.length === 0 ? (
            <p className="text-sm text-neutral-400">Aucun employé.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {employees.map((emp) => (
                <div key={emp.id} className="flex items-center gap-2 bg-neutral-100 rounded-full pl-3 pr-2 py-1 text-sm">
                  <span>{emp.name}</span>
                  <button onClick={() => removeEmployee(emp.id)} className="text-neutral-400 hover:text-red-500">✕</button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {!summary.session_open ? (
        <div className="bg-white border border-neutral-200 rounded-xl p-5 mb-4">
          <h2 className="font-semibold mb-2">Ouvrir la caisse</h2>
          <p className="text-sm text-neutral-500 mb-3">Saisissez le fond de caisse (argent présent dans le tiroir au début).</p>
          <div className="flex gap-2">
            <button onClick={() => setPad("opening")} className={padField}>
              {openingAmount ? `${openingAmount} MAD` : <span className="text-neutral-400">Montant du fond (MAD)</span>}
            </button>
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

          <div className="bg-white border border-neutral-200 rounded-xl p-5 mb-4">
            <h2 className="font-semibold mb-3">Ajouter une dépense / retrait</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 mb-2">
              <select value={expCategory} onChange={(e) => setExpCategory(e.target.value)} className={input}>
                {EXPENSE_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
              <button onClick={() => setPad("expense")} className={padField}>
                {expAmount ? `${expAmount} MAD` : <span className="text-neutral-400">Montant</span>}
              </button>
              <select value={expEmployee} onChange={(e) => setExpEmployee(e.target.value)} className={input}>
                <option value="">— Employé (optionnel) —</option>
                {employees.map((emp) => <option key={emp.id} value={emp.id}>{emp.name}</option>)}
              </select>
              <input type="text" placeholder="Note (optionnel)" value={expDesc}
                onChange={(e) => setExpDesc(e.target.value)} className={input} />
            </div>
            <button onClick={addExpense} disabled={busy} className="bg-neutral-900 text-white rounded-lg px-4 py-2 font-medium disabled:opacity-50">
              Ajouter
            </button>

            {summary.expenses_list && summary.expenses_list.length > 0 && (
              <div className="mt-4 space-y-2">
                {summary.expenses_list.map((exp) => (
                  <div key={exp.id} className="flex justify-between items-center text-sm border-b border-neutral-100 pb-2">
                    <div>
                      <span className="font-medium">{exp.category}</span>
                      {exp.employee_name ? <span className="text-blue-600"> · {exp.employee_name}</span> : null}
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

          <div className="bg-white border border-neutral-200 rounded-xl p-5">
            <h2 className="font-semibold mb-2">Clôturer la caisse</h2>
            <p className="text-sm text-neutral-500 mb-3">Comptez l&apos;argent réel dans le tiroir et saisissez-le pour vérifier.</p>
            <div className="flex gap-2 mb-3">
              <button onClick={() => setPad("closing")} className={padField}>
                {closingAmount ? `${closingAmount} MAD` : <span className="text-neutral-400">Montant compté (MAD)</span>}
              </button>
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

      <NumPad open={pad === "opening"} initialValue={openingAmount} label="Fond de caisse"
        onConfirm={(v) => setOpeningAmount(v)} onClose={() => setPad(null)} />
      <NumPad open={pad === "closing"} initialValue={closingAmount} label="Montant compté"
        onConfirm={(v) => setClosingAmount(v)} onClose={() => setPad(null)} />
      <NumPad open={pad === "expense"} initialValue={expAmount} label="Montant de la dépense"
        onConfirm={(v) => setExpAmount(v)} onClose={() => setPad(null)} />
    </div>
  );
}