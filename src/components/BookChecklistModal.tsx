import React, { useState, useMemo } from "react";
import { X, CheckCircle2 } from "lucide-react";
import { type OrderDocument } from "../services/FirestoreService";

interface BookChecklistModalProps {
  visible: boolean;
  onClose: () => void;
  orders: OrderDocument[];
}

const BookChecklistModal: React.FC<BookChecklistModalProps> = ({
  visible,
  onClose,
  orders,
}) => {
  const [checkedItems, setCheckedItems] = useState<Set<string>>(new Set());

  const bookSummary = useMemo(() => {
    const summary: Record<string, { count: number; buyers: string[] }> = {};
    orders.forEach((order) => {
      if (order.orders) {
        order.orders.forEach((item) => {
          const name = item.description || "Tanpa Nama";
          if (!summary[name]) {
            summary[name] = { count: 0, buyers: [] };
          }
          summary[name].count += 1;
          summary[name].buyers.push(order.name || "Unknown");
        });
      }
    });

    return Object.entries(summary)
      .map(([name, data]) => ({
        name,
        count: data.count,
        buyers: data.buyers,
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [orders]);

  const toggleCheck = (name: string) => {
    const newChecked = new Set(checkedItems);
    if (newChecked.has(name)) {
      newChecked.delete(name);
    } else {
      newChecked.add(name);
    }
    setCheckedItems(newChecked);
  };

  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm transition-opacity">
      <div className="bg-white rounded-t-[2.5rem] sm:rounded-2xl w-full max-w-2xl max-h-[92vh] sm:max-h-[90vh] flex flex-col shadow-2xl animate-in slide-in-from-bottom duration-300">
        <div className="p-4 sm:p-6 border-b border-gray-100 flex justify-between items-center shrink-0">
          <div className="flex-1 text-center sm:text-left">
            <div className="w-12 h-1.5 bg-gray-200 rounded-full mx-auto mb-4 sm:hidden" />
            <h2 className="text-xl font-bold text-gray-800">Checklist Buku</h2>
            <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mt-1">
              Total {bookSummary.length} judul buku
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors absolute right-4 top-4 sm:static"
          >
            <X className="w-6 h-6 text-gray-500" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-3">
          {bookSummary.map((item) => {
            const isChecked = checkedItems.has(item.name);
            return (
              <button
                key={item.name}
                onClick={() => toggleCheck(item.name)}
                className={`w-full text-left p-4 rounded-2xl border-2 transition-all flex items-start gap-4 ${
                  isChecked
                    ? "bg-green-50 border-green-500 shadow-sm"
                    : "bg-white border-gray-100 hover:border-blue-200"
                }`}
              >
                <div className="mt-1 shrink-0">
                  {isChecked ? (
                    <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                      <CheckCircle2 className="w-4 h-4 text-white" />
                    </div>
                  ) : (
                    <div className="w-6 h-6 border-2 border-gray-200 rounded-full" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-start mb-1 gap-2">
                    <h3
                      className={`font-bold text-sm sm:text-base leading-tight ${isChecked ? "text-green-800 line-through opacity-50" : "text-gray-900"}`}
                    >
                      {item.name}
                    </h3>
                    <span
                      className={`shrink-0 px-2 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest ${
                        isChecked
                          ? "bg-green-200 text-green-800"
                          : "bg-blue-100 text-blue-700"
                      }`}
                    >
                      {item.count} pcs
                    </span>
                  </div>
                  <div
                    className={`text-[11px] leading-relaxed ${isChecked ? "text-green-600 opacity-50" : "text-gray-500"}`}
                  >
                    <span className="font-black uppercase tracking-tighter mr-1">
                      Pembeli:
                    </span>
                    {item.buyers.join(", ")}
                  </div>
                </div>
              </button>
            );
          })}

          {bookSummary.length === 0 && (
            <div className="text-center py-20">
              <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <X className="w-10 h-10 text-gray-200" />
              </div>
              <p className="text-gray-400 font-bold">
                Tidak ada buku untuk dichecklist
              </p>
            </div>
          )}
        </div>

        <div className="p-4 sm:p-6 border-t border-gray-100 bg-gray-50 shrink-0 space-y-4">
          <div className="flex justify-between items-center">
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">
              Progres Packing
            </span>
            <span className="text-sm font-black text-blue-600">
              {checkedItems.size} / {bookSummary.length}
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden shadow-inner">
            <div
              className="bg-green-500 h-full transition-all duration-700 ease-out"
              style={{
                width: `${(checkedItems.size / (bookSummary.length || 1)) * 100}%`,
              }}
            >
              <div className="w-full h-full bg-white/20 animate-pulse" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BookChecklistModal;
