import { useState, useEffect, useCallback } from 'react';
import FirestoreService, { type StockOpnameDocument } from '../services/FirestoreService';
import { RefreshCw } from "lucide-react";
import { KpiSkeleton, Pager, TableSkeleton, goToListPage, usePage } from "../components/ListPage.tsx";

const COLLECTION_NAME = 'stock_opname';

const EstimatedSalesScreen = () => {
  const [items, setItems] = useState<StockOpnameDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [fromDate, setFromDate] = useState<string>('');
  const [toDate, setToDate] = useState<string>('');

  const fetchItems = useCallback(async () => {
    try {
      setLoading(true);
      setLoadError(null);
      const data = await FirestoreService.getCollection(COLLECTION_NAME);
      const sorted = (data as StockOpnameDocument[]).sort((a, b) => {
        const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
        const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
        return dateB - dateA;
      });
      setItems(sorted);
    } catch (error) {
      console.error('Error fetching stock for estimation:', error);
      setLoadError("Estimasi gagal dimuat.");
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

  const estimatePage = usePage(estimableItems, `${fromDate}|${toDate}`);

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1 className="page-title">Estimasi</h1>
          <p className="page-note">Kalau stok yang punya harga jual laku semuanya.</p>
        </div>
        <button type="button" className="btn" onClick={fetchItems}>
          <RefreshCw aria-hidden="true" /> Muat lagi
        </button>
      </div>

      {loading ? (
        <KpiSkeleton cells={3} label="Memuat estimasi" quiet />
      ) : !loadError && (
        <div className="kpi cols-3" style={{ gridTemplateColumns: "repeat(3, minmax(0, 1fr))" }}>
          <div>
            <p className="k">Omzet kalau laku</p>
            <p className="v num">Rp {stats.totalRevenue.toLocaleString("id-ID")}</p>
          </div>
          <div>
            <p className="k">Laba kotor</p>
            <p className={`v lead num${stats.totalProfit < 0 ? " bad" : ""}`}>
              Rp {stats.totalProfit.toLocaleString("id-ID")}
            </p>
          </div>
          <div>
            <p className="k">Eksemplar</p>
            <p className="v num">{stats.totalBooks}</p>
          </div>
        </div>
      )}

      <div className="date-row">
        <label>
          Stok masuk dari
          <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
        </label>
        <label>
          Sampai
          <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
        </label>
        <button type="button" className="btn" onClick={() => { setFromDate(""); setToDate(""); }}>
          Reset
        </button>
      </div>

      {loadError && (
        <div className="state state-error" role="alert">
          <h2>{loadError}</h2>
          <button type="button" className="btn" style={{ marginTop: 12 }} onClick={fetchItems}>
            Muat lagi
          </button>
        </div>
      )}

      {loading ? (
        <TableSkeleton cols={6} label="Memuat estimasi. Stok berharga sedang dijumlah." />
      ) : estimableItems.length === 0 ? (
        <div className="state">
          <h2>Tidak ada yang bisa diestimasi</h2>
          <p>Judul tanpa harga jual tidak masuk hitungan ini.</p>
        </div>
      ) : (
        <>
        <Pager
          id="list-top"
          page={estimatePage.page}
          pages={estimatePage.pages}
          total={estimatePage.total}
          from={estimatePage.from}
          to={estimatePage.to}
          onPage={(next) => goToListPage(estimatePage.setPage, next)}
        />
        <div className="panel" style={{ overflowX: "auto" }}>
          <table className="ledger">
            <thead>
              <tr>
                <th>Judul</th>
                <th className="num">Stok</th>
                <th className="num">Jual</th>
                <th className="num">Beli</th>
                <th className="num">Laba per buku</th>
                <th className="num">Laba total</th>
              </tr>
            </thead>
            <tbody>
              {estimatePage.slice.map((item) => {
                const sell = item.sell_price ?? 0;
                const buy = item.price ?? 0;
                const stock = item.stock || 0;
                const perUnit = sell - buy;
                const total = perUnit * stock;

                return (
                  <tr key={item.id}>
                    <td>{item.book_name}</td>
                    <td className="num">{stock}</td>
                    <td className="num">Rp {sell.toLocaleString("id-ID")}</td>
                    <td className="num">Rp {buy.toLocaleString("id-ID")}</td>
                    <td className={`num${perUnit < 0 ? " neg" : ""}`}>Rp {perUnit.toLocaleString("id-ID")}</td>
                    <td className={`num${total < 0 ? " neg" : ""}`}>Rp {total.toLocaleString("id-ID")}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {estimatePage.pages > 1 && (
          <Pager
            page={estimatePage.page}
            pages={estimatePage.pages}
            total={estimatePage.total}
            from={estimatePage.from}
            to={estimatePage.to}
            onPage={(next) => goToListPage(estimatePage.setPage, next)}
          />
        )}
        </>
      )}
    </div>
  );
};

export default EstimatedSalesScreen;
