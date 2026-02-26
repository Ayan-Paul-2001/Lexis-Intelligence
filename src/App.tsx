import { useState, useRef, useEffect } from 'react';
import {
  Mic,
  Upload,
  FileAudio,
  Loader2,
  MessageSquare,
  AlertCircle,
  X,
  Play,
  Pause,
  Download,
  Copy,
  Check,
  History,
  Settings2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import Markdown from 'react-markdown';
import { transcribeAudio, TranscriptionMode } from './services/geminiService';

export default function App() {
  const [file, setFile] = useState<File | null>(null);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [transcription, setTranscription] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [copied, setCopied] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [mode, setMode] = useState<TranscriptionMode>('dialogue');
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (file) {
      const url = URL.createObjectURL(file);
      setAudioUrl(url);
      setCurrentTime(0);
      setDuration(0);
      setIsPlaying(false);
      return () => URL.revokeObjectURL(url);
    } else {
      setAudioUrl(null);
    }
  }, [file]);

  useEffect(() => {
    if (copied) {
      const timer = setTimeout(() => setCopied(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [copied]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (selectedFile.type.startsWith('audio/')) {
        setFile(selectedFile);
        setError(null);
        setTranscription(null);
      } else {
        setError('Unsupported file type. Please upload an audio file.');
      }
    }
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const base64String = (reader.result as string).split(',')[1];
        resolve(base64String);
      };
      reader.onerror = (error) => reject(error);
    });
  };

  const handleTranscribe = async () => {
    if (!file) return;

    setIsTranscribing(true);
    setError(null);
    try {
      const base64Audio = await fileToBase64(file);
      const result = await transcribeAudio(base64Audio, file.type, mode);
      setTranscription(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsTranscribing(false);
    }
  };

  const reset = () => {
    setFile(null);
    setTranscription(null);
    setError(null);
    if (audioRef.current) {
      audioRef.current.pause();
    }
  };

  const togglePlay = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const formatTime = (secs: number) => {
    if (!isFinite(secs) || isNaN(secs)) return '0:00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!audioRef.current || !duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const newTime = ratio * duration;
    audioRef.current.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const downloadTranscription = () => {
    if (!transcription) return;
    const blob = new Blob([transcription], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `transcription-${file?.name || 'dialogue'}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const copyToClipboard = () => {
    if (!transcription) return;
    navigator.clipboard.writeText(transcription);
    setCopied(true);
  };

  return (
    <div className="min-h-screen bg-[#fafafa] text-zinc-900 font-sans selection:bg-zinc-200">
      {/* Navigation Rail / Header */}
      <nav className="fixed top-0 left-0 right-0 h-16 bg-white/80 backdrop-blur-xl border-b border-zinc-200 z-50 flex items-center justify-between px-6">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-zinc-900 rounded-lg flex items-center justify-center text-white">
            <Mic size={18} strokeWidth={2.5} />
          </div>
          <span className="font-bold tracking-tight text-lg">Lexis</span>
        </div>
        <div className="flex items-center gap-4">
          <button className="p-2 text-zinc-400 hover:text-zinc-900 transition-colors">
            <History size={20} />
          </button>
          <button className="p-2 text-zinc-400 hover:text-zinc-900 transition-colors">
            <Settings2 size={20} />
          </button>
        </div>
      </nav>

      <main className="pt-32 pb-24 px-6 max-w-5xl mx-auto">
        <div className="grid lg:grid-cols-[1fr_400px] gap-12 items-start">

          {/* Left Column: Content */}
          <div className="space-y-8">
            <header className="space-y-2">
              <h1 className="text-4xl font-extrabold tracking-tight text-zinc-900">
                Lexis Intelligence
              </h1>
              <p className="text-zinc-500 text-lg leading-relaxed max-w-xl">
                High-fidelity verbatim transcription for professional conversations, interviews, and recordings.
              </p>
            </header>

            <AnimatePresence mode="wait">
              {transcription ? (
                <motion.div
                  key="result"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="bg-white rounded-3xl border border-zinc-200 shadow-sm overflow-hidden"
                >
                  <div className="flex items-center justify-between px-8 py-5 border-b border-zinc-100 bg-zinc-50/50">
                    <div className="flex items-center gap-2 text-zinc-500 font-medium text-sm uppercase tracking-widest">
                      <MessageSquare size={14} />
                      Transcript
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={copyToClipboard}
                        className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white border border-zinc-200 text-xs font-bold hover:bg-zinc-50 transition-all"
                      >
                        {copied ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
                        {copied ? 'Copied' : 'Copy'}
                      </button>
                      <button
                        onClick={downloadTranscription}
                        className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-zinc-900 text-white text-xs font-bold hover:bg-zinc-800 transition-all"
                      >
                        <Download size={14} />
                        Export
                      </button>
                    </div>
                  </div>
                  <div className="p-8 md:p-12">
                    <div className="prose prose-zinc max-w-none prose-p:text-zinc-700 prose-p:leading-[1.8] prose-strong:text-zinc-900 prose-strong:font-bold">
                      <Markdown>{transcription}</Markdown>
                    </div>
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key="empty"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="aspect-[4/3] rounded-3xl border-2 border-dashed border-zinc-200 bg-zinc-50/30 flex flex-col items-center justify-center text-center p-12"
                >
                  <div className="w-16 h-16 bg-white rounded-2xl shadow-sm border border-zinc-100 flex items-center justify-center text-zinc-400 mb-6">
                    <FileAudio size={32} />
                  </div>
                  <h3 className="text-xl font-bold text-zinc-900 mb-2">No active transcript</h3>
                  <p className="text-zinc-500 max-w-xs">
                    Upload an audio file to begin the high-fidelity transcription process.
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Right Column: Controls */}
          <aside className="lg:sticky lg:top-32 space-y-6">
            <div className="bg-white rounded-3xl border border-zinc-200 p-6 shadow-sm space-y-6">
              <div className="space-y-1">
                <h4 className="text-sm font-bold uppercase tracking-widest text-zinc-400">Source</h4>
                <p className="text-xs text-zinc-500">Select your audio recording</p>
              </div>

              {/* Transcription Mode Selector */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-widest text-zinc-400">Mode</h4>
                <div className="flex p-1 bg-zinc-100 rounded-xl gap-1">
                  <button
                    onClick={() => { setMode('dialogue'); setTranscription(null); }}
                    className={`flex-1 h-9 rounded-lg text-xs font-bold transition-all ${mode === 'dialogue'
                      ? 'bg-white text-zinc-900 shadow-sm'
                      : 'text-zinc-400 hover:text-zinc-600'
                      }`}
                  >
                    Dialogue
                  </button>
                  <button
                    onClick={() => { setMode('lyrical'); setTranscription(null); }}
                    className={`flex-1 h-9 rounded-lg text-xs font-bold transition-all ${mode === 'lyrical'
                      ? 'bg-white text-zinc-900 shadow-sm'
                      : 'text-zinc-400 hover:text-zinc-600'
                      }`}
                  >
                    Lyrical
                  </button>
                </div>
                <p className="text-[10px] text-zinc-400 leading-relaxed">
                  {mode === 'dialogue'
                    ? 'Speaker-labeled turns, non-verbal cues included.'
                    : 'Plain verbatim text, no speaker labels — ideal for songs or raw speech.'}
                </p>
              </div>

              {!file ? (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="group relative h-48 rounded-2xl border-2 border-dashed border-zinc-200 hover:border-zinc-900 hover:bg-zinc-50 transition-all cursor-pointer flex flex-col items-center justify-center gap-3"
                >
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    accept="audio/*"
                    className="hidden"
                  />
                  <div className="p-3 bg-zinc-100 rounded-xl group-hover:bg-zinc-900 group-hover:text-white transition-all">
                    <Upload size={20} />
                  </div>
                  <span className="text-sm font-bold">Choose File</span>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="p-4 bg-zinc-50 rounded-2xl border border-zinc-100 flex items-center justify-between">
                    <div className="flex items-center gap-3 overflow-hidden">
                      <div className="w-10 h-10 bg-white rounded-xl border border-zinc-200 flex items-center justify-center text-zinc-400 flex-shrink-0">
                        <FileAudio size={18} />
                      </div>
                      <div className="overflow-hidden">
                        <p className="text-sm font-bold truncate">{file.name}</p>
                        <p className="text-[10px] text-zinc-400 font-mono">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                      </div>
                    </div>
                    <button
                      onClick={reset}
                      className="p-2 text-zinc-300 hover:text-red-500 transition-colors"
                    >
                      <X size={16} />
                    </button>
                  </div>

                  {/* Audio Player */}
                  <div className="rounded-2xl border border-zinc-100 bg-zinc-50 overflow-hidden">
                    {/* Play/Pause Row */}
                    <div className="flex items-center gap-3 px-4 pt-4 pb-3">
                      <button
                        onClick={togglePlay}
                        className="w-9 h-9 flex-shrink-0 flex items-center justify-center rounded-full bg-zinc-900 text-white hover:bg-zinc-700 transition-all shadow-sm"
                      >
                        {isPlaying
                          ? <Pause size={14} fill="currentColor" />
                          : <Play size={14} fill="currentColor" className="ml-0.5" />}
                      </button>

                      {/* Time stamps */}
                      <div className="flex items-center gap-1 text-[11px] font-mono text-zinc-500 tabular-nums flex-shrink-0">
                        <span className={isPlaying ? 'text-zinc-900 font-semibold' : ''}>{formatTime(currentTime)}</span>
                        <span className="text-zinc-300">/</span>
                        <span>{formatTime(duration)}</span>
                      </div>

                      {/* Live pulse indicator */}
                      {isPlaying && (
                        <div className="ml-auto flex items-center gap-1">
                          {[0, 1, 2].map((i) => (
                            <span
                              key={i}
                              className="block w-0.5 bg-zinc-900 rounded-full animate-bounce"
                              style={{ height: `${8 + i * 4}px`, animationDelay: `${i * 0.15}s`, animationDuration: '0.6s' }}
                            />
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Seekable Progress Bar */}
                    <div
                      className="h-1.5 bg-zinc-200 cursor-pointer relative group mx-4 mb-4 rounded-full overflow-hidden"
                      onClick={handleSeek}
                    >
                      <div
                        className="h-full bg-zinc-900 rounded-full transition-all duration-100 relative"
                        style={{ width: `${duration ? (currentTime / duration) * 100 : 0}%` }}
                      >
                        {/* Thumb dot */}
                        <span className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 w-3 h-3 bg-zinc-900 rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow" />
                      </div>
                    </div>

                    <audio
                      ref={audioRef}
                      src={audioUrl || undefined}
                      onTimeUpdate={() => setCurrentTime(audioRef.current?.currentTime ?? 0)}
                      onLoadedMetadata={() => setDuration(audioRef.current?.duration ?? 0)}
                      onEnded={() => { setIsPlaying(false); setCurrentTime(0); }}
                      className="hidden"
                    />
                  </div>

                  <button
                    onClick={handleTranscribe}
                    disabled={isTranscribing}
                    className="w-full h-14 rounded-2xl bg-zinc-900 text-white font-bold text-sm hover:bg-zinc-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-xl shadow-zinc-200 flex items-center justify-center gap-3"
                  >
                    {isTranscribing ? (
                      <>
                        <Loader2 className="animate-spin" size={18} />
                        Processing...
                      </>
                    ) : (
                      <>
                        <Mic size={18} />
                        {mode === 'dialogue' ? 'Transcribe as Dialogue' : 'Transcribe as Lyrical'}
                      </>
                    )}
                  </button>
                </div>
              )}

              {error && (
                <div className="p-4 bg-red-50 rounded-2xl border border-red-100 flex items-start gap-3 text-red-600">
                  <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
                  <p className="text-xs font-medium leading-relaxed">{error}</p>
                </div>
              )}
            </div>

            <div className="bg-zinc-900 rounded-3xl p-6 text-white space-y-4">
              <h4 className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500">Engine Stats</h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <p className="text-2xl font-light">99.8<span className="text-xs text-zinc-500 ml-0.5">%</span></p>
                  <p className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider">Accuracy</p>
                </div>
                <div className="space-y-1">
                  <p className="text-2xl font-light">Flash<span className="text-xs text-zinc-500 ml-0.5">3</span></p>
                  <p className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider">Model</p>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </main>

      <footer className="fixed bottom-0 left-0 right-0 h-14 flex items-center justify-center px-6 pointer-events-none">
        <div className="bg-zinc-900 border border-zinc-700 px-5 py-2 rounded-full text-[11px] font-semibold uppercase tracking-widest text-zinc-300 pointer-events-auto shadow-lg shadow-zinc-900/20 flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block animate-pulse" />
          Lexis Intelligence &bull; Transcriber Engine v1.0.4
        </div>
      </footer>
    </div>
  );
}
