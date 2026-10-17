/* Nuottipaja – mobiilin nuottilukija v2. Sävelten transponointilogiikkaa ei muuteta. */
(() => {
  'use strict';
  const score = document.getElementById('score');
  if (!score || typeof window.opensheetmusicdisplay === 'undefined') return;
  const OSMD = window.opensheetmusicdisplay.OpenSheetMusicDisplay;
  let renderedXml = null;
  let resizeTimer = null;
  let generation = 0;
  const options = {
    autoResize: false, backend: 'svg',
    pageFormat: 'Endless',
    drawTitle: false, drawSubtitle: false, drawComposer: false,
    drawLyricist: false, drawPartNames: false, drawMeasureNumbers: false,
    drawFingerings: true, spacingFactor: 0.8,
    renderSingleHorizontalStaffline: false
  };
  async function draw(xml) {
    if (!xml) return;
    const id = ++generation;
    const screen = document.body.classList.contains('np-present');
    // Oikea viivastojen määrä lasketaan käytettävissä olevan ruudun leveyden mukaan.
    score.style.width = '100%';
    score.style.setProperty('--np-zoom', '1');
    score.innerHTML = '';
    const view = new OSMD(score, {...options, pageFormat: screen ? 'Endless' : 'Endless'});
    await view.load(xml);
    if (id !== generation) return;
    view.Zoom = 1;
    view.render();
    if (id !== generation) return;
    renderedXml = xml;
    // OSMD voi asettaa kuvapinnan leveyden kiinteäksi; CSS sovittaa sen puhelimeen.
    score.querySelectorAll('svg').forEach(svg => {
      svg.style.maxWidth = '100%';
      svg.style.width = '100%';
      svg.style.height = 'auto';
    });
  }
  // Korvaa vain sivuasettelu; vanha transponointi, toisto ja MusicXML-lataus säilyvät.
  window.render = draw;
  // Sivun esitystilaan siirtyminen edellyttää leveyden uudelleenlaskentaa.
  const observer = new MutationObserver(() => {
    if (!renderedXml) return;
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => draw(renderedXml).catch(console.error), 120);
  });
  observer.observe(document.body, {attributes:true,attributeFilter:['class']});
  window.addEventListener('resize', () => {
    if (!renderedXml) return;
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => draw(renderedXml).catch(console.error), 280);
  });
})();
