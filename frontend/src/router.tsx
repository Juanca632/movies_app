import { createBrowserRouter, type RouteObject } from "react-router-dom";
import Layout from "./components/Layout";
import { NotFoundPage, RouteErrorPage } from "./pages/StatusPages";

// Pages are split into their own chunks; the slug after the id is only for readable URLs.
export const routes: RouteObject[] = [
  {
    element: <Layout />,
    errorElement: <RouteErrorPage />,
    hydrateFallbackElement: <div className="min-h-dvh bg-bg" />,
    children: [
      { index: true, lazy: () => import("./pages/HomePage").then((m) => ({ Component: m.default })) },
      {
        path: "movie/:id/:slug?",
        lazy: () => import("./pages/MediaPage").then((m) => ({ element: <m.default mediaType="movie" /> })),
      },
      {
        path: "tv-show/:id/:slug?",
        lazy: () => import("./pages/MediaPage").then((m) => ({ element: <m.default mediaType="tv" /> })),
      },
      { path: "person/:id/:slug?", lazy: () => import("./pages/PersonPage").then((m) => ({ Component: m.default })) },
      { path: "browse/:mediaType", lazy: () => import("./pages/BrowsePage").then((m) => ({ Component: m.default })) },
      { path: "calendar", lazy: () => import("./pages/CalendarPage").then((m) => ({ Component: m.default })) },
      { path: "search", lazy: () => import("./pages/SearchPage").then((m) => ({ Component: m.default })) },
      { path: "*", element: <NotFoundPage /> },
    ],
  },
];

export const createRouter = () => createBrowserRouter(routes);
