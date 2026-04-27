import { useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import {
  LayoutDashboard, Users, Wrench, BookOpen, ShoppingCart, CreditCard, Menu, X, LogOut, User, KeyRound,
} from "lucide-react";
import ModeSwitcher from "../components/ModeSwitcher";
import ChangePasswordDialog from "../components/ChangePasswordDialog";
import { useAuth } from "../contexts/AuthContext";
import { detectAuto } from "../hooks/useDeviceMode";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
  DropdownMenuLabel, DropdownMenuSeparator,
} from "../components/ui/dropdown-menu";
import { Button } from "../components/ui/button";

const ALL_NAV = [
  { name: "Tableau de bord", href: "/", icon: LayoutDashboard, ipad: false, ipadName: null },
  { name: "Clients", href: "/clients", icon: Users, ipad: false, ipadName: null },
  { name: "Réparations", href: "/reparations", icon: Wrench, ipad: true, ipadName: "Signature client" },
  { name: "Commandes client", href: "/commandes", icon: ShoppingCart, ipad: false, ipadName: null },
  { name: "Encaissement", href: "/encaissement", icon: CreditCard, ipad: false, ipadName: null },
  { name: "Journal de caisse", href: "/caisse", icon: BookOpen, ipad: false, ipadName: null },
];

function getNavigation(isIpad) {
  return isIpad
    ? ALL_NAV.filter((n) => n.ipad).map((n) => ({ ...n, name: n.ipadName || n.name }))
    : ALL_NAV;
}

function Sidebar({ isOpen, setIsOpen, navigation }) {
  const location = useLocation();
  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}
      <aside
        className={`fixed top-0 left-0 z-50 h-full w-64 bg-[#0F172A] transform transition-transform duration-200 ease-in-out md:translate-x-0 md:static md:z-auto ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
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
        <nav className="p-2 space-y-1 pb-24">
          {navigation.map((item) => {
            const isActive =
              location.pathname === item.href ||
              (item.href !== "/" && location.pathname.startsWith(item.href));
            return (
              <NavLink
                key={item.name}
                to={item.href}
                onClick={() => setIsOpen(false)}
                className={`sidebar-link ${isActive ? "active" : ""}`}
                data-testid={`nav-${item.href.replace("/", "") || "dashboard"}`}
              >
                <item.icon className="w-5 h-5 mr-3" />
                <span className="font-medium text-sm">{item.name}</span>
              </NavLink>
            );
          })}
        </nav>
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-slate-700 pointer-events-none">
          <p className="text-xs text-slate-500">DCLIC INFORMATIQUE</p>
          <p className="text-xs text-slate-600">05.55.73.57.20</p>
        </div>
      </aside>
    </>
  );
}

function MobileNav({ navigation }) {
  const location = useLocation();
  const mobileNav = navigation.slice(0, 5);
  return (
    <nav className="mobile-nav md:hidden">
      {mobileNav.map((item) => {
        const isActive =
          location.pathname === item.href ||
          (item.href !== "/" && location.pathname.startsWith(item.href));
        return (
          <NavLink
            key={item.name}
            to={item.href}
            className={`mobile-nav-link ${isActive ? "active" : ""}`}
            data-testid={`mobile-nav-${item.href.replace("/", "") || "dashboard"}`}
          >
            <item.icon />
            <span>{item.name.split(" ")[0]}</span>
          </NavLink>
        );
      })}
    </nav>
  );
}

export default function PcMode({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [pwdOpen, setPwdOpen] = useState(false);
  const { user, logout } = useAuth();
  const isIpad = detectAuto() === "ipad";
  const navigation = getNavigation(isIpad);

  return (
    <div className="flex min-h-screen bg-[#F8FAFC]">
      <Sidebar isOpen={sidebarOpen} setIsOpen={setSidebarOpen} navigation={navigation} />

      <main className="flex-1 pb-20 md:pb-0">
        {/* Header */}
        <header className="flex items-center justify-between p-4 bg-white border-b border-slate-200 md:justify-end">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 hover:bg-slate-100 rounded-lg md:hidden"
            data-testid="open-sidebar-btn"
          >
            <Menu className="w-6 h-6 text-slate-700" />
          </button>
          <div className="flex items-center gap-2 md:hidden">
            <div className="w-7 h-7 bg-[#84CC16] rounded-lg flex items-center justify-center">
              <Wrench className="w-4 h-4 text-white" />
            </div>
            <span className="font-outfit font-semibold text-slate-900">DCLIC</span>
          </div>
          <div className="flex items-center gap-2">
            <ModeSwitcher />
            {user && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="gap-2" data-testid="user-menu-btn">
                    <User className="w-4 h-4" />
                    <span className="hidden sm:inline text-xs text-slate-600 max-w-[180px] truncate">
                      {user.email}
                    </span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="bg-white">
                  <DropdownMenuLabel className="text-xs text-slate-500">
                    {user.name || user.email}
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => setPwdOpen(true)}
                    data-testid="change-password-btn"
                  >
                    <KeyRound className="w-4 h-4 mr-2" />
                    Changer mon mot de passe
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={logout}
                    className="text-red-600 focus:text-red-600 focus:bg-red-50"
                    data-testid="logout-btn"
                  >
                    <LogOut className="w-4 h-4 mr-2" />
                    Se déconnecter
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </header>

        <div className="p-4 md:p-6 lg:p-8">{children}</div>
      </main>

      <MobileNav navigation={navigation} />
      <ChangePasswordDialog open={pwdOpen} onOpenChange={setPwdOpen} />
    </div>
  );
}
