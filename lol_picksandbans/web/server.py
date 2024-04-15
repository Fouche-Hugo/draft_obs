from flask import Flask, send_from_directory
import os

app = Flask(__name__)

@app.route('/')
def home():
    return send_from_directory('', 'admin.html')

@app.route('/<path:path>')
def serve_file_in_dir(path):
    if not os.path.isfile(path):
        path = os.path.join(path, 'index.html')

    return send_from_directory('', path)

if __name__ == "__main__":
    app.run(port=5000)