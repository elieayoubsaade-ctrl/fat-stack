/**
 * Two screens live at two URLs:
 *   /        the game itself (the cabinet)
 *   /claim   the form a player opens on their phone after scanning the QR
 *
 * Deliberately a path check rather than a router — the app has exactly two entry
 * points and a router would be more code than the thing it routes.
 */
import ClaimPage from "@/claim/ClaimPage";
import SuperStackGame from "@/game/SuperStackGame";

export default function App() {
  const path = window.location.pathname.replace(/\/+$/, "");
  return path.endsWith("/claim") ? <ClaimPage /> : <SuperStackGame />;
}
