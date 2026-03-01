import React, { useState, useEffect, useCallback } from 'react';
import FirestoreService, { type HistoricalDataDocument } from '../services/FirestoreService';
import { 
  Plus, 
  Trash2, 
  X,
  Save,
  Loader2,
  History,
  TrendingUp,
  TrendingDown,
  BookOpen
} from 'lucide-react';

const COLLECTION_NAME = 'sales_history';

const SalesHistoryScreen = () => {
  const [historyData, setHistoryData] = useState<HistoricalDataDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFormVisible, setIsFormVisible] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form State
  const [description, setDescription] = useState('');
  const [capital, setCapital] = useState('');
  const [revenue, setRevenue] = useState('');
  const [totalBooks, setTotalBooks] = useState('');

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const data = await FirestoreService.getCollection(COLLECTION_NAME);
      const sortedData = (data as HistoricalDataDocument[]).sort((a, b) => {
        const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
        const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
        return dateB - dateA;
      });
      setHistoryData(sortedData);
    } catch (error) {
      console.error('Error fetching history data:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const totals = historyData.reduce(
    (acc, h) => {
      acc.capital += h.capital || 0;
      acc.revenue += h.revenue || 0;
      acc.profit += (h.revenue || 0) - (h.capital || 0);
      acc.books += h.total_books || 0;
      return acc;
    },
    { capital: 0, revenue: 0, profit: 0, books: 0 }
  );

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description || !capital || !revenue || !totalBooks) return;

    setSubmitting(true);
    try {
      const capitalValue = parseInt(capital, 10);
      const revenueValue = parseInt(revenue, 10);
      const totalBooksValue = parseInt(totalBooks, 10);
      const profitValue = revenueValue - capitalValue;

      const newEntry = {
        description,
        capital: capitalValue,
        revenue: revenueValue,
        profit: profitValue,
        total_books: totalBooksValue,
      };

      await FirestoreService.addDocument(COLLECTION_NAME, newEntry);
      
      setDescription('');
      setCapital('');
      setRevenue('');
      setTotalBooks('');
      setIsFormVisible(false);
      fetchData();
    } catch (error) {
      console.error('Error saving history:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Hapus data history ini?')) {
      try {
        await FirestoreService.deleteDocument(COLLECTION_NAME, id);
        fetchData();
      } catch (error) {
        console.error('Error deleting history:', error);
      }
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">History Penjualan Lama</h1>
        <button 
          onClick={() => setIsFormVisible(true)}
          className="w-full sm:w-auto flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-md"
        >
          <Plus className="w-4 h-4 mr-2" />
          Tambah History
        </button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <div className="bg-white p-4 sm:p-6 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-2 sm:mb-4 text-blue-600">
            <TrendingUp className="w-5 h-5 sm:w-6 sm:h-6" />
            <span className="text-[10px] sm:text-xs font-medium text-gray-400 uppercase tracking-wider">Revenue</span>
          </div>
          <p className="text-lg sm:text-2xl font-bold">Rp {totals.revenue.toLocaleString()}</p>
        </div>
        <div className="bg-white p-4 sm:p-6 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-2 sm:mb-4 text-red-600">
            <TrendingDown className="w-5 h-5 sm:w-6 sm:h-6" />
            <span className="text-[10px] sm:text-xs font-medium text-gray-400 uppercase tracking-wider">Capital</span>
          </div>
          <p className="text-lg sm:text-2xl font-bold">Rp {totals.capital.toLocaleString()}</p>
        </div>
        <div className="bg-white p-4 sm:p-6 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-2 sm:mb-4 text-green-600">
            <TrendingUp className="w-5 h-5 sm:w-6 sm:h-6" />
            <span className="text-[10px] sm:text-xs font-medium text-gray-400 uppercase tracking-wider">Profit</span>
          </div>
          <p className="text-lg sm:text-2xl font-bold text-green-600">Rp {totals.profit.toLocaleString()}</p>
        </div>
        <div className="bg-white p-4 sm:p-6 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-2 sm:mb-4 text-purple-600">
            <BookOpen className="w-5 h-5 sm:w-6 sm:h-6" />
            <span className="text-[10px] sm:text-xs font-medium text-gray-400 uppercase tracking-wider">Books</span>
          </div>
          <p className="text-lg sm:text-2xl font-bold">{totals.books} Pcs</p>
        </div>
      </div>

      {isFormVisible && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 sm:p-8 w-full max-w-md shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-gray-900">Tambah History</h2>
              <button onClick={() => setIsFormVisible(false)} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-all">
                <X className="w-6 h-6" />
              </button>
            </div>
            <form onSubmit={handleSave} className="space-y-5">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Deskripsi/Bulan</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Penjualan Januari 2024"
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all bg-gray-50/50"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Modal (Capital)</label>
                  <input
                    type="number"
                    required
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all bg-gray-50/50"
                    value={capital}
                    onChange={(e) => setCapital(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Pemasukan</label>
                  <input
                    type="number"
                    required
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all bg-gray-50/50"
                    value={revenue}
                    onChange={(e) => setRevenue(e.target.value)}
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Total Buku Terjual</label>
                <input
                  type="number"
                  required
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all bg-gray-50/50"
                  value={totalBooks}
                  onChange={(e) => setTotalBooks(e.target.value)}
                />
              </div>
              <button
                type="submit"
                disabled={submitting}
                className="w-full flex items-center justify-center px-4 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all disabled:bg-blue-400 font-bold shadow-lg shadow-blue-200"
              >
                {submitting ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <Save className="w-5 h-5 mr-2" />}
                Simpan Data
              </button>
            </form>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          {/* Desktop View */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="px-6 py-4 text-sm font-semibold text-gray-600">Deskripsi</th>
                  <th className="px-6 py-4 text-sm font-semibold text-gray-600">Revenue</th>
                  <th className="px-6 py-4 text-sm font-semibold text-gray-600">Capital</th>
                  <th className="px-6 py-4 text-sm font-semibold text-gray-600">Profit</th>
                  <th className="px-6 py-4 text-sm font-semibold text-gray-600">Books</th>
                  <th className="px-6 py-4 text-sm font-semibold text-gray-600 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {historyData.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 font-medium text-gray-900">{item.description}</td>
                    <td className="px-6 py-4 font-bold text-blue-600">Rp {item.revenue.toLocaleString()}</td>
                    <td className="px-6 py-4 text-gray-500 text-sm">Rp {item.capital.toLocaleString()}</td>
                    <td className="px-6 py-4 font-bold text-green-600">Rp {item.profit.toLocaleString()}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{item.total_books} Pcs</td>
                    <td className="px-6 py-4 text-right">
                      <button onClick={() => handleDelete(item.id)} className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile View */}
          <div className="md:hidden divide-y divide-gray-100">
            {historyData.map((item) => (
              <div key={item.id} className="p-4 space-y-4">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-bold text-gray-900">{item.description}</p>
                    <p className="text-xs text-gray-500">{item.total_books} Pcs terjual</p>
                  </div>
                  <button onClick={() => handleDelete(item.id)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-blue-50 rounded-xl p-3">
                    <p className="text-[10px] text-blue-600 font-semibold uppercase mb-1">Revenue</p>
                    <p className="font-bold text-blue-700 text-sm">Rp {item.revenue.toLocaleString()}</p>
                  </div>
                  <div className="bg-green-50 rounded-xl p-3">
                    <p className="text-[10px] text-green-600 font-semibold uppercase mb-1">Profit</p>
                    <p className="font-bold text-green-700 text-sm">Rp {item.profit.toLocaleString()}</p>
                  </div>
                </div>
                <div className="flex justify-between items-center text-xs text-gray-500 px-1">
                  <span>Capital: Rp {item.capital.toLocaleString()}</span>
                </div>
              </div>
            ))}
          </div>

          {historyData.length === 0 && (
            <div className="px-6 py-12 text-center text-gray-500">
              <History className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              Belum ada data history penjualan
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default SalesHistoryScreen;
