import { BrowserRouter, Routes, Route, NavLink, useLocation } from "react-router-dom";
import { Toaster } from "./components/ui/sonner";
import { 
  LayoutDashboard, 
  Users, 
  Wrench, 
  BookOpen,
  ShoppingCart,
  CreditCard,
  Menu,
  X,
  QrCode
} from "lucide-react";
import { useState } from "react";
import "@/App.css";

// Pages
import Dashboard from "./pages/Dashboard";
import ClientsPage from "./pages/ClientsPage";
import ClientDetailPage from "./pages/ClientDetailPage";
import ReparationsPage from "./pages/ReparationsPage";
import CommandesPage from "./pages/CommandesPage";
import EncaissementPage from "./pages/EncaissementPage";
import CaissePage from "./pages/CaissePage";
import SuiviPage from "./pages/SuiviPage";
import SignaturePage from "./pages/SignaturePage";

const navigation = [
  { name: "Tableau de bord", href: "/", icon: LayoutDashboard },
  { name: "Clients", href: "/clients", icon: Users },
  { name: "Réparations", href: "/reparations", icon: Wrench },
  { name: "Commandes client", href: "/commandes", icon: ShoppingCart },
  { name: "Encaissement", href: "/encaissement", icon: CreditCard },
  { name: "Journal de caisse", href: "/caisse", icon: BookOpen },
];

function Sidebar({ isOpen, setIsOpen }) {
  const location = useLocation();

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside 
        className={`
          fixed top-0 left-0 z-50 h-full w-64 bg-[#0F172A] transform transition-transform duration-200 ease-in-out
          md:translate-x-0 md:static md:z-auto
          ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        {/* Logo */}
        <div className="flex items-center justify-between p-4 border-b border-slate-700">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-[#84CC16] rounded-lg flex items-center justify-center">
              <Wrench className="w-5 h-5 text-white" />
            </div>
            <span className="font-outfit font-semibold text-white text-lg">DCLIC</span>
          </div>
          <button 
            className="md:hidden text-slate-400 hover:text-white"
            onClick={() => setIsOpen(false)}
            data-testid="close-sidebar-btn"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="p-2 space-y-1 pb-24">
          {navigation.map((item) => {
            const isActive = location.pathname === item.href || 
              (item.href !== "/" && location.pathname.startsWith(item.href));
            
            return (
              <NavLink
                key={item.name}
                to={item.href}
                onClick={() => setIsOpen(false)}
                className={`
                  sidebar-link
                  ${isActive ? 'active' : ''}
                `}
                data-testid={`nav-${item.href.replace('/', '') || 'dashboard'}`}
              >
                <item.icon className="w-5 h-5 mr-3" />
                <span className="font-medium text-sm">{item.name}</span>
              </NavLink>
            );
          })}
        </nav>

        {/* Company info */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-slate-700 pointer-events-none">
          <p className="text-xs text-slate-500">DCLIC INFORMATIQUE</p>
          <p className="text-xs text-slate-600">05.55.73.57.20</p>
        </div>
      </aside>
    </>
  );
}

function MobileNav() {
  const location = useLocation();
  
  // Show only 5 most important items on mobile
  const mobileNav = navigation.slice(0, 5);

  return (
    <nav className="mobile-nav md:hidden">
      {mobileNav.map((item) => {
        const isActive = location.pathname === item.href || 
          (item.href !== "/" && location.pathname.startsWith(item.href));
        
        return (
          <NavLink
            key={item.name}
            to={item.href}
            className={`mobile-nav-link ${isActive ? 'active' : ''}`}
            data-testid={`mobile-nav-${item.href.replace('/', '') || 'dashboard'}`}
          >
            <item.icon />
            <span>{item.name.split(' ')[0]}</span>
          </NavLink>
        );
      })}
    </nav>
  );
}

function Layout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  
  // Don't show layout for public tracking or signature page
  if (location.pathname.startsWith('/suivi/') || location.pathname.startsWith('/signer/')) {
    return children;
  }

  return (
    <div className="flex min-h-screen bg-[#F8FAFC]">
      <Sidebar isOpen={sidebarOpen} setIsOpen={setSidebarOpen} />
      
      <main className="flex-1 pb-20 md:pb-0">
        {/* Mobile header */}
        <header className="md:hidden flex items-center justify-between p-4 bg-white border-b border-slate-200">
          <button 
            onClick={() => setSidebarOpen(true)}
            className="p-2 hover:bg-slate-100 rounded-lg"
            data-testid="open-sidebar-btn"
          >
            <Menu className="w-6 h-6 text-slate-700" />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-[#84CC16] rounded-lg flex items-center justify-center">
              <Wrench className="w-4 h-4 text-white" />
            </div>
            <span className="font-outfit font-semibold text-slate-900">DCLIC</span>
          </div>
          <div className="w-10" />
        </header>

        <div className="p-4 md:p-6 lg:p-8">
          {children}
        </div>
      </main>

      <MobileNav />
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <Toaster position="top-right" richColors />
      <Layout>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/clients" element={<ClientsPage />} />
          <Route path="/clients/:id" element={<ClientDetailPage />} />
          <Route path="/reparations" element={<ReparationsPage />} />
          <Route path="/commandes" element={<CommandesPage />} />
          <Route path="/encaissement" element={<EncaissementPage />} />
          <Route path="/caisse" element={<CaissePage />} />
          <Route path="/suivi/:trackingId" element={<SuiviPage />} />
          <Route path="/signer/:reparationId" element={<SignaturePage />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
}

export default App;
