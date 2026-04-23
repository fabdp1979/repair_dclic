import { useState } from "react";
import { Monitor, Tablet } from "lucide-react";
import { Button } from "../components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../components/ui/dropdown-menu";
import { useDeviceMode } from "../hooks/useDeviceMode";

/** Petit bouton discret pour basculer PC ↔ iPad — PC uniquement, caché en /signer /suivi /ipad */
export default function ModeSwitcher() {
  const { mode, forced, setMode } = useDeviceMode();
  const [open, setOpen] = useState(false);
  if (forced) return null;

  const apply = (next) => {
    setOpen(false);
    if (next === "ipad") {
      setMode("ipad");
      // bascule visuellement en redirigeant vers l'accueil iPad pour démo
      window.location.href = "/ipad";
    } else {
      setMode("pc");
    }
  };

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="text-slate-500 hover:text-slate-900 gap-2"
          data-testid="mode-switcher-btn"
        >
          {mode === "ipad" ? <Tablet className="w-4 h-4" /> : <Monitor className="w-4 h-4" />}
          <span className="hidden sm:inline text-xs">
            Mode&nbsp;: {mode === "ipad" ? "iPad" : "PC"}
          </span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="bg-white">
        <DropdownMenuItem onClick={() => apply("pc")} data-testid="mode-pc-item">
          <Monitor className="w-4 h-4 mr-2" />
          Mode PC (technicien)
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => apply("ipad")} data-testid="mode-ipad-item">
          <Tablet className="w-4 h-4 mr-2" />
          Mode iPad (aperçu)
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
