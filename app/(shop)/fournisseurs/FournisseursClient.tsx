"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Supplier = {
  id: string;
  name: string;
  phone: string | null;
  balance: number;
};

type Transaction = {
  id: string;
  type: string;
  amount: number;
  description: string | null;
  created_at: string;
};

function fmt(n: number) {
  return (Number(n) || 0).toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " MAD";
}

export default function FournisseursClient({ initialSuppliers }: { initialSuppliers: Supplier[] }) {
  const supabase = createClient();
  const [suppliers, setSuppliers] = useState<Supplier[]>(initialSuppliers);
  const [busy, setBusy] = useState(false);

  // Ajout fournisseur
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState("");
  const [newPhone, setNewPhone] = useState("");

  // Fournisseur ouvert (détail)
  const [openId, setOpenId] = useState<string | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [txType, setTxType] = useState<"debt" | "payment">("debt");
  const [txAmount, setTxAmount] = useState("");
  const [txDesc, setTxDesc] = useState("");

  const totalDue = suppliers.reduce((s, sup) => s + (sup.balance > 0 ? sup.balance : 0), 0);

  async function refreshSuppliers() {
    const { data } = await supabase.rpc("suppliers_with_balance");
    setSuppliers(data || []);
  }

  async function addSupplier() {
    if (!newName.trim()) { alert("Le nom est obligatoire"); return; }
    setBusy(true);
    const { error } = await supabase.from("suppliers").insert({
      name: newName.trim(),
      phone: newPhone.trim() || null,
    });
    setBusy(false);
    if (error) { alert("Erreur : " + error.message); return; }
    setNewName(""); setNewPhone(""); setShowAdd(false);
    refreshSuppliers();
  }

  async function openSupplier(id: string) {
    if (openId === id) { setOpenId(null); return; }
    setOpenId(id);
    const { data } = await supabase
      .from("supplier_transactions")
      .select("id, type, amount, description, created_at")
      .eq("supplier_id", id)
      .order("created_at", { ascending: false });
    setTransactions(data || []);
  }

  async function addTransaction(supplierId: string) {
    if (!txAmount || Number(txAmount) <= 0) { alert("Montant invalide"); return; }
    setBusy(true);
    const { error } = await supabase.from("supplier_transactions").insert({
      supplier_id: supplierId,
      type: txType,
      amount: Number(txAmount),
      description: txDesc.trim() || null,
    });
    setBusy(false);
    if (error) { alert("Erreur : " + error.message); return; }
    setTxAmount(""); setTxDesc("");
    // Recharger les transactions + les soldes
    const { data } = await supabase
      .from("supplier_transactions")
      .select("id, type, amount, description, created_at")
      .eq("supplier_id", supplierId)
      .order("created_at", { ascending: false });
    setTransactions(data || []);
    refreshSuppliers();
  }

  async function deleteSupplier(id: string, name: string) {
    if (!confirm(`Supprimer le fournisseur "${name}" et tout son historique ?`)) return;
    await supabase.from("suppliers").delete().eq("id", id);
    if (openId === id) setOpenId(null);
    refreshSuppliers();
  }

  const input = "border border-neutral-300 rounded-lg px-3 py-2 w-full";

  return (
    <div className="p-4 sm:p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">Fournisseurs</h1>
        <button onClick={() => setShowAdd(!showAdd)} className="bg-neutral-900 text-white rounded-lg px-4 py-2 font-medium">
          {showAdd ? "Annuler" : "+ Ajouter"}
        </button>
      </div>

      {/* Total dû */}
      <div className="bg-red-600 text-white rounded-xl p-4 mb-4 flex justify-between items-center">
        <span className="text-sm">Total à payer (tous fournisseurs)</span>
        <span className="text-2xl font-bold">{fmt(totalDue)}</span>
      </div>

      {/* Formulaire ajout */}
      {showAdd && (
        <div className="bg-white border border-neutral-200 rounded-xl p-4 mb-4">
          <h2 className="font-semibold mb-3">Nouveau fournisseur</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-3">
            <input placeholder="Nom *" value={newName} onChange={(e) => setNewName(e.target.value)} className={input} />
            <input placeholder="Téléphone" value={newPhone} onChange={(e) => setNewPhone(e.target.value)} className={input} />
          </div>
          <button onClick={addSupplier} disabled={busy} className="bg-neutral-900 text-white rounded-lg px-4 py-2 font-medium disabled:opacity-50">
            Enregistrer
          </button>
        </div>
      )}

      {/* Liste fournisseurs */}
      {suppliers.length === 0 ? (
        <p className="text-center text-neutral-400 py-8">Aucun fournisseur. Ajoutez-en un.</p>
      ) : (
        <div className="space-y-2">
          {suppliers.map((sup) => {
            const isOpen = openId === sup.id;
            return (
              <div key={sup.id} className="bg-white border border-neutral-200 rounded-xl overflow-hidden">
                <button onClick={() => openSupplier(sup.id)} className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-neutral-50">
                  <div>
                    <div className="font-medium">{sup.name}</div>
                    {sup.phone ? <div className="text-xs text-neutral-500">{sup.phone}</div> : null}
                  </div>
                  <div className="text-right">
                    <div className={`font-bold ${sup.balance > 0 ? "text-red-600" : sup.balance < 0 ? "text-green-600" : "text-neutral-400"}`}>
                      {sup.balance > 0 ? fmt(sup.balance) : sup.balance < 0 ? `Avance ${fmt(-sup.balance)}` : "À jour"}
                    </div>
                    <div className="text-xs text-neutral-400">{isOpen ? "▲" : "▼"}</div>
                  </div>
                </button>

                {isOpen && (
                  <div className="border-t border-neutral-100 p-4 bg-neutral-50">
                    {/* Ajouter dette / paiement */}
                    <div className="mb-4">
                      <div className="flex gap-2 mb-2">
                        <button onClick={() => setTxType("debt")}
                          className={`flex-1 py-2 rounded-lg text-sm font-medium border ${txType === "debt" ? "bg-red-600 text-white border-red-600" : "bg-white border-neutral-200"}`}>
                          Il me facture (dette)
                        </button>
                        <button onClick={() => setTxType("payment")}
                          className={`flex-1 py-2 rounded-lg text-sm font-medium border ${txType === "payment" ? "bg-green-600 text-white border-green-600" : "bg-white border-neutral-200"}`}>
                          Je le rembourse
                        </button>
                      </div>
                      <div className="flex gap-2">
                        <input type="number" inputMode="decimal" placeholder="Montant" value={txAmount}
                          onChange={(e) => setTxAmount(e.target.value)} className={input} />
                        <input type="text" placeholder="Note (optionnel)" value={txDesc}
                          onChange={(e) => setTxDesc(e.target.value)} className={input} />
                        <button onClick={() => addTransaction(sup.id)} disabled={busy}
                          className="bg-neutral-900 text-white rounded-lg px-4 py-2 font-medium whitespace-nowrap disabled:opacity-50">
                          Ajouter
                        </button>
                      </div>
                    </div>

                    {/* Historique */}
                    {transactions.length === 0 ? (
                      <p className="text-sm text-neutral-400">Aucun mouvement.</p>
                    ) : (
                      <div className="space-y-1.5">
                        {transactions.map((tx) => (
                          <div key={tx.id} className="flex justify-between text-sm border-b border-neutral-100 pb-1.5">
                            <div>
                              <span className={tx.type === "debt" ? "text-red-600" : "text-green-600"}>
                                {tx.type === "debt" ? "Dette" : "Paiement"}
                              </span>
                              {tx.description ? <span className="text-neutral-500"> — {tx.description}</span> : null}
                              <span className="text-neutral-400 text-xs"> · {new Date(tx.created_at).toLocaleDateString("fr-FR")}</span>
                            </div>
                            <span className={`font-medium ${tx.type === "debt" ? "text-red-600" : "text-green-600"}`}>
                              {tx.type === "debt" ? "+" : "−"}{fmt(tx.amount)}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}

                    <button onClick={() => deleteSupplier(sup.id, sup.name)} className="text-red-500 text-xs mt-4 hover:underline">
                      Supprimer ce fournisseur
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}