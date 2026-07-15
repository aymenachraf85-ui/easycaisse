"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";

type PaymentRow = { payment_method: string; total: number; count: number };
type TopProduct = { name: string; qty: number; revenue: number };
type ExpenseCat = { category: string; total: number };

type Report = {
  sales_total?: number;
  sales_count?: number;
  profit?: number;
  expenses?: number;
  items_sold?: number;
  by_payment?: PaymentRow[];
  top_products?: TopProduct[];
  expenses_by_cat?: ExpenseCat[];
};

const PAYMENT_LABELS: Record<string, string> = { cash: "Espèces", card: "Carte", transfer: "Virement" };

function fmt(n: number | undefined) {
  return (Number(n) || 0).toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " MAD";
}

// Bornes de période
function dayBounds(dateStr: string) {
  const start = new Date(dateStr + "T00:00:00");
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return { start, end };
}
function monthBounds(monthStr: string) {
  const start = new Date(monthStr + "-01T00:00:00");
  const end = new Date(start);
  end.setMonth(end.getMonth() + 1);
  return { start, end };
}

export default function RapportsClient() {
  const supabase = createClient();
  const [mode, setMode] = useState<"day" | "month">("day");
  const today = new Date();
  const [day, setDay] = useState(today.toISOString().slice(0, 10));
  const [month, setMonth] = useState(today.toISOString().slice(0, 7));
  const [report, setReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const { start, end } = mode === "day" ? dayBounds(day) : monthBounds(month);
    const { data } = await supabase.rpc("period_report", {
      p_start: start.toISOString(),
      p_end: end.toISOString(),
    });
    setReport(data || {});
    setLoading(false);
  }, [mode, day, month, supabase]);

  useEffect(() => { load(); }, [load]);

  const net = (report?.profit || 0) - (report?.expenses || 0);

  return (
    <div className="p-4 sm:p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Rapports</h1>

      {/* Sélecteur période */}
      <div className="bg-white border border-neutral-200 rounded-xl p-4 mb-4">
        <div className="flex gap-2 mb-3">
          <button onClick={() => setMode("day")}
            className={`flex-1 py-2 rounded-lg font-medium border ${mode === "day" ? "bg-neutral-900 text-white border-neutral-900" : "bg-white border-neutral-200"}`}>
            Par jour
          </button>
          <button onClick={() => setMode("month")}
            className={`flex-1 py-2 rounded-lg font-medium border ${mode === "month" ? "bg-neutral-900 text-white border-neutral-900" : "bg-white border-neutral-200"}`}>
            Par mois
          </button>
        </div>
        {mode === "day" ? (
          <input type="date" value={day} onChange={(e) => setDay(e.target.value)}
            className="border border-neutral-300 rounded-lg px-4 py-2 w-full" />
        ) : (
          <input type="month" value={month} onChange={(e) => setMonth(e.target.value)}
            className="border border-neutral-300 rounded-lg px-4 py-2 w-full" />
        )}
      </div>

      {loading ? (
        <p className="text-center text-neutral-400 py-8">Chargement…</p>
      ) : report ? (
        <>
          {/* Cartes principales */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
            <div className="bg-white border border-neutral-200 rounded-xl p-4">
              <div className="text-xs text-neutral-500">Ventes</div>
              <div className="text-xl font-bold">{fmt(report.sales_total)}</div>
              <div className="text-xs text-neutral-400">{report.sales_count || 0} vente(s) · {report.items_sold || 0} article(s)</div>
            </div>
            <div className="bg-white border border-neutral-200 rounded-xl p-4">
              <div className="text-xs text-neutral-500">Profit brut</div>
              <div className="text-xl font-bold">{fmt(report.profit)}</div>
            </div>
            <div className="bg-white border border-neutral-200 rounded-xl p-4">
              <div className="text-xs text-neutral-500">Dépenses</div>
              <div className="text-xl font-bold text-red-600">−{fmt(report.expenses)}</div>
            </div>
            <div className={`rounded-xl p-4 border ${net >= 0 ? "bg-emerald-600 border-emerald-600 text-white" : "bg-red-600 border-red-600 text-white"}`}>
              <div className="text-xs text-white/80">Bénéfice net</div>
              <div className="text-xl font-bold">{fmt(net)}</div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Par moyen de paiement */}
            <div className="bg-white border border-neutral-200 rounded-xl p-5">
              <h2 className="font-semibold mb-3">Par moyen de paiement</h2>
              {(report.by_payment || []).length === 0 ? (
                <p className="text-sm text-neutral-400">Aucune vente.</p>
              ) : (
                <div className="space-y-2">
                  {report.by_payment!.map((p) => (
                    <div key={p.payment_method} className="flex justify-between text-sm border-b border-neutral-100 pb-2">
                      <span>{PAYMENT_LABELS[p.payment_method] || p.payment_method} <span className="text-neutral-400">({p.count})</span></span>
                      <span className="font-medium">{fmt(p.total)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Dépenses par catégorie */}
            <div className="bg-white border border-neutral-200 rounded-xl p-5">
              <h2 className="font-semibold mb-3">Dépenses par catégorie</h2>
              {(report.expenses_by_cat || []).length === 0 ? (
                <p className="text-sm text-neutral-400">Aucune dépense.</p>
              ) : (
                <div className="space-y-2">
                  {report.expenses_by_cat!.map((e) => (
                    <div key={e.category} className="flex justify-between text-sm border-b border-neutral-100 pb-2">
                      <span>{e.category}</span>
                      <span className="font-medium text-red-600">−{fmt(e.total)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Top produits */}
            <div className="bg-white border border-neutral-200 rounded-xl p-5 lg:col-span-2">
              <h2 className="font-semibold mb-3">Articles les plus vendus</h2>
              {(report.top_products || []).length === 0 ? (
                <p className="text-sm text-neutral-400">Aucune vente.</p>
              ) : (
                <div className="space-y-2">
                  {report.top_products!.map((t, i) => (
                    <div key={i} className="flex justify-between text-sm border-b border-neutral-100 pb-2">
                      <span>{t.name} <span className="text-neutral-400">× {t.qty}</span></span>
                      <span className="font-medium">{fmt(t.revenue)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}