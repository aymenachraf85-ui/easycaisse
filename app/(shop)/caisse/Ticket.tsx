"use client";

import { useEffect, useRef } from "react";

type TicketItem = {
  name: string;
  size: string | null;
  quantity: number;
  sold_price: number;
};

export type TicketData = {
  shopName: string;
  saleId: string;
  items: TicketItem[];
  total: number;
  payment: string;
  date: Date;
};

const PAYMENT_LABELS: Record<string, string> = {
  cash: "Espèces",
  card: "Carte",
  transfer: "Virement",
};

function fmt(n: number) {
  return n.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function Ticket({
  data,
  width,
  onClose,
  onWidthChange,
}: {
  data: TicketData;
  width: 58 | 80;
  onClose: () => void;
  onWidthChange: (w: 58 | 80) => void;
}) {
  const printedRef = useRef(false);

  useEffect(() => {
    if (printedRef.current) return;   // empêche la double impression
    printedRef.current = true;
    const timer = setTimeout(() => window.print(), 400);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4 print:bg-white print:p-0 print:block">
      <div className="bg-white rounded-xl max-w-md w-full print:rounded-none print:max-w-none print:w-auto">
        <div className="flex items-center justify-between p-4 border-b border-neutral-200 print:hidden">
          <h3 className="font-semibold">Ticket de caisse</h3>
          <div className="flex border border-neutral-200 rounded-lg overflow-hidden text-xs">
            <button onClick={() => onWidthChange(58)} className={`px-3 py-1.5 ${width === 58 ? "bg-neutral-900 text-white" : "bg-white"}`}>58mm</button>
            <button onClick={() => onWidthChange(80)} className={`px-3 py-1.5 ${width === 80 ? "bg-neutral-900 text-white" : "bg-white"}`}>80mm</button>
          </div>
        </div>

        <div className="p-4 print:p-0 flex justify-center">
          <div
            id="ticket-print-area"
            className="bg-white text-black font-mono"
            style={{
              width: width === 58 ? "58mm" : "80mm",
              padding: "3mm",
              fontSize: width === 58 ? "10px" : "11px",
              lineHeight: 1.35,
            }}
          >
            <div style={{ textAlign: "center", fontWeight: "bold", fontSize: width === 58 ? "13px" : "15px", marginBottom: "2mm" }}>
              {data.shopName}
            </div>
            <div style={{ textAlign: "center", fontSize: "9px", marginBottom: "2mm" }}>
              {data.date.toLocaleDateString("fr-FR")} {data.date.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
            </div>

            <div style={{ borderTop: "1px dashed #000", borderBottom: "1px dashed #000", padding: "1.5mm 0", marginBottom: "1.5mm" }}>
              N° {data.saleId.slice(0, 8).toUpperCase()}
            </div>

            {data.items.map((item, i) => (
              <div key={i} style={{ marginBottom: "1.2mm" }}>
                <div>{item.name}{item.size ? ` (${item.size})` : ""}</div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span>{item.quantity} x {fmt(item.sold_price)}</span>
                  <span>{fmt(item.sold_price * item.quantity)}</span>
                </div>
              </div>
            ))}

            <div style={{ borderTop: "1px solid #000", marginTop: "1.5mm", paddingTop: "1.5mm", display: "flex", justifyContent: "space-between", fontWeight: "bold", fontSize: width === 58 ? "12px" : "14px" }}>
              <span>TOTAL</span>
              <span>{fmt(data.total)} MAD</span>
            </div>

            <div style={{ marginTop: "1.5mm", fontSize: "9px" }}>
              Paiement : {PAYMENT_LABELS[data.payment] || data.payment}
            </div>

            <div style={{ textAlign: "center", marginTop: "3mm", fontSize: "9px" }}>
              Merci de votre visite !
            </div>
          </div>
        </div>

        <div className="flex gap-2 p-4 border-t border-neutral-200 print:hidden">
          <button onClick={onClose} className="flex-1 border border-neutral-300 rounded-lg py-2.5 font-medium">Fermer</button>
          <button onClick={() => window.print()} className="flex-1 bg-neutral-900 text-white rounded-lg py-2.5 font-medium">Réimprimer</button>
        </div>
      </div>

      <style jsx global>{`
        @media print {
          /* Page = largeur du ticket, hauteur automatique : plus de papier gaspillé */
          @page {
            size: ${width}mm auto;
            margin: 0;
          }
          html, body {
            width: ${width}mm;
            margin: 0 !important;
            padding: 0 !important;
          }
          body * { visibility: hidden; }
          #ticket-print-area, #ticket-print-area * { visibility: visible; }
          #ticket-print-area {
            position: absolute;
            left: 0;
            top: 0;
            width: ${width}mm;
          }
        }
      `}</style>
    </div>
  );
}