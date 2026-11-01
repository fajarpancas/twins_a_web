import React, { useState, useEffect, useMemo } from "react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { jsPDF } from "jspdf";
import {
  Plus,
  Trash2,
  Edit2,
  Eye,
  BookOpen,
  ExternalLink,
  Download,
  Upload,
} from "lucide-react";
import * as XLSX from "xlsx";
import FirestoreService, {
  type OrderDocument,
} from "../services/FirestoreService";
import AddOrderModal from "../components/AddOrderModal.tsx";
import OrderDetailModal from "../components/OrderDetailModal.tsx";
import BookChecklistModal from "../components/BookChecklistModal.tsx";
import CsvImportModal from "../components/CsvImportModal.tsx";
import {
  CardSkeleton,
  PAGE_SIZE,
  Pager,
  TallySkeleton,
  goToListPage,
  usePage,
} from "../components/ListPage.tsx";

const ItemListScreen: React.FC = () => {
  const [orders, setOrders] = useState<OrderDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<
    OrderDocument["status"] | "all"
  >("all");
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [keepFilter, setKeepFilter] = useState(false);
  const [paidFilter, setPaidFilter] = useState(false);
  const [isAddModalVisible, setIsAddModalVisible] = useState(false);
  const [isDetailModalVisible, setIsDetailModalVisible] = useState(false);
  const [isChecklistVisible, setIsChecklistVisible] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<OrderDocument | null>(
    null,
  );
  const [lastEditedOrderId, setLastEditedOrderId] = useState<string | null>(
    null,
  );
  const [isCsvImportVisible, setIsCsvImportVisible] = useState(false);
  const [bookDetailOrder, setBookDetailOrder] = useState<OrderDocument | null>(null);

  useEffect(() => {
    fetchOrders();
  }, []);


  const fetchOrders = async () => {
    setLoading(true);
    setLoadError(null);
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
      setLoadError("Pesanan tidak terbaca.");
    } finally {
      setLoading(false);
    }
  };

  const handleAddOrder = async (orderData: Omit<OrderDocument, "id">) => {
    try {
      if (selectedOrder) {
        const id = selectedOrder.id;
        setLastEditedOrderId(id);
        await FirestoreService.updateDocument("orders", id, orderData);
        setOrders((prev) =>
          prev.map((o) =>
            o.id === id
              ? {
                  ...o,
                  ...orderData,
                  id,
                  updated_at: new Date().toISOString(),
                }
              : o,
          ),
        );
      } else {
        const newId = await FirestoreService.addDocument("orders", orderData);
        const now = new Date().toISOString();
        const newOrder: OrderDocument = {
          id: newId,
          ...orderData,
          created_at: now,
          updated_at: now,
        } as OrderDocument;
        setOrders((prev) => [newOrder, ...prev]);
        setLastEditedOrderId(newId);
      }
    } catch (error) {
      console.error("Error saving order:", error);
    } finally {
      setSelectedOrder(null);
    }
  };

  const handleBulkSave = async (orders: Omit<OrderDocument, "id">[]) => {
    const now = new Date().toISOString();
    for (const orderData of orders) {
      const newId = await FirestoreService.addDocument("orders", orderData);
      const newOrder: OrderDocument = { id: newId, ...orderData, created_at: now, updated_at: now } as OrderDocument;
      setOrders((prev) => [newOrder, ...prev]);
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

  const toggleOrderHnr = async (order: OrderDocument) => {
    const newValue = !order.is_hnr;
    try {
      await FirestoreService.updateDocument("orders", order.id, {
        is_hnr: newValue,
      });
      setOrders((prev) =>
        prev.map((o) =>
          o.id === order.id ? { ...o, is_hnr: newValue } : o,
        ),
      );
    } catch (error) {
      console.error("Error updating HnR:", error);
    }
  };

  const toggleOrderKeep = async (order: OrderDocument) => {
    const newValue = !order.is_keep;
    try {
      await FirestoreService.updateDocument("orders", order.id, {
        is_keep: newValue,
      });
      setOrders((prev) =>
        prev.map((o) =>
          o.id === order.id ? { ...o, is_keep: newValue } : o,
        ),
      );
    } catch (error) {
      console.error("Error updating Keep:", error);
    }
  };

  const filteredOrders = useMemo(() => {
    const calcTotalWithUnique = (order: OrderDocument) => {
      const itemsTotal =
        order.orders?.reduce((sum, i) => sum + (i.price || 0), 0) || 0;
      const unique = order.unique_code || 0;
      const packing = order.is_packing_fee_applied ? 2000 : 0;
      return itemsTotal + unique + packing;
    };
    const list = orders.filter((order) => {
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


      const matchesKeep = !keepFilter || order.is_keep;

      const matchesPaid = !paidFilter || order.payment_status === "full";


      return matchesSearch && matchesStatus && matchesDate && matchesKeep && matchesPaid;
    });
    return list.sort((a, b) => calcTotalWithUnique(b) - calcTotalWithUnique(a));
  }, [orders, searchQuery, statusFilter, startDate, endDate, keepFilter, paidFilter]);

  const orderPage = usePage(
    filteredOrders,
    [statusFilter, searchQuery, paidFilter, keepFilter, startDate?.getTime() ?? "", endDate?.getTime() ?? ""].join("|"),
  );

  useEffect(() => {
    if (!lastEditedOrderId) return;
    const index = filteredOrders.findIndex((order) => order.id === lastEditedOrderId);
    if (index < 0) {
      setLastEditedOrderId(null);
      return;
    }
    const nextPage = Math.floor(index / PAGE_SIZE) + 1;
    if (orderPage.page !== nextPage) {
      orderPage.setPage(nextPage);
      return;
    }
    const frame = requestAnimationFrame(() => {
      document.getElementById(`order-card-${lastEditedOrderId}`)?.scrollIntoView({ block: "center" });
      setLastEditedOrderId(null);
    });
    return () => cancelAnimationFrame(frame);
  }, [lastEditedOrderId, filteredOrders, orderPage.page, orderPage.setPage]);

  const activeOrders = useMemo(
    () => filteredOrders.filter((order) => !order.is_hnr),
    [filteredOrders],
  );

  const omzetWithoutUnique = useMemo(() => {
    return activeOrders.reduce((sum, order) => {
      const itemsTotal =
        order.orders?.reduce((s, it) => s + (it.price || 0), 0) || 0;
      const packing = order.is_packing_fee_applied ? 2000 : 0;
      return sum + itemsTotal + packing;
    }, 0);
  }, [activeOrders]);

  const tally = useMemo(() => {
    const query = searchQuery.toLowerCase();
    const queue = orders.filter((order) => {
      const matchesSearch =
        order.name?.toLowerCase().includes(query) ||
        order.last_4_digits_phone?.includes(query) ||
        order.orders?.some((item) =>
          item.description?.toLowerCase().includes(query),
        );
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
      const matchesKeep = !keepFilter || order.is_keep;
      const matchesPaid = !paidFilter || order.payment_status === "full";
      return matchesSearch && matchesDate && matchesKeep && matchesPaid;
    });
    const count = (status: OrderDocument["status"]) =>
      queue.filter((order) => order.status === status).length;
    return {
      all: queue.length,
      pending: count("pending"),
      packing: count("packing"),
      sent: count("sent"),
      hnr: count("hnr"),
    };
  }, [orders, searchQuery, startDate, endDate, keepFilter, paidFilter]);

  const exportToExcel = () => {
    const rows = filteredOrders.map((order) => {
      const itemsTotal =
        order.orders?.reduce((s, it) => s + (it.price || 0), 0) || 0;
      const totalTransfer =
        itemsTotal +
        (order.unique_code || 0) +
        (order.is_packing_fee_applied ? 2000 : 0);
      return {
        "Nama Customer": order.name,
        "4 Digit No HP": order.last_4_digits_phone,
        "Total Transfer": totalTransfer,
      };
    });
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Order Management");
    const today = new Date().toISOString().split("T")[0];
    XLSX.writeFile(wb, `Order-Management-${today}.xlsx`);
  };

  const statusCopy = (status: OrderDocument["status"]) => {
    switch (status) {
      case "packing":
        return { label: "Dikemas", pill: "pill-accent" };
      case "sent":
        return { label: "Terkirim", pill: "pill-pos" };
      case "hnr":
        return { label: "HnR", pill: "pill-neg" };
      default:
        return { label: "Menunggu", pill: "pill-warn" };
    }
  };

  const getPaymentBadge = (status: OrderDocument["payment_status"]) => {
    switch (status) {
      case "full":
        return <span className="pill pill-pos">Lunas</span>;
      case "half":
        return <span className="pill pill-accent">DP</span>;
      default:
        return <span className="pill pill-neg">Belum bayar</span>;
    }
  };

  const stillOnBench = tally.pending + tally.packing;

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1 className="page-title">Pesanan</h1>
          <p className="page-note">
            {loading
              ? "Memuat pesanan."
              : <>
                  {stillOnBench} masih di meja, belum dikirim. Omzet saringan ini{" "}
                  <span className="num" style={{ color: "var(--chart-1)" }}>
                    Rp {omzetWithoutUnique.toLocaleString("id-ID")}
                  </span>{" "}
                  dari {activeOrders.length} pesanan.
                </>}
          </p>
        </div>
        <div className="actions">
          <button type="button" onClick={() => setIsChecklistVisible(true)} className="btn">
            <BookOpen aria-hidden="true" /> Checklist
          </button>
          <button type="button" onClick={exportToExcel} className="btn">
            <Download aria-hidden="true" /> Export
          </button>
          <button type="button" onClick={() => setIsCsvImportVisible(true)} className="btn">
            <Upload aria-hidden="true" /> Import
          </button>
          <button
            type="button"
            onClick={() => {
              setSelectedOrder(null);
              setIsAddModalVisible(true);
            }}
            className="btn btn-primary"
          >
            <Plus aria-hidden="true" /> Tambah pesanan
          </button>
          <button
            onClick={() => {
              const doc = new jsPDF({ unit: "mm", format: [58, 200] });
              let y = 4;
              const addNewPageIfNeeded = (needed: number) => {
                if (y + needed > 190) {
                  doc.addPage();
                  y = 4;
                }
              };
              const truncateText = (text: string, maxWidth: number, fontSize: number) => {
                doc.setFontSize(fontSize);
                const maxChars = Math.floor(maxWidth / (fontSize * 0.15));
                if (text.length > maxChars) {
                  return text.substring(0, maxChars - 3) + "...";
                }
                return text;
              };
              filteredOrders.forEach((order) => {
                addNewPageIfNeeded(11);
                doc.setFont("helvetica", "bold");
                doc.setFontSize(9);
                doc.text(order.name || "Tanpa Nama", 29, y, { align: "center", maxWidth: 54 });
                y += 4;
                doc.setFont("helvetica", "normal");
                doc.setFontSize(8);
                doc.text(order.last_4_digits_phone || "****", 29, y, { align: "center" });
                y += 4;
                doc.setLineWidth(0.2);
                doc.line(2, y, 56, y);
                y += 3;
                doc.setFontSize(7);
                order.orders?.forEach((item) => {
                  addNewPageIfNeeded(3.5);
                  const price = item.price ? `Rp${item.price.toLocaleString("id-ID")}` : "-";
                  const desc = item.description || "-";
                  const line = `${price} ${desc}`;
                  doc.text(truncateText(line, 52, 7), 3, y);
                  y += 3.5;
                });
                doc.line(2, y, 56, y);
                y += 3;
              });
              const today = new Date().toISOString().split("T")[0];
              doc.save(`orders-${today}.pdf`);
            }}
            className="btn"
          >
            <Download aria-hidden="true" /> Cetak label
          </button>
        </div>
      </div>

      {/* Filters */}
      {loading ? (
        <TallySkeleton />
      ) : (
      <div className="tally" role="group" aria-label="Saring status pesanan">
        {(
          [
            ["all", "Semua", tally.all],
            ["pending", "Menunggu", tally.pending],
            ["packing", "Dikemas", tally.packing],
            ["sent", "Terkirim", tally.sent],
            ["hnr", "HnR", tally.hnr],
          ] as const
        ).map(([key, label, count]) => (
          <button
            key={key}
            type="button"
            aria-pressed={statusFilter === key}
            onClick={() => setStatusFilter(key)}
          >
            <span className="k">{label}</span>
            <span className="v">{count}</span>
          </button>
        ))}
      </div>
      )}

      <div className="filters">
        <label>
          <span className="sr-only">Cari pesanan</span>
          <input
            type="search"
            placeholder="Nama atau 4 digit HP"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </label>
        <div className="checks">
          <label>
            <input
              type="checkbox"
              checked={paidFilter}
              onChange={(e) => setPaidFilter(e.target.checked)}
            />
            Lunas
          </label>
          <label>
            <input
              type="checkbox"
              checked={keepFilter}
              onChange={(e) => setKeepFilter(e.target.checked)}
            />
            Keep
          </label>
        </div>
        <div className="dates">
          <DatePicker
            selected={startDate}
            onChange={(date: Date | null) => setStartDate(date)}
            selectsStart
            startDate={startDate}
            endDate={endDate}
            placeholderText="Dari tanggal"
            dateFormat="dd/MM/yyyy"
            className="field"
            wrapperClassName="w-full"
            portalId="datepicker-portal"
            isClearable
          />
          <DatePicker
            selected={endDate}
            onChange={(date: Date | null) => setEndDate(date)}
            selectsEnd
            startDate={startDate}
            endDate={endDate}
            minDate={startDate ?? undefined}
            placeholderText="Sampai tanggal"
            dateFormat="dd/MM/yyyy"
            className="field"
            wrapperClassName="w-full"
            portalId="datepicker-portal"
            isClearable
          />
        </div>
      </div>

      {loading ? (
        <CardSkeleton />
      ) : loadError ? (
        <div className="state state-error" role="alert">
          <h2>{loadError}</h2>
          <p>Data terakhir tidak sempat tampil.</p>
          <button type="button" className="btn" style={{ marginTop: 12 }} onClick={fetchOrders}>
            Muat lagi
          </button>
        </div>
      ) : filteredOrders.length === 0 ? (
        <div className="state">
          <h2>Tidak ada pesanan di saringan ini</h2>
          <p>Ubah tanggal atau status, atau tambah pesanan baru.</p>
        </div>
      ) : (
        <>
        <Pager
          id="list-top"
          page={orderPage.page}
          pages={orderPage.pages}
          total={orderPage.total}
          from={orderPage.from}
          to={orderPage.to}
          onPage={(next) => goToListPage(orderPage.setPage, next)}
        />
        <div className="order-grid">
          {orderPage.slice.map((order) => {
            const status = statusCopy(order.status);
            const pay =
              (order.orders?.reduce((sum, item) => sum + (item.price || 0), 0) || 0) +
              (order.unique_code || 0) +
              (order.is_packing_fee_applied ? 2000 : 0);
            return (
            <article
              id={`order-card-${order.id}`}
              key={order.id}
              className={`order-card${order.is_hnr ? " is-hnr" : ""}`}
            >
              {/* Order Header */}
              <header>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="truncate">{order.name || "Tanpa nama"}</h2>
                    {getPaymentBadge(order.payment_status)}
                  </div>
                  <p className="meta">
                    {order.id.slice(-6)} · {order.last_4_digits_phone || "----"}
                    {order.unique_code != null
                      ? ` · unik Rp ${order.unique_code.toLocaleString("id-ID")}`
                      : ""}
                    <br />
                    <span className="weight">
                      {(order.total_weight_kg ?? 0).toLocaleString("id-ID")}
                      {"\u00A0"}
                      kg
                    </span>
                  </p>
                </div>
                <span className={`pill ${status.pill}`}>{status.label}</span>
              </header>

              <div className="body">
                {order.orders?.slice(0, 3).map((item, idx) => (
                  <div className="line" key={idx}>
                    <span className="truncate">{item.description}</span>
                    <span className="num">Rp {item.price?.toLocaleString("id-ID")}</span>
                  </div>
                ))}
                {(order.orders?.length ?? 0) > 3 && (
                  <p className="page-note">+{(order.orders?.length ?? 0) - 3} buku lagi</p>
                )}
                <button type="button" className="btn btn-quiet" onClick={() => setBookDetailOrder(order)}>
                  Lihat semua buku
                </button>
                <div className="pay">
                  <p className="page-note" style={{ margin: 0 }}>
                    {order.delivery_type === "Manual"
                      ? "Kirim sendiri"
                      : order.delivery_type || "Ekspedisi belum diisi"}
                    {order.payment_type ? ` · Cara bayar ${order.payment_type}` : ""}
                  </p>
                  <div>
                    <p className="page-note" style={{ margin: 0, textAlign: "right" }}>
                      Total bayar
                    </p>
                    <strong className="num">Rp {pay.toLocaleString("id-ID")}</strong>
                  </div>
                </div>
              </div>

              {/* Order Actions */}
              <footer>
                <div className="actions">
                  <button
                    type="button"
                    className="icon-btn"
                    aria-label="Lihat pesanan"
                    onClick={() => {
                      setSelectedOrder(order);
                      setIsDetailModalVisible(true);
                    }}
                  >
                    <Eye aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    className="icon-btn"
                    aria-label="Ubah pesanan"
                    onClick={() => {
                      setSelectedOrder(order);
                      setLastEditedOrderId(order.id);
                      setIsAddModalVisible(true);
                    }}
                  >
                    <Edit2 aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    className="icon-btn danger"
                    aria-label="Hapus pesanan"
                    onClick={() => handleDeleteOrder(order.id)}
                  >
                    <Trash2 aria-hidden="true" />
                  </button>
                </div>
                <div className="actions">
                  <button
                    type="button"
                    className={order.is_keep ? "btn btn-primary" : "btn"}
                    onClick={() => toggleOrderKeep(order)}
                  >
                    {order.is_keep ? "Batalkan keep" : "Keep"}
                  </button>
                  {order.payment_status !== "full" && (
                    <button type="button" className="btn" onClick={() => toggleOrderHnr(order)}>
                      {order.is_hnr ? "Batalkan HnR" : "HnR"}
                    </button>
                  )}
                  {order.status === "pending" && (
                    <button
                      type="button"
                      className="btn btn-primary"
                      onClick={() => updateOrderStatus(order.id, "packing")}
                    >
                      Kemas
                    </button>
                  )}
                  {order.status === "packing" && (
                    <button
                      type="button"
                      className="btn btn-primary"
                      onClick={() => updateOrderStatus(order.id, "sent")}
                    >
                      Kirim
                    </button>
                  )}
                  {order.status === "sent" && order.tracking_number && (
                    <a
                      className="btn"
                      href={`https://cekresi.com/?noresi=${order.tracking_number}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <ExternalLink aria-hidden="true" /> Resi
                    </a>
                  )}
                </div>
              </footer>
            </article>
            );
          })}
        </div>
        {orderPage.pages > 1 && (
          <Pager
            page={orderPage.page}
            pages={orderPage.pages}
            total={orderPage.total}
            from={orderPage.from}
            to={orderPage.to}
            onPage={(next) => goToListPage(orderPage.setPage, next)}
          />
        )}
        </>
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

      <CsvImportModal
        visible={isCsvImportVisible}
        onClose={() => setIsCsvImportVisible(false)}
        onBulkSave={handleBulkSave}
      />

      {/* Book Detail Modal */}
      {bookDetailOrder && (
        <div
          className="dialog-scrim"
          onClick={() => setBookDetailOrder(null)}
        >
          <div
            className="dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="book-detail-title"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 id="book-detail-title">
              {bookDetailOrder.name || "Tanpa nama"} ({bookDetailOrder.last_4_digits_phone || "----"})
            </h2>
            <ul className="mt-3 space-y-1">
              {bookDetailOrder.orders?.map((order, index) => (
                <li key={index}>{order.description || "-"}</li>
              )) || <li>Tidak ada buku</li>}
            </ul>
            <div className="mt-4 flex justify-end">
              <button type="button" className="btn" onClick={() => setBookDetailOrder(null)}>
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ItemListScreen;
