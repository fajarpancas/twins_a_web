import React, { useState, useEffect, useMemo } from "react";
import { 
  Plus, Search, Download, 
  Trash2, Edit2, Package, 
  TrendingUp, TrendingDown,
  AlertCircle, X
} from "lucide-react";
import * as XLSX from "xlsx";
import FirestoreService, { type StockOpnameDocument } from "../services/FirestoreService";

const StockOpnameScreen: React.FC = () => {
  const [stock, setStock] = useState<StockOpnameDocument[]>([]);
  const [loading, setLoading] = useState(true);
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
    try {
      const data = await FirestoreService.getCollection("stock_opname", "book_name", "asc");
      setStock(data as StockOpnameDocument[]);
    } catch (error) {
      console.error("Error fetching stock:", error);
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

  const stats = useMemo(() => {
    const totalItems = stock.reduce((sum, item) => sum + item.stock, 0);
    const totalValue = stock.reduce((sum, item) => sum + (item.price * item.stock), 0);
    const lowStock = stock.filter(item => item.stock <= 5).length;
    return { totalItems, totalValue, lowStock };
  }, [stock]);

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-gray-900 tracking-tight">Stock Opname</h1>
          <p className="text-sm text-gray-500 mt-1">Kelola inventori buku dan harga</p>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={exportToExcel}
            className="flex-1 md:flex-none flex items-center justify-center px-4 py-2 bg-white border border-gray-200 text-gray-700 font-bold rounded-xl hover:bg-gray-50 transition-all shadow-sm"
          >
            <Download className="w-5 h-5 mr-2" /> Export
          </button>
          <button 
            onClick={() => {
              resetForm();
              setIsModalVisible(true);
            }}
            className="flex-1 md:flex-none flex items-center justify-center px-4 py-2 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-all shadow-md shadow-blue-100"
          >
            <Plus className="w-5 h-5 mr-2" /> Tambah
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="bg-white p-4 md:p-6 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-blue-50 rounded-xl text-blue-600 shrink-0">
            <Package className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs md:text-sm text-gray-500 font-medium">Total Stok</p>
            <p className="text-xl md:text-2xl font-bold text-gray-900">{stats.totalItems} <span className="text-xs font-normal text-gray-400">pcs</span></p>
          </div>
        </div>
        <div className="bg-white p-4 md:p-6 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-green-50 rounded-xl text-green-600 shrink-0">
            <TrendingUp className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs md:text-sm text-gray-500 font-medium">Nilai Inventori</p>
            <p className="text-xl md:text-2xl font-bold text-gray-900">Rp {stats.totalValue.toLocaleString()}</p>
          </div>
        </div>
        <div className="bg-white p-4 md:p-6 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-amber-50 rounded-xl text-amber-600 shrink-0">
            <AlertCircle className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs md:text-sm text-gray-500 font-medium">Stok Menipis (≤5)</p>
            <p className="text-xl md:text-2xl font-bold text-gray-900">{stats.lowStock} <span className="text-xs font-normal text-gray-400">judul</span></p>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
        <input 
          type="text" 
          placeholder="Cari judul buku..."
          className="w-full pl-12 pr-4 py-3 bg-white border border-gray-100 rounded-2xl shadow-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all text-black font-medium placeholder:text-gray-400"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {/* List/Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {/* Desktop Table View */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-gray-50 text-gray-500 text-xs font-bold uppercase tracking-wider">
                <th className="px-6 py-4">Judul Buku</th>
                <th className="px-6 py-4">Harga Modal</th>
                <th className="px-6 py-4">Harga Jual</th>
                <th className="px-6 py-4 text-center">Stok</th>
                <th className="px-6 py-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                  </td>
                </tr>
              ) : filteredStock.map(item => (
                <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4">
                    <p className="font-bold text-gray-900">{item.book_name}</p>
                    {item.stock <= 5 && (
                      <span className="inline-flex items-center gap-1 text-[10px] text-amber-600 font-bold uppercase mt-1">
                        <TrendingDown className="w-3 h-3" /> Stok Menipis
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">Rp {item.price.toLocaleString()}</td>
                  <td className="px-6 py-4">
                    <p className="text-sm font-bold text-blue-600">Rp {(item.sell_price || item.price).toLocaleString()}</p>
                    <p className="text-[10px] text-green-600 font-bold">
                      +{((item.sell_price || item.price) - item.price).toLocaleString()} profit
                    </p>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className={`px-3 py-1 rounded-full text-sm font-bold ${
                      item.stock <= 5 ? 'bg-amber-100 text-amber-700' : 'bg-blue-50 text-blue-700'
                    }`}>
                      {item.stock}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-2">
                      <button 
                        onClick={() => {
                          setEditingItem(item);
                          setBookName(item.book_name);
                          setPrice(item.price.toString());
                          setSellPrice((item.sell_price || item.price).toString());
                          setStockCount(item.stock.toString());
                          setIsModalVisible(true);
                        }}
                        className="p-2 text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                      >
                        <Edit2 className="w-5 h-5" />
                      </button>
                      <button 
                        onClick={() => handleDelete(item.id)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile List View */}
        <div className="md:hidden divide-y divide-gray-50">
          {loading ? (
            <div className="px-6 py-12 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            </div>
          ) : filteredStock.map(item => (
            <div key={item.id} className="p-4 space-y-3">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <p className="font-bold text-gray-900">{item.book_name}</p>
                  {item.stock <= 5 && (
                    <span className="inline-flex items-center gap-1 text-[10px] text-amber-600 font-bold uppercase">
                      <TrendingDown className="w-3 h-3" /> Stok Menipis
                    </span>
                  )}
                </div>
                <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                  item.stock <= 5 ? 'bg-amber-100 text-amber-700' : 'bg-blue-50 text-blue-700'
                }`}>
                  {item.stock} pcs
                </span>
              </div>
              
              <div className="flex justify-between items-center text-sm">
                <div>
                  <p className="text-xs text-gray-400 uppercase font-bold">Harga Modal</p>
                  <p className="text-gray-600">Rp {item.price.toLocaleString()}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-gray-400 uppercase font-bold">Harga Jual</p>
                  <p className="font-bold text-blue-600">Rp {(item.sell_price || item.price).toLocaleString()}</p>
                </div>
              </div>

              <div className="pt-2 flex justify-between items-center border-t border-gray-50">
                <p className="text-[10px] text-green-600 font-bold uppercase">
                  Profit: +{((item.sell_price || item.price) - item.price).toLocaleString()}
                </p>
                <div className="flex gap-2">
                  <button 
                    onClick={() => {
                      setEditingItem(item);
                      setBookName(item.book_name);
                      setPrice(item.price.toString());
                      setSellPrice((item.sell_price || item.price).toString());
                      setStockCount(item.stock.toString());
                      setIsModalVisible(true);
                    }}
                    className="p-2 text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={() => handleDelete(item.id)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Modal */}
      {isModalVisible && (
        <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm transition-opacity">
          <div className="bg-white rounded-t-[2.5rem] sm:rounded-2xl w-full max-w-md shadow-2xl flex flex-col max-h-[92vh] sm:max-h-[90vh] animate-in slide-in-from-bottom duration-300">
            <div className="p-4 sm:p-6 border-b border-gray-100 flex justify-between items-center shrink-0">
              <div className="flex-1 text-center sm:text-left">
                <div className="w-12 h-1.5 bg-gray-200 rounded-full mx-auto mb-4 sm:hidden" />
                <h2 className="text-xl font-bold text-gray-800">
                  {editingItem ? "Edit Stok" : "Tambah Stok Baru"}
                </h2>
              </div>
              <button 
                onClick={() => setIsModalVisible(false)}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors absolute right-4 top-4 sm:static"
              >
                <X className="w-6 h-6 text-gray-500" />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-4 sm:p-6 space-y-5 overflow-y-auto">
              <div className="space-y-1.5">
                <label className="block text-xs font-black text-gray-400 uppercase tracking-widest ml-1">Judul Buku</label>
                <input
                  type="text"
                  required
                  value={bookName}
                  onChange={(e) => setBookName(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none transition-all font-bold text-gray-700"
                  placeholder="Contoh: Belajar React Web"
                />
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="block text-xs font-black text-gray-400 uppercase tracking-widest ml-1">Harga Modal</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-xs font-bold">Rp</span>
                    <input
                      type="number"
                      required
                      value={price}
                      onChange={(e) => setPrice(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none transition-all font-black text-gray-700"
                      placeholder="0"
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="block text-xs font-black text-gray-400 uppercase tracking-widest ml-1">Harga Jual</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-xs font-bold">Rp</span>
                    <input
                      type="number"
                      required
                      value={sellPrice}
                      onChange={(e) => setSellPrice(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none transition-all font-black text-blue-600"
                      placeholder="0"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-black text-gray-400 uppercase tracking-widest ml-1">Jumlah Stok</label>
                <input
                  type="number"
                  required
                  value={stockCount}
                  onChange={(e) => setStockCount(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none transition-all font-black text-gray-700"
                  placeholder="0"
                />
              </div>
              
              <div className="pt-4 shrink-0">
                <button
                  type="submit"
                  className="w-full py-4 bg-blue-600 text-white font-black uppercase tracking-widest rounded-2xl hover:bg-blue-700 transition-all shadow-xl shadow-blue-100 active:scale-[0.98]"
                >
                  {editingItem ? "Simpan Perubahan" : "Tambah Stok"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default StockOpnameScreen;
