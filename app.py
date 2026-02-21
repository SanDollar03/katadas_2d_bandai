from flask import Flask, render_template, request, jsonify, send_from_directory
import os
import json

app = Flask(__name__)

# ─────────────────────────────────────────
# Paths
# ─────────────────────────────────────────
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(BASE_DIR, 'data')
LOG_DIR = os.path.join(BASE_DIR, 'logs')
IMAGE_DIR = os.path.join(BASE_DIR, 'images')

GRID_CFG_PATH = os.path.join(DATA_DIR, 'grid_config.json')
OPTIONS_FILE = 'trouble_note_options.json'

ADMIN_PASSWORD = os.environ.get("KATADAS_ADMIN_PW", "katadas2d")

# ─────────────────────────────────────────
# Init
# ─────────────────────────────────────────
def initialize():
    os.makedirs(DATA_DIR, exist_ok=True)
    os.makedirs(LOG_DIR, exist_ok=True)
    os.makedirs(IMAGE_DIR, exist_ok=True)

def load_json(filename):
    path = os.path.join(DATA_DIR, filename)
    try:
        with open(path, 'r', encoding='utf-8') as f:
            return json.load(f)
    except Exception as e:
        print(f"[JSON読み込みエラー] {filename}: {e}")
        return None

# ─────────────────────────────────────────
# Grid config
# ─────────────────────────────────────────
def read_grid_config():
    try:
        if not os.path.exists(GRID_CFG_PATH):
            return {"rows": 180, "cols": 320}
        with open(GRID_CFG_PATH, 'r', encoding='utf-8') as f:
            data = json.load(f)
            rows = int(data.get("rows", 180))
            cols = int(data.get("cols", 320))
            rows = max(1, min(180, rows))
            cols = max(1, min(320, cols))
            return {"rows": rows, "cols": cols}
    except Exception as e:
        print(f"[グリッド設定読み込みエラー] {e}")
        return {"rows": 180, "cols": 320}

def write_grid_config(rows: int, cols: int):
    data = {"rows": int(rows), "cols": int(cols)}
    with open(GRID_CFG_PATH, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

# ─────────────────────────────────────────
# Trouble note options
# ─────────────────────────────────────────
def load_trouble_note_options():
    data = load_json(OPTIONS_FILE)
    if isinstance(data, dict):
        return data
    return {
        "maker": [],
        "second_maker": [],
        "mold_name": [],
        "mold_vendor": [],
        "materials": [],
        "trouble_types": [],
        "repair_types": [],
        "causes": [],
        "cause_owner": []
    }

# ─────────────────────────────────────────
# Routes
# ─────────────────────────────────────────
@app.route('/')
def index():
    return render_template('index.html')

@app.route('/get_products')
def get_products():
    data = load_json('products.json')
    return jsonify(data if isinstance(data, list) else [])

@app.route('/get_issues')
def get_issues():
    data = load_json('issues.json')
    return jsonify(data if isinstance(data, list) else [])

@app.route('/get_save_path')
def get_save_path():
    return jsonify({"path": LOG_DIR})

@app.route('/get_trouble_note_options')
def get_trouble_note_options():
    return jsonify(load_trouble_note_options())

@app.route('/get_grid_config')
def get_grid_config():
    return jsonify(read_grid_config())

@app.route('/set_grid_config', methods=['POST'])
def set_grid_config():
    try:
        payload = request.get_json(silent=True) or {}
        pw = payload.get('password', '')
        rows = int(payload.get('rows', 180))
        cols = int(payload.get('cols', 320))

        if pw != ADMIN_PASSWORD:
            return 'Forbidden', 403

        rows = max(1, min(180, rows))
        cols = max(1, min(320, cols))

        write_grid_config(rows, cols)
        print(f"[グリッド設定更新] rows={rows}, cols={cols} -> {GRID_CFG_PATH}")
        return jsonify({"rows": rows, "cols": cols})
    except Exception as e:
        print(f"[グリッド設定保存エラー] {e}")
        return 'Server error', 500

@app.route('/verify_password', methods=['POST'])
def verify_password():
    try:
        payload = request.get_json(silent=True) or {}
        pw = payload.get('password', '')
        if pw == ADMIN_PASSWORD:
            return '', 200
        return 'Forbidden', 403
    except Exception as e:
        print(f"[PW検証エラー] {e}")
        return 'Server error', 500

@app.route('/images/<path:filename>')
def get_image(filename):
    return send_from_directory(IMAGE_DIR, filename)

@app.route('/save_csv', methods=['POST'])
def save_csv():
    try:
        data = request.data.decode('utf-8')
        timestamp = request.args.get('timestamp')
        if not timestamp:
            return 'Missing timestamp', 400

        filename = f"log_{timestamp}.csv"
        full_path = os.path.join(LOG_DIR, filename)

        with open(full_path, 'w', encoding='utf-8') as f:
            f.write(data)

        print(f"[CSV保存完了] {full_path}")
        return '', 200
    except Exception as e:
        print(f"[CSV保存エラー] {e}")
        return 'CSV保存に失敗しました', 500

if __name__ == '__main__':
    initialize()
    print("別PCからアクセスするにはこのPCのIPアドレスを使用してください（例: http://192.168.0.5:5030）")
    app.run(debug=True, host="0.0.0.0", port=5030, use_reloader=False)