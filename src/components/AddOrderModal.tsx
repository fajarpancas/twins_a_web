import React, { useState, useEffect } from "react";
import { X, Plus, Trash2, Search } from "lucide-react";
import FirestoreService, {
  type OrderDocument,
  type OrderItem,
  type StockOpnameDocument,
} from "../services/FirestoreService";

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
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [deliveryType, setDeliveryType] = useState("Manual");
  const [paymentStatus, setPaymentStatus] =
    useState<OrderDocument["payment_status"]>("none");
  const [isShippingPaid, setIsShippingPaid] = useState(false);
  const [isPackingFeeApplied, setIsPackingFeeApplied] = useState(true);
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
        setItems(
          initialData.orders && initialData.orders.length > 0
            ? initialData.orders
            : [{ id: Date.now().toString(), description: "", price: 0 }],
        );
      } else {
        resetForm();
      }
    }
  }, [visible, initialData]);

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
    setItems([{ id: Date.now().toString(), description: "", price: 0 }]);
  };

  const handleAddItem = () => {
    setItems([
      ...items,
      { id: Date.now().toString(), description: "", price: 0 },
    ]);
  };

  const handleRemoveItem = (id: string) => {
    setItems(items.filter((item) => item.id !== id));
  };

  const handleUpdateItem = (
    id: string,
    field: keyof OrderItem,
    value: string | number,
  ) => {
    setItems(
      items.map((item) =>
        item.id === id ? { ...item, [field]: value } : item,
      ),
    );

    if (field === "description") {
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

  const handleSelectStockItem = (stockItem: StockOpnameDocument) => {
    if (activeItemId) {
      setItems(
        items.map((item) =>
          item.id === activeItemId
            ? {
                ...item,
                description: stockItem.book_name,
                price: stockItem.sell_price || stockItem.price,
                stockId: stockItem.id,
              }
            : item,
        ),
      );
      setSelectionModalVisible(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const orderData: Omit<OrderDocument, "id"> = {
        name,
        last_4_digits_phone: phone,
        delivery_address: address,
        delivery_type: deliveryType,
        payment_status: paymentStatus,
        is_shipping_paid: isShippingPaid,
        is_packing_fee_applied: isPackingFeeApplied,
        orders: items.filter((i) => i.description.trim() !== ""),
        status: initialData?.status || "pending",
        created_at: initialData?.created_at || new Date().toISOString(),
        updated_at: new Date().toISOString(),
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

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm transition-opacity">
      <div className="bg-white rounded-t-[2.5rem] sm:rounded-2xl w-full max-w-2xl max-h-[92vh] sm:max-h-[90vh] flex flex-col shadow-2xl animate-in slide-in-from-bottom duration-300">
        <div className="p-4 sm:p-6 border-b border-gray-100 flex justify-between items-center shrink-0">
          <div className="flex-1 text-center sm:text-left">
            <div className="w-12 h-1.5 bg-gray-200 rounded-full mx-auto mb-4 sm:hidden" />
            <h2 className="text-xl font-bold text-gray-800">
              {initialData ? "Edit Order" : "Tambah Order Baru"}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors absolute right-4 top-4 sm:static"
          >
            <X className="w-6 h-6 text-gray-500" />
          </button>
        </div>

        <form
          onSubmit={handleSubmit}
          className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5 sm:space-y-6"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="block text-xs font-black text-gray-400 uppercase tracking-widest ml-1">
                Nama Customer
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Contoh: Budi Santoso"
                className="w-full px-4 py-3 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
              />
            </div>
            <div className="space-y-1.5">
              <label className="block text-xs font-black text-gray-400 uppercase tracking-widest ml-1">
                4 Digit No HP
              </label>
              <input
                type="text"
                required
                maxLength={4}
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="0000"
                className="w-full px-4 py-3 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none transition-all font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="block text-xs font-black text-gray-400 uppercase tracking-widest ml-1">
                Ekspedisi
              </label>
              <div className="relative">
                <select
                  value={deliveryType}
                  onChange={(e) => setDeliveryType(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none appearance-none font-bold text-gray-700 transition-all"
                >
                  <option value="Manual">Manual</option>
                  <option value="Shopee">Shopee</option>
                </select>
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="block text-xs font-black text-gray-400 uppercase tracking-widest ml-1">
                Status Pembayaran
              </label>
              <select
                value={paymentStatus}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                  setPaymentStatus(
                    e.target.value as OrderDocument["payment_status"],
                  )
                }
                className="w-full px-4 py-3 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none appearance-none font-bold text-gray-700 transition-all"
              >
                <option value="none">Belum Bayar</option>
                <option value="half">DP</option>
                <option value="full">Lunas</option>
              </select>
            </div>
          </div>

          {deliveryType === "Manual" && (
            <div className="space-y-1.5 animate-in fade-in slide-in-from-top-2 duration-200">
              <label className="block text-xs font-black text-gray-400 uppercase tracking-widest ml-1">
                Alamat Pengiriman
              </label>
              <textarea
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Masukkan alamat lengkap..."
                className="w-full px-4 py-3 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none min-h-[100px] transition-all"
              />
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label
              className={`flex items-center gap-3 p-4 rounded-2xl border-2 transition-all cursor-pointer ${isShippingPaid ? "bg-blue-50 border-blue-500 shadow-sm" : "bg-gray-50 border-transparent hover:border-gray-200"}`}
            >
              <div
                className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${isShippingPaid ? "bg-blue-600 border-blue-600" : "bg-white border-gray-300"}`}
              >
                {isShippingPaid && (
                  <div className="w-2 h-2 bg-white rounded-full" />
                )}
              </div>
              <input
                type="checkbox"
                checked={isShippingPaid}
                onChange={(e) => setIsShippingPaid(e.target.checked)}
                className="hidden"
              />
              <span className="text-sm font-bold text-gray-700">
                Ongkir Sudah Bayar
              </span>
            </label>
            <label
              className={`flex items-center gap-3 p-4 rounded-2xl border-2 transition-all cursor-pointer ${isPackingFeeApplied ? "bg-blue-50 border-blue-500 shadow-sm" : "bg-gray-50 border-transparent hover:border-gray-200"}`}
            >
              <div
                className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${isPackingFeeApplied ? "bg-blue-600 border-blue-600" : "bg-white border-gray-300"}`}
              >
                {isPackingFeeApplied && (
                  <div className="w-2 h-2 bg-white rounded-full" />
                )}
              </div>
              <input
                type="checkbox"
                checked={isPackingFeeApplied}
                onChange={(e) => setIsPackingFeeApplied(e.target.checked)}
                className="hidden"
              />
              <span className="text-sm font-bold text-gray-700">
                Biaya Packing (2rb)
              </span>
            </label>
          </div>

          <div className="space-y-4 pt-4">
            <div className="flex justify-between items-center">
              <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">
                Daftar Buku
              </label>
              <button
                type="button"
                onClick={handleAddItem}
                className="text-sm text-blue-600 font-black uppercase tracking-widest flex items-center gap-1 hover:bg-blue-50 px-3 py-1.5 rounded-xl transition-all"
              >
                <Plus className="w-4 h-4" /> Tambah
              </button>
            </div>
            <div className="space-y-3">
              {items.map((item) => (
                <div
                  key={item.id}
                  className="p-4 bg-gray-50 rounded-2xl border border-gray-100 space-y-3"
                >
                  <div className="flex gap-2">
                    <div className="flex-1 relative">
                      <input
                        type="text"
                        placeholder="Judul Buku"
                        value={item.description}
                        onChange={(e) =>
                          handleUpdateItem(
                            item.id,
                            "description",
                            e.target.value,
                          )
                        }
                        onFocus={() => {
                          if (item.description.length > 0)
                            setActiveSuggestionId(item.id);
                        }}
                        className="w-full px-4 py-2.5 bg-white border-none rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm font-bold text-black"
                      />
                      {activeSuggestionId === item.id &&
                        item.description.length > 0 && (
                          <div className="absolute z-[80] top-full left-0 w-full mt-1 bg-white border border-gray-100 rounded-xl shadow-xl max-h-48 overflow-y-auto">
                            {stockItems
                              .filter((stock) =>
                                stock.book_name
                                  .toLowerCase()
                                  .includes(item.description.toLowerCase()),
                              )
                              .slice(0, 5)
                              .map((stock) => (
                                <button
                                  key={stock.id}
                                  type="button"
                                  className="w-full px-4 py-3 text-left hover:bg-blue-50 text-sm text-black font-medium border-b border-gray-50 last:border-none transition-colors"
                                  onClick={() => {
                                    handleUpdateItem(
                                      item.id,
                                      "description",
                                      stock.book_name,
                                    );
                                    handleUpdateItem(
                                      item.id,
                                      "price",
                                      stock.sell_price || stock.price,
                                    );
                                    handleUpdateItem(
                                      item.id,
                                      "stockId",
                                      stock.id,
                                    );
                                    setActiveSuggestionId(null);
                                  }}
                                >
                                  <div className="flex justify-between items-center">
                                    <span className="truncate flex-1">
                                      {stock.book_name}
                                    </span>
                                    <span className="text-xs text-blue-600 font-black ml-2 shrink-0">
                                      Rp{" "}
                                      {(
                                        stock.sell_price || stock.price
                                      ).toLocaleString()}
                                    </span>
                                  </div>
                                </button>
                              ))}
                          </div>
                        )}
                      <button
                        type="button"
                        onClick={() => handleOpenSelection(item.id)}
                        className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 hover:bg-gray-100 rounded-lg text-blue-600 transition-all"
                      >
                        <Search className="w-4 h-4" />
                      </button>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveItem(item.id)}
                      className="p-2.5 text-red-500 hover:bg-red-50 rounded-xl transition-all"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-bold text-gray-400">Rp</span>
                    <input
                      type="number"
                      placeholder="Harga"
                      value={item.price || ""}
                      onChange={(e) =>
                        handleUpdateItem(
                          item.id,
                          "price",
                          parseInt(e.target.value) || 0,
                        )
                      }
                      className="flex-1 px-4 py-2.5 bg-white border-none rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm font-black text-blue-600"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </form>

        <div className="p-4 sm:p-6 border-t border-gray-100 bg-gray-50 shrink-0">
          <button
            type="submit"
            disabled={loading}
            onClick={(e) => {
              const form = (e.target as HTMLElement).closest("form");
              if (form) form.requestSubmit();
            }}
            className="w-full py-4 bg-blue-600 text-white font-black uppercase tracking-widest rounded-2xl hover:bg-blue-700 transition-all shadow-xl shadow-blue-100 flex items-center justify-center gap-2 disabled:opacity-50 active:scale-[0.98]"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : initialData ? (
              "Simpan Perubahan"
            ) : (
              "Buat Order"
            )}
          </button>
        </div>
      </div>

      {/* Selection Modal */}
      {isSelectionModalVisible && (
        <div className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-t-[2.5rem] sm:rounded-2xl w-full max-w-md max-h-[80vh] flex flex-col shadow-2xl animate-in slide-in-from-bottom duration-300">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center shrink-0">
              <h3 className="font-bold text-gray-800">Pilih Buku</h3>
              <button
                onClick={() => setSelectionModalVisible(false)}
                className="p-2 hover:bg-gray-100 rounded-full"
              >
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>
            <div className="p-4 shrink-0">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Cari buku..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2.5 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm text-black font-medium"
                />
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {filteredStock.map((item) => (
                <button
                  key={item.id}
                  onClick={() => handleSelectStockItem(item)}
                  className="w-full p-4 bg-white hover:bg-blue-50 border border-gray-100 rounded-2xl text-left transition-all group"
                >
                  <div className="font-bold text-gray-800 group-hover:text-blue-700 mb-1">
                    {item.book_name}
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-400 font-mono">
                      Stok: {item.stock}
                    </span>
                    <span className="text-sm font-black text-blue-600">
                      Rp {(item.sell_price || item.price).toLocaleString()}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AddOrderModal;
