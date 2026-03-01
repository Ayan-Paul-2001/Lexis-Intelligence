import { useState } from 'react';
import { Loader2, Music, Download, X, Check, FileAudio } from 'lucide-react';

export default function Mp3Converter() {
    const [url, setUrl] = useState('');
    const [isConverting, setIsConverting] = useState(false);
    const [convertedData, setConvertedData] = useState<{ tempId: string; title: string } | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [actionStatus, setActionStatus] = useState<'idle' | 'saving' | 'saved' | 'cancelled'>('idle');

    const handleConvert = async () => {
        if (!url.trim()) return;
        setIsConverting(true);
        setError(null);
        setConvertedData(null);
        setActionStatus('idle');

        try {
            const res = await fetch('/api/convert-yt-mp3', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ youtubeUrl: url.trim() }),
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Conversion failed');

            setConvertedData({ tempId: data.tempId, title: data.title });
        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsConverting(false);
        }
    };

    const handleDownload = async () => {
        if (!convertedData) return;
        setActionStatus('saving');
        try {
            const res = await fetch('/api/save-yt-mp3', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ tempId: convertedData.tempId, title: convertedData.title }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed to save');
            setActionStatus('saved');
        } catch (err: any) {
            setError(err.message);
            setActionStatus('idle');
        }
    };

    const handleCancel = async () => {
        if (!convertedData) return;
        try {
            await fetch('/api/cancel-yt-mp3', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ tempId: convertedData.tempId }),
            });
        } catch (err) {
            console.error(err);
        }
        setConvertedData(null);
        setUrl('');
        setActionStatus('cancelled');
    };

    return (
        <div className="max-w-3xl mx-auto mt-12 space-y-8">
            <div className="text-center space-y-4">
                <div className="w-16 h-16 bg-red-50 text-red-500 rounded-2xl flex items-center justify-center mx-auto mb-6">
                    <Music size={32} />
                </div>
                <h2 className="text-3xl font-extrabold text-zinc-900">YouTube to MP3 Converter</h2>
                <p className="text-zinc-500 max-w-lg mx-auto">
                    Convert any YouTube video to a high-quality MP3 file in seconds.
                </p>
            </div>

            <div className="bg-white p-8 rounded-3xl border border-zinc-200 shadow-sm space-y-6">
                <div className="space-y-4">
                    <label className="text-sm font-bold text-zinc-900 ml-1">Insert a YouTube video URL</label>
                    <div className="flex flex-col sm:flex-row gap-3">
                        <input
                            type="url"
                            placeholder="youtube.com/watch?v="
                            value={url}
                            onChange={(e) => setUrl(e.target.value)}
                            disabled={isConverting || !!convertedData}
                            className="flex-1 h-12 px-4 rounded-xl bg-zinc-50 border border-zinc-200 focus:bg-white focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all text-sm"
                        />
                        <button
                            onClick={handleConvert}
                            disabled={isConverting || !!convertedData || !url.trim()}
                            className="h-12 flex items-center rounded-xl overflow-hidden shadow-sm disabled:opacity-50 disabled:cursor-not-allowed transition-all hover:shadow-md"
                        >
                            <div className="h-full px-4 bg-zinc-900 text-white flex items-center justify-center font-bold text-sm tracking-wide">
                                .mp3
                            </div>
                            <div className="h-full px-6 bg-[#E53935] text-white flex items-center justify-center font-bold text-sm">
                                {isConverting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Convert'}
                            </div>
                        </button>
                    </div>
                    {error && (
                        <p className="text-sm text-red-500 mt-2 font-medium">{error}</p>
                    )}
                </div>

                {convertedData && actionStatus !== 'saved' && (
                    <div className="p-6 bg-zinc-50 border border-zinc-200 rounded-2xl animate-in fade-in slide-in-from-bottom-2">
                        <div className="flex items-center gap-4 mb-6">
                            <div className="w-12 h-12 bg-white rounded-xl border border-zinc-200 flex items-center justify-center text-zinc-400">
                                <FileAudio size={24} />
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-bold text-zinc-900 truncate" title={convertedData.title}>
                                    {convertedData.title}.mp3
                                </p>
                                <p className="text-xs text-zinc-500 mt-1">Ready for download</p>
                            </div>
                        </div>

                        <div className="flex items-center gap-3">
                            <button
                                onClick={handleDownload}
                                disabled={actionStatus === 'saving'}
                                className="flex-1 h-12 bg-zinc-900 text-white rounded-xl font-bold text-sm hover:bg-zinc-800 transition-colors flex items-center justify-center gap-2"
                            >
                                {actionStatus === 'saving' ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                    <>
                                        <Download size={16} />
                                        Download
                                    </>
                                )}
                            </button>
                            <button
                                onClick={handleCancel}
                                disabled={actionStatus === 'saving'}
                                className="flex-1 h-12 bg-white text-zinc-700 border border-zinc-200 rounded-xl font-bold text-sm hover:bg-zinc-50 hover:text-red-500 transition-colors flex items-center justify-center gap-2"
                            >
                                <X size={16} />
                                Cancel
                            </button>
                        </div>
                    </div>
                )}

                {actionStatus === 'saved' && (
                    <div className="p-6 bg-emerald-50 border border-emerald-100 rounded-2xl flex flex-col items-center justify-center text-center space-y-3 animate-in fade-in slide-in-from-bottom-2">
                        <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center">
                            <Check size={24} strokeWidth={3} />
                        </div>
                        <div>
                            <p className="text-sm font-bold text-emerald-900">Successfully Saved!</p>
                            <p className="text-xs text-emerald-700 mt-1">
                                The file has been saved to the "Files" folder in your project directory.
                            </p>
                        </div>
                        <button
                            onClick={() => {
                                setUrl('');
                                setConvertedData(null);
                                setActionStatus('idle');
                            }}
                            className="mt-2 text-xs font-bold text-emerald-700 hover:text-emerald-800 underline underline-offset-2"
                        >
                            Convert another video
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
