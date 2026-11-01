import { useEffect, useState, type ReactNode } from "react";
import Sidebar from "./Sidebar";

const Layout = ({ children }: { children: ReactNode }) => {
  const [open, setOpen] = useState(false);
  const today = new Date().toLocaleDateString("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div className="app-shell">
      <a className="skip" href="#work">
        Lewati ke isi
      </a>
      <button
        type="button"
        className={`scrim${open ? " open" : ""}`}
        aria-label="Tutup menu"
        onClick={() => setOpen(false)}
      />
      <Sidebar open={open} onNavigate={() => setOpen(false)} />
      <div className="app-column">
        <header className="app-topbar">
          <button
            type="button"
            className="nav-toggle"
            aria-expanded={open}
            aria-controls="side-nav"
            onClick={() => setOpen((value) => !value)}
          >
            {open ? "Tutup" : "Menu"}
          </button>
          <p className="topbar-scope">Kasir buku</p>
          <time className="topbar-date" dateTime={new Date().toISOString()}>
            {today}
          </time>
        </header>
        <main id="work" className="app-sheet">
          {children}
        </main>
      </div>
    </div>
  );
};

export default Layout;
