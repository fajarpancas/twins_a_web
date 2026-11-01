import { useState, useEffect, useCallback } from "react";
import FirestoreService, {
  type OrderDocument,
  type StockOpnameDocument,
  type ExpenseDocument,
} from "../services/FirestoreService";
import { Download, RefreshCw } from "lucide-react";
import * as XLSX from "xlsx";
import { KpiSkeleton, Pager, TableSkeleton, goToListPage, usePage } from "../components/ListPage.tsx";

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
  const [loadError, setLoadError] = useState<string | null>(null);
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
      setLoadError(null);
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
      setLoadError("Laporan tidak terbaca.");
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

  const profitPage = usePage(profitItems, `${fromDate}|${toDate}`);

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1 className="page-title">Laba</h1>
          <p className="page-note">
            Sisa setelah modal buku dan pengeluaran, hanya dari pesanan terkirim.
          </p>
        </div>
        <div className="actions">
          <button type="button" onClick={exportToExcel} className="btn">
            <Download aria-hidden="true" /> Export
          </button>
          <button type="button" onClick={fetchData} className="btn">
            <RefreshCw aria-hidden="true" /> Muat lagi
          </button>
        </div>
      </div>

      {loading ? (
        <KpiSkeleton cells={4} label="Memuat laba" quiet />
      ) : !loadError && (
        <div className="kpi cols-4" style={{ gridTemplateColumns: "repeat(4, minmax(0, 1fr))" }}>
          <div>
            <p className="k">Omzet terkirim</p>
            <p className="v num">Rp {summary.totalRevenue.toLocaleString("id-ID")}</p>
          </div>
          <div>
            <p className="k">Modal dan pengeluaran</p>
            <p className="v num">Rp {(summary.totalCost + summary.totalExpenses).toLocaleString("id-ID")}</p>
          </div>
          <div>
            <p className="k">Sisa</p>
            <p className={`v lead num${summary.netProfit < 0 ? " bad" : ""}`}>
              Rp {summary.netProfit.toLocaleString("id-ID")}
            </p>
          </div>
          <div>
            <p className="k">Buku terkirim</p>
            <p className="v num">{summary.totalBooksSent}</p>
          </div>
        </div>
      )}

      <div className="date-row">
        <label>
          Dari tanggal
          <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
        </label>
        <label>
          Sampai tanggal
          <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
        </label>
        <button
          type="button"
          className="btn"
          onClick={() => {
            setFromDate("");
            setToDate("");
          }}
        >
          Reset
        </button>
      </div>

      {loadError && (
        <div className="state state-error" role="alert">
          <h2>{loadError}</h2>
          <button type="button" className="btn" style={{ marginTop: 12 }} onClick={fetchData}>
            Muat lagi
          </button>
        </div>
      )}

      {loading ? (
        <TableSkeleton cols={6} label="Memuat laba. Pesanan terkirim sedang dijumlah." />
      ) : profitItems.length === 0 ? (
        <div className="state">
          <h2>Belum ada pesanan terkirim</h2>
          <p>Sisa dihitung setelah status berubah jadi terkirim.</p>
        </div>
      ) : (
        <>
        <Pager
          id="list-top"
          page={profitPage.page}
          pages={profitPage.pages}
          total={profitPage.total}
          from={profitPage.from}
          to={profitPage.to}
          onPage={(next) => goToListPage(profitPage.setPage, next)}
        />
        <div className="panel" style={{ overflowX: "auto" }}>
          <table className="ledger">
            <thead>
              <tr>
                <th>Tanggal</th>
                <th>Pemesan</th>
                <th>Buku</th>
                <th className="num">Jual</th>
                <th className="num">Beli</th>
                <th className="num">Sisa</th>
              </tr>
            </thead>
            <tbody>
              {profitPage.slice.map((item) => (
                <tr key={item.id}>
                  <td>{new Date(item.date).toLocaleDateString("id-ID")}</td>
                  <td>{item.orderName}</td>
                  <td>{item.itemName}</td>
                  <td className="num">Rp {item.sellPrice.toLocaleString("id-ID")}</td>
                  <td className="num">Rp {item.buyPrice.toLocaleString("id-ID")}</td>
                  <td className={`num${item.profit < 0 ? " neg" : ""}`}>
                    Rp {item.profit.toLocaleString("id-ID")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {profitPage.pages > 1 && (
          <Pager
            page={profitPage.page}
            pages={profitPage.pages}
            total={profitPage.total}
            from={profitPage.from}
            to={profitPage.to}
            onPage={(next) => goToListPage(profitPage.setPage, next)}
          />
        )}
        </>
      )}
    </div>
  );
};

export default ProfitReportScreen;
