/* Nuottipaja v5: erillinen A4-tulostusasettelu. Ei muuta sävel- eikä transponointilogiikkaa. */
(() => {
  'use strict';
  const printButton = document.getElementById('print');
  const score = document.getElementById('score');
  if (!printButton || !score) return;
  let currentXml = '';
  let printable = null;
  let rendering = false;
  const OSMD = () => window.opensheetmusicdisplay?.OpenSheetMusicDisplay;
  const style = document.createElement('style');
  style.textContent = `
    #np-print-sheet { display:none; }
    @media print {
      @page { size:A4 portrait; margin:12mm; }
      html,body { width:auto!important; height:auto!important; margin:0!important; padding:0!important;
        background:white!important; color:black!important; overflow:visible!important; }
      body > *:not(#np-print-sheet) { display:none!important; }
      #np-print-sheet { display:block!important; background:white!important; color:black!important;
        position:static!important; width:186mm!important; max-width:none!important;
        padding:0!important; margin:0!important; overflow:visible!important; }
      #np-print-sheet svg { display:block!important; width:100%!important; max-width:100%!important; height:auto!important; }
      #np-print-sheet .np-page { break-after:page; page-break-after:always; }
      #np-print-sheet .np-page:last-child { break-after:auto; page-break-after:auto; }
    }
  `;
  document.head.appendChild(style);
  const printSheet = document.createElement('div');
  printSheet.id = 'np-print-sheet';
  document.body.appendChild(printSheet);

  // Pidä käytössä juuri se transponoitu MusicXML, joka annettiin näyttöpiirtimelle.
  // Muut ominaisuudet voivat korvata render-funktion; sieppaa sen argumentti
  // ilman alkuperäisen toiminnon muuttamista.
  function wrapRenderer() {
    const render = window.render;
    if (typeof render !== 'function' || render.__npFitWrapped) return;
    const wrapped = function(musicxml, ...args) {
      if (typeof musicxml === 'string' && musicxml.includes('<score-')) currentXml = musicxml;
      return render.call(this, musicxml, ...args);
    };
    wrapped.__npFitWrapped = true;
    window.render = wrapped;
  }
  wrapRenderer();
  document.getElementById('convert')?.addEventListener('click', wrapRenderer, true);
  document.getElementById('demo')?.addEventListener('click', wrapRenderer, true);

  function removeBreakHints(musicxml) {
    const d = new DOMParser().parseFromString(musicxml, 'application/xml');
    if (d.querySelector('parsererror')) return musicxml;
    d.querySelectorAll('print').forEach(n => {
      n.removeAttribute('new-system'); n.removeAttribute('new-page');
    });
    return new XMLSerializer().serializeToString(d);
  }

  async function preparePrint() {
    if (!currentXml) throw Error('Muodosta ensin nuotit painikkeella Tee uudet nuotit.');
    const Ctor = OSMD();
    if (!Ctor) throw Error('Nuottien piirto-ohjelma ei ole vielä latautunut.');
    if (rendering) return;
    rendering = true;
    try {
      printSheet.innerHTML = '';
      // Näyttökoosta riippumaton A4-leveys. Kätketty myös esitystilassa.
      printSheet.style.cssText = 'display:block;position:fixed;left:-10000px;top:0;width:703px;background:white;color:black;';
      printable = new Ctor(printSheet, {
        autoResize:false, backend:'svg', pageFormat:'A4',
        drawTitle:false, drawSubtitle:false, drawComposer:false,
        drawLyricist:false, drawPartNames:false, drawPartAbbreviations:false,
        drawMeasureNumbers:false, newSystemFromXML:false, newPageFromXML:false,
        newSystemFromNewPageInXML:false
      });
      await printable.load(removeBreakHints(currentXml));
      // Automaattinen A4-taitto, vähintään useita tahteja yhdelle riville.
      // OSMD vastaa sivujaosta ja tilanteeseen sopivasta rivipituudesta.
      printable.EngravingRules.RenderXMeasuresPerLineAkaSystem = 0;
      printable.EngravingRules.StaffDistance = 7;
      printable.EngravingRules.SystemDistance = 13;
      printable.Zoom = 1.35;
      printable.render();
      printSheet.querySelectorAll('svg').forEach(svg => {
        svg.style.width = '100%'; svg.style.maxWidth = '100%'; svg.style.height = 'auto';
      });
      // Anna selaimelle yksi maalauskierros ennen tulostusikkunaa.
      await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      window.print();
    } finally {
      rendering = false;
      // Pidä DOM odottamassa tulostuksen päättymistä; print-media näyttää sen vain paperilla.
      printSheet.style.cssText = 'display:none';
    }
  }
  // Capture-vaiheessa ohitamme vanhan window.print()-kuuntelijan.
  printButton.addEventListener('click', async e => {
    e.stopImmediatePropagation(); e.preventDefault();
    printButton.disabled = true;
    try { await preparePrint(); }
    catch(err) { alert(err.message || 'Tulostusasettelu epäonnistui.'); console.error(err); }
    finally { printButton.disabled = false; }
  }, true);
})();
