import type { ReactNode } from "react";
import { useDocumentTitle } from "../lib/useDocumentTitle";

const UPDATED = "October 3, 2026";
const ISSUES = "https://github.com/Juanca632/movies_app/issues";

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-3">
      <h2 className="font-display text-xl font-bold tracking-tight text-fg">{title}</h2>
      {children}
    </section>
  );
}

const external = "text-accent hover:underline";

function PrivacyPage() {
  useDocumentTitle("Privacy");

  return (
    <article className="page-x mx-auto max-w-3xl space-y-8 pt-24 leading-relaxed text-fg/85 sm:pt-28">
      <header>
        <h1 className="font-display text-3xl font-bold tracking-tight text-fg sm:text-5xl">Privacy</h1>
        <p className="mt-2 text-sm text-subtle">Last updated {UPDATED}</p>
      </header>

      <p>
        MoviesApp is a personal portfolio project. You can browse and search everything without an account; signing in
        with Google is optional and only used to keep your list and favorites. This page explains what is stored and why.
      </p>

      <Section title="Without an account">
        <ul className="list-disc space-y-2 pl-5">
          <li>
            Your country (for where to watch) and your conversation with the AI assistant are saved in your own browser's
            storage. They never reach our database, and clearing your browser data removes them.
          </li>
          <li>
            Questions you ask the AI assistant, with a short recap of the earlier ones, are sent to{" "}
            <a href="https://www.anthropic.com/legal/privacy" target="_blank" rel="noreferrer" className={external}>
              Anthropic
            </a>{" "}
            to write the answer. Identical questions are cached in memory for an hour; they are not stored anywhere else.
          </li>
          <li>
            To limit how many questions each visitor can ask, the server keeps your IP address with the times of your
            recent questions in memory only; it is never written to a database and is gone when the server restarts. The
            hosting provider,{" "}
            <a href="https://vercel.com/legal/privacy-policy" target="_blank" rel="noreferrer" className={external}>
              Vercel
            </a>
            , keeps standard request logs.
          </li>
        </ul>
      </Section>

      <Section title="With an account">
        <p>When you sign in with Google, we receive and store:</p>
        <ul className="list-disc space-y-2 pl-5">
          <li>your Google account ID, email address, name and profile picture link;</li>
          <li>the movies and shows you save to My list or Favorites, and when you saved them;</li>
          <li>a sign-in session: a random token in a cookie that scripts cannot read, valid for 30 days of inactivity.</li>
        </ul>
        <p>
          We never see your Google password, and we ask Google for nothing beyond your basic profile. This data is used only
          to sign you in, show your lists and recommend titles from them. It lives in a database hosted by{" "}
          <a href="https://neon.com/privacy-policy" target="_blank" rel="noreferrer" className={external}>
            Neon
          </a>{" "}
          in the United States.
        </p>
        <p>
          When you ask the AI assistant while signed in, the titles you saved most recently (up to 15 from each list) go to
          Anthropic with your question, so the answer fits your taste. Those answers are never cached or shown to anyone else.
        </p>
        <p>
          The same titles are sent to Anthropic, about once a day at most and only after your lists change, to make the AI
          picks on the home page. The latest picks are stored with your account and deleted with it.
        </p>
      </Section>

      <Section title="What we don't do">
        <p>
          No ads, no analytics or tracking cookies, and your data is never sold or shared. The movie databases we use (TMDB
          and OMDb) only receive the IDs of titles, never anything about you.
        </p>
      </Section>

      <Section title="Deleting your data">
        <ul className="list-disc space-y-2 pl-5">
          <li>Signing out ends the session on that browser.</li>
          <li>
            <strong className="text-fg">Delete account</strong>, in the menu under your picture, erases your account, your
            sessions and both lists at once, for good.
          </li>
          <li>
            You can also remove the app's access in your{" "}
            <a href="https://myaccount.google.com/connections" target="_blank" rel="noreferrer" className={external}>
              Google account settings
            </a>
            .
          </li>
        </ul>
      </Section>

      <Section title="Contact">
        <p>
          Questions or requests:{" "}
          <a href={ISSUES} target="_blank" rel="noreferrer" className={external}>
            open an issue on GitHub
          </a>
          . If this policy changes, the date above will too.
        </p>
      </Section>
    </article>
  );
}

export default PrivacyPage;
