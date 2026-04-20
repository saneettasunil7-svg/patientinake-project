export const getApiBaseUrl = () => {
    // All API calls use the /api relative path.
    // - On Vercel (production): next.config.ts rewrites /api/* → Render backend
    // - On local dev: server.js HTTPS proxy handles /api/* → local FastAPI
    return '/api';
};

export const getWsBaseUrl = (sessionId: string) => {
    if (typeof window !== 'undefined') {
        // In production on Vercel, WebSocket must connect directly to Render backend
        // because Next.js rewrites don't support WebSocket upgrades.
        const renderBackend = process.env.NEXT_PUBLIC_WS_BACKEND_URL;
        if (renderBackend) {
            // renderBackend should be like: wss://your-backend.onrender.com
            return `${renderBackend}/video/ws/${sessionId}`;
        }

        // Local dev: route through our server.js proxy which handles WS upgrades
        const hostname = window.location.hostname;
        const port = window.location.port || (window.location.protocol === 'https:' ? '443' : '80');
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        return `${protocol}//${hostname}:${port}/api/video/ws/${sessionId}`;
    }
    // SSR fallback
    return `ws://127.0.0.1:8000/video/ws/${sessionId}`;
};
