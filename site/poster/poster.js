// Draws the divergence chart and its hover/tap detail panel.
// ?export hides the page chrome so the stage can be captured as the upload PNG.
(() => {
  // [model, benchmark, metric / eval, n papers, min, max, min paper, max paper, missing detail]
  const ROWS = [
    ["GPT-4o", "UCMerced", "accuracy, zero-shot", 2, 43.5, 88.8, "RingMo-Agent", "EarthDial", "Identical prompts, API snapshot, scoring, and samples are not established."],
    ["CROMA", "m-Cashew", "mIoU, linear probe", 4, 30.1, 62.2, "DOFA", "SatDiFuser", "Decoder details are weakly described."],
    ["ViT-22k", "OSCD", "recall, fine-tuned", 2, 22.5, 52.4, "GFM", "SpectralGPT", "GFM describes 192×192 tiles and SpectralGPT 128×128 crops with 50% overlap."],
    ["DOFA", "m-Cashew", "mIoU, linear probe", 3, 27.7, 53.9, "TerraFM", "SatDiFuser", "Decoder details are weakly described."],
    ["Satlas", "m-Cashew", "mIoU, linear probe", 2, 25.1, 49.1, "TerraFM", "SatDiFuser", "It is unclear which decoder produced the lower score."],
    ["ViT-22k", "OSCD", "F1, fine-tuned", 3, 30.7, 52.2, "GFM", "SpectralGPT", "The papers do not establish that they use the same evaluation recipe."],
    ["CaCo", "NWPU-RESISC45", "accuracy, fine-tuned", 2, 68.6, 88.3, "CtxMIM", "SelectiveMAE", "CtxMIM's head-fine-tuning description is ambiguous."],
    ["Scale-MAE", "NWPU-RESISC45", "accuracy, fine-tuned", 7, 78.0, 95.7, "CtxMIM", "Scale-MAE", "Freezing is unclear in CtxMIM."],
    ["GPT-4o", "AID", "accuracy, zero-shot", 2, 58.3, 74.7, "RingMo-Agent", "EarthDial", "Identical samples, prompts, answer mapping, and API snapshot are not established."],
    ["ResNet-50", "OSCD", "recall, fine-tuned", 3, 25.1, 38.9, "GFM", "SpectralGPT", "GFM's scores match a ResNet-18 run in SeCo."],
  ];
  const stage = document.getElementById("stage");
  if (new URLSearchParams(location.search).has("export")) document.documentElement.classList.add("export");

  const rows = document.getElementById("rows");
  const detail = document.getElementById("detail");
  const select = (i) => {
    const [m, b, e, n, lo, hi, pl, ph, why] = ROWS[i];
    for (const [j, el] of [...rows.children].entries()) el.classList.toggle("on", j === i);
    detail.innerHTML = `<b>${m} on ${b}</b> (${e}, ${n} papers): <span class="mono">${lo.toFixed(1)}</span> in ${pl}, <span class="mono">${hi.toFixed(1)}</span> in ${ph}. ${why}`;
  };
  ROWS.forEach(([m, b, , , lo, hi], i) => {
    const el = document.createElement("div");
    el.className = "row";
    el.innerHTML = `<div class="name">${m} <span>on ${b}</span></div><div class="track"><i class="gap" style="left:${lo}%;width:${hi - lo}%"></i><i class="dot lo" style="left:${lo}%"></i><i class="dot hi" style="left:${hi}%"></i></div><div class="delta">Δ${Math.round(hi - lo)}</div>`;
    el.addEventListener("mouseenter", () => select(i));
    el.addEventListener("click", () => select(i));
    rows.appendChild(el);
  });
  select(1);

  const tip = document.getElementById("tip");
  for (const el of document.querySelectorAll("[data-tip]")) {
    el.addEventListener("mousemove", (ev) => {
      const r = stage.getBoundingClientRect();
      tip.textContent = el.dataset.tip;
      tip.style.display = "block";
      tip.style.left = `${ev.clientX - r.left + 14}px`;
      tip.style.top = `${ev.clientY - r.top - 44}px`;
    });
    el.addEventListener("mouseleave", () => { tip.style.display = "none"; });
  }
})();
