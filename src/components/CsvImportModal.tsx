import React, { useState, useRef } from "react";
import { X, Upload, Trash2, AlertCircle, CheckCircle2, FileText } from "lucide-react";
import type { OrderDocument, OrderItem } from "../services/FirestoreService";

interface CsvRow {
  id: string;
  name: string;
  phone: string;
  delivery_type: string;
  payment_status: OrderDocument["payment_status"];
  is_shipping_paid: boolean;
  is_packing_fee_applied: boolean;
  address: string;
  items: OrderItem[];
  errors: string[];
}

interface CsvImportModalProps {
  visible: boolean;
  onClose: () => void;
  onBulkSave: (orders: Omit<OrderDocument, "id">[]) => Promise<void>;
}

const splitCsvLine = (line: string): string[] => {
  const cols: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      inQuotes = !inQuotes;
    } else if (ch === "," && !inQuotes) {
      cols.push(current.trim());
      current = "";
    } else {
      current += ch;
    }
  }
  cols.push(current.trim());
  return cols;
};

const parseItems = (raw: string): { items: OrderItem[]; error?: string } => {
  if (!raw.trim()) return { items: [], error: "Kolom items kosong" };
  const parts = raw.split("|");
  const items: OrderItem[] = [];
  for (const part of parts) {
    const colonIdx = part.lastIndexOf(":");
    if (colonIdx === -1) return { items: [], error: `Format items salah: "${part}" (harus NamaBuku:Harga)` };
    const desc = part.slice(0, colonIdx).trim();
    const priceStr = part.slice(colonIdx + 1).trim();
    if (!desc) return { items: [], error: `Nama buku kosong di: "${part}"` };
    const price = parseInt(priceStr.replace(/\D/g, ""));
    if (isNaN(price)) return { items: [], error: `Harga tidak valid: "${priceStr}"` };
    items.push({ id: `${Date.now()}-${Math.random()}`, description: desc, price });
  }
  return { items };
};

const parseBool = (val: string, defaultVal = false): boolean => {
  if (!val) return defaultVal;
  return val.toLowerCase() === "true" || val === "1";
};

const parsePaymentStatus = (val: string): OrderDocument["payment_status"] | null => {
  const valid = ["none", "half", "full"];
  return valid.includes(val) ? (val as OrderDocument["payment_status"]) : null;
};

const parseDeliveryType = (val: string): string => {
  if (!val) return "Manual";
  const map: Record<string, string> = { manual: "Manual", shopee: "Shopee" };
  return map[val.toLowerCase()] || val;
};

const computeUniqueCode = (row: CsvRow): number => {
  const now = new Date();
  const base =
    row.name.length +
    row.phone.split("").reduce((s, c) => s + c.charCodeAt(0), 0) +
    row.items.reduce((s, it) => s + (it.description?.length || 0), 0) +
    now.getDate() +
    now.getMonth() +
    now.getFullYear();
  return (base % 100) + 1;
};

const parseCSV = (text: string): CsvRow[] => {
  const lines = text.trim().split(/\r?\n/).filter(Boolean);
  if (lines.length < 2) return [];

  const headers = splitCsvLine(lines[0]).map((h) => h.toLowerCase().replace(/\s/g, ""));

  return lines.slice(1).map((line, idx) => {
    const cols = splitCsvLine(line);
    const get = (field: string) => cols[headers.indexOf(field)] ?? "";

    const errors: string[] = [];

    const name = get("name");
    if (!name) errors.push("Nama kosong");

    const rawPhone = get("phone");
    const phone = rawPhone.length > 0 && rawPhone.length <= 4 ? rawPhone.padStart(4, "0") : rawPhone;
    if (!phone) errors.push("Phone kosong");
    else if (phone.length !== 4) errors.push(`Phone harus tepat 4 digit (dapat: "${rawPhone}")`);

    const delivery_type = parseDeliveryType(get("delivery_type"));
    if (!["Manual", "Shopee"].includes(delivery_type))
      errors.push(`delivery_type tidak valid: "${delivery_type}"`);

    const paymentRaw = get("payment_status") || "none";
    const payment_status = parsePaymentStatus(paymentRaw);
    if (!payment_status) errors.push(`payment_status tidak valid: "${paymentRaw}"`);

    const { items, error: itemsError } = parseItems(get("items"));
    if (itemsError) errors.push(itemsError);

    return {
      id: `row-${idx}-${Date.now()}`,
      name,
      phone,
      delivery_type,
      payment_status: payment_status ?? "none",
      is_shipping_paid: parseBool(get("is_shipping_paid"), false),
      is_packing_fee_applied: parseBool(get("is_packing_fee_applied"), true),
      address: get("address"),
      items,
      errors,
    };
  });
};

