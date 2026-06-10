import { useEffect, useMemo, useRef, useState } from "react";
import Fuse from "fuse.js";
import { Check, ChevronDown, Search, UserPlus, X } from "lucide-react";
import { Input } from "./ui/input";
import { Button } from "./ui/button";

/**
 * Combobox client avec recherche fuzzy (tolère les fautes de frappe).
 * Exemple : taper "dumont" propose "DUPONT Jean" (distance de Levenshtein).
 *
 * Props :
 *  - clients: [{ id, prenom, nom, telephone, telephone2, email }]
 *  - value: id sélectionné (ou "")
 *  - onChange: (id) => void
 *  - onCreateNew?: () => void  — bouton "Nouveau client rapide"
 */
export default function ClientCombobox({ clients, value, onChange, onCreateNew }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [highlight, setHighlight] = useState(0);
  const containerRef = useRef(null);
  const inputRef = useRef(null);

  const selected = useMemo(
    () => clients.find((c) => c.id === value) || null,
    [clients, value]
  );

  const fuse = useMemo(
    () =>
      new Fuse(clients, {
        keys: [
          { name: "nom", weight: 2 },
          { name: "prenom", weight: 2 },
          { name: "telephone", weight: 1 },
          { name: "telephone2", weight: 0.5 },
          { name: "email", weight: 0.5 },
        ],
        threshold: 0.4, // tolère ~40% de différence → DUMONT match DUPONT
        ignoreLocation: true,
        includeScore: true,
        minMatchCharLength: 1,
      }),
    [clients]
  );

  const results = useMemo(() => {
    if (!query.trim()) return clients.slice(0, 50);
    const r = fuse.search(query.trim()).slice(0, 20).map((x) => x.item);
    return r;
  }, [query, clients, fuse]);

  // Close on outside click
  useEffect(() => {
    const onClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    if (open) document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [open]);

  // Reset highlight when query changes
  useEffect(() => { setHighlight(0); }, [query]);

  const pick = (c) => {
    onChange(c.id);
    setOpen(false);
    setQuery("");
  };

  const handleKeyDown = (e) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlight((h) => Math.min(h + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlight((h) => Math.max(h - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (results[highlight]) pick(results[highlight]);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  };

  return (
    <div ref={containerRef} className="relative" data-testid="client-combobox">
      {/* Trigger */}
      {!open ? (
        <button
          type="button"
          onClick={() => {
            setOpen(true);
            setTimeout(() => inputRef.current?.focus(), 0);
          }}
          className="w-full h-10 px-3 rounded-md border border-slate-200 bg-white text-left flex items-center justify-between hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#84CC16]/40"
          data-testid="client-combobox-trigger"
        >
          {selected ? (
            <span className="flex-1 truncate text-slate-900">
              {selected.prenom} {selected.nom}
              {selected.telephone ? (
                <span className="text-slate-400"> — {selected.telephone}</span>
              ) : null}
            </span>
          ) : (
            <span className="text-slate-400">Sélectionner un client...</span>
          )}
          <ChevronDown className="w-4 h-4 text-slate-400 flex-shrink-0 ml-2" />
        </button>
      ) : (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            ref={inputRef}
            type="text"
            placeholder="Rechercher un client (nom, prénom, téléphone...)"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            className="pl-9 pr-8"
            data-testid="client-combobox-search"
            autoComplete="off"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
              aria-label="Effacer"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      )}

      {/* Dropdown */}
      {open && (
        <div className="absolute z-50 mt-1 w-full bg-white border border-slate-200 rounded-md shadow-lg max-h-72 overflow-y-auto">
          {results.length === 0 ? (
            <div className="p-3 text-sm text-slate-500 text-center">
              Aucun client trouvé
              {onCreateNew && (
                <div className="mt-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setOpen(false);
                      onCreateNew();
                    }}
                    data-testid="combobox-create-new"
                  >
                    <UserPlus className="w-4 h-4 mr-2" />
                    Créer un nouveau client
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <ul>
              {results.map((c, idx) => (
                <li key={c.id}>
                  <button
                    type="button"
                    onClick={() => pick(c)}
                    onMouseEnter={() => setHighlight(idx)}
                    className={`w-full text-left px-3 py-2 flex items-center gap-2 ${
                      idx === highlight ? "bg-[#84CC16]/10" : "hover:bg-slate-50"
                    }`}
                    data-testid={`combobox-option-${c.id}`}
                  >
                    <span className="flex-1 min-w-0">
                      <div className="font-medium text-slate-900 truncate">
                        {c.societe ? <span className="text-[#84CC16]">{c.societe} — </span> : null}{c.prenom} {c.nom}
                      </div>
                      <div className="text-xs text-slate-500 truncate">
                        {c.telephone || "—"}
                        {c.email ? ` · ${c.email}` : ""}
                      </div>
                    </span>
                    {c.id === value && (
                      <Check className="w-4 h-4 text-[#84CC16] flex-shrink-0" />
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}
          {onCreateNew && results.length > 0 && (
            <div className="border-t border-slate-200 p-2">
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  onCreateNew();
                }}
                className="w-full text-sm text-[#84CC16] hover:bg-[#84CC16]/10 rounded px-2 py-1.5 flex items-center gap-2"
                data-testid="combobox-create-new"
              >
                <UserPlus className="w-4 h-4" />
                Créer un nouveau client
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
