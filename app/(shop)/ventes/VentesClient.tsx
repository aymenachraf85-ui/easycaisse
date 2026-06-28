"use client";

import { useState, useMemo } from "react";

type ProductRef = { name: string; size: string | null };

type SaleItem = {
  id: string;
  quantity: number;
  sold_price: number;
  products: ProductRef | ProductRef[] | null;
};

type Sale = {
  id: string;
  total: number;
  payment_method: string;
  created_at: string;
  sale_items: SaleItem[];
};

const PAYMENT_LABELS: Record<string, string> = {
  cash: "Espèces",
  card: "Carte",
  transfer: "Virement",
};

function fmt(n: number) {
  return (Number(n) || 0).toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " MAD";
}

// products peut être un objet OU un tableau selon Supabase : on normalise
function getProduct(p: ProductRef | ProductRef[] | null): ProductRef | null {
  if (!p) return null;
  if (Array.isArray(p)) return p[0] || null;
  return p;
}

export default function VentesClient({ sales }: { sales: Sale[] }) {
  const [openId, setOpenId] = useState<string | null>(null);
  const [filter, setFilter] = useState("");

  const filtered = useMemo(() => {
    if (!filter) return sales;
    return sales.filter((s) => new Date(s.created_at).toLocaleDateString("fr-FR").includes(filter));
  }, [sales, filter]);

  const dayTotal = filtered.reduce((s, sale) => s + Number(sale.total), 0);

  return (
    <div className="p-4 sm:p-6 max-w-4xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <h1 className="text-2xl font-bold">Historique des ventes</h1>
        <input
          type="text"
          placeholder="Filtrer par date (ex: 28/06)"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="border border-neutral-300 rounded-lg px-4 py-2 text-sm"
        />
      </div>

      <div className="bg-neutral-900 text-white rounded-xl p-4 mb-4 flex justify-between items-center">
        <span className="text-sm text-neutral-300">{filtered.length} vente(s) affichée(s)</span>
        <span className="text-xl font-bold">{fmt(dayTotal)}</span>
      </div>

      {filtered.length === 0 ? (
        <p className="text-center text-neutral-400 py-8">Aucune vente.</p>
      ) : (
        <div className="space-y-2">
          {filtered.map((sale) => {
            const date = new Date(sale.created_at);
            const isOpen = openId === sale.id;
            return (
              <div key={sale.id} className="bg-white border border-neutral-200 rounded-xl overflow-hidden">
                <button
                  onClick={() => setOpenId(isOpen ? null : sale.id)}
                  className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-neutral-50"
                >
                  <div>
                    <div className="font-medium text-sm">
                      {date.toLocaleDateString("fr-FR")} à {date.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                    </div>
                    <div className="text-xs text-neutral-500">
                      {PAYMENT_LABELS[sale.payment_method] || sale.payment_method} · N° {sale.id.slice(0, 8).toUpperCase()}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-bold">{fmt(sale.total)}</span>
                    <span className="text-neutral-400 text-sm">{isOpen ? "▲" : "▼"}</span>
                  </div>
                </button>

                {isOpen && (
                  <div className="border-t border-neutral-100 px-4 py-3 bg-neutral-50">
                    {sale.sale_items.length === 0 ? (
                      <p className="text-sm text-neutral-400">Aucun détail.</p>
                    ) : (
                      <div className="space-y-1.5">
                        {sale.sale_items.map((item) => {
                          const prod = getProduct(item.products);
                          return (
                            <div key={item.id} className="flex justify-between text-sm">
                              <span>
                                {item.quantity} × {prod?.name || "Produit supprimé"}
                                {prod?.size ? ` (${prod.size})` : ""}
                              </span>
                              <span className="font-medium">{fmt(item.sold_price * item.quantity)}</span>
                            </div>
                          );
                        })}
                      </div>
                    )}
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