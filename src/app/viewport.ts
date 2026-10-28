// "The keyboard never covers the field being typed in" (specs/design.md). Android resizes the layout
// (interactive-widget=resizes-content); iOS doesn't, so --kb holds the keyboard height for sheets and bars.
const vv = window.visualViewport;

function update() {
  if (!vv) return;
  const kb = Math.max(0, Math.round(innerHeight - vv.height - vv.offsetTop));
  document.documentElement.style.setProperty("--kb", `${kb}px`);
}

vv?.addEventListener("resize", update);
vv?.addEventListener("scroll", update);
update();

// Keep the focused field in view once the keyboard has opened.
addEventListener("focusin", (e) => {
  const el = e.target as HTMLElement;
  if (el.matches("input, textarea")) setTimeout(() => el.scrollIntoView({ block: "nearest" }), 300);
});
