import React, { useState, useEffect, useRef } from "react";
import { X, Trash2, Search } from "lucide-react";
import FirestoreService, {
  type OrderDocument,
  type OrderItem,
  type StockOpnameDocument,
} from "../services/FirestoreService";

const blankBook = (): OrderItem => ({
  id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
  description: "",
  price: 0,
});

const isBlankBook = (item: OrderItem) => item.description.trim() === "";

const withTrailingBlank = (list: OrderItem[]): OrderItem[] => {
  const next = [...list];
  while (
    next.length > 1 &&
    isBlankBook(next[next.length - 1]) &&
    isBlankBook(next[next.length - 2])
  ) {
    next.pop();
  }
  if (next.length === 0 || !isBlankBook(next[next.length - 1])) {
    next.push(blankBook());
  }
  return next;
};

interface AddOrderModalProps {
  visible: boolean;
  onClose: () => void;
  onSave: (order: Omit<OrderDocument, "id">) => Promise<void>;
  initialData?: OrderDocument | null;
}

const AddOrderModal: React.FC<AddOrderModalProps> = ({
  visible,
  onClose,
  onSave,
  initialData,
}) => {
  const computeUniqueCode = () => {
    const base =
      (name || "").length +
      (phone || "").split("").reduce((s, c) => s + c.charCodeAt(0), 0) +
      (items || []).reduce((s, it) => s + (it.description?.length || 0), 0) +
      new Date().getDate() +
      new Date().getMonth() +
      new Date().getFullYear();
    const code = (base % 100) + 1;
    return code;
  };
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [deliveryType, setDeliveryType] = useState("Manual");
  const [paymentStatus, setPaymentStatus] =
    useState<OrderDocument["payment_status"]>("none");
  const [isShippingPaid, setIsShippingPaid] = useState(false);
  const [isPackingFeeApplied, setIsPackingFeeApplied] = useState(true);
  const [totalWeight, setTotalWeight] = useState(0);
  const [items, setItems] = useState<OrderItem[]>([
    { id: Date.now().toString(), description: "", price: 0 },
  ]);
  const [loading, setLoading] = useState(false);
  const [stockItems, setStockItems] = useState<StockOpnameDocument[]>([]);
  const [isSelectionModalVisible, setSelectionModalVisible] = useState(false);
  const [activeItemId, setActiveItemId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeSuggestionId, setActiveSuggestionId] = useState<string | null>(
    null,
  );
  const trailingTitleRef = useRef<HTMLInputElement>(null);
  const focusTrailing = useRef(false);
  const bookCount = useRef(0);

  useEffect(() => {
    if (visible) {
      fetchStockItems();
      setActiveSuggestionId(null);
      if (initialData) {
        setName(initialData.name);
        setPhone(initialData.last_4_digits_phone);
        setAddress(initialData.delivery_address || "");
        setDeliveryType(initialData.delivery_type);
        setPaymentStatus(initialData.payment_status);
        setIsShippingPaid(initialData.is_shipping_paid || false);
        setIsPackingFeeApplied(initialData.is_packing_fee_applied ?? true);
        setTotalWeight(initialData.total_weight_kg ?? 0);
        setItems(withTrailingBlank(initialData.orders ?? []));
      } else {
        resetForm();
      }
    }
  }, [visible, initialData]);

  useEffect(() => {
    if (!visible) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      if (isSelectionModalVisible) {
        setSelectionModalVisible(false);
        return;
      }
      onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [visible, onClose, isSelectionModalVisible]);

  const fetchStockItems = async () => {
    try {
      const data = await FirestoreService.getCollection("stock_opname");
      setStockItems(data as StockOpnameDocument[]);
    } catch (error) {
      console.error("Error fetching stock items:", error);
    }
  };

  const resetForm = () => {
    setName("");
    setPhone("");
    setAddress("");
    setDeliveryType("Manual");
    setPaymentStatus("none");
    setIsShippingPaid(false);
    setIsPackingFeeApplied(true);
    setTotalWeight(0);
    setItems(withTrailingBlank([]));
  };

  const handleRemoveItem = (id: string) => {
    setItems((prev) => withTrailingBlank(prev.filter((item) => item.id !== id)));
  };

  const handleUpdateItem = (
    id: string,
    field: keyof OrderItem,
    value: string | number,
    isManualChange = true,
  ) => {
    setItems((prevItems) =>
      withTrailingBlank(
        prevItems.map((item) =>
          item.id === id ? { ...item, [field]: value } : item,
        ),
      ),
    );

    if (field === "description" && isManualChange) {
      if (typeof value === "string" && value.length > 0) {
        setActiveSuggestionId(id);
      } else {
        setActiveSuggestionId(null);
      }
    }
  };

  const handleOpenSelection = (itemId: string) => {
    setActiveItemId(itemId);
    setSearchQuery("");
    setSelectionModalVisible(true);
  };

  const applyStock = (itemId: string, stockItem: StockOpnameDocument) => {
    focusTrailing.current = true;
    setItems((prev) =>
      withTrailingBlank(
        prev.map((item) =>
          item.id === itemId
            ? {
                ...item,
                description: stockItem.book_name,
                price: stockItem.sell_price || stockItem.price,
                stockId: stockItem.id,
              }
            : item,
        ),
      ),
    );
    setActiveSuggestionId(null);
    setSelectionModalVisible(false);
  };

  useEffect(() => {
    if (items.length > bookCount.current) {
      trailingTitleRef.current?.scrollIntoView({ block: "nearest" });
    }
    bookCount.current = items.length;
    if (!focusTrailing.current) return;
    focusTrailing.current = false;
    trailingTitleRef.current?.focus();
  }, [items]);

  const handleSelectStockItem = (stockItem: StockOpnameDocument) => {
    if (activeItemId) applyStock(activeItemId, stockItem);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const uniqueCode =
        initialData?.unique_code !== undefined
          ? initialData.unique_code
          : computeUniqueCode();
      const orderData: Omit<OrderDocument, "id"> = {
        name,
        last_4_digits_phone: phone,
        delivery_address: address,
        delivery_type: deliveryType,
        payment_status: paymentStatus,
        is_shipping_paid: isShippingPaid,
        is_packing_fee_applied: isPackingFeeApplied,
        total_weight_kg: totalWeight || 0,
        orders: items.filter((i) => i.description.trim() !== ""),
        status: initialData?.status || "pending",
        created_at: initialData?.created_at || new Date().toISOString(),
        updated_at: new Date().toISOString(),
        unique_code: uniqueCode,
      };
      await onSave(orderData);
      onClose();
    } catch (error) {
      console.error("Error saving order:", error);
    } finally {
      setLoading(false);
    }
  };

  if (!visible) return null;

  const filteredStock = stockItems.filter((item) =>
    item.book_name.toLowerCase().includes(searchQuery.toLowerCase()),
  );
  const titledBooks = items.filter((item) => item.description.trim() !== "");
  const booksTotal = titledBooks.reduce((sum, item) => sum + (item.price || 0), 0);
  const packingFee = isPackingFeeApplied ? 2000 : 0;
  const slipTotal = booksTotal + packingFee;
  const money = (value: number) => `Rp ${value.toLocaleString("id-ID")}`;

  return (
    <div
      className="dialog-scrim"
      onClick={onClose}
    >
      <form
        onSubmit={handleSubmit}
        className="order-sheet"
        onClick={(event) => event.stopPropagation()}
      >
        <header>
          <div>
            <h2>{initialData ? "Ubah pesanan" : "Tambah pesanan"}</h2>
            <p>
              {initialData
                ? "Ubah pembeli, cara kirim, atau daftar bukunya."
                : "Catat pembeli, cara kirim, dan buku yang dibawa."}
            </p>
          </div>
          <button type="button" className="icon-btn" aria-label="Tutup" onClick={onClose}>
            <X aria-hidden="true" />
          </button>
        </header>

        <div className="sheet-body">
          <section>
            <h3>Pembeli</h3>
            <div className="pair">
              <label>
                Nama
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Nama di nota"
                  autoComplete="name"
                />
              </label>
              <label>
                4 digit HP
                <input
                  type="text"
                  required
                  inputMode="numeric"
                  maxLength={4}
                  value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 4))}
                  placeholder="0000"
                  autoComplete="off"
                />
              </label>
            </div>
          </section>

          <section>
            <h3>Buku</h3>
            <div className="book-list">
                {items.map((item, index) => {
                  const trailing = index === items.length - 1 && isBlankBook(item);
                  const suggestions =
                    activeSuggestionId === item.id && item.description.length > 0
                      ? stockItems
                          .filter((stock) =>
                            stock.book_name
                              .toLowerCase()
                              .includes(item.description.toLowerCase()),
                          )
                          .slice(0, 5)
                      : [];
                  return (
                    <div className="book-row" key={item.id}>
                      <label>
                        {index === 0 ? "Judul" : <span className="sr-only">Judul</span>}
                        <input
                          ref={trailing ? trailingTitleRef : undefined}
                          type="text"
                          placeholder={
                            trailing && index > 0
                              ? "Judul buku berikutnya"
                              : "Ketik judul, atau cari di stok"
                          }
                          value={item.description}
                          onChange={(e) =>
                            handleUpdateItem(item.id, "description", e.target.value)
                          }
                          onKeyDown={(event) => {
                            if (event.key !== "Enter") return;
                            event.preventDefault();
                            event.currentTarget
                              .closest(".book-row")
                              ?.querySelector<HTMLInputElement>(".book-price input")
                              ?.focus();
                          }}
                          onFocus={() => {
                            if (item.description.length > 0) setActiveSuggestionId(item.id);
                          }}
                          onBlur={() => {
                            setTimeout(() => setActiveSuggestionId(null), 200);
                          }}
                        />
                        {activeSuggestionId === item.id && item.description.length > 0 && (
                          <ul className="suggest">
                            {suggestions.length === 0 ? (
                              <li className="suggest-empty">Tidak ada di stok. Harga diisi sendiri.</li>
                            ) : (
                              suggestions.map((stock) => (
                                <li key={stock.id}>
                                  <button
                                    type="button"
                                    onMouseDown={(e) => e.preventDefault()}
                                    onClick={() => applyStock(item.id, stock)}
                                  >
                                    <span>{stock.book_name}</span>
                                    <span className="num">
                                      {money(stock.sell_price || stock.price)}
                                    </span>
                                  </button>
                                </li>
                              ))
                            )}
                          </ul>
                        )}
                      </label>
                      <label className="book-price">
                        {index === 0 ? "Harga" : <span className="sr-only">Harga</span>}
                        <span className="affix">
                          <span>Rp</span>
                          <input
                            type="number"
                            min="0"
                            placeholder="0"
                            value={item.price || ""}
                            onChange={(e) =>
                              handleUpdateItem(item.id, "price", parseInt(e.target.value) || 0)
                            }
                            onKeyDown={(event) => {
                              if (event.key !== "Enter") return;
                              event.preventDefault();
                              trailingTitleRef.current?.focus();
                            }}
                          />
                        </span>
                      </label>
                      <button
                        type="button"
                        className="icon-btn"
                        aria-label={`Cari ${item.description || "buku"} di stok`}
                        onClick={() => handleOpenSelection(item.id)}
                      >
                        <Search aria-hidden="true" />
                      </button>
                      {trailing ? (
                        <span />
                      ) : (
                        <button
                          type="button"
                          className="icon-btn danger"
                          aria-label="Hapus baris buku"
                          onClick={() => handleRemoveItem(item.id)}
                        >
                          <Trash2 aria-hidden="true" />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
          </section>

          <section>
            <h3>Kirim dan bayar</h3>
            <div className="pair">
              <div className="choice">
                <span>Ekspedisi</span>
                <div className="seg stretch" role="group" aria-label="Ekspedisi">
                  <button
                    type="button"
                    aria-pressed={deliveryType === "Manual"}
                    onClick={() => setDeliveryType("Manual")}
                  >
                    Kirim sendiri
                  </button>
                  <button
                    type="button"
                    aria-pressed={deliveryType === "Shopee"}
                    onClick={() => setDeliveryType("Shopee")}
                  >
                    Shopee
                  </button>
                </div>
                <p>
                  {deliveryType === "Manual"
                    ? "Dikirim sendiri, alamat diisi di bawah."
                    : "Resi mengikuti pesanan Shopee. Alamat tidak dicatat di sini."}
                </p>
              </div>
              <div className="choice">
                <span>Status bayar</span>
                <div className="seg stretch" role="group" aria-label="Status bayar">
                  {(
                    [
                      ["none", "Belum bayar"],
                      ["half", "DP"],
                      ["full", "Lunas"],
                    ] as const
                  ).map(([value, label]) => (
                    <button
                      key={value}
                      type="button"
                      aria-pressed={paymentStatus === value}
                      onClick={() => setPaymentStatus(value)}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                <p>Ini status nota, bukan metode transfer.</p>
              </div>
            </div>

            {deliveryType === "Manual" && (
              <label>
                Alamat pengiriman
                <textarea
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Jalan, nomor, kecamatan"
                  rows={2}
                />
              </label>
            )}

            <div className="pair ship-row">
              <label>
                Berat
                <span className="affix">
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="0"
                    value={totalWeight || ""}
                    onChange={(e) => setTotalWeight(parseFloat(e.target.value) || 0)}
                  />
                  <span>kg</span>
                </span>
              </label>
              <div className="ticks">
                <label>
                  <input
                    type="checkbox"
                    checked={isShippingPaid}
                    onChange={(e) => setIsShippingPaid(e.target.checked)}
                  />
                  Ongkir sudah dibayar
                </label>
                <label>
                  <input
                    type="checkbox"
                    checked={isPackingFeeApplied}
                    onChange={(e) => setIsPackingFeeApplied(e.target.checked)}
                  />
                  Tambah packing Rp 2.000
                </label>
              </div>
            </div>
          </section>

        </div>

        <footer className="slip">
          <div>
            <p>
              {titledBooks.length} buku
              {isPackingFeeApplied ? " · packing Rp 2.000" : " · tanpa packing"}
              {initialData?.unique_code != null
                ? ` · kode unik Rp ${initialData.unique_code.toLocaleString("id-ID")} belum masuk`
                : " · kode unik ditambah saat disimpan"}
            </p>
            <strong className="num">{money(slipTotal)}</strong>
          </div>
          <div className="actions">
            <button type="button" className="btn" onClick={onClose}>
              Batal
            </button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? "Menyimpan…" : initialData ? "Simpan perubahan" : "Simpan pesanan"}
            </button>
          </div>
        </footer>
      </form>

      {isSelectionModalVisible && (
        <div
          className="dialog-scrim picker-scrim"
          onClick={() => setSelectionModalVisible(false)}
        >
          <div
            className="order-sheet picker"
            role="dialog"
            aria-modal="true"
            aria-labelledby="stock-picker-title"
            onClick={(event) => event.stopPropagation()}
          >
            <header>
              <div>
                <h2 id="stock-picker-title">Pilih dari stok</h2>
                <p>Harga jual terisi otomatis. Stok tidak berkurang dari sini.</p>
              </div>
              <button
                type="button"
                className="icon-btn"
                aria-label="Tutup daftar stok"
                onClick={() => setSelectionModalVisible(false)}
              >
                <X aria-hidden="true" />
              </button>
            </header>
            <div className="sheet-body">
              <label>
                Cari judul
                <input
                  type="search"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Judul buku"
                  autoFocus
                />
              </label>
              {filteredStock.length === 0 ? (
                <p className="empty-books">Tidak ada judul itu di stok.</p>
              ) : (
                <ul className="stock-list">
                  {filteredStock.map((item) => (
                    <li key={item.id}>
                      <button type="button" onClick={() => handleSelectStockItem(item)}>
                        <span>
                          <strong>{item.book_name}</strong>
                          <span className="page-note">Stok {item.stock}</span>
                        </span>
                        <span className="num">{money(item.sell_price || item.price)}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AddOrderModal;
