import type { Provider, Providers } from "../api/types";
import { imageUrl } from "../lib/tmdb";
import { ExternalIcon } from "./icons";

// TMDB lists ad-supported tiers as separate providers ("Netflix basic with Ads"); they only add noise.
const isAdTier = (provider: Provider) => /with ads$/i.test(provider.provider_name);

const GROUPS = [
  ["flatrate", "Stream"],
  ["rent", "Rent"],
  ["buy", "Buy"],
] as const;

function ProviderLogo({ provider, href }: { provider: Provider; href: string | null }) {
  const src = imageUrl(provider.logo_path, "w92");
  const logo = src ? (
    <img src={src} alt={provider.provider_name} title={provider.provider_name} loading="lazy" className="size-12 rounded-xl ring-1 ring-white/10" />
  ) : (
    <span className="grid h-12 place-items-center rounded-xl bg-surface-2 px-3 text-xs">{provider.provider_name}</span>
  );
  return href ? (
    <a href={href} target="_blank" rel="noreferrer" className="block transition hover:-translate-y-0.5 hover:opacity-90">
      {logo}
    </a>
  ) : (
    logo
  );
}

function WatchProviders({ providers }: { providers: Providers | null }) {
  const groups = GROUPS.map(([key, label]) => [label, (providers?.[key] ?? []).filter((p) => !isAdTier(p))] as const).filter(([, list]) => list.length);
  if (!providers || !groups.length) return null;

  return (
    <section aria-label="Where to watch" className="page-x">
      <h2 className="mb-4 font-display text-xl font-semibold tracking-tight sm:text-2xl">Where to watch</h2>
      <div className="flex flex-wrap gap-x-10 gap-y-5">
        {groups.map(([label, list]) => (
          <div key={label}>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-subtle">{label}</h3>
            <ul className="flex flex-wrap gap-2">
              {list.map((provider) => (
                <li key={provider.provider_id}>
                  <ProviderLogo provider={provider} href={providers.link} />
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <p className="mt-4 flex items-center gap-1 text-xs text-subtle">
        Availability in {providers.region}, powered by JustWatch
        {providers.link && (
          <a href={providers.link} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-muted hover:text-accent">
            · all options <ExternalIcon className="size-3" />
          </a>
        )}
      </p>
    </section>
  );
}

export default WatchProviders;
