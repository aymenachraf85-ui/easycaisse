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
            JsBarcode(svg, entry.code, {
              format: "CODE128",
              width: 2,
              height: 60,
              fontSize: 16,
              margin: 0,
              displayValue: true,
            });
          } catch {}
        }
      }
    });
  }, [entries]);

  const totalLabels = entries.reduce((s, e) => s + e.qty, 0);

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 print:bg-white print:p-0 print:block print:static">
      <div className="bg-white rounded-xl max-w-md w-full max-h-[85vh] overflow-y-auto print:max-w-none print:max-h-none print:overflow-visible print:rounded-none">
        <div className="flex items-center justify-between p-4 border-b border-neutral-200 print:hidden">
          <div>
            <h3 className="font-semibold">Codes-barres — {productName}</h3>
            <p className="text-xs text-neutral-500">{totalLabels} étiquette(s) · 80×80mm</p>
          </div>
          <button onClick={onClose} className="text-neutral-500 text-xl">✕</button>
        </div>

        <div id="labels-print-area" className="p-4 print:p-0">
          {entries.length === 0 ? (
            <p className="text-sm text-neutral-400">Aucun code-barres.</p>
          ) : (
            entries.flatMap((entry) =>
              Array.from({ length: Math.max(0, entry.qty) }).map((_, i) => (
                <div key={`${entry.code}-${i}`} className="label-item border border-neutral-200 rounded-lg mb-2 print:border-0 print:rounded-none print:mb-0">
                  <div className="label-inner">
                    <div className="label-name">{productName}</div>
                    <div className="label-size">Taille {entry.size}</div>
                    <svg id={`barcode-${entry.code}-${i}`}></svg>
                  </div>
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
        .label-inner {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          text-align: center;
          padding: 4mm;
        }
        .label-name {
          font-size: 13px;
          font-weight: 700;
          margin-bottom: 1mm;
          max-width: 72mm;
          overflow: hidden;
          white-space: nowrap;
          text-overflow: ellipsis;
        }
        .label-size {
          font-size: 12px;
          margin-bottom: 2mm;
        }

        @media print {
          /* Une étiquette = une page de 80x80mm */
          @page {
            size: 80mm 80mm;
            margin: 0;
          }
          html, body {
            width: 80mm;
            margin: 0 !important;
            padding: 0 !important;
            background: #fff !important;
          }
          body * { visibility: hidden !important; }
          #labels-print-area,
          #labels-print-area * { visibility: visible !important; }
          #labels-print-area {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 80mm !important;
          }
          .label-item {
            width: 80mm;
            height: 80mm;
            display: flex;
            align-items: center;
            justify-content: center;
            page-break-after: always;
            break-after: page;
            overflow: hidden;
          }
          .label-item:last-child {
            page-break-after: auto;
            break-after: auto;
          }
        }
      `}</style>
    </div>
  );
}