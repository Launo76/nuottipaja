/* Nuottipaja – lukunäkymä v4: sovitus leveyteen ja kahden sormen zoomaus. */
(() => {
  'use strict';
  const score = document.getElementById('score');
  const OSMD = window.opensheetmusicdisplay?.OpenSheetMusicDisplay;
  if (!score || !OSMD) return;

  let lastXml = null, serial = 0, timer = 0;
  let userScale = 1, fittedScale = 1, logicalWidth = 820;
  let touchDistance = null, pinchBase = 1;
  const clamp = (x, low, high) => Math.max(low, Math.min(high, x));

  // Luodaan sisäinen piirtoalue vanhan #score-elementin sisälle.
  const host = document.createElement('div');
  host.id = 'np-reader-viewport';
  host.style.cssText = 'width:100%;overflow-x:auto;overflow-y:hidden;overscroll-behavior-x:contain;';
  const canvas = document.createElement('div');
  canvas.id = 'np-reader-canvas';
  canvas.style.cssText = 'position:relative;transform-origin:top left;';
  host.appendChild(canvas);
  score.replaceChildren(host);

  function flowingXml(xml) {
    try {
      const doc = new DOMParser().parseFromString(xml, 'application/xml');
      if (doc.querySelector('parsererror')) return xml;
      doc.querySelectorAll('print').forEach(n => {n.removeAttribute('new-page'); n.removeAttribute('new-system');});
      return new XMLSerializer().serializeToString(doc);
    } catch (_) { return xml; }
  }

  function applyScale() {
    if (!canvas.firstElementChild) return;
    const scale = fittedScale * userScale;
    // CSS zoom muuttaa sekä leveyden että korkeuden; SVG:n suhteet pysyvät ennallaan.
    canvas.style.zoom = String(scale);
    host.scrollLeft = clamp(host.scrollLeft, 0, host.scrollWidth - host.clientWidth);
  }
  function availableWidth() {
    const r = score.getBoundingClientRect();
    return Math.max(280, Math.round(r.width || document.documentElement.clientWidth || 360));
  }
  function updateFit() {
    fittedScale = Math.min(1.35, availableWidth() / logicalWidth);
    applyScale();
  }
  function setUserScale(scale) {
    userScale = clamp(scale, 0.65, 3.5);
    applyScale();
  }

  async function draw(xml) {
    if (!xml) return;
    lastXml = xml;
    const id = ++serial;
    const phone = window.innerWidth < 760;
    // Vakioleveys antaa OSMD:lle riittävästi tilaa useille tahdeille.
    // Ulkoinen zoom sitten sovittaa koko rivin puhelimen näytölle.
    logicalWidth = phone ? 760 : Math.max(880, Math.min(1450, availableWidth()));
    canvas.style.width = logicalWidth + 'px';
    canvas.style.zoom = '1';
    canvas.replaceChildren();
    const view = new OSMD(canvas, {
      autoResize: false, backend:'svg', pageFormat:'Endless',
      drawTitle:false, drawSubtitle:false, drawComposer:false,
      drawLyricist:false, drawPartNames:false, drawPartAbbreviations:false,
      drawMeasureNumbers:false, newSystemFromXML:false, newPageFromXML:false,
      newSystemFromNewPageInXML:false, spacingFactor:0.8
    });
    await view.load(flowingXml(xml));
    if (id !== serial) return;
    view.EngravingRules.RenderXMeasuresPerLineAkaSystem = 0;
    view.EngravingRules.StaffDistance = 5;
    view.EngravingRules.SystemDistance = 7;
    view.Zoom = 1;
    view.render();
    if (id !== serial) return;
    canvas.querySelectorAll('svg').forEach(svg => {
      svg.style.display = 'block'; svg.style.maxWidth = 'none';
    });
    updateFit();
  }

  // Pääohjelma kutsuu render-funktiota muunnetun MusicXML:n jälkeen.
  window.render = draw;
  function redraw() {
    if (!lastXml) return;
    clearTimeout(timer);
    timer = setTimeout(() => draw(lastXml).catch(console.error), 220);
  }
  window.addEventListener('resize', () => {
    if (window.innerWidth < 760) updateFit(); else redraw();
  });
  new MutationObserver(() => {
    if (lastXml) setTimeout(updateFit, 80);
  }).observe(document.body, {attributes:true, attributeFilter:['class']});

  // Kaksi sormea nuottialueella: suurennus ja pienennys.
  const dist = touches => Math.hypot(touches[0].clientX-touches[1].clientX, touches[0].clientY-touches[1].clientY);
  host.addEventListener('touchstart', e => {
    if (e.touches.length !== 2) return;
    touchDistance = dist(e.touches); pinchBase = userScale;
  }, {passive:true});
  host.addEventListener('touchmove', e => {
    if (e.touches.length !== 2 || !touchDistance) return;
    e.preventDefault();
    setUserScale(pinchBase * dist(e.touches) / touchDistance);
  }, {passive:false});
  const pinchEnd = () => { touchDistance = null; };
  host.addEventListener('touchend', pinchEnd, {passive:true});
  host.addEventListener('touchcancel', pinchEnd, {passive:true});
  // Kaksi napautusta palauttaa sovituksen.
  let lastTap = 0;
  host.addEventListener('touchend', e => {
    if (e.changedTouches.length !== 1 || e.touches.length) return;
    const now = Date.now();
    if (now - lastTap < 320) {setUserScale(1); lastTap = 0;}
    else lastTap = now;
  }, {passive:true});
  // Jos mobile.js sisältää suurennuspainikkeet, sidotaan ne myös tähän näkymään.
  document.addEventListener('click', e => {
    const btn = e.target.closest('button');
    if (!btn) return;
    if (!document.body.classList.contains('np-present')) return;
    const t = (btn.textContent || '').trim();
    if (t === 'A+' || t === 'A−' || t === 'A-') {
      e.stopImmediatePropagation(); e.preventDefault();
      setUserScale(userScale * (t === 'A+' ? 1.2 : 1/1.2));
    }
  }, true);
})();
