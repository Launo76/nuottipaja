
from flask import Flask, jsonify

app = Flask(__name__)

@app.route("/")
def home():
    return jsonify({
        "service": "Nuottipaja",
        "status": "ok",
        "message": "Taustapalvelu toimii!"
    })

@app.route("/health")
def health():
    return jsonify({"status": "ok"})
