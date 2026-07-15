"use client";

import { useEffect, useRef } from "react";
import JsBarcode from "jsbarcode";

type BarcodeEntry = { size: string; code: string; qty: number };

function buildLabels(entries: BarcodeEntry[]) {
  const labels: { size: string; code: string; uid: string }[] = [];
  entries.forEach((entry) => {
    for (let i = 0; i < entry.qty; i++) {
      labels.push({ size: entry.size, code: entry.code, uid: `${entry.code}-${i}` });
    }
  });
  return labels;
}

// Génère le SVG d'un code-barres et renvoie son code HTML
function barcodeSVG(code: string): string {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  try {
    JsBarcode(svg, code, { format: "CODE128", width: 2, height: 55, fontSize: 16, margin: 0 });
  } catch {
    return "";
  }
  return new XMLSerializer().serializeToString(svg);
}

export default function BarcodeModal({
  productName,
  entries,
  onClose,
}: {
  productName: string;
  entries: BarcodeEntry[];
  onClose: () => void;
}) {
  const labels = buildLabels(entries);

  // Aperçu écran
  useEffect(() => {
    labels.forEach((label) => {
      const svg = document.getElementById(`bc-${label.uid}`);
      if (svg) {
        try {
          JsBarcode(svg, label.code, { format: "CODE128", width: 2, height: 50, fontSize: 16, margin: 0 });
        } catch {}
      }
    });
  }, [labels]);

  // Impression : ouvre une fenêtre HTML pure, 1 étiquette = 1 page
  function printLabels() {
    const win = window.open("", "_blank", "width=400,height=600");
    if (!win) { alert("Autorisez les pop-ups pour imprimer."); return; }

    const labelsHTML = labels.map((label) => `
      <div class="label">
        <div class="name">${productName}</div>
        <div class="size">Taille ${label.size}</div>
        ${barcodeSVG(label.code)}
      </div>
    `).join("");

    win.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Étiquettes</title>
        <style>
          @page { size: 80mm 80mm; margin: 0; }
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: sans-serif; }
          .label {
            width: 80mm;
            height: 80mm;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            page-break-after: always;
            overflow: hidden;
            padding: 4mm;
          }
          .label:last-child { page-break-after: auto; }
          .name { font-size: 15px; font-weight: 700; text-align: center; margin-bottom: 2mm; }
          .size { font-size: 13px; text-align: center; margin-bottom: 3mm; }
          .label svg { max-width: 72mm; }
        </style>
      </head>
      <body>
        ${labelsHTML}
        <script>
          window.onload = function() {
            window.print();
            setTimeout(function(){ window.close(); }, 500);
          };
        </script>
      </body>
      </html>
    `);
    win.document.close();
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl max-w-md w-full max-h-[85vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b border-neutral-200">
          <div>
            <h3 className="font-semibold">Codes-barres — {productName}</h3>
            <p className="text-xs text-neutral-500">{labels.length} étiquette(s) · 1 code par étiquette</p>
          </div>
          <button onClick={onClose} className="text-neutral-500 text-xl">✕</button>
        </div>

        <div className="p-4 grid grid-cols-2 gap-2">
          {labels.map((label) => (
            <div key={label.uid} className="border border-neutral-200 rounded-lg p-2 text-center">
              <div className="text-xs font-semibold truncate">{productName}</div>
              <div className="text-xs mb-1">Taille {label.size}</div>
              <svg id={`bc-${label.uid}`}></svg>
            </div>
          ))}
        </div>

        <div className="flex gap-2 p-4 border-t border-neutral-200">
          <button onClick={onClose} className="flex-1 border border-neutral-300 rounded-lg py-2.5 font-medium">Fermer</button>
          <button onClick={printLabels} className="flex-1 bg-neutral-900 text-white rounded-lg py-2.5 font-medium">Imprimer</button>
        </div>
      </div>
    </div>
  );
}