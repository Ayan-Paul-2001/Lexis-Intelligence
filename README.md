# Lexis: Dialogue Intelligence Transcriber

Lexis is a professional-grade audio transcription application engineered to process spoken dialogue using advanced artificial intelligence. Specifically designed for accuracy and speaker differentiation, the system leverages the Google Gemini AI engine to produce high-fidelity, verbatim transcripts from audio recordings. The architecture emphasizes a seamless user experience, combining a modern React front-end with an efficient Vite-powered build system.

## Key Capabilities

*   **Verbatim Transcription Processing:** Analyzes and transcribes spoken audio with high precision, capturing non-verbal cues and nuanced dialogue.
*   **Automated Speaker Diarization:** Intelligently identifies and separates distinct voices within the audio stream, outputting cleanly labeled speaker segments.
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
3.  **Authentication Credentials:** An active Google Gemini API Key, provisioned through the Google AI Studio or Google Cloud Console.

## Deployment Guidelines

Follow these sequential steps to initialize the application in a local development environment.

### 1. Repository Initialization

Clone the project repository to your local machine and navigate into the root directory:

```bash
git clone <repository-url>
cd lexis-transcriber
```

### 2. Dependency Resolution

Execute the package manager to fetch and install all required local dependencies outlined in the `package.json`:

```bash
npm install
```

### 3. Environment Configuration

The application requires specific environment variables for secure operation. Create a `.env` file at the repository root and provision your authentication token:

```env
VITE_GEMINI_API_KEY="your_actual_api_key_here"
```
*(Note: Refer to standard security practices and never commit production API keys to public version control repositories.)*

## Application Operations

### Initializing Development Server

To launch the application with hot-module replacement for active development, run:

```bash
npm run dev
```

The service will bind to the specified port and typically be accessible via `http://localhost:3000`.

### Building for Production

To compile an optimized, minified production build:

```bash
npm run build
```

This process parses the `src` directory and outputs static assets into the `dist` directory, ready for server deployment.

### Previewing Production Build

To serve the generated production build locally for verification:

```bash
npm run preview
```

## User Workflow Documentation

1.  **Audio Ingestion:** Initiate the process by dragging and dropping an audio file into the designated upload zone, or utilize the native file selection dialog. Supported formats include standard web-audio containers (e.g., MP3, WAV, M4A).
2.  **Source Verification:** Utilize the embedded audio player to audition the file and confirm correct selection prior to initiating transcription.
3.  **Execution:** Trigger the "Transcribe Verbatim" action to send the binary audio stream to the AI processing layer.
4.  **Data Review:** Upon successful response, the main transcript area will populate. Review the speaker-attributed dialogue blocks for accuracy.
5.  **Output Extraction:** Click the "Copy" action to place the formatted transcript into the operating system clipboard, or select "Export" to download a formatted `.txt` document to the local filesystem.

## Licensing Information

This software is distributed under the Apache License, Version 2.0. Please review the LICENSE file for comprehensive terms regarding reproduction, distribution, and modification.
