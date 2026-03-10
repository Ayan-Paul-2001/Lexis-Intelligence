import { useEffect, useState } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';

/**
 * PwaUpdatePrompt
 * Shows a non-intrusive toast at the bottom of the screen when a new
 * version of the app has been cached and is ready to activate.
 * The user can dismiss it or click "Refresh" to apply the update immediately.
 */
export default function PwaUpdatePrompt() {
    const {
        needRefresh: [needRefresh, setNeedRefresh],
        updateServiceWorker,
    } = useRegisterSW({
        onRegistered(r) {
            console.log('[PWA] Service Worker registered:', r);
        },
        onRegisterError(err) {
            console.error('[PWA] Service Worker registration failed:', err);
        },
    });

    const [visible, setVisible] = useState(false);

    useEffect(() => {
        if (needRefresh) setVisible(true);
    }, [needRefresh]);

    const handleUpdate = () => {
        updateServiceWorker(true);
        setVisible(false);
    };

    const handleDismiss = () => {
        setNeedRefresh(false);
        setVisible(false);
    };

    if (!visible) return null;

    return (
        <div
            style={{
                position: 'fixed',
                bottom: '1.5rem',
                left: '50%',
                transform: 'translateX(-50%)',
                zIndex: 9999,
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                padding: '0.85rem 1.25rem',
                background: 'rgba(15, 23, 42, 0.95)',
                backdropFilter: 'blur(12px)',
                border: '1px solid rgba(99, 102, 241, 0.4)',
                borderRadius: '0.75rem',
                boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
                color: '#e2e8f0',
                fontSize: '0.875rem',
                fontFamily: 'Inter, system-ui, sans-serif',
                whiteSpace: 'nowrap',
                animation: 'pwa-slide-up 0.3s ease',
            }}
        >
            <span style={{ fontSize: '1.1rem' }}>🚀</span>
            <span>A new version of Lexis is available.</span>
            <button
                onClick={handleUpdate}
                style={{
                    padding: '0.35rem 0.85rem',
                    background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                    border: 'none',
                    borderRadius: '0.4rem',
                    color: '#fff',
                    fontWeight: 600,
                    cursor: 'pointer',
                    fontSize: '0.8rem',
                    transition: 'opacity 0.2s',
                }}
                onMouseOver={e => (e.currentTarget.style.opacity = '0.85')}
                onMouseOut={e => (e.currentTarget.style.opacity = '1')}
            >
                Refresh
            </button>
            <button
                onClick={handleDismiss}
                aria-label="Dismiss update prompt"
                style={{
                    background: 'transparent',
                    border: 'none',
                    color: '#94a3b8',
                    cursor: 'pointer',
                    fontSize: '1rem',
                    lineHeight: 1,
                    padding: '0 0.25rem',
                }}
            >
                ✕
            </button>
            <style>{`
        @keyframes pwa-slide-up {
          from { opacity: 0; transform: translateX(-50%) translateY(1rem); }
          to   { opacity: 1; transform: translateX(-50%) translateY(0); }
        }
      `}</style>
        </div>
    );
}
