import React, { useState, useEffect } from "react";
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

  useEffect(() => {
    setTrackingNumber(item.tracking_number || "");
  }, [item.tracking_number]);

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
      <div className="p-5">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h3 className="text-lg font-bold text-gray-900 leading-tight mb-1">
              {item.name || "Tanpa Nama"}
            </h3>
            <div className="flex items-center text-sm text-gray-500">
              <Phone className="w-3 h-3 mr-1" />
              {item.last_4_digits_phone || "****"}
            </div>
          </div>
          <div className="flex space-x-1">
            <button
              onClick={onEdit}
              className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
            >
              <Edit2 className="w-4 h-4" />
            </button>
            <button
              onClick={onDelete}
              className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            >
              <Trash2 className="w-4 h-4" />
            </button>
            <button
              onClick={onShowDetail}
              className="p-2 text-gray-600 hover:bg-gray-50 rounded-lg transition-colors"
            >
              <Eye className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="space-y-4">
          {/* Status and Payment Chips */}
          <div className="flex flex-wrap gap-2">
            <select
              value={item.status}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                onUpdateStatus(e.target.value as OrderDocument["status"])
              }
              className={`text-xs font-bold px-2 py-1 rounded-full border focus:outline-none ${getStatusColor(item.status)}`}
            >
              <option value="pending">PENDING</option>
              <option value="packing">PACKING</option>
              <option value="sent">SENT</option>
              <option value="hnr">HNR</option>
            </select>
            <select
              value={item.payment_status}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                onUpdatePayment(
                  e.target.value as OrderDocument["payment_status"],
                )
              }
              className={`text-xs font-bold px-2 py-1 rounded-full border focus:outline-none ${getPaymentColor(item.payment_status)}`}
            >
              <option value="none">BELUM BAYAR</option>
              <option value="half">DP</option>
              <option value="full">LUNAS</option>
            </select>
          </div>

          {/* Book Items Summary */}
          <div className="bg-gray-50 rounded-lg p-3">
            <div className="flex items-center text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
              <Book className="w-3 h-3 mr-1" />
              Pesanan ({item.orders?.length || 0})
            </div>
            <ul className="text-sm text-gray-700 space-y-1">
              {item.orders?.slice(0, 2).map((order, idx) => (
                <li key={idx} className="truncate">
                  - {order.description}
                </li>
              ))}
              {item.orders && item.orders.length > 2 && (
                <li className="text-gray-400 text-xs">
                  +{item.orders.length - 2} buku lainnya...
                </li>
              )}
            </ul>
          </div>

          {/* Tracking Number */}
          <div className="relative">
            <Truck className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="No. Resi"
              value={trackingNumber}
              onChange={(e) => setTrackingNumber(e.target.value)}
              onBlur={() => onUpdateTracking(trackingNumber)}
              className="w-full pl-10 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Toggles */}
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => onToggleField("is_book_paid")}
              className={`flex items-center justify-center px-3 py-2 text-xs font-medium rounded-lg border transition-colors ${
                item.is_book_paid
                  ? "bg-green-50 text-green-700 border-green-200"
                  : "bg-white text-gray-500 border-gray-200"
              }`}
            >
              {item.is_book_paid ? (
                <CheckCircle2 className="w-3 h-3 mr-1" />
              ) : (
                <Clock className="w-3 h-3 mr-1" />
              )}
              Buku
            </button>
            <button
              onClick={() => onToggleField("is_shipping_paid")}
              className={`flex items-center justify-center px-3 py-2 text-xs font-medium rounded-lg border transition-colors ${
                item.is_shipping_paid
                  ? "bg-green-50 text-green-700 border-green-200"
                  : "bg-white text-gray-500 border-gray-200"
              }`}
            >
              {item.is_shipping_paid ? (
                <CheckCircle2 className="w-3 h-3 mr-1" />
              ) : (
                <Clock className="w-3 h-3 mr-1" />
              )}
              Ongkir
            </button>
          </div>
        </div>
      </div>

      <div className="px-5 py-3 bg-gray-50 border-t border-gray-100 flex justify-between items-center">
        <span className="text-xs font-medium text-gray-500">Total Tagihan</span>
        <span className="text-base font-bold text-blue-600">
          Rp {finalTotal.toLocaleString("id-ID")}
        </span>
      </div>
    </div>
  );
};

export default OrderItem;
