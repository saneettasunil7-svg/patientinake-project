export const getApiBaseUrl = () => {
    // All API traffic goes through the server.js HTTPS proxy at /api
    if (typeof window !== 'undefined') {
        return '/api'; // Client-side relative path
    }
    // Server-side (Next.js SSR) requires absolute URLs
    // We point back to our own Next.js server so the proxy handles it natively
    return 'https://127.0.0.1:3000/api';
};

export const getWsBaseUrl = (sessionId: string) => {
    if (typeof window !== 'undefined') {
        const hostname = window.location.hostname;
        const port = window.location.port || (window.location.protocol === 'https:' ? '443' : '80');
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';

        // Route through our server.js proxy so SSL is handled correctly
        return `${protocol}//${hostname}:${port}/api/video/ws/${sessionId}`;
    }
    // Fallback for SSR if needed
    return `ws://127.0.0.1:8000/video/ws/${sessionId}`;
};
