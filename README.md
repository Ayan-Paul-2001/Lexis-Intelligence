# Lexis: Dialogue Intelligence Transcriber

Lexis is a professional-grade audio transcription application engineered to process spoken dialogue using advanced artificial intelligence. Specifically designed for accuracy and speaker differentiation, the system leverages the Google Gemini AI engine to produce high-fidelity, verbatim transcripts from audio recordings. The architecture emphasizes a seamless user experience, combining a modern React front-end with an efficient Vite-powered build system.

---

> **IMPORTANT NOTICE -- CREDENTIALS REMOVED**
>
> All authentication credentials, API keys, service account files, and sensitive configuration data have been permanently removed from this repository for security compliance. The public codebase does not contain any operational secrets required to run the application.
>
> To obtain the complete, fully functional codebase with all necessary credentials and environment configurations, please contact the project administrator directly.
>
> Unauthorized attempts to reconstruct or reverse-engineer removed credentials are strictly prohibited.

---

## Key Capabilities

*   **Verbatim Transcription Processing:** Analyzes and transcribes spoken audio with high precision, capturing non-verbal cues and nuanced dialogue.
*   **Automated Speaker Diarization:** Intelligently identifies and separates distinct voices within the audio stream, outputting cleanly labeled speaker segments.
*   **YouTube Video Transcription:** Directly ingests YouTube video URLs to extract and transcribing audio without manual downloading.
*   **YouTube to MP3 Converter:** Included dedicated side-tool to reliably convert and extract high-quality MP3 files straight from YouTube into a local `Files` directory.
*   **Integrated Audio Playback:** Features a built-in pre-transcription monitoring environment, allowing users to review audio files immediately upon upload.
*   **Data Export Mechanisms:** Provides streamlined export functionality, supporting direct clipboard memory access and localized .txt file generation for archival purposes.
*   **Responsive User Interface:** Built upon React 19 and Tailwind CSS 4, ensuring a responsive, accessible, and performant user interface across modern browsers.

## Technical Architecture

The technology stack has been selected for optimal performance, maintainability, and immediate development feedback:

*   **Core Framework:** React 19
*   **Build Tooling & Server:** Vite 6
*   **Styling Engine:** Tailwind CSS 4
*   **Artificial Intelligence:** Google GenAI SDK (`@google/genai`)
*   **Iconography:** Lucide React
*   **Animation Routing:** Motion (Framer Motion)
*   **Content Rendering:** React Markdown
*   **Database Management (if applicable):** Better-SQLite3

## System Prerequisites

To deploy and run the application locally, the host environment must meet the following baseline requirements:

