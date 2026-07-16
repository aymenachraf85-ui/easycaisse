"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";

type PaymentRow = { payment_method: string; total: number; count: number };
type TopProduct = { name: string; qty: number; revenue: number };
type ExpenseCat = { category: string; total: number };
type SaleItem = { name: string; size: string | null; quantity: number; sold_price: number };
type SaleRow = { id: string; created_at: string; total: number; payment_method: string; items: SaleItem[] };
type ExpenseRow = { id: string; created_at: string; category: string; amount: number; description: string | null; employee_name: string | null };

type Report = {
  sales_total?: number;
  sales_count?: number;
  profit?: number;
  expenses?: number;
  items_sold?: number;
  by_payment?: PaymentRow[];
  top_products?: TopProduct[];
  expenses_by_cat?: ExpenseCat[];
  sales_list?: SaleRow[];
  expenses_list?: ExpenseRow[];
};

const PAYMENT_LABELS: Record<string, string> = { cash: "Espèces", card: "Carte", transfer: "Virement" };

function fmt(n: number | undefined) {
  return (Number(n) || 0).toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " MAD";
}

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
  const [showSales, setShowSales] = useState(false);
  const [showExpenses, setShowExpenses] = useState(false);
  const [openSaleId, setOpenSaleId] = useState<string | null>(null);

  const periodLabel = mode === "day"
    ? new Date(day + "T00:00:00").toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" })
    : new Date(month + "-01T00:00:00").toLocaleDateString("fr-FR", { month: "long", year: "numeric" });

  const load = useCallback(async () => {
    setLoading(true);
    const { start, end } = mode === "day" ? dayBounds(day) : monthBounds(month);
    const { data } = await supabase.rpc("period_full_report", {
      p_start: start.toISOString(),
      p_end: end.toISOString(),
    });
    setReport(data || {});
    setLoading(false);
  }, [mode, day, month, supabase]);

  useEffect(() => { load(); }, [load]);

  const net = (report?.profit || 0) - (report?.expenses || 0);

  function exportPDF() {
    if (!report) return;
    const win = window.open("", "_blank");
    if (!win) { alert("Autorisez les pop-ups pour exporter."); return; }

    const salesRows = (report.sales_list || []).map((s) => {
      const itemsStr = s.items.map((i) => `${i.quantity}× ${i.name}${i.size ? ` (${i.size})` : ""} — ${fmt(i.sold_price * i.quantity)}`).join("<br>");
      return `
        <tr>
          <td>${new Date(s.created_at).toLocaleString("fr-FR")}</td>
          <td>${itemsStr}</td>
          <td>${PAYMENT_LABELS[s.payment_method] || s.payment_method}</td>
          <td style="text-align:right;font-weight:bold">${fmt(s.total)}</td>
        </tr>`;
    }).join("");

    const expenseRows = (report.expenses_list || []).map((e) => `
      <tr>
        <td>${new Date(e.created_at).toLocaleString("fr-FR")}</td>
        <td>${e.category}${e.employee_name ? ` (${e.employee_name})` : ""}</td>
        <td>${e.description || ""}</td>
        <td style="text-align:right;font-weight:bold;color:#dc2626">−${fmt(e.amount)}</td>
      </tr>`).join("");

    win.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Rapport — ${periodLabel}</title>
        <style>
          @page { size: A4; margin: 15mm; }
          * { box-sizing: border-box; }
          body { font-family: Arial, sans-serif; color: #111; font-size: 12px; }
          h1 { font-size: 20px; margin-bottom: 2px; }
          h2 { font-size: 14px; margin: 20px 0 8px; border-bottom: 2px solid #111; padding-bottom: 4px; }
          .subtitle { color: #666; margin-bottom: 20px; }
          .summary { display: flex; gap: 12px; margin-bottom: 10px; flex-wrap: wrap; }
          .card { border: 1px solid #ddd; border-radius: 6px; padding: 10px 14px; flex: 1; min-width: 120px; }
          .card .label { font-size: 10px; color: #666; }
          .card .value { font-size: 16px; font-weight: bold; margin-top: 2px; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 10px; }
          th, td { border-bottom: 1px solid #eee; padding: 6px 8px; text-align: left; font-size: 11px; vertical-align: top; }
          th { background: #f5f5f5; font-size: 10px; text-transform: uppercase; color: #555; }
          .net-pos { color: #059669; }
          .net-neg { color: #dc2626; }
          @media print {
            .no-print { display: none; }
          }
        </style>
      </head>
      <body>
        <h1>Rapport de boutique</h1>
        <div class="subtitle">Période : ${periodLabel}</div>

        <div class="summary">
          <div class="card"><div class="label">VENTES</div><div class="value">${fmt(report.sales_total)}</div></div>
          <div class="card"><div class="label">PROFIT BRUT</div><div class="value">${fmt(report.profit)}</div></div>
          <div class="card"><div class="label">DÉPENSES</div><div class="value" style="color:#dc2626">−${fmt(report.expenses)}</div></div>
          <div class="card"><div class="label">BÉNÉFICE NET</div><div class="value ${net >= 0 ? "net-pos" : "net-neg"}">${fmt(net)}</div></div>
        </div>

        <h2>Ventes détaillées (${report.sales_count || 0})</h2>
        <table>
          <thead><tr><th>Date/heure</th><th>Articles</th><th>Paiement</th><th style="text-align:right">Total</th></tr></thead>
          <tbody>${salesRows || '<tr><td colspan="4">Aucune vente.</td></tr>'}</tbody>
        </table>

        <h2>Dépenses détaillées</h2>
        <table>
          <thead><tr><th>Date/heure</th><th>Catégorie</th><th>Note</th><th style="text-align:right">Montant</th></tr></thead>
          <tbody>${expenseRows || '<tr><td colspan="4">Aucune dépense.</td></tr>'}</tbody>
        </table>

        <script>
          window.onload = function() { window.print(); };
        </script>
      </body>
      </html>
    `);
    win.document.close();
  }

  return (
    <div className="p-4 sm:p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">Rapports</h1>
        <button onClick={exportPDF} disabled={!report} className="bg-neutral-900 text-white rounded-lg px-4 py-2 text-sm font-medium disabled:opacity-50">
          📄 Exporter PDF
        </button>
      </div>

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

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
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

          {/* Liste complète des ventes */}
          <div className="bg-white border border-neutral-200 rounded-xl mb-4 overflow-hidden">
            <button onClick={() => setShowSales(!showSales)} className="w-full flex justify-between items-center p-5 text-left">
              <h2 className="font-semibold">Toutes les ventes ({report.sales_list?.length || 0})</h2>
              <span className="text-neutral-400">{showSales ? "▲" : "▼"}</span>
            </button>
            {showSales && (
              <div className="px-5 pb-5 space-y-2">
                {(report.sales_list || []).length === 0 ? (
                  <p className="text-sm text-neutral-400">Aucune vente.</p>
                ) : (
                  report.sales_list!.map((s) => {
                    const isOpen = openSaleId === s.id;
                    return (
                      <div key={s.id} className="border border-neutral-100 rounded-lg overflow-hidden">
                        <button onClick={() => setOpenSaleId(isOpen ? null : s.id)}
                          className="w-full flex justify-between items-center px-3 py-2 text-left hover:bg-neutral-50 text-sm">
                          <span>{new Date(s.created_at).toLocaleString("fr-FR")} · {PAYMENT_LABELS[s.payment_method] || s.payment_method}</span>
                          <span className="font-bold">{fmt(s.total)}</span>
                        </button>
                        {isOpen && (
                          <div className="bg-neutral-50 px-3 py-2 space-y-1">
                            {s.items.map((it, i) => (
                              <div key={i} className="flex justify-between text-xs text-neutral-600">
                                <span>{it.quantity}× {it.name}{it.size ? ` (${it.size})` : ""}</span>
                                <span>{fmt(it.sold_price * it.quantity)}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </div>

          {/* Liste complète des dépenses */}
          <div className="bg-white border border-neutral-200 rounded-xl overflow-hidden">
            <button onClick={() => setShowExpenses(!showExpenses)} className="w-full flex justify-between items-center p-5 text-left">
              <h2 className="font-semibold">Toutes les dépenses ({report.expenses_list?.length || 0})</h2>
              <span className="text-neutral-400">{showExpenses ? "▲" : "▼"}</span>
            </button>
            {showExpenses && (
              <div className="px-5 pb-5 space-y-2">
                {(report.expenses_list || []).length === 0 ? (
                  <p className="text-sm text-neutral-400">Aucune dépense.</p>
                ) : (
                  report.expenses_list!.map((e) => (
                    <div key={e.id} className="flex justify-between items-start text-sm border-b border-neutral-100 pb-2">
                      <div>
                        <span className="font-medium">{e.category}</span>
                        {e.employee_name ? <span className="text-blue-600"> · {e.employee_name}</span> : null}
                        {e.description ? <div className="text-xs text-neutral-400">{e.description}</div> : null}
                        <div className="text-xs text-neutral-400">{new Date(e.created_at).toLocaleString("fr-FR")}</div>
                      </div>
                      <span className="text-red-600 font-medium whitespace-nowrap">−{fmt(e.amount)}</span>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </>
      ) : null}
    </div>
  );
}