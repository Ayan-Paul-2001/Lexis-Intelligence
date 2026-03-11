import os
import tempfile
import json
import base64
from flask import Flask, request, jsonify
import yt_dlp
import google.generativeai as genai

app = Flask(__name__)

def setup_google_auth():
    # Use the same JSON env var as the Node app
    credentials_json = os.environ.get('GOOGLE_SERVICE_ACCOUNT_JSON')
    if credentials_json:
        # Create a temp file for the credentials
        with tempfile.NamedTemporaryFile(mode='w', suffix='.json', delete=False) as f:
            f.write(credentials_json)
            os.environ['GOOGLE_APPLICATION_CREDENTIALS'] = f.name
    
    project_id = os.environ.get('VERTEX_PROJECT_ID')
    api_key = os.environ.get('GEMINI_API_KEY')
    
    if project_id:
        # Vertex AI setup (if project_id is provided)
        genai.configure(transport='rest') # Vertex usually uses REST on Vercel
    elif api_key:
        genai.configure(api_key=api_key)

@app.route('/api/transcribe-youtube', methods=['POST'])
def handler():
    try:
        data = request.get_json()
        youtube_url = data.get('youtubeUrl')
        prompt = data.get('prompt')
        
        if not youtube_url:
            return jsonify({"error": "No URL provided"}), 400

        # Create a temporary directory for the download
        with tempfile.TemporaryDirectory() as tmp_dir:
            file_template = os.path.join(tmp_dir, 'audio.%(ext)s')
            
            ydl_opts = {
                'format': 'bestaudio[ext=m4a]/bestaudio/best',
                'outtmpl': file_template,
                'postprocessors': [{
                    'key': 'FFmpegExtractAudio',
                    'preferredcodec': 'm4a',
                }],
                'quiet': True,
                'no_warnings': True,
            }
            
            with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                ydl.download([youtube_url])
            
            # Find the downloaded file
            audio_path = os.path.join(tmp_dir, 'audio.m4a')
            if not os.path.exists(audio_path):
                # Check for other extensions just in case
                files = os.listdir(tmp_dir)
                if not files:
                    raise Exception("Download failed")
                audio_path = os.path.join(tmp_dir, files[0])

            # Read and encode
            with open(audio_path, 'rb') as f:
                audio_data = base64.b64encode(f.read()).decode('utf-8')

            # Initialize Gemini
            setup_google_auth()
            model = genai.GenerativeModel('gemini-1.5-flash') # Using standard naming
            
            response = model.generate_content([
                prompt,
                {'mime_type': 'audio/mp4', 'data': audio_data}
            ])

            return jsonify({"text": response.text})

    except Exception as e:
        print(f"Error: {str(e)}")
        return jsonify({"error": "Transcription timed out or failed. Please try a shorter video."}), 500

# Vercel requires the app variable to be named 'app'
# and the function to be exported as 'handler' if not using a framework
# but for Flask, we just use the app directly.
