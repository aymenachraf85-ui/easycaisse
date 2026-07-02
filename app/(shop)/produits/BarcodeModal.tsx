"use client";

import { useEffect } from "react";
import JsBarcode from "jsbarcode";

type BarcodeEntry = { size: string; code: string; qty: number };

export default function BarcodeModal({
  productName,
  entries,
  onClose,
}: {
  productName: string;
  entries: BarcodeEntry[];
  onClose: () => void;
}) {
  useEffect(() => {
    entries.forEach((entry) => {
      for (let i = 0; i < entry.qty; i++) {
        const svg = document.getElementById(`barcode-${entry.code}-${i}`);
        if (svg) {
          try {
            JsBarcode(svg, entry.code, { format: "EAN13", width: 2, height: 50, fontSize: 14, margin: 5 });
          } catch {
            try {
              JsBarcode(svg, entry.code, { format: "CODE128", width: 2, height: 50, fontSize: 14, margin: 5 });
            } catch {}
          }
        }
      }
    });
  }, [entries]);

  const totalLabels = entries.reduce((s, e) => s + e.qty, 0);

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 print:bg-white print:p-0 print:block">
      <div className="bg-white rounded-xl max-w-md w-full max-h-[85vh] overflow-y-auto print:max-w-none print:rounded-none">
        <div className="flex items-center justify-between p-4 border-b border-neutral-200 print:hidden">
          <div>
            <h3 className="font-semibold">Codes-barres — {productName}</h3>
            <p className="text-xs text-neutral-500">{totalLabels} étiquette(s) à imprimer (selon le stock)</p>
          </div>
          <button onClick={onClose} className="text-neutral-500 text-xl">✕</button>
        </div>

        <div id="barcode-print-area" className="p-4 grid grid-cols-2 gap-2">
          {entries.length === 0 ? (
            <p className="text-sm text-neutral-400 col-span-2">Aucun code-barres.</p>
          ) : (
            entries.flatMap((entry) =>
              Array.from({ length: Math.max(0, entry.qty) }).map((_, i) => (
                <div key={`${entry.code}-${i}`} className="text-center border border-neutral-200 rounded-lg p-2 break-inside-avoid">
                  <div className="font-medium text-[11px] mb-1 truncate">{productName} — {entry.size}</div>
                  <svg id={`barcode-${entry.code}-${i}`}></svg>
                </div>
              ))
            )
          )}
        </div>

        <div className="flex gap-2 p-4 border-t border-neutral-200 print:hidden">
          <button onClick={onClose} className="flex-1 border border-neutral-300 rounded-lg py-2.5 font-medium">Fermer</button>
          <button onClick={() => window.print()} className="flex-1 bg-neutral-900 text-white rounded-lg py-2.5 font-medium">Imprimer les étiquettes</button>
        </div>
      </div>

      <style jsx global>{`
        @media print {
          body * { visibility: hidden; }
          #barcode-print-area, #barcode-print-area * { visibility: visible; }
          #barcode-print-area { position: absolute; left: 0; top: 0; width: 100%; }
        }
      `}</style>
    </div>
  );
}