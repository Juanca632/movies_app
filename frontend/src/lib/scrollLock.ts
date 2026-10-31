/**
 * Stops the page from scrolling behind an overlay. Returns the function that releases it.
 *
 * The lock goes on <html>, not <body>: `html { overflow-x: clip }` (index.css) stops the browser
 * from passing body's overflow up to the viewport, so `body { overflow: hidden }` locks nothing.
 * It is counted, so overlays opened on top of each other (the tour handing over to the assistant)
 * don't release each other's lock.
 */
let locks = 0;
let previous = "";

export function lockScroll() {
  const root = document.documentElement;
  if (locks++ === 0) {
    previous = root.style.overflow;
    root.style.overflow = "hidden";
  }
  let released = false;
  return () => {
    if (released) return;
    released = true;
    if (--locks === 0) root.style.overflow = previous;
  };
}
