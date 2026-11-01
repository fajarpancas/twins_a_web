import React, { useState, useEffect, useMemo } from "react";
import { Plus, Download, Trash2, Edit2, X } from "lucide-react";
import * as XLSX from "xlsx";
import FirestoreService, { type StockOpnameDocument } from "../services/FirestoreService";
import { KpiSkeleton, Pager, SkeletonRows, goToListPage, usePage } from "../components/ListPage.tsx";

const StockOpnameScreen: React.FC = () => {
  const [stock, setStock] = useState<StockOpnameDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingItem, setEditingItem] = useState<StockOpnameDocument | null>(null);

  // Form states
  const [bookName, setBookName] = useState("");
  const [price, setPrice] = useState("");
  const [sellPrice, setSellPrice] = useState("");
  const [stockCount, setStockCount] = useState("");

  useEffect(() => {
    fetchStock();
  }, []);

  const fetchStock = async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const data = await FirestoreService.getCollection("stock_opname", "book_name", "asc");
      setStock(data as StockOpnameDocument[]);
    } catch (error) {
      console.error("Error fetching stock:", error);
      setLoadError("Stok tidak terbaca.");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const data = {
      book_name: bookName,
      price: parseFloat(price) || 0,
      sell_price: parseFloat(sellPrice) || 0,
      stock: parseInt(stockCount) || 0,
      updated_at: new Date().toISOString(),
    };

    try {
      if (editingItem) {
        await FirestoreService.updateDocument("stock_opname", editingItem.id, data);
      } else {
        await FirestoreService.addDocument("stock_opname", data);
      }
      setIsModalVisible(false);
      resetForm();
      fetchStock();
    } catch (error) {
      console.error("Error saving stock:", error);
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm("Hapus stok buku ini?")) {
      try {
        await FirestoreService.deleteDocument("stock_opname", id);
        fetchStock();
      } catch (error) {
        console.error("Error deleting stock:", error);
      }
    }
  };

  const resetForm = () => {
    setBookName("");
    setPrice("");
    setSellPrice("");
    setStockCount("");
    setEditingItem(null);
  };

  const exportToExcel = () => {
    const exportData = stock.map(item => ({
      "Judul Buku": item.book_name,
      "Harga Modal": item.price,
      "Harga Jual": item.sell_price || item.price,
      "Stok": item.stock,
      "Total Nilai Modal": item.price * item.stock,
      "Total Nilai Jual": (item.sell_price || item.price) * item.stock,
      "Profit Per Buku": (item.sell_price || item.price) - item.price,
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Stok Buku");
    XLSX.writeFile(wb, `Stock-Opname-${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const filteredStock = useMemo(() => {
    return stock.filter(item => 
      item.book_name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [stock, searchQuery]);

  const stockPage = usePage(filteredStock, searchQuery);

  const stats = useMemo(() => {
    const totalItems = stock.reduce((sum, item) => sum + item.stock, 0);
    const totalValue = stock.reduce((sum, item) => sum + (item.price * item.stock), 0);
    const lowStock = stock.filter(item => item.stock <= 5).length;
    return { totalItems, totalValue, lowStock };
  }, [stock]);

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1 className="page-title">Stok</h1>
          <p className="page-note">
            {loading
              ? "Menghitung rak."
              : `${stats.lowStock} judul tinggal 5 eksemplar atau kurang.`}
          </p>
        </div>
        <div className="actions">
          <button type="button" onClick={exportToExcel} className="btn">
            <Download aria-hidden="true" /> Export
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => {
              resetForm();
              setIsModalVisible(true);
            }}
          >
            <Plus aria-hidden="true" /> Tambah judul
          </button>
        </div>
      </div>

      {loading ? (
        <KpiSkeleton cells={3} label="Memuat stok" />
      ) : (
      <div className="kpi cols-3" style={{ gridTemplateColumns: "repeat(3, minmax(0, 1fr))" }}>
        <div>
          <p className="k">Eksemplar di rak</p>
          <p className="v lead">{stats.totalItems}</p>
        </div>
        <div>
          <p className="k">Nilai modal</p>
          <p className="v num">Rp {stats.totalValue.toLocaleString("id-ID")}</p>
        </div>
        <div>
          <p className="k">Judul menipis</p>
          <p className={`v num${stats.lowStock > 0 ? " bad" : ""}`}>{stats.lowStock}</p>
        </div>
      </div>
      )}

      <label>
        <span className="sr-only">Cari judul</span>
        <input
          type="search"
          placeholder="Judul buku"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </label>

      {/* List/Table */}
      {loadError && (
        <div className="state state-error" role="alert">
          <h2>{loadError}</h2>
          <button type="button" className="btn" style={{ marginTop: 12 }} onClick={fetchStock}>
            Muat lagi
          </button>
        </div>
      )}

      {!loading && !loadError && stockPage.pages > 1 && (
        <Pager
          id="list-top"
          page={stockPage.page}
          pages={stockPage.pages}
          total={stockPage.total}
          from={stockPage.from}
          to={stockPage.to}
          onPage={(next) => goToListPage(stockPage.setPage, next)}
        />
      )}

      <div className="panel">
        <div className="hidden md:block overflow-x-auto">
          <table className="ledger">
            <thead>
              <tr>
                <th>Judul</th>
                <th className="num">Modal</th>
                <th className="num">Jual</th>
                <th className="num">Stok</th>
                <th className="num">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                <SkeletonRows cols={5} />
              ) : stockPage.slice.map(item => (
                <tr key={item.id}>
                  <td>
                    <p>{item.book_name}</p>
                    {item.stock <= 5 && <span className="pill pill-warn">Menipis</span>}
                  </td>
                  <td className="num">Rp {item.price.toLocaleString("id-ID")}</td>
                  <td className="num">
                    Rp {(item.sell_price || item.price).toLocaleString("id-ID")}
                    <div className="page-note">
                      sisa Rp {((item.sell_price || item.price) - item.price).toLocaleString("id-ID")}
                    </div>
                  </td>
                  <td className="num">{item.stock}</td>
                  <td className="num">
                    <button
                      type="button"
                      className="icon-btn"
                      aria-label={`Ubah ${item.book_name}`}
                      onClick={() => {
                        setEditingItem(item);
                        setBookName(item.book_name);
                        setPrice(item.price.toString());
                        setSellPrice((item.sell_price || item.price).toString());
                        setStockCount(item.stock.toString());
                        setIsModalVisible(true);
                      }}
                    >
                      <Edit2 aria-hidden="true" />
                    </button>
                    <button
                      type="button"
                      className="icon-btn danger"
                      aria-label={`Hapus ${item.book_name}`}
                      onClick={() => handleDelete(item.id)}
                    >
                      <Trash2 aria-hidden="true" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile List View */}
        <div className="md:hidden divide-y divide-gray-50">
          {loading ? (
            <div aria-hidden="true" style={{ display: "grid", gap: 12, padding: 16 }}>
              {Array.from({ length: 6 }, (_, index) => (
                <span key={index} className="skel" style={{ width: index % 2 ? "58%" : "82%" }} />
              ))}
            </div>
          ) : stockPage.slice.map(item => (
            <div key={item.id} className="p-4 space-y-3">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <p className="font-bold text-gray-900">{item.book_name}</p>
                  {item.stock <= 5 && <span className="pill pill-warn">Menipis</span>}
                </div>
                <span className="num">{item.stock} eksemplar</span>
              </div>
              
              <div className="flex justify-between items-center text-sm">
                <div>
                  <p className="k">Modal</p>
                  <p className="num">Rp {item.price.toLocaleString("id-ID")}</p>
                </div>
                <div className="text-right">
                  <p className="k">Jual</p>
                  <p className="num">Rp {(item.sell_price || item.price).toLocaleString("id-ID")}</p>
                </div>
              </div>

              <div className="pt-2 flex justify-between items-center">
                <p className="num">
                  Sisa Rp {((item.sell_price || item.price) - item.price).toLocaleString("id-ID")}
                </p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    className="icon-btn"
                    aria-label={`Ubah ${item.book_name}`}
                    onClick={() => {
                      setEditingItem(item);
                      setBookName(item.book_name);
                      setPrice(item.price.toString());
                      setSellPrice((item.sell_price || item.price).toString());
                      setStockCount(item.stock.toString());
                      setIsModalVisible(true);
                    }}
                  >
                    <Edit2 aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    className="icon-btn danger"
                    aria-label={`Hapus ${item.book_name}`}
                    onClick={() => handleDelete(item.id)}
                  >
                    <Trash2 aria-hidden="true" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {!loading && !loadError && (
        <Pager
          page={stockPage.page}
          pages={stockPage.pages}
          total={stockPage.total}
          from={stockPage.from}
          to={stockPage.to}
          onPage={(next) => goToListPage(stockPage.setPage, next)}
        />
      )}

      {/* Modal */}
      {isModalVisible && (
        <div className="dialog-scrim" onClick={() => setIsModalVisible(false)}>
          <div
            className="dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="stock-dialog-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-3">
              <h2 id="stock-dialog-title">{editingItem ? "Ubah stok" : "Tambah judul"}</h2>
              <button type="button" className="icon-btn" aria-label="Tutup" onClick={() => setIsModalVisible(false)}>
                <X aria-hidden="true" />
              </button>
            </div>
            <form onSubmit={handleSave} className="mt-4 space-y-4">
              <div>
                <label htmlFor="book-name">Judul buku</label>
                <input id="book-name" type="text" required value={bookName} onChange={(e) => setBookName(e.target.value)} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="buy-price">Harga modal</label>
                  <input id="buy-price" type="number" required value={price} onChange={(e) => setPrice(e.target.value)} />
                </div>
                <div>
                  <label htmlFor="sell-price">Harga jual</label>
                  <input id="sell-price" type="number" required value={sellPrice} onChange={(e) => setSellPrice(e.target.value)} />
                </div>
              </div>
              <div>
                <label htmlFor="stock-count">Jumlah stok</label>
                <input id="stock-count" type="number" required value={stockCount} onChange={(e) => setStockCount(e.target.value)} />
              </div>
              <button type="submit" className="btn btn-primary">
                {editingItem ? "Simpan perubahan" : "Tambah judul"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default StockOpnameScreen;
