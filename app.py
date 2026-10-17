"""Nuottipajan kuvantunnistuksen pohja: kuvien vastaanotto ja viivastojen havaitseminen.
Tämä EI vielä palauta MusicXML:ää eikä tunnista sävellajia.
"""
import io
import os
from flask import Flask, jsonify, request, render_template_string
from flask_cors import CORS
from PIL import Image, ImageOps, UnidentifiedImageError
import numpy as np

app = Flask(__name__)
app.config['MAX_CONTENT_LENGTH'] = 8 * 1024 * 1024
CORS(app, resources={r'/api/*': {'origins': ['https://launo76.github.io']}})

@app.get('/')
def home():
    return jsonify(service='Nuottipaja', status='ok', message='Taustapalvelu toimii!', version='kuvantunnistus-v1')

@app.get('/health')
def health():
    return jsonify(status='ok')


def detect_staves(image):
    # EXIF-suunta huomioidaan, värit muutetaan harmaasävyiksi.
    gray = ImageOps.exif_transpose(image).convert('L')
    # Pidetään tarkkuus riittävänä viivastoille mutta rajataan CPU- ja muistikuormaa.
    gray.thumbnail((2200, 2200))
    arr = np.asarray(gray, dtype=np.uint8)
    height, width = arr.shape
    # Tummien pikseleiden määrä vaakariveittäin.
    dark = arr < 150
    row_density = dark.mean(axis=1)
    # Viiva ulottuu yleensä leveälle; rajataan vain selvästi pitkät vaakaviivat.
    candidate = np.where(row_density > 0.38)[0]
    runs = []
    for y in candidate:
        if runs and y == runs[-1][-1] + 1:
            runs[-1].append(int(y))
        else:
            runs.append([int(y)])
    centers = [int(round(sum(r) / len(r))) for r in runs if len(r) <= max(5, height * .009)]
    # Viiden tasavälisen viivan ryhmät, palautetaan vain ryhmät joiden väli on uskottava.
    staves = []
    used = set()
    for i in range(len(centers) - 4):
        ys = centers[i:i+5]
        gaps = np.diff(ys)
        spacing = float(np.median(gaps))
        if not (5 <= spacing <= max(70, height / 10)):
            continue
        if max(abs(float(g) - spacing) for g in gaps) > max(2.5, spacing * .22):
            continue
        inds = set(range(i, i + 5))
        if used & inds:
            continue
        staves.append({'lines_y': ys, 'line_spacing_px': round(spacing, 1)})
        used |= inds
    return {'image_width': width, 'image_height': height, 'staves': staves,
            'staff_count': len(staves), 'key_signature': None, 'musicxml_available': False,
            'message': ('Viivastot havaittu. Etumerkkien ja nuottien tunnistus on seuraava kehitysvaihe.'
                        if staves else 'Viivastoja ei voitu tunnistaa luotettavasti. Kokeile suoraa, terävää skannausta.')}

@app.post('/api/analyze')
def analyze():
    file = request.files.get('file')
    if not file:
        return jsonify(detail='Lisää kuva kenttään file.'), 400
    if not (file.mimetype or '').startswith('image/'):
        return jsonify(detail='Tämä testivaihe tukee vain PNG/JPEG-kuvia, ei vielä PDF:ää.'), 415
    try:
        content = file.read()
        image = Image.open(io.BytesIO(content))
        if image.format not in ('PNG', 'JPEG', 'WEBP'):
            return jsonify(detail='Käytä PNG-, JPG- tai WEBP-kuvaa.'), 415
        if image.width * image.height > 18_000_000:
            return jsonify(detail='Kuva on liian suuri (enintään 18 megapikseliä).'), 413
        data = detect_staves(image)
        return jsonify(data)
    except (UnidentifiedImageError, OSError, ValueError):
        return jsonify(detail='Kuvatiedostoa ei voitu avata.'), 400

@app.post('/api/recognize')
def recognize():
    return jsonify(detail='MusicXML-nuotintunnistus ei ole vielä valmis. Käytä toistaiseksi /api/analyze-rajapintaa viivastotestiin.'), 501

@app.get('/test')
def test_page():
    return render_template_string('''<!doctype html><html lang="fi"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Nuottipaja – viivastotesti</title><style>body{font-family:system-ui;max-width:720px;margin:3em auto;padding:1em;line-height:1.5}input,button{font-size:1rem;padding:.7em}pre{white-space:pre-wrap;background:#eee;padding:1em;border-radius:8px}</style><h1>Nuottipaja – kuvantunnistustesti</h1><p>Valitse kuva nuottiviivastosta. Tässä versiossa etsitään vain viivastot, ei vielä sävellajia tai MusicXML:ää.</p><input id="f" type="file" accept="image/png,image/jpeg,image/webp"><button id="b">Tutki kuva</button><pre id="out">Ei analyysiä.</pre><script>document.getElementById('b').onclick=async()=>{const f=document.getElementById('f').files[0], out=document.getElementById('out');if(!f){out.textContent='Valitse kuva.';return}out.textContent='Tutkitaan...';try{let body=new FormData();body.append('file',f);const r=await fetch('/api/analyze',{method:'POST',body});out.textContent=JSON.stringify(await r.json(),null,2)}catch(e){out.textContent=String(e)}}</script></html>''')

@app.errorhandler(413)
def too_large(e):
    return jsonify(detail='Tiedosto on liian suuri (raja 8 Mt).'), 413
