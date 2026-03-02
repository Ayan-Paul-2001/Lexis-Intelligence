import { useState } from 'react';
import { Loader2, Music, Download, X } from 'lucide-react';

export default function Mp3Converter() {
    const [url, setUrl] = useState('');
    const [isConverting, setIsConverting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    const handleConvert = async () => {
        if (!url.trim()) return;
        setIsConverting(true);
        setError(null);
        setSuccess(false);

        try {
            const res = await fetch('/api/convert-yt-mp3', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ youtubeUrl: url.trim() }),
            });

            if (!res.ok) {
                const data = await res.json().catch(() => ({}));
                throw new Error(data.error || `Conversion failed (${res.status})`);
            }

            // Extract filename from Content-Disposition header
            const disposition = res.headers.get('Content-Disposition') || '';
            let filename = 'audio.mp3';
            const match = disposition.match(/filename\*=UTF-8''(.+)/i) || disposition.match(/filename="?([^"]+)"?/i);
            if (match?.[1]) filename = decodeURIComponent(match[1]);

            // Trigger native browser download
            const blob = await res.blob();
            const blobUrl = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = blobUrl;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(blobUrl);

            setSuccess(true);
            setUrl('');
        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsConverting(false);
        }
    };

    return (
        <div className="max-w-3xl mx-auto mt-12 space-y-8">
            <div className="text-center space-y-4">
                <div className="w-16 h-16 bg-red-50 text-red-500 rounded-2xl flex items-center justify-center mx-auto mb-6">
                    <Music size={32} />
                </div>
                <h2 className="text-3xl font-extrabold text-zinc-900">YouTube to MP3 Converter</h2>
                <p className="text-zinc-500 max-w-lg mx-auto">
                    Convert any YouTube video to a high-quality MP3 file — downloaded directly to your device.
                </p>
            </div>

            <div className="bg-white p-8 rounded-3xl border border-zinc-200 shadow-sm space-y-6">
                <div className="space-y-4">
                    <label className="text-sm font-bold text-zinc-900 ml-1">Insert a YouTube video URL</label>
                    <div className="flex flex-col sm:flex-row gap-3">
                        <input
                            type="url"
                            placeholder="https://www.youtube.com/watch?v=..."
                            value={url}
                            onChange={(e) => { setUrl(e.target.value); setSuccess(false); setError(null); }}
                            disabled={isConverting}
                            className="flex-1 h-12 px-4 rounded-xl bg-zinc-50 border border-zinc-200 focus:bg-white focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all text-sm"
                        />
                        <button
                            onClick={handleConvert}
                            disabled={isConverting || !url.trim()}
                            className="h-12 flex items-center rounded-xl overflow-hidden shadow-sm disabled:opacity-50 disabled:cursor-not-allowed transition-all hover:shadow-md"
                        >
                            <div className="h-full px-4 bg-zinc-900 text-white flex items-center justify-center font-bold text-sm tracking-wide">
                                .mp3
                            </div>
                            <div className="h-full px-6 bg-[#E53935] text-white flex items-center justify-center font-bold text-sm gap-2">
                                {isConverting ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Download size={14} /> Convert</>}
                            </div>
                        </button>
                    </div>

                    {error && (
                        <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-100 rounded-xl">
                            <X size={14} className="text-red-500 mt-0.5 flex-shrink-0" />
                            <p className="text-sm text-red-600 font-medium">{error}</p>
                        </div>
                    )}
                </div>

                {isConverting && (
                    <div className="p-6 bg-zinc-50 border border-zinc-200 rounded-2xl flex items-center gap-4 animate-pulse">
                        <div className="w-10 h-10 bg-zinc-200 rounded-xl flex items-center justify-center">
                            <Music size={18} className="text-zinc-400" />
                        </div>
                        <div className="flex-1 space-y-2">
                            <div className="h-3 bg-zinc-200 rounded-full w-3/4" />
                            <div className="h-2 bg-zinc-100 rounded-full w-1/2" />
                        </div>
                        <Loader2 size={18} className="text-zinc-400 animate-spin" />
                    </div>
                )}

                {success && !isConverting && (
                    <div className="p-6 bg-emerald-50 border border-emerald-100 rounded-2xl flex items-center gap-4">
                        <div className="w-10 h-10 bg-emerald-100 text-emerald-600 rounded-xl flex items-center justify-center">
                            <Download size={18} />
                        </div>
                        <div className="flex-1">
                            <p className="text-sm font-bold text-emerald-900">Download started!</p>
                            <p className="text-xs text-emerald-700 mt-0.5">The MP3 has been saved to your device's Downloads folder.</p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
