import { useState, useEffect, useCallback } from "react";
import FirestoreService, {
  type OrderDocument,
  type StockOpnameDocument,
  type ExpenseDocument,
} from "../services/FirestoreService";
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Calendar,
  Download,
  RefreshCw,
  BookOpen,
} from "lucide-react";
import * as XLSX from "xlsx";

interface ProfitItem {
  id: string;
  orderId: string;
  orderName: string;
  itemName: string;
  sellPrice: number;
  buyPrice: number;
  profit: number;
  date: string;
  status: string;
}

const ProfitReportScreen = () => {
  const [loading, setLoading] = useState(true);
  const [profitItems, setProfitItems] = useState<ProfitItem[]>([]);
  const [fromDate, setFromDate] = useState<string>("");
  const [toDate, setToDate] = useState<string>("");
  const [summary, setSummary] = useState({
    totalRevenue: 0,
    totalCost: 0,
    totalProfit: 0,
    totalExpenses: 0,
    netProfit: 0,
    totalBooksSent: 0,
  });

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [ordersData, stockData, expensesData] = await Promise.all([
        FirestoreService.getCollection("orders"),
        FirestoreService.getCollection("stock_opname"),
        FirestoreService.getCollection("expenses"),
      ]);

      const orders = ordersData as OrderDocument[];
      const stocks = stockData as StockOpnameDocument[];
      const expenses = expensesData as ExpenseDocument[];

      const inRange = (dateStr?: string) => {
        if (!fromDate && !toDate) return true;
        if (!dateStr) return false;
        const d = new Date(dateStr).getTime();
        const start = fromDate ? new Date(fromDate).setHours(0, 0, 0, 0) : 0;
        const end = toDate
          ? new Date(toDate).setHours(23, 59, 59, 999)
          : Infinity;
        return d >= start && d <= end;
      };

      const items: ProfitItem[] = [];
      let totalRevenue = 0;
      let totalCost = 0;
      let totalBooksSent = 0;

      orders.forEach((order) => {
        if (order.status === "sent" && inRange(order.created_at)) {
          order.orders?.forEach((orderItem, index) => {
            const stock = stocks.find((s) => s.id === orderItem.stockId);
            const buyPrice = stock?.price || 0;
            const sellPrice = orderItem.price || 0;
            const profit = sellPrice - buyPrice;

            items.push({
              id: `${order.id}-${index}`,
              orderId: order.id,
              orderName: order.name,
              itemName: orderItem.description,
              sellPrice,
              buyPrice,
              profit,
              date: order.created_at,
              status: order.status,
            });

            totalRevenue += sellPrice;
            totalCost += buyPrice;
            totalBooksSent += 1;
          });
        }
      });

      const totalExpenses = expenses
        .filter((e) => inRange(e.created_at))
        .reduce((sum, e) => sum + (e.total || 0), 0);

      const totalProfit = totalRevenue - totalCost;
      const netProfit = totalProfit - totalExpenses;

      setProfitItems(
        items.sort(
          (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
        ),
      );
      setSummary({
        totalRevenue,
        totalCost,
        totalProfit,
        totalExpenses,
        netProfit,
        totalBooksSent,
      });
    } catch (error) {
      console.error("Error fetching profit report:", error);
    } finally {
      setLoading(false);
    }
  }, [fromDate, toDate]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const exportToExcel = () => {
    const ws = XLSX.utils.json_to_sheet(
      profitItems.map((item) => ({
        Tanggal: new Date(item.date).toLocaleDateString(),
        "Nama Customer": item.orderName,
        "Nama Buku": item.itemName,
        "Harga Jual": item.sellPrice,
        "Harga Beli": item.buyPrice,
        Keuntungan: item.profit,
      })),
    );
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Laporan Keuntungan");
    XLSX.writeFile(wb, "Laporan_Keuntungan.xlsx");
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
          Laporan Keuntungan
        </h1>
        <div className="flex w-full sm:w-auto space-x-2 sm:space-x-3">
          <button
            onClick={exportToExcel}
            className="flex-1 sm:flex-none flex items-center justify-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm sm:text-base"
          >
            <Download className="w-4 h-4 mr-2" />
            Export
          </button>
          <button
            onClick={fetchData}
            className="flex-1 sm:flex-none flex items-center justify-center px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm sm:text-base"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <div className="bg-white p-4 sm:p-6 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-2 sm:mb-4">
            <div className="p-1.5 sm:p-2 bg-blue-100 text-blue-600 rounded-lg">
              <TrendingUp className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <span className="text-[10px] sm:text-xs font-medium text-gray-400 text-right uppercase tracking-wider">
              Revenue
            </span>
          </div>
          <p className="text-lg sm:text-2xl font-bold text-gray-900">
            Rp {summary.totalRevenue.toLocaleString()}
          </p>
        </div>
        <div className="bg-white p-4 sm:p-6 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-2 sm:mb-4">
            <div className="p-1.5 sm:p-2 bg-red-100 text-red-600 rounded-lg">
              <TrendingDown className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <span className="text-[10px] sm:text-xs font-medium text-gray-400 text-right uppercase tracking-wider">
              Expenses
            </span>
          </div>
          <p className="text-lg sm:text-2xl font-bold text-gray-900">
            Rp {(summary.totalCost + summary.totalExpenses).toLocaleString()}
          </p>
        </div>
        <div className="bg-white p-4 sm:p-6 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-2 sm:mb-4">
            <div className="p-1.5 sm:p-2 bg-green-100 text-green-600 rounded-lg">
              <DollarSign className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <span className="text-[10px] sm:text-xs font-medium text-gray-400 text-right uppercase tracking-wider">
              Net Profit
            </span>
          </div>
          <p className="text-lg sm:text-2xl font-bold text-green-600">
            Rp {summary.netProfit.toLocaleString()}
          </p>
        </div>
        <div className="bg-white p-4 sm:p-6 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-2 sm:mb-4">
            <div className="p-1.5 sm:p-2 bg-purple-100 text-purple-600 rounded-lg">
              <BookOpen className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <span className="text-[10px] sm:text-xs font-medium text-gray-400 text-right uppercase tracking-wider">
              Books Sold
            </span>
          </div>
          <p className="text-lg sm:text-2xl font-bold text-gray-900">
            {summary.totalBooksSent} Pcs
          </p>
        </div>
      </div>

      <div className="bg-white p-4 sm:p-6 rounded-xl shadow-sm border border-gray-100">
        <div className="flex flex-col md:flex-row md:items-end gap-4">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Dari Tanggal
            </label>
            <div className="relative">
              <Calendar className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="date"
                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
              />
            </div>
          </div>
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Sampai Tanggal
            </label>
            <div className="relative">
              <Calendar className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="date"
                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
              />
            </div>
          </div>
          <div className="w-full md:w-auto">
            <button
              onClick={() => {
                setFromDate("");
                setToDate("");
              }}
              className="w-full px-6 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium"
            >
              Reset
            </button>
          </div>
        </div>
      </div>

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
                  <th className="px-6 py-4 text-sm font-semibold text-gray-600">
                    Tanggal
                  </th>
                  <th className="px-6 py-4 text-sm font-semibold text-gray-600">
                    Customer
                  </th>
                  <th className="px-6 py-4 text-sm font-semibold text-gray-600">
                    Buku
                  </th>
                  <th className="px-6 py-4 text-sm font-semibold text-gray-600 text-right">
                    Jual
                  </th>
                  <th className="px-6 py-4 text-sm font-semibold text-gray-600 text-right">
                    Beli
                  </th>
                  <th className="px-6 py-4 text-sm font-semibold text-gray-600 text-right">
                    Profit
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {profitItems.map((item) => (
                  <tr
                    key={item.id}
                    className="hover:bg-gray-50 transition-colors"
                  >
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {new Date(item.date).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 font-medium text-gray-900">
                      {item.orderName}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {item.itemName}
                    </td>
                    <td className="px-6 py-4 text-right text-gray-900">
                      Rp {item.sellPrice.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 text-right text-gray-500">
                      Rp {item.buyPrice.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 text-right font-bold text-green-600">
                      Rp {item.profit.toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile View */}
          <div className="md:hidden divide-y divide-gray-100">
            {profitItems.map((item) => (
              <div key={item.id} className="p-4 space-y-3">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-bold text-gray-900">{item.orderName}</p>
                    <p className="text-xs text-gray-500">
                      {new Date(item.date).toLocaleDateString()}
                    </p>
                  </div>
                  <p className="font-bold text-green-600">
                    +Rp {item.profit.toLocaleString()}
                  </p>
                </div>
                <div className="bg-gray-50 rounded-lg p-3 space-y-2">
                  <p className="text-sm font-medium text-gray-700">
                    {item.itemName}
                  </p>
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-500">
                      Harga Jual: Rp {item.sellPrice.toLocaleString()}
                    </span>
                    <span className="text-gray-500">
                      Harga Beli: Rp {item.buyPrice.toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {profitItems.length === 0 && (
            <div className="px-6 py-12 text-center text-gray-500">
              Belum ada data penjualan terkirim dalam periode ini
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ProfitReportScreen;
