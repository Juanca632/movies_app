// One small SVG per country, emitted as its own file (see vite.config) so only visible flags download.
const FLAGS = import.meta.glob<string>("/node_modules/flag-icons/flags/4x3/*.svg", {
  eager: true,
  query: "?url",
  import: "default",
});

const byCode = new Map(
  Object.entries(FLAGS).map(([path, url]) => [path.slice(path.lastIndexOf("/") + 1, -4).toUpperCase(), url]),
);

/** URL of a country's flag, or null for codes without one. */
export const flagUrl = (code: string) => byCode.get(code) ?? null;
