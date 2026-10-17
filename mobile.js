/* Nuottipaja Mobile - ei muuta nykyistä transponointilogiikkaa. */
(()=>{'use strict';
const $=id=>document.getElementById(id);
const score=$('score'),file=$('file'),demo=$('demo'),convert=$('convert');
if(!score||!file||!convert)return;
const panel=score.closest('.panel');panel.classList.add('np-score-panel');
const hero=document.createElement('div');hero.className='np-hero';
const openButton=document.createElement('button');openButton.type='button';openButton.textContent='📂 Avaa MusicXML / MXL';openButton.onclick=()=>file.click();
const demoButton=document.createElement('button');demoButton.type='button';demoButton.className='secondary';demoButton.textContent='♫ Kokeile esimerkkiä';demoButton.onclick=()=>demo.click();
hero.append(openButton,demoButton);file.closest('.panel').querySelector('h2').after(hero);
const zoomTools=document.createElement('div');zoomTools.className='np-toolrow';
zoomTools.innerHTML='<strong>Nuottien koko</strong> <button type="button" data-z="-">−</button><output id="np-zoom-label">100 %</output><button type="button" data-z="+">+</button><button type="button" data-z="reset">Palauta</button>';
score.before(zoomTools);
let zoom=Number(localStorage.getItem('npZoom'))||1;zoom=Math.max(.8,Math.min(2.4,zoom));
function applyZoom(){score.style.setProperty('--np-zoom',zoom);$('np-zoom-label').textContent=Math.round(zoom*100)+' %';localStorage.setItem('npZoom',String(zoom))}
zoomTools.addEventListener('click',e=>{let z=e.target.closest('[data-z]');if(!z)return;zoom=z.dataset.z==='reset'?1:Math.max(.8,Math.min(2.4,zoom+(z.dataset.z==='+'?.2:-.2)));applyZoom()});applyZoom();
const bar=document.createElement('nav');bar.className='np-mobilebar noprint';bar.setAttribute('aria-label','Pikatoiminnot');
const actions=[['📂 Avaa',()=>file.click()],['🎼 Nuotit',()=>panel.scrollIntoView({behavior:'smooth'})],['🎺 Muunna',()=>{convert.scrollIntoView({behavior:'smooth',block:'center'});convert.click()}],['⛶ Esitys',()=>togglePresent()]];
for(const [label,fn] of actions){const b=document.createElement('button');b.type='button';b.textContent=label;if(label.includes('Esitys'))b.className='np-present-button';b.onclick=fn;bar.appendChild(b)}document.body.appendChild(bar);
const presentActions=document.createElement('div');presentActions.className='np-present-actions noprint';presentActions.innerHTML='<button type="button" id="np-small">A−</button><button type="button" id="np-large">A+</button><button type="button" id="np-exit">Sulje ✕</button>';document.body.appendChild(presentActions);
$('np-small').onclick=()=>{zoom=Math.max(.8,zoom-.2);applyZoom()};$('np-large').onclick=()=>{zoom=Math.min(2.4,zoom+.2);applyZoom()};$('np-exit').onclick=()=>togglePresent(false);
function togglePresent(force){const on=force??!document.body.classList.contains('np-present');document.body.classList.toggle('np-present',on);if(on)window.scrollTo({top:0,behavior:'instant'});else panel.scrollIntoView({behavior:'smooth'})}
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&document.body.classList.contains('np-present'))togglePresent(false)});
// Nuottikirjasto tallennetaan vain tähän selaimeen (IndexedDB), ei verkkoon.
const lib=document.createElement('div');lib.className='np-library noprint';
lib.innerHTML='<strong>Oma nuottikirjasto</strong><p class="np-message">Tallentuu vain tämän laitteen selaimeen. Pidä alkuperäiset tiedostot tallessa.</p><div class="np-toolrow"><button type="button" id="np-save">Tallenna valittu nuotti</button><button type="button" id="np-refresh">Päivitä lista</button></div><div class="np-library-items" id="np-items"></div><p class="np-message" id="np-info"></p>';
file.closest('.panel').append(lib);
const status=s=>$('np-info').textContent=s;
const dbOpen=new Promise((resolve,reject)=>{if(!window.indexedDB){reject(Error('Tallennus ei ole käytettävissä'));return}const req=indexedDB.open('nuottipaja-mobile',1);req.onupgradeneeded=()=>req.result.createObjectStore('scores',{keyPath:'id',autoIncrement:true});req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error)});
async function list(){try{const db=await dbOpen;const tx=db.transaction('scores','readonly');const req=tx.objectStore('scores').getAll();req.onsuccess=()=>{const items=$('np-items');items.replaceChildren();for(const row of req.result.sort((a,b)=>b.saved-a.saved)){const wrap=document.createElement('div');wrap.className='np-library-item';const b=document.createElement('button');b.className='np-lib-open';b.textContent=row.name;b.onclick=()=>{try{selected=new File([row.blob],row.name,{type:row.type});file.value='';if(typeof message==='function')message('Kirjastosta avattu: '+row.name+'. Paina Tee uudet nuotit.');$('source').scrollIntoView({behavior:'smooth'})}catch(err){status('Avaus epäonnistui: '+err.message)}};const del=document.createElement('button');del.className='np-lib-delete';del.textContent='Poista';del.onclick=()=>{if(!confirm('Poistetaanko tämä nuotti tästä laitteesta?'))return;const t=db.transaction('scores','readwrite');t.objectStore('scores').delete(row.id);t.oncomplete=list};wrap.append(b,del);items.appendChild(wrap)}if(!req.result.length)items.textContent='Ei vielä tallennettuja nuotteja.'};req.onerror=()=>status('Kirjastoa ei voitu lukea.')}catch(err){status('Kirjasto ei ole käytettävissä: '+err.message)}}
$('np-refresh').onclick=list;
$('np-save').onclick=async()=>{try{if(typeof selected==='undefined'||!selected){status('Valitse ensin MusicXML- tai MXL-tiedosto.');return}if(!/\.(musicxml|xml|mxl)$/i.test(selected.name)){status('Tallenna MusicXML/MXL, ei raakaa valokuvaa.');return}const db=await dbOpen;const tx=db.transaction('scores','readwrite');tx.objectStore('scores').add({name:selected.name,type:selected.type,blob:selected,saved:Date.now()});tx.oncomplete=()=>{status('Tallennettu tähän selaimeen.');list()};tx.onerror=()=>status('Tallennus epäonnistui.')}catch(err){status('Tallennus epäonnistui: '+err.message)}};
list();
})();
