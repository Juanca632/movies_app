import type { ReactNode } from "react";
import { Outlet, ScrollRestoration, useNavigation } from "react-router-dom";
import AssistantPanel from "./AssistantPanel";
import BottomNav from "./BottomNav";
import Navbar from "./Navbar";
import TrailerModal from "./TrailerModal";

function Layout({ children }: { children?: ReactNode }) {
  const navigation = useNavigation();

  return (
    // On phones the bottom tab bar covers the last 4rem: keep the footer clear of it.
    <div className="flex min-h-dvh flex-col pb-[calc(4rem+env(safe-area-inset-bottom))] sm:pb-0">
      {navigation.state === "loading" && (
        <div aria-hidden className="fixed inset-x-0 top-0 z-[60] h-0.5 animate-shimmer bg-accent" />
      )}
      <Navbar />
      <main className="flex-1">{children ?? <Outlet />}</main>
      <footer className="page-x mt-16 border-t border-white/5 py-8 text-xs text-subtle">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <p>
            Data and images from{" "}
            <a href="https://www.themoviedb.org" target="_blank" rel="noreferrer" className="text-muted hover:text-accent">
              TMDB
            </a>
            . This product uses the TMDB API but is not endorsed or certified by TMDB.
          </p>
          <a href="https://github.com/Juanca632/movies_app" target="_blank" rel="noreferrer" className="text-muted hover:text-accent">
            Source on GitHub
          </a>
        </div>
      </footer>
      <BottomNav />
      <AssistantPanel />
      <TrailerModal />
      <ScrollRestoration />
    </div>
  );
}

export default Layout;
