// One-shot scroll reveal + BibTeX copy. The page is fully readable without JS:
// the .js class (which hides .reveal blocks until they enter the viewport) is
// only added here.
(() => {
  const root = document.documentElement;
  root.classList.add("js");

  const blocks = document.querySelectorAll(".reveal");
  if (!("IntersectionObserver" in window)) {
    for (const el of blocks) el.classList.add("in");
  } else {
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            e.target.classList.add("in");
            io.unobserve(e.target);
          }
        }
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.08 },
    );
    for (const el of blocks) io.observe(el);
  }

  for (const btn of document.querySelectorAll("[data-copy]")) {
    btn.addEventListener("click", async () => {
      const src = document.querySelector(btn.dataset.copy);
      if (!src) return;
      const label = btn.textContent;
      try {
        await navigator.clipboard.writeText(src.textContent.trim());
        btn.textContent = "Copied";
      } catch {
        const range = document.createRange();
        range.selectNodeContents(src);
        const sel = window.getSelection();
        sel.removeAllRanges();
        sel.addRange(range);
        btn.textContent = "Selected";
      }
      setTimeout(() => {
        btn.textContent = label;
      }, 1600);
    });
  }
})();
