import React, { useState, useEffect, useMemo } from "react";
import {
  Plus,
  Search,
  Filter,
  Trash2,
  Edit2,
  Eye,
  RefreshCcw,
  BookOpen,
  Package,
  Truck,
  XCircle,
  CreditCard,
  ExternalLink,
} from "lucide-react";
import FirestoreService, {
  type OrderDocument,
} from "../services/FirestoreService";
import AddOrderModal from "../components/AddOrderModal.tsx";
import OrderDetailModal from "../components/OrderDetailModal.tsx";
import BookChecklistModal from "../components/BookChecklistModal.tsx";

const ItemListScreen: React.FC = () => {
  const [orders, setOrders] = useState<OrderDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<
    OrderDocument["status"] | "all"
  >("all");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [isAddModalVisible, setIsAddModalVisible] = useState(false);
  const [isDetailModalVisible, setIsDetailModalVisible] = useState(false);
  const [isChecklistVisible, setIsChecklistVisible] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<OrderDocument | null>(
    null,
  );

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const data = await FirestoreService.getCollection(
        "orders",
        "created_at",
        "desc",
      );
      setOrders(data as OrderDocument[]);
      const ordersData = data as OrderDocument[];
      const today = new Date();
      const toBackfillMap = new Map<string, number>();
      const computeUniqueCode = (o: OrderDocument) => {
        const base =
          (o.name || "").length +
          (o.last_4_digits_phone || "")
            .split("")
            .reduce((s, c) => s + c.charCodeAt(0), 0) +
          (o.orders || []).reduce(
            (s, it) => s + (it.description?.length || 0),
            0,
          ) +
          today.getDate() +
          today.getMonth() +
          today.getFullYear();
        const code = (base % 100) + 1;
        return code;
      };
      ordersData.forEach((o) => {
        if (!o.created_at) return;
        const d = new Date(o.created_at);
        const isToday =
          d.getFullYear() === today.getFullYear() &&
          d.getMonth() === today.getMonth() &&
          d.getDate() === today.getDate();
        if (
          isToday &&
          (o.unique_code === undefined || o.unique_code === null)
        ) {
          toBackfillMap.set(o.id, computeUniqueCode(o));
        }
        if (
          o.last_4_digits_phone === "8054" &&
          (o.unique_code === undefined || o.unique_code === null)
        ) {
          toBackfillMap.set(o.id, computeUniqueCode(o));
        }
      });
      if (toBackfillMap.size > 0) {
        const updates = Array.from(toBackfillMap.entries()).map(([id, code]) =>
          FirestoreService.updateDocument("orders", id, {
            unique_code: code,
          }),
        );
        Promise.allSettled(updates).then(() => {
          setOrders((prev) => {
            return prev.map((p) =>
              toBackfillMap.has(p.id)
                ? { ...p, unique_code: toBackfillMap.get(p.id) as number }
                : p,
            );
          });
        });
      }
    } catch (error) {
      console.error("Error fetching orders:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddOrder = async (orderData: Omit<OrderDocument, "id">) => {
    try {
      if (selectedOrder) {
        await FirestoreService.updateDocument(
          "orders",
          selectedOrder.id,
          orderData,
        );
      } else {
        await FirestoreService.addDocument("orders", orderData);
      }
      fetchOrders();
    } catch (error) {
      console.error("Error saving order:", error);
    }
  };

  const handleDeleteOrder = async (id: string) => {
    if (window.confirm("Hapus order ini?")) {
      try {
        await FirestoreService.deleteDocument("orders", id);
        fetchOrders();
      } catch (error) {
        console.error("Error deleting order:", error);
      }
    }
  };

  const updateOrderStatus = async (
    id: string,
    newStatus: OrderDocument["status"],
  ) => {
    try {
      await FirestoreService.updateDocument("orders", id, {
        status: newStatus,
      });
      fetchOrders();
    } catch (error) {
      console.error("Error updating status:", error);
    }
  };

  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      const query = searchQuery.toLowerCase();

      const matchesName = order.name?.toLowerCase().includes(query);
      const matchesPhone = order.last_4_digits_phone?.includes(query);
      const matchesItems = order.orders?.some((item) =>
        item.description?.toLowerCase().includes(query),
      );

      const matchesSearch = matchesName || matchesPhone || matchesItems;

      const matchesStatus =
        statusFilter === "all" || order.status === statusFilter;

      let matchesDate = true;
      if (order.created_at) {
        const d = new Date(order.created_at);
        if (startDate) {
          const s = new Date(startDate);
          s.setHours(0, 0, 0, 0);
          if (d < s) matchesDate = false;
        }
        if (endDate) {
          const e = new Date(endDate);
          e.setHours(23, 59, 59, 999);
          if (d > e) matchesDate = false;
        }
      }

      return matchesSearch && matchesStatus && matchesDate;
    });
  }, [orders, searchQuery, statusFilter, startDate, endDate]);

  const omzetWithoutUnique = useMemo(() => {
    return filteredOrders.reduce((sum, order) => {
      const itemsTotal =
        order.orders?.reduce((s, it) => s + (it.price || 0), 0) || 0;
      const packing = order.is_packing_fee_applied ? 2000 : 0;
      return sum + itemsTotal + packing;
    }, 0);
  }, [filteredOrders]);

  const getStatusColor = (status: OrderDocument["status"]) => {
    switch (status) {
      case "pending":
        return "bg-amber-100 text-amber-700 border-amber-200";
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

  const getStatusIcon = (status: OrderDocument["status"]) => {
    switch (status) {
      case "pending":
        return <RefreshCcw className="w-4 h-4" />;
      case "packing":
        return <Package className="w-4 h-4" />;
      case "sent":
        return <Truck className="w-4 h-4" />;
      case "hnr":
        return <XCircle className="w-4 h-4" />;
      default:
        return null;
    }
  };

  const getPaymentBadge = (status: OrderDocument["payment_status"]) => {
    switch (status) {
      case "full":
        return (
          <span className="text-[10px] px-2 py-0.5 bg-green-500 text-white rounded-full font-bold">
            LUNAS
          </span>
        );
      case "half":
        return (
          <span className="text-[10px] px-2 py-0.5 bg-blue-500 text-white rounded-full font-bold">
            DP
          </span>
        );
      default:
        return (
          <span className="text-[10px] px-2 py-0.5 bg-red-500 text-white rounded-full font-bold">
            BELUM BAYAR
          </span>
        );
    }
  };

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-6 space-y-6">
      {/* Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight">
            Order Management
          </h1>
          <p className="text-gray-500 mt-1 text-sm">
            Total {filteredOrders.length} pesanan ditemukan
          </p>
        </div>
        <div className="grid grid-cols-2 sm:flex gap-2 w-full sm:w-auto">
          <button
            onClick={() => setIsChecklistVisible(true)}
            className="flex items-center justify-center px-4 py-2 bg-white border border-gray-200 text-gray-700 font-bold rounded-xl hover:bg-gray-50 transition-all shadow-sm text-sm sm:text-base"
          >
            <BookOpen className="w-4 h-4 sm:w-5 sm:h-5 mr-2" /> Checklist
          </button>
          <button
            onClick={() => {
              setSelectedOrder(null);
              setIsAddModalVisible(true);
            }}
            className="flex items-center justify-center px-4 py-2 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-all shadow-md shadow-blue-100 text-sm sm:text-base"
          >
            <Plus className="w-4 h-4 sm:w-5 sm:h-5 mr-2" /> Tambah
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Cari nama atau nomor HP..."
            className="w-full pl-10 pr-4 py-2 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-blue-500 transition-all outline-none text-sm text-black font-medium placeholder:text-gray-400"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2 bg-gray-50 px-3 py-2 rounded-xl">
          <Filter className="text-gray-400 w-4 h-4 shrink-0" />
          <select
            className="w-full bg-transparent border-none focus:ring-0 outline-none text-sm font-medium text-gray-700"
            value={statusFilter}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
              setStatusFilter(e.target.value as OrderDocument["status"] | "all")
            }
          >
            <option value="all">Semua Status</option>
            <option value="pending">Pending</option>
            <option value="packing">Packing</option>
            <option value="sent">Sent</option>
            <option value="hnr">HnR</option>
          </select>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Dari"
            aria-label="Dari Tanggal"
          />
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Sampai"
            aria-label="Sampai Tanggal"
          />
        </div>
      </div>

      {/* Omzet Banner */}
      <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between">
        <p className="text-sm font-bold text-gray-500 uppercase tracking-widest">
          Omzet (tanpa Kode Unik)
        </p>
        <p className="text-xl font-extrabold text-blue-600">
          Rp {omzetWithoutUnique.toLocaleString("id-ID")}
        </p>
      </div>

      {/* Grid of Orders */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredOrders.map((order) => (
            <div
              key={order.id}
              className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all overflow-hidden flex flex-col group"
            >
              {/* Order Header */}
              <div className="p-4 border-b border-gray-50 flex justify-between items-start gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <h3 className="font-bold text-gray-900 truncate">
                      {order.name}
                    </h3>
                    {getPaymentBadge(order.payment_status)}
                  </div>
                  <p className="text-[10px] text-gray-400 font-mono tracking-tighter">
                    ID: {order.id.slice(-6).toUpperCase()} •{" "}
                    {order.last_4_digits_phone}
                    {order.unique_code !== undefined &&
                    order.unique_code !== null
                      ? ` • Kode Unik: Rp ${order.unique_code.toLocaleString()}`
                      : ""}
                  </p>
                </div>
                <div
                  className={`shrink-0 px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border flex items-center gap-1 shadow-sm ${getStatusColor(order.status)}`}
                >
                  {getStatusIcon(order.status)}
                  {order.status}
                </div>
              </div>

              {/* Order Content */}
              <div className="p-4 flex-1 space-y-4">
                <div className="space-y-2">
                  {order.orders?.map((item, idx) => (
                    <div
                      key={idx}
                      className="flex justify-between items-start text-xs bg-gray-50/50 p-2 rounded-lg border border-gray-50 group-hover:border-gray-100 transition-colors"
                    >
                      <span className="text-gray-600 line-clamp-2 mr-3 font-medium">
                        {item.description}
                      </span>
                      <span className="font-black text-gray-900 shrink-0">
                        Rp {item.price?.toLocaleString()}
                      </span>
                    </div>
                  ))}
                </div>

                <div className="pt-3 border-t border-gray-50 flex justify-between items-end">
                  <div className="space-y-1">
                    <div className="text-[10px] text-gray-400 font-bold uppercase tracking-wide flex items-center gap-1">
                      <Truck className="w-3 h-3" />
                      {order.delivery_type}
                    </div>
                    <div className="text-[10px] text-gray-400 font-bold uppercase tracking-wide flex items-center gap-1">
                      <CreditCard className="w-3 h-3" />
                      {order.payment_type || "Manual"}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] text-gray-400 uppercase font-black tracking-widest mb-0.5">
                      Total Bayar
                    </p>
                    <p className="text-lg font-black text-blue-600 leading-none">
                      Rp{" "}
                      {(
                        (order.orders?.reduce(
                          (sum, i) => sum + (i.price || 0),
                          0,
                        ) || 0) +
                        (order.unique_code || 0) +
                        (order.is_packing_fee_applied ? 2000 : 0)
                      ).toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>

              {/* Order Actions */}
              <div className="px-4 py-3 bg-gray-50/80 backdrop-blur-sm border-t border-gray-100 flex justify-between items-center gap-2">
                <div className="flex gap-1">
                  <button
                    onClick={() => {
                      setSelectedOrder(order);
                      setIsDetailModalVisible(true);
                    }}
                    className="p-2 text-blue-600 hover:bg-blue-100 rounded-xl transition-all"
                    title="Detail"
                  >
                    <Eye className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => {
                      setSelectedOrder(order);
                      setIsAddModalVisible(true);
                    }}
                    className="p-2 text-amber-600 hover:bg-amber-100 rounded-xl transition-all"
                    title="Edit"
                  >
                    <Edit2 className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => handleDeleteOrder(order.id)}
                    className="p-2 text-red-600 hover:bg-red-100 rounded-xl transition-all"
                    title="Hapus"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>

                <div className="flex gap-1">
                  {order.status === "pending" && (
                    <button
                      onClick={() => updateOrderStatus(order.id, "packing")}
                      className="px-4 py-2 bg-blue-600 text-white text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-blue-700 shadow-lg shadow-blue-100 active:scale-95 transition-all"
                    >
                      Pack
                    </button>
                  )}
                  {order.status === "packing" && (
                    <button
                      onClick={() => updateOrderStatus(order.id, "sent")}
                      className="px-4 py-2 bg-green-600 text-white text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-green-700 shadow-lg shadow-green-100 active:scale-95 transition-all"
                    >
                      Kirim
                    </button>
                  )}
                  {order.status === "sent" && order.tracking_number && (
                    <a
                      href={`https://cekresi.com/?noresi=${order.tracking_number}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-4 py-2 bg-white border border-gray-200 text-gray-700 text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-gray-50 flex items-center shadow-sm active:scale-95 transition-all"
                    >
                      <ExternalLink className="w-3 h-3 mr-1" /> Resi
                    </a>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty State */}
      {!loading && filteredOrders.length === 0 && (
        <div className="bg-white rounded-3xl border border-dashed border-gray-300 p-12 text-center">
          <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <Search className="w-10 h-10 text-gray-300" />
          </div>
          <h3 className="text-xl font-bold text-gray-900">Tidak ada order</h3>
          <p className="text-gray-500 mt-2">
            Coba ganti filter atau cari kata kunci lain
          </p>
        </div>
      )}

      {/* Modals */}
      <AddOrderModal
        visible={isAddModalVisible}
        onClose={() => setIsAddModalVisible(false)}
        onSave={handleAddOrder}
        initialData={selectedOrder}
      />

      <OrderDetailModal
        visible={isDetailModalVisible}
        onClose={() => setIsDetailModalVisible(false)}
        order={selectedOrder}
      />

      <BookChecklistModal
        visible={isChecklistVisible}
        onClose={() => setIsChecklistVisible(false)}
        orders={filteredOrders}
      />
    </div>
  );
};

export default ItemListScreen;
