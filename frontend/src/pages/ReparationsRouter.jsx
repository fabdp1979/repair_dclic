import ReparationsPage from "./ReparationsPage";
import IpadReparationSearch from "../pages-ipad/IpadReparationSearch";
import { detectAuto } from "../hooks/useDeviceMode";

export default function ReparationsRouter() {
  return detectAuto() === "ipad" ? <IpadReparationSearch /> : <ReparationsPage />;
}
