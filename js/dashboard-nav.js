(() => {
  const sidebar = document.querySelector(".sidebar");
  if (!sidebar) return;

  const links = [...sidebar.querySelectorAll('a[href^="#"]')]
    .filter(link => link.getAttribute("href").length > 1);
  const targets = links
    .map(link => document.querySelector(link.getAttribute("href")))
    .filter(section =>
      section &&
      section.parentElement?.matches(".dashboard-main, main")
    );
  let lockedLink = null;
  let unlockTimer = 0;
  let scrollFrame = 0;

  function markActive(link) {
    links.forEach(item => {
      const allowed = item.dataset.noActive !== "true";
      item.classList.toggle("active", allowed && item === link);
      if (allowed && item === link) item.setAttribute("aria-current", "location");
      else item.removeAttribute("aria-current");
    });
  }

  function linkForSection(section) {
    return links.find(link => link.getAttribute("href") === `#${section.id}`);
  }

  function nearestSection() {
    const anchor = Math.min(180, window.innerHeight * 0.24);
    let best = null;
    let bestDistance = Infinity;
    targets.forEach(section => {
      const rect = section.getBoundingClientRect();
      if (rect.bottom < 0 || rect.top > window.innerHeight) return;
      const distance = Math.abs(rect.top - anchor);
      if (distance < bestDistance) {
        best = section;
        bestDistance = distance;
      }
    });
    return best;
  }

  function updateFromScroll() {
    scrollFrame = 0;
    if (lockedLink) return;
    const section = nearestSection();
    if (section) markActive(linkForSection(section));
  }

  function releaseLock() {
    window.clearTimeout(unlockTimer);
    lockedLink = null;
    updateFromScroll();
  }

  links.forEach(link => {
    link.addEventListener("click", event => {
      const target = document.querySelector(link.getAttribute("href"));
      if (!target) return;
      event.preventDefault();
      lockedLink = link;
      markActive(link);
      history.replaceState(null, "", link.getAttribute("href"));
      target.scrollIntoView({ behavior: "smooth", block: "start" });
      window.clearTimeout(unlockTimer);
      if (targets.includes(target)) {
        unlockTimer = window.setTimeout(releaseLock, 1100);
      }
    });
  });

  ["wheel", "touchstart"].forEach(eventName => {
    window.addEventListener(eventName, () => {
      if (lockedLink) releaseLock();
    }, { passive: true });
  });

  window.addEventListener("scroll", () => {
    if (scrollFrame) return;
    scrollFrame = window.requestAnimationFrame(updateFromScroll);
  }, { passive: true });

  const initialLink = location.hash
    ? links.find(link => link.getAttribute("href") === location.hash)
    : null;
  if (initialLink) markActive(initialLink);
  else updateFromScroll();
})();