1.  **Node.js Runtime Environment:** Version 18.x or greater is strongly recommended.
2.  **Package Manager:** Node Package Manager (npm), typically distributed with the Node.js installation.
3.  **Google Cloud Account:** A Google Cloud project with the Vertex AI API enabled.
4.  **Service Account Key:** A Google Cloud service account JSON key file with Vertex AI permissions.
5.  **ffmpeg (Recommended):** Required for optimal YouTube audio extraction. Download from [ffmpeg.org](https://ffmpeg.org/download.html) and ensure it is available in your system PATH.

## Installation Guide

Follow these steps sequentially to set up and run the application from scratch.

### Step 1 -- Clone the Repository

Clone the project repository to your local machine and navigate into the root directory:

```bash
git clone <repository-url>
cd lexis-transcriber
```

### Step 2 -- Install Dependencies

Execute the package manager to fetch and install all required dependencies:

```bash
npm install
```

This will install the following core packages:
- `@google/genai` -- Google Generative AI SDK for Vertex AI integration
- `youtube-dl-exec` -- YouTube audio extraction engine (yt-dlp)
- `express` -- Backend middleware for API proxying
- `react`, `react-dom` -- Core UI framework (v19)
- `tailwindcss`, `@tailwindcss/vite` -- Styling engine (v4)
- `lucide-react` -- Icon library
- `motion` -- Animation library (Framer Motion)
- `react-markdown` -- Markdown rendering for transcript output

### Step 3 -- Configure Environment Variables

Create a `.env` file at the repository root with the following variables:

```env
# Gemini API Key (fallback for non-Vertex usage)
GEMINI_API_KEY="your_gemini_api_key_here"

# Application URL
APP_URL="your_app_url_here"

# Vertex AI Configuration
GOOGLE_APPLICATION_CREDENTIALS="/absolute/path/to/your/service-account-key.json"
VERTEX_PROJECT_ID="your_google_cloud_project_id"
VERTEX_LOCATION="global"
```

| Variable | Description |
|---|---|
| `GEMINI_API_KEY` | Your Google Gemini API key (used as fallback if Vertex AI is not configured) |
| `APP_URL` | The deployment URL of the application |
| `GOOGLE_APPLICATION_CREDENTIALS` | Absolute file path to your Google Cloud service account JSON key |
| `VERTEX_PROJECT_ID` | Your Google Cloud project ID (e.g., `my-project-123456`) |
| `VERTEX_LOCATION` | Vertex AI regional endpoint (use `global` for Gemini 3 preview models) |

### Step 4 -- Obtain Google Cloud Service Account Key

1. Navigate to the [Google Cloud Console](https://console.cloud.google.com/).
2. Select your project or create a new one.
3. Go to **IAM & Admin** then **Service Accounts**.
4. Create a new service account or select an existing one.
5. Grant the role **Vertex AI User** (`roles/aiplatform.user`).
6. Under the **Keys** tab, click **Add Key** then **Create new key** then select **JSON**.
7. Download the JSON file and place it in a secure location on your machine.
8. Update the `GOOGLE_APPLICATION_CREDENTIALS` variable in your `.env` file with the absolute path to this file.

### Step 5 -- Verify Vertex AI API is Enabled

1. In the Google Cloud Console, navigate to **APIs & Services** then **Enabled APIs**.
2. Search for **Vertex AI API**.
3. If not already enabled, click **Enable**.

### Step 6 -- Install ffmpeg (Recommended)

ffmpeg is required for optimal YouTube audio extraction and format conversion.

**Windows:**
```bash
winget install Gyan.FFmpeg
```

**macOS:**
```bash
brew install ffmpeg
```

**Linux (Ubuntu/Debian):**
```bash
sudo apt update && sudo apt install ffmpeg
```

Verify installation:
```bash
ffmpeg -version
```

### Step 7 -- Start the Development Server

Launch the application with hot-module replacement:

```bash
npm run dev
```

The service will start and be accessible at `http://localhost:3000`.

### Step 8 -- Verify the Installation

1. Open `http://localhost:3000` in your browser.
2. Upload a short audio file (MP3, WAV, or M4A).
3. Select a transcription mode (Dialogue or Lyrical).
4. Click the transcribe button and confirm that a transcript is returned successfully.
5. (Optional) Switch to the YouTube source tab, paste a YouTube link, and verify YouTube transcription.

## Build Commands

| Command | Description |
|---|---|
| `npm run dev` | Start the development server with hot-reload on port 3000 |
| `npm run build` | Compile an optimized production build to the `dist` directory |
| `npm run preview` | Serve the production build locally for verification |
| `npm run lint` | Run TypeScript type checking without emitting files |
| `npm run clean` | Remove the `dist` directory |

## User Workflow Documentation

### Transcription Process
1.  **Audio Ingestion:** Initiate the process by uploading a local audio file (standard web-audio containers like MP3, WAV, M4A) or switch the input source to **YouTube** and paste a video URL.
2.  **Source Verification:** If using a local file, utilize the embedded audio player to audition the file and confirm correct selection prior to initiating transcription.
3.  **Execution:** Trigger the transcription action (Dialogue or Lyrical) to send the extracted streaming data to the AI processing layer.
4.  **Data Review:** Upon successful response, the main transcript area will populate. Review the speaker-attributed dialogue blocks for accuracy.
5.  **Output Extraction:** Click the "Copy" action to place the formatted transcript into the operating system clipboard, or select "Export" to download a formatted `.txt` document to the local filesystem.

### YouTube to MP3 Conversion
1.  **Interface Access:** Navigate to the top navigation bar and select the **"Mp3 Converter"** action.
2.  **Link Input:** Paste the target YouTube video URL into the provided text field.
3.  **Extraction Trigger:** Click **"Convert"** to spin up the yt-dlp binary system and isolate the core audio as an `.mp3` cache file.
4.  **Save or Discard:** Upon successful cache, click **"Download"** to permanently dump the file to your isolated `/Files/` root directory. Alternatively, tap **"Cancel"** to abort and flush the temp cache safely.

## Licensing Information

This software is distributed under the Apache License, Version 2.0. Please review the LICENSE file for comprehensive terms regarding reproduction, distribution, and modification.
