import type { ReactNode } from "react";
import { Link, isRouteErrorResponse, useRouteError } from "react-router-dom";
import ErrorState from "../components/ErrorState";
import Layout from "../components/Layout";
import { useDocumentTitle } from "../lib/useDocumentTitle";

function Message({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="page-x flex min-h-[70vh] flex-col items-center justify-center gap-4 pt-16 text-center">
      <p className="font-display text-7xl font-extrabold text-accent/90">{title}</p>
      {children}
    </div>
  );
}

export function NotFoundPage({ what = "page" }: { what?: string }) {
  useDocumentTitle("Not found");
  return (
    <Message title="404">
      <p className="text-muted">We couldn't find that {what}.</p>
      <Link to="/" className="rounded-full bg-accent px-5 py-2 text-sm font-semibold text-bg transition hover:bg-accent-strong">
        Back to home
      </Link>
    </Message>
  );
}

export function LoadErrorPage({ onRetry }: { onRetry: () => void }) {
  useDocumentTitle("Error");
  return (
    <Message title="Oops">
      <ErrorState message="We couldn't load this page. The server may be busy." onRetry={onRetry} className="justify-center" />
    </Message>
  );
}

/** Router-level error boundary (unknown URL or a crash while rendering). */
export function RouteErrorPage() {
  const error = useRouteError();
  const notFound = isRouteErrorResponse(error) && error.status === 404;
  if (!notFound) console.error(error);

  return (
    <Layout>
      {notFound ? (
        <NotFoundPage />
      ) : (
        <Message title="Oops">
          <p className="text-muted">Something went wrong on our side.</p>
          <button type="button" onClick={() => window.location.reload()} className="rounded-full bg-accent px-5 py-2 text-sm font-semibold text-bg">
            Reload
          </button>
        </Message>
      )}
    </Layout>
  );
}
