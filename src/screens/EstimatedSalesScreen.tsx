import { useState, useEffect, useCallback } from 'react';
import FirestoreService, { type StockOpnameDocument } from '../services/FirestoreService';
import { 
  TrendingUp, 
  Calendar,
  RefreshCw,
  BookOpen,
  DollarSign,
  AlertCircle
} from 'lucide-react';

const COLLECTION_NAME = 'stock_opname';

const EstimatedSalesScreen = () => {
  const [items, setItems] = useState<StockOpnameDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [fromDate, setFromDate] = useState<string>('');
  const [toDate, setToDate] = useState<string>('');

  const fetchItems = useCallback(async () => {
    try {
      setLoading(true);
      const data = await FirestoreService.getCollection(COLLECTION_NAME);
      const sorted = (data as StockOpnameDocument[]).sort((a, b) => {
        const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
        const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
        return dateB - dateA;
      });
      setItems(sorted);
    } catch (error) {
      console.error('Error fetching stock for estimation:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  const startOfDay = (d: string) => {
    const x = new Date(d);
    x.setHours(0, 0, 0, 0);
    return x.getTime();
  };

  const endOfDay = (d: string) => {
    const x = new Date(d);
    x.setHours(23, 59, 59, 999);
    return x.getTime();
  };

  const filteredItems = items.filter(item => {
    if (!item.created_at) return true;
    const created = new Date(item.created_at).getTime();
    if (fromDate && created < startOfDay(fromDate)) return false;
    if (toDate && created > endOfDay(toDate)) return false;
    return true;
  });

  const estimableItems = filteredItems.filter(it => (it.sell_price ?? 0) > 0);
  
  const stats = estimableItems.reduce((acc, it) => {
    const sell = it.sell_price ?? 0;
    const buy = it.price ?? 0;
    const stock = it.stock || 0;
    const perUnit = sell - buy;
    
    acc.totalBooks += stock;
    acc.totalRevenue += sell * stock;
    acc.totalProfit += perUnit * stock;
    return acc;
  }, { totalBooks: 0, totalRevenue: 0, totalProfit: 0 });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Estimasi Penjualan</h1>
          <p className="text-gray-500 mt-1 text-xs sm:text-sm italic font-medium">*Berdasarkan stok tersedia saat ini</p>
        </div>
        <button 
          onClick={fetchItems}
          className="w-full sm:w-auto flex items-center justify-center px-4 py-2 bg-white text-gray-700 rounded-xl hover:bg-gray-50 transition-all border border-gray-200 shadow-sm font-medium"
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh Data
        </button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        <div className="bg-white p-4 sm:p-6 rounded-2xl shadow-sm border border-gray-100 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
            <TrendingUp className="w-12 h-12 text-blue-600" />
          </div>
          <div className="flex items-center justify-between mb-2 sm:mb-4 text-blue-600">
            <TrendingUp className="w-5 h-5 sm:w-6 sm:h-6" />
            <span className="text-[10px] sm:text-xs font-semibold text-gray-400 uppercase tracking-widest">Est. Revenue</span>
          </div>
          <p className="text-lg sm:text-2xl font-black text-gray-900">Rp {stats.totalRevenue.toLocaleString()}</p>
        </div>
        <div className="bg-white p-4 sm:p-6 rounded-2xl shadow-sm border border-gray-100 border-l-4 border-l-green-500 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
            <DollarSign className="w-12 h-12 text-green-600" />
          </div>
          <div className="flex items-center justify-between mb-2 sm:mb-4 text-green-600">
            <DollarSign className="w-5 h-5 sm:w-6 sm:h-6" />
            <span className="text-[10px] sm:text-xs font-semibold text-gray-400 uppercase tracking-widest">Est. Profit</span>
          </div>
          <p className="text-lg sm:text-2xl font-black text-green-600">Rp {stats.totalProfit.toLocaleString()}</p>
        </div>
        <div className="bg-white p-4 sm:p-6 rounded-2xl shadow-sm border border-gray-100 relative overflow-hidden group col-span-2 lg:col-span-1">
          <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
            <BookOpen className="w-12 h-12 text-purple-600" />
          </div>
          <div className="flex items-center justify-between mb-2 sm:mb-4 text-purple-600">
            <BookOpen className="w-5 h-5 sm:w-6 sm:h-6" />
            <span className="text-[10px] sm:text-xs font-semibold text-gray-400 uppercase tracking-widest">Available Books</span>
          </div>
          <p className="text-lg sm:text-2xl font-black text-gray-900">{stats.totalBooks} Pcs</p>
        </div>
      </div>

      <div className="bg-white p-4 sm:p-6 rounded-2xl shadow-sm border border-gray-100">
        <div className="flex flex-col md:flex-row md:items-end gap-4">
          <div className="flex-1">
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Filter Stok Masuk (Dari)</label>
            <div className="relative">
              <Calendar className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input 
                type="date" 
                className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all bg-gray-50/50"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
              />
            </div>
          </div>
          <div className="flex-1">
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Sampai</label>
            <div className="relative">
              <Calendar className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input 
                type="date" 
                className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all bg-gray-50/50"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
              />
            </div>
          </div>
          <div className="w-full md:w-auto">
            <button 
              onClick={() => { setFromDate(''); setToDate(''); }}
              className="w-full px-8 py-2.5 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-all font-bold text-sm"
            >
              Reset Filter
            </button>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          {/* Desktop View */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50/50 border-b border-gray-100">
                  <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Nama Buku</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-right">Stok</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-right">H. Jual</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-right">H. Beli</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-right">Est. Profit/Unit</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-right">Est. Total Profit</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {estimableItems.map((item) => {
                  const sell = item.sell_price ?? 0;
                  const buy = item.price ?? 0;
                  const stock = item.stock || 0;
                  const perUnit = sell - buy;
                  const total = perUnit * stock;

                  return (
                    <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 font-bold text-gray-900">{item.book_name}</td>
                      <td className="px-6 py-4 text-right font-medium">{stock}</td>
                      <td className="px-6 py-4 text-right text-gray-900 font-semibold">Rp {sell.toLocaleString()}</td>
                      <td className="px-6 py-4 text-right text-gray-400 text-sm">Rp {buy.toLocaleString()}</td>
                      <td className="px-6 py-4 text-right text-green-600 font-bold">Rp {perUnit.toLocaleString()}</td>
                      <td className="px-6 py-4 text-right font-black text-green-700 bg-green-50/30">Rp {total.toLocaleString()}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile View */}
          <div className="md:hidden divide-y divide-gray-100">
            {estimableItems.map((item) => {
              const sell = item.sell_price ?? 0;
              const buy = item.price ?? 0;
              const stock = item.stock || 0;
              const perUnit = sell - buy;
              const total = perUnit * stock;

              return (
                <div key={item.id} className="p-4 space-y-4">
                  <div className="flex justify-between items-start">
                    <p className="font-black text-gray-900 flex-1">{item.book_name}</p>
                    <span className="ml-3 px-2 py-1 bg-gray-100 text-gray-600 rounded text-[10px] font-bold uppercase tracking-tighter">
                      {stock} PCS STOK
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-gray-50 rounded-xl p-3 border border-gray-100">
                      <p className="text-[10px] text-gray-400 font-bold uppercase mb-1">Harga Jual</p>
                      <p className="font-bold text-gray-900 text-sm">Rp {sell.toLocaleString()}</p>
                    </div>
                    <div className="bg-green-50 rounded-xl p-3 border border-green-100">
                      <p className="text-[10px] text-green-600 font-bold uppercase mb-1">Est. Profit</p>
                      <p className="font-black text-green-700 text-sm">Rp {total.toLocaleString()}</p>
                    </div>
                  </div>
                  <div className="flex justify-between items-center text-[10px] text-gray-400 px-1 font-medium">
                    <span>H. Beli: Rp {buy.toLocaleString()}</span>
                    <span>Profit/Unit: Rp {perUnit.toLocaleString()}</span>
                  </div>
                </div>
              );
            })}
          </div>

          {estimableItems.length === 0 && (
            <div className="px-6 py-12 text-center text-gray-500">
              <AlertCircle className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              Tidak ada stok yang tersedia untuk diestimasi
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default EstimatedSalesScreen;
