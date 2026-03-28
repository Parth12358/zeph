from flask import Flask, request, jsonify

app = Flask(__name__)

@app.route('/bash', methods=['POST'])
def bash():
    cmd = request.json.get('command')
    print(f"[BASH] Received: {cmd}")
    return jsonify({"status": "ok", "output": f"mock executed: {cmd}"})

@app.route('/dispatch', methods=['POST'])
def dispatch():
    cmd = request.json.get('command')
    print(f"[HYPRCTL] Received: {cmd}")
    return jsonify({"status": "ok", "output": f"mock dispatched: {cmd}"})

@app.route('/airdrop', methods=['POST'])
def airdrop():
    file = request.json.get('file')
    print(f"[AIRDROP] Received: {file}")
    return jsonify({"status": "ok", "output": f"mock airdrop: {file}"})

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)