const CsvImportModal: React.FC<CsvImportModalProps> = ({ visible, onClose, onBulkSave }) => {
  const [rows, setRows] = useState<CsvRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [fileName, setFileName] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      setRows(parseCSV(text));
    };
    reader.readAsText(file);
  };

  const handleRemoveRow = (id: string) => {
    setRows((prev) => prev.filter((r) => r.id !== id));
  };

  const handleImport = async () => {
    const validRows = rows.filter((r) => r.errors.length === 0);
    if (!validRows.length) return;
    setLoading(true);
    try {
      const orders: Omit<OrderDocument, "id">[] = validRows.map((row) => ({
        name: row.name,
        last_4_digits_phone: row.phone,
        delivery_address: row.address,
        delivery_type: row.delivery_type,
        payment_status: row.payment_status,
        is_shipping_paid: row.is_shipping_paid,
        is_packing_fee_applied: row.is_packing_fee_applied,
        orders: row.items,
        status: "pending",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        unique_code: computeUniqueCode(row),
      }));
      await onBulkSave(orders);
      setRows([]);
      setFileName("");
      onClose();
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setRows([]);
    setFileName("");
    onClose();
  };

  if (!visible) return null;

  const validCount = rows.filter((r) => r.errors.length === 0).length;
  const invalidCount = rows.length - validCount;

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-white rounded-t-[2.5rem] sm:rounded-2xl w-full max-w-3xl max-h-[92vh] sm:max-h-[90vh] flex flex-col shadow-2xl animate-in slide-in-from-bottom duration-300">
        {/* Header */}
        <div className="p-4 sm:p-6 border-b border-gray-100 flex justify-between items-center shrink-0">
          <div className="flex-1">
            <div className="w-12 h-1.5 bg-gray-200 rounded-full mx-auto mb-4 sm:hidden" />
            <h2 className="text-xl font-bold text-gray-800">Import dari CSV</h2>
            {rows.length > 0 && (
              <p className="text-sm text-gray-400 mt-0.5">
                <span className="text-green-600 font-bold">{validCount} valid</span>
                {invalidCount > 0 && (
                  <span className="text-red-500 font-bold"> · {invalidCount} error</span>
                )}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-6 h-6 text-gray-500" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          {/* Upload Zone */}
          <div
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-gray-200 rounded-2xl p-8 flex flex-col items-center justify-center gap-3 cursor-pointer hover:border-blue-400 hover:bg-blue-50/30 transition-all"
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              className="hidden"
              onChange={handleFileChange}
            />
            {fileName ? (
              <>
                <FileText className="w-10 h-10 text-blue-500" />
                <p className="font-bold text-gray-700">{fileName}</p>
                <p className="text-sm text-blue-500 font-medium">Klik untuk ganti file</p>
              </>
            ) : (
              <>
                <Upload className="w-10 h-10 text-gray-300" />
                <p className="font-bold text-gray-500">Klik untuk upload file CSV</p>
                <p className="text-xs text-gray-400">Format: name, phone, delivery_type, payment_status, is_shipping_paid, is_packing_fee_applied, address, items</p>
              </>
            )}
          </div>

          {/* Preview Table */}
          {rows.length > 0 && (
            <div className="space-y-3">
              {rows.map((row) => {
                const isValid = row.errors.length === 0;
                return (
                  <div
                    key={row.id}
                    className={`rounded-2xl border p-4 space-y-2 transition-all ${
                      isValid
                        ? "bg-white border-gray-100"
                        : "bg-red-50 border-red-200"
                    }`}
                  >
                    <div className="flex justify-between items-start gap-2">
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        {isValid ? (
                          <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />
                        ) : (
                          <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
                        )}
                        <span className="font-bold text-gray-800 truncate">
                          {row.name || <span className="text-gray-400 italic">Nama kosong</span>}
                        </span>
                        <span className="text-xs font-mono text-gray-400 shrink-0">{row.phone}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveRow(row.id)}
                        className="p-1.5 text-red-400 hover:bg-red-100 rounded-lg transition-all shrink-0"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    {isValid && (
                      <div className="flex flex-wrap gap-2 text-xs">
                        <span className="px-2 py-0.5 bg-gray-100 rounded-full text-gray-600 font-medium">
                          {row.delivery_type}
                        </span>
                        <span className="px-2 py-0.5 bg-gray-100 rounded-full text-gray-600 font-medium">
                          {row.payment_status === "none" ? "Belum Bayar" : row.payment_status === "half" ? "DP" : "Lunas"}
                        </span>
                        <span className="px-2 py-0.5 bg-gray-100 rounded-full text-gray-600 font-medium">
                          {row.items.length} buku
                        </span>
                        {row.items.map((item, i) => (
                          <span key={i} className="px-2 py-0.5 bg-blue-50 text-blue-600 rounded-full font-medium">
                            {item.description}: Rp {item.price.toLocaleString()}
                          </span>
                        ))}
                      </div>
                    )}

                    {!isValid && (
                      <ul className="space-y-0.5">
                        {row.errors.map((err, i) => (
                          <li key={i} className="text-xs text-red-600 font-medium">
                            · {err}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 sm:p-6 border-t border-gray-100 bg-gray-50 shrink-0 flex gap-3">
          <button
            type="button"
            onClick={handleClose}
            className="flex-1 py-3 border border-gray-200 text-gray-700 font-bold rounded-2xl hover:bg-gray-100 transition-all"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={handleImport}
            disabled={loading || validCount === 0}
            className="flex-1 py-3 bg-blue-600 text-white font-black uppercase tracking-widest rounded-2xl hover:bg-blue-700 transition-all shadow-xl shadow-blue-100 disabled:opacity-50 flex items-center justify-center gap-2 active:scale-[0.98]"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              `Import ${validCount} Order`
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CsvImportModal;
