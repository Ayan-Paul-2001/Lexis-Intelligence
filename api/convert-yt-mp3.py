import os
import tempfile
import base64
import urllib.parse
from flask import Flask, request, send_file, jsonify
import yt_dlp

app = Flask(__name__)

@app.route('/', defaults={'path': ''}, methods=['POST', 'GET', 'OPTIONS'])
@app.route('/<path:path>', methods=['POST', 'GET', 'OPTIONS'])
def handler(path):
    try:
        data = request.get_json()
        youtube_url = data.get('youtubeUrl')
        
        if not youtube_url:
            return jsonify({"error": "No URL provided"}), 400

        # Create a temporary directory
        tmp_dir = tempfile.mkdtemp()
        file_id = base64.b64encode(os.urandom(6)).decode('utf-8').replace('/', '_').replace('+', '_')
        file_path = os.path.join(tmp_dir, f'lexis_{file_id}')

        ydl_opts = {
            'format': 'bestaudio[ext=m4a]/bestaudio/best',
            'outtmpl': f'{file_path}.%(ext)s',
            'quiet': True,
        }

        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            # Get video title
            info = ydl.extract_info(youtube_url, download=True)
            title = info.get('title', 'audio')
            # Sanitize title
            safe_title = "".join([c for c in title if c.isalnum() or c in (' ', '-', '_')]).strip()

        # Find actual downloaded file (might not be mp3 anymore since we bypass ffmpeg)
        files = os.listdir(tmp_dir)
        downloaded = [f for f in files if f.startswith(f'lexis_{file_id}')]
        
        if not downloaded:
            return jsonify({"error": "Conversion failed or file not found"}), 500

        actual_file_name = downloaded[0]
        actual_file_path = os.path.join(tmp_dir, actual_file_name)
        ext = actual_file_name.split('.')[-1]

        mimetype = "audio/mp4" if ext == "m4a" else "audio/webm"

        # Send the file
        response = send_file(
            actual_file_path,
            mimetype=mimetype,
            as_attachment=True,
            download_name=f"{safe_title}.{ext}"
        )
        
        # Add headers for PWA/Vercel
        response.headers["Content-Disposition"] = f"attachment; filename*=UTF-8''{urllib.parse.quote(safe_title)}.{ext}"
        return response

    except Exception as e:
        print(f"Error: {str(e)}")
        return jsonify({"error": "Conversion failed. Please try a shorter video."}), 500
