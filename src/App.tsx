import { BrowserRouter, Routes, Route } from "react-router-dom";
import Layout from "./components/Layout";
import ItemListScreen from "./screens/ItemListScreen";
import StockOpnameScreen from "./screens/StockOpnameScreen";
import ProfitReportScreen from "./screens/ProfitReportScreen";
import ExpensesScreen from "./screens/ExpensesScreen";
import SalesHistoryScreen from "./screens/SalesHistoryScreen";
import EstimatedSalesScreen from "./screens/EstimatedSalesScreen";
import AnalysisScreen from "./screens/AnalysisScreen";

function App() {
  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<ItemListScreen />} />
          <Route path="/stock" element={<StockOpnameScreen />} />
          <Route path="/profit" element={<ProfitReportScreen />} />
          <Route path="/expenses" element={<ExpensesScreen />} />
          <Route path="/history" element={<SalesHistoryScreen />} />
          <Route path="/estimated" element={<EstimatedSalesScreen />} />
          <Route path="/analysis" element={<AnalysisScreen />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
}

export default App;
