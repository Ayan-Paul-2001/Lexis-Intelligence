import os
import tempfile
import base64
import urllib.parse
from flask import Flask, request, send_file, jsonify
import yt_dlp

app = Flask(__name__)

@app.route('/api/convert-yt-mp3', methods=['POST'])
def handler():
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
            'format': 'bestaudio/best',
            'outtmpl': f'{file_path}.%(ext)s',
            'postprocessors': [{
                'key': 'FFmpegExtractAudio',
                'preferredcodec': 'mp3',
                'preferredquality': '192',
            }],
            'quiet': True,
        }

        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            # Get video title
            info = ydl.extract_info(youtube_url, download=True)
            title = info.get('title', 'audio')
            # Sanitize title
            safe_title = "".join([c for c in title if c.isalnum() or c in (' ', '-', '_')]).strip()

        actual_file = f'{file_path}.mp3'
        
        if not os.path.exists(actual_file):
            return jsonify({"error": "Conversion failed"}), 500

        # Send the file
        response = send_file(
            actual_file,
            mimetype="audio/mpeg",
            as_attachment=True,
            download_name=f"{safe_title}.mp3"
        )
        
        # Add headers for PWA/Vercel
        response.headers["Content-Disposition"] = f"attachment; filename*=UTF-8''{urllib.parse.quote(safe_title)}.mp3"
        return response

    except Exception as e:
        print(f"Error: {str(e)}")
        return jsonify({"error": "Conversion failed. Please try a shorter video."}), 500
