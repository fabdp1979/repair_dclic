import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { Toaster } from "./components/ui/sonner";
import "@/App.css";

// Mode layouts
import PcMode from "./modes/PcMode";
import IpadMode from "./modes/IpadMode";

// Mode detection
import { useDeviceMode, isForcedIpadPath } from "./hooks/useDeviceMode";

// Pages PC
import Dashboard from "./pages/Dashboard";
import ClientsPage from "./pages/ClientsPage";
import ClientDetailPage from "./pages/ClientDetailPage";
import ReparationsPage from "./pages/ReparationsPage";
import CommandesPage from "./pages/CommandesPage";
import EncaissementPage from "./pages/EncaissementPage";
import CaissePage from "./pages/CaissePage";

// Pages iPad / publiques
import SuiviPage from "./pages/SuiviPage";
import SignaturePage from "./pages-ipad/SignaturePage";
import HomeIpadPage from "./pages-ipad/HomeIpadPage";

function LayoutSelector({ children }) {
  const location = useLocation();
  const { mode } = useDeviceMode();

  // iPad FORCÉ sur les routes publiques
  if (isForcedIpadPath(location.pathname) || mode === "ipad") {
    return <IpadMode>{children}</IpadMode>;
  }
  return <PcMode>{children}</PcMode>;
}

function App() {
  return (
    <BrowserRouter>
      <Toaster position="top-right" richColors />
      <LayoutSelector>
        <Routes>
          {/* PC */}
          <Route path="/" element={<Dashboard />} />
          <Route path="/clients" element={<ClientsPage />} />
          <Route path="/clients/:id" element={<ClientDetailPage />} />
          <Route path="/reparations" element={<ReparationsPage />} />
          <Route path="/commandes" element={<CommandesPage />} />
          <Route path="/encaissement" element={<EncaissementPage />} />
          <Route path="/caisse" element={<CaissePage />} />

          {/* iPad / public */}
          <Route path="/suivi/:trackingId" element={<SuiviPage />} />
          <Route path="/signer/:reparationId" element={<SignaturePage />} />
          <Route path="/ipad" element={<HomeIpadPage />} />
        </Routes>
      </LayoutSelector>
    </BrowserRouter>
  );
}

export default App;
