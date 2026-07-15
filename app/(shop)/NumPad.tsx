"use client";

import { useState, useEffect } from "react";

export default function NumPad({
  open,
  initialValue,
  label,
  allowDecimal = true,
  onConfirm,
  onClose,
}: {
  open: boolean;
  initialValue: string;
  label?: string;
  allowDecimal?: boolean;
  onConfirm: (value: string) => void;
  onClose: () => void;
}) {
  const [value, setValue] = useState(initialValue);

  useEffect(() => {
    if (open) setValue(initialValue);
  }, [open, initialValue]);

  if (!open) return null;

  function press(key: string) {
    if (key === "." ) {
      if (!allowDecimal || value.includes(".")) return;
      setValue((v) => (v === "" ? "0." : v + "."));
      return;
    }
    setValue((v) => (v === "0" ? key : v + key));
  }

  function backspace() {
    setValue((v) => v.slice(0, -1));
  }

  function clear() {
    setValue("");
  }

  const keys = ["7", "8", "9", "4", "5", "6", "1", "2", "3"];

  return (
    <div className="fixed inset-0 bg-black/50 z-[60] flex items-end sm:items-center justify-center" onClick={onClose}>
      <div className="bg-white rounded-t-2xl sm:rounded-2xl w-full sm:max-w-xs p-4" onClick={(e) => e.stopPropagation()}>
        {label && <div className="text-sm text-neutral-500 mb-1">{label}</div>}
        <div className="border-2 border-neutral-900 rounded-lg px-4 py-3 text-right text-3xl font-bold mb-3 min-h-[3.5rem]">
          {value || "0"}
        </div>

        <div className="grid grid-cols-3 gap-2">
          {keys.map((k) => (
            <button key={k} onClick={() => press(k)}
              className="bg-neutral-100 hover:bg-neutral-200 rounded-lg py-4 text-2xl font-semibold active:scale-95 transition">
              {k}
            </button>
          ))}
          {/* Dernière ligne : . 0 backspace */}
          <button onClick={() => press(".")} disabled={!allowDecimal}
            className="bg-neutral-100 hover:bg-neutral-200 rounded-lg py-4 text-2xl font-semibold active:scale-95 transition disabled:opacity-30">
            .
          </button>
          <button onClick={() => press("0")}
            className="bg-neutral-100 hover:bg-neutral-200 rounded-lg py-4 text-2xl font-semibold active:scale-95 transition">
            0
          </button>
          <button onClick={backspace}
            className="bg-neutral-100 hover:bg-neutral-200 rounded-lg py-4 text-xl font-semibold active:scale-95 transition">
            ⌫
          </button>
        </div>

        <div className="flex gap-2 mt-3">
          <button onClick={clear} className="flex-1 border border-neutral-300 rounded-lg py-3 font-medium">Effacer</button>
          <button onClick={() => { onConfirm(value); onClose(); }}
            className="flex-[2] bg-emerald-600 text-white rounded-lg py-3 font-bold">
            Valider
          </button>
        </div>
      </div>
    </div>
  );
}