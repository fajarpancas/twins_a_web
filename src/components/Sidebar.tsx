import { NavLink } from "react-router-dom";
import {
  LayoutList,
  ClipboardList,
  TrendingUp,
  Wallet,
  History,
  BarChart3,
  ChartColumn,
} from "lucide-react";

const menuItems = [
  { name: "Pesanan", path: "/", icon: LayoutList },
  { name: "Stok", path: "/stock", icon: ClipboardList },
  { name: "Laba", path: "/profit", icon: TrendingUp },
  { name: "Pengeluaran", path: "/expenses", icon: Wallet },
  { name: "Riwayat", path: "/history", icon: History },
  { name: "Estimasi", path: "/estimated", icon: BarChart3 },
  { name: "Analisis", path: "/analysis", icon: ChartColumn },
];

const Sidebar = ({
  open,
  onNavigate,
}: {
  open: boolean;
  onNavigate: () => void;
}) => {
  return (
    <aside id="side-nav" className={`side${open ? " open" : ""}`}>
      <div className="brand">
        <svg width="28" height="28" viewBox="0 0 28 28" aria-hidden="true">
          <rect x="4" y="5" width="7" height="18" rx="1" fill="#1b6c80" />
          <rect x="13" y="8" width="7" height="15" rx="1" fill="#131416" />
          <rect x="22" y="11" width="3" height="12" fill="#8aa8ae" />
        </svg>
        <div>
          <div className="brand-name">TwinsA</div>
          <div className="brand-scope">Toko buku</div>
        </div>
      </div>
      <nav aria-label="Bagian kasir">
        {menuItems.map((item) => (
          <NavLink key={item.path} to={item.path} end={item.path === "/"} onClick={onNavigate}>
            <item.icon aria-hidden="true" />
            {item.name}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
};

export default Sidebar;
