/* Nuottipaja – lukunäkymä v3. Korvaa vain nuottien näyttöä, ei transponointia. */
(() => {
  'use strict';
  const score = document.getElementById('score');
  const OSMD = window.opensheetmusicdisplay?.OpenSheetMusicDisplay;
  if (!score || !OSMD) return;
  let lastXml = null;
  let pending = 0;
  let serial = 0;
  // Alkuperäinen MusicXML pysyy muuttumattomana. Tästä vain rivitysvihjeet poistetaan
  // näyttöä varten; alkuperäinen tiedosto ja ladattava transponoitu XML säilyvät ennallaan.
  function flowingXml(xml) {
    try {
      const doc = new DOMParser().parseFromString(xml, 'application/xml');
      if (doc.querySelector('parsererror')) return xml;
      doc.querySelectorAll('print').forEach(el => {
        el.removeAttribute('new-system');
        el.removeAttribute('new-page');
      });
      return new XMLSerializer().serializeToString(doc);
    } catch (_) { return xml; }
  }
  async function draw(xml) {
    if (!xml) return;
    lastXml = xml;
    const call = ++serial;
    const presentation = document.body.classList.contains('np-present');
    const width = Math.max(280, score.parentElement?.clientWidth || window.innerWidth);
    // Pienessä puhelimessa kahdesta tahdista lähdetään liikkeelle;
    // isommalle ruudulle kirjasto saa rivittää automaattisesti.
    const phone = width < 760;
    score.style.width = '100%';
    score.style.maxWidth = '100%';
    score.innerHTML = '';
    const view = new OSMD(score, {
      autoResize:false, backend:'svg', pageFormat:'Endless',
      drawTitle:false, drawSubtitle:false, drawComposer:false,
      drawLyricist:false, drawPartNames:false, drawPartAbbreviations:false,
      drawMeasureNumbers:false, drawFingerings:true,
      newSystemFromXML:false, newPageFromXML:false,
      newSystemFromNewPageInXML:false,
      renderSingleHorizontalStaffline:false,
      spacingFactor:0.75
    });
    await view.load(flowingXml(xml));
    if (call !== serial) return;
    // Rivikohtainen pakko: kaksi tahtia puhelimessa, tietokoneella 0=automaattinen.
    // Myös kohotahti lasketaan omaksi tahdikseen.
    view.EngravingRules.RenderXMeasuresPerLineAkaSystem = phone ? 2 : 0;
    view.EngravingRules.StaffDistance = 5;
    view.EngravingRules.SystemDistance = 7;
    view.Zoom = phone ? 0.85 : 1;
    view.render();
    if (call !== serial) return;
    score.querySelectorAll('svg').forEach(svg => {
      svg.style.width = '100%';
      svg.style.maxWidth = '100%';
      svg.style.height = 'auto';
      svg.style.display = 'block';
    });
  }
  // Globaalissa pääohjelmassa render() kutsutaan aina muunnoksen jälkeen.
  window.render = draw;
  function redraw() {
    if (!lastXml) return;
    clearTimeout(pending);
    pending = setTimeout(() => draw(lastXml).catch(console.error), 200);
  }
  new MutationObserver(redraw).observe(document.body, {attributes:true, attributeFilter:['class']});
  window.addEventListener('resize', redraw);
})();
