import { BrowserRouter, Routes, Route, useLocation, Navigate } from "react-router-dom";
import { Toaster } from "./components/ui/sonner";
import "@/App.css";

// Mode layouts
import PcMode from "./modes/PcMode";
import IpadMode from "./modes/IpadMode";

// Mode detection
import { isForcedIpadPath } from "./hooks/useDeviceMode";

// Auth
import { AuthProvider } from "./contexts/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import LoginPage from "./pages/LoginPage";
import SetupPage from "./pages/SetupPage";

// Pages PC (admin — protected)
import Dashboard from "./pages/Dashboard";
import ClientsPage from "./pages/ClientsPage";
import ClientDetailPage from "./pages/ClientDetailPage";
import ReparationsPage from "./pages/ReparationsPage";
import CommandesPage from "./pages/CommandesPage";
import EncaissementPage from "./pages/EncaissementPage";
import CaissePage from "./pages/CaissePage";
import ParametresPage from "./pages/ParametresPage";

// Pages iPad / publiques (no auth)
import SuiviPage from "./pages/SuiviPage";
import SignaturePage from "./pages-ipad/SignaturePage";
import HomeIpadPage from "./pages-ipad/HomeIpadPage";
import PrivacyPolicyPage from "./pages-ipad/PrivacyPolicyPage";

function LayoutSelector({ children }) {
  const location = useLocation();
  // Le login & setup ont leur propre layout (pas de sidebar PC)
  if (location.pathname === "/login" || location.pathname === "/setup") return children;
  if (isForcedIpadPath(location.pathname) || location.pathname === "/confidentialite") {
    return <IpadMode>{children}</IpadMode>;
  }
  return <PcMode>{children}</PcMode>;
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Toaster position="top-right" richColors />
        <LayoutSelector>
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" />} />
            {/* Auth */}
            <Route path="/setup" element={<SetupPage />} />
            <Route path="/login" element={<LoginPage />} />

            {/* PC admin (protégé) */}
            <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/clients" element={<ProtectedRoute><ClientsPage /></ProtectedRoute>} />
            <Route path="/clients/:id" element={<ProtectedRoute><ClientDetailPage /></ProtectedRoute>} />
            <Route path="/reparations" element={<ProtectedRoute><ReparationsPage /></ProtectedRoute>} />
            <Route path="/commandes" element={<ProtectedRoute><CommandesPage /></ProtectedRoute>} />
            <Route path="/encaissement" element={<ProtectedRoute><EncaissementPage /></ProtectedRoute>} />
            <Route path="/caisse" element={<ProtectedRoute><CaissePage /></ProtectedRoute>} />
            <Route path="/parametres" element={<ProtectedRoute><ParametresPage /></ProtectedRoute>} />

            {/* iPad / public */}
            <Route path="/suivi/:trackingId" element={<SuiviPage />} />
            <Route path="/signer/:reparationId" element={<SignaturePage />} />
            <Route path="/ipad" element={<HomeIpadPage />} />
            <Route path="/confidentialite" element={<PrivacyPolicyPage />} />
          </Routes>
        </LayoutSelector>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
