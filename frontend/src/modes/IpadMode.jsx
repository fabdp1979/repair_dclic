/**
 * IpadMode — layout plein-écran minimal pour clients.
 * Aucune navigation admin, aucun menu, aucun lien interne.
 * Le namespace `.ipad-mode` active la typographie et espacement XL via index.css.
 */
export default function IpadMode({ children }) {
  return (
    <div className="ipad-mode min-h-screen bg-slate-50" data-testid="ipad-mode-root">
      {children}
    </div>
  );
}
