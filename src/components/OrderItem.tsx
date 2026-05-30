import React, { useState } from "react";
import {
  Edit2,
  Trash2,
  Eye,
  Phone,
  Book,
  Truck,
  CheckCircle2,
  Clock,
} from "lucide-react";
import { type OrderDocument } from "../services/FirestoreService";

interface OrderItemProps {
  item: OrderDocument;
  onUpdateStatus: (newStatus: OrderDocument["status"]) => void;
  onUpdatePayment: (newPayment: OrderDocument["payment_status"]) => void;
  onDelete: () => void;
  onEdit: () => void;
  onShowDetail: () => void;
  onUpdateTracking: (tracking: string) => void;
  onToggleField: (field: keyof OrderDocument) => void;
}

const OrderItem: React.FC<OrderItemProps> = ({
  item,
  onUpdateStatus,
  onUpdatePayment,
  onDelete,
  onEdit,
  onShowDetail,
  onUpdateTracking,
  onToggleField,
}) => {
  const [trackingNumber, setTrackingNumber] = useState(
    item.tracking_number || "",
  );
  const [showModal, setShowModal] = useState(false);

  const totalPrice =
    item.orders?.reduce((sum, order) => sum + (order.price || 0), 0) || 0;
  const finalTotal = totalPrice + (item.unique_code || 0);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "bg-yellow-100 text-yellow-700 border-yellow-200";
      case "packing":
        return "bg-blue-100 text-blue-700 border-blue-200";
      case "sent":
        return "bg-green-100 text-green-700 border-green-200";
      case "hnr":
        return "bg-red-100 text-red-700 border-red-200";
      default:
        return "bg-gray-100 text-gray-700 border-gray-200";
    }
  };

  const getPaymentColor = (status: string) => {
    switch (status) {
      case "full":
        return "bg-green-50 text-green-700 border-green-200";
      case "half":
        return "bg-blue-50 text-blue-700 border-blue-200";
      case "none":
        return "bg-red-50 text-red-700 border-red-200";
      default:
        return "bg-gray-50 text-gray-700 border-gray-200";
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow">
      <div className="p-3 space-y-2">
        {/* Row 1: Name + phone + actions */}
        <div className="flex items-center gap-2">
          <div className="min-w-0 flex-1">
            <span className="text-sm font-bold text-gray-900 truncate block">
              {item.name || "Tanpa Nama"}
            </span>
            <span className="text-[10px] text-gray-400 font-mono flex items-center gap-0.5">
              <Phone className="w-2.5 h-2.5" />
              {item.last_4_digits_phone || "****"}
            </span>
          </div>
          <div className="flex gap-0.5 shrink-0">
            <button
              onClick={onEdit}
              className="p-1 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
            >
              <Edit2 className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={onDelete}
              className="p-1 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={onShowDetail}
              className="p-1 text-gray-400 hover:bg-gray-50 rounded-lg transition-colors"
            >
              <Eye className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Row 2: Status + payment + total */}
        <div className="flex items-center gap-1.5">
          <select
            value={item.status}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
              onUpdateStatus(e.target.value as OrderDocument["status"])
            }
            className={`text-[10px] font-bold px-2 py-0.5 rounded-full border focus:outline-none ${getStatusColor(item.status)}`}
          >
            <option value="pending">PENDING</option>
            <option value="packing">PACKING</option>
            <option value="sent">SENT</option>
            <option value="hnr">HNR</option>
          </select>
          <select
            value={item.payment_status}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
              onUpdatePayment(e.target.value as OrderDocument["payment_status"])
            }
            className={`text-[10px] font-bold px-2 py-0.5 rounded-full border focus:outline-none ${getPaymentColor(item.payment_status)}`}
          >
            <option value="none">BELUM BAYAR</option>
            <option value="half">DP</option>
            <option value="full">LUNAS</option>
          </select>
          <span className="ml-auto text-xs font-black text-blue-600 shrink-0">
            Rp {finalTotal.toLocaleString("id-ID")}
          </span>
        </div>

        {/* Row 3: Books truncated + modal button */}
        <div className="flex items-center gap-1.5 text-[10px] text-gray-500">
          <Book className="w-3 h-3 shrink-0 text-gray-300" />
          <span className="truncate min-w-0">
            {item.orders?.map((o) => o.description).join(", ") || "-"}
          </span>
          <button
            onClick={() => setShowModal(true)}
            className="shrink-0 px-1.5 py-0.5 text-[9px] font-medium text-blue-600 bg-blue-50 rounded hover:bg-blue-100 transition-colors"
          >
            Detail
          </button>
        </div>

        {/* Row 4: Tracking + toggles */}
        <div className="flex items-center gap-1.5">
          <div className="relative flex-1">
            <Truck className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-300 w-3 h-3" />
            <input
              type="text"
              placeholder="No. Resi"
              value={trackingNumber}
              onChange={(e) => setTrackingNumber(e.target.value)}
              onBlur={() => onUpdateTracking(trackingNumber)}
              className="w-full pl-6 pr-2 py-1 text-[10px] border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <button
            onClick={() => onToggleField("is_book_paid")}
            className={`flex items-center gap-0.5 px-2 py-1 text-[10px] font-medium rounded-lg border transition-colors shrink-0 ${item.is_book_paid ? "bg-green-50 text-green-700 border-green-200" : "bg-white text-gray-400 border-gray-200"}`}
          >
            {item.is_book_paid ? (
              <CheckCircle2 className="w-3 h-3" />
            ) : (
              <Clock className="w-3 h-3" />
            )}
            Buku
          </button>
          <button
            onClick={() => onToggleField("is_shipping_paid")}
            className={`flex items-center gap-0.5 px-2 py-1 text-[10px] font-medium rounded-lg border transition-colors shrink-0 ${item.is_shipping_paid ? "bg-green-50 text-green-700 border-green-200" : "bg-white text-gray-400 border-gray-200"}`}
          >
            {item.is_shipping_paid ? (
              <CheckCircle2 className="w-3 h-3" />
            ) : (
              <Clock className="w-3 h-3" />
            )}
            Ongkir
          </button>
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={() => setShowModal(false)}
        >
          <div
            className="bg-white rounded-xl shadow-lg max-w-sm w-full max-h-[80vh] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 border-b border-gray-100">
              <h3 className="text-sm font-bold text-gray-900">
                {item.name || "Tanpa Nama"}
              </h3>
              <p className="text-xs text-gray-500 font-mono flex items-center gap-1 mt-1">
                <Phone className="w-3 h-3" />
                {item.last_4_digits_phone || "****"}
              </p>
            </div>
            <div className="p-4 overflow-y-auto max-h-[60vh]">
              <ul className="space-y-2">
                {item.orders?.map((order, index) => (
                  <li
                    key={index}
                    className="flex items-start gap-2 text-xs text-gray-700"
                  >
                    <Book className="w-3.5 h-3.5 shrink-0 text-gray-400 mt-0.5" />
                    <span>{order.description || "-"}</span>
                  </li>
                )) || <li className="text-xs text-gray-400">Tidak ada buku</li>}
              </ul>
            </div>
            <div className="p-3 border-t border-gray-100 flex justify-end">
              <button
                onClick={() => setShowModal(false)}
                className="px-3 py-1.5 text-xs font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OrderItem;
