import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';

// CRITICAL: Force Node.js runtime - Edge runtime doesn't support axios
export const runtime = 'nodejs';

// This server-side proxy forwards requests to the Python backend on port 8000.

export async function GET(request: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
    const resolvedParams = await params;
    return handleRequest(request, resolvedParams.path);
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
    const resolvedParams = await params;
    return handleRequest(request, resolvedParams.path);
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
    const resolvedParams = await params;
    return handleRequest(request, resolvedParams.path);
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
    const resolvedParams = await params;
    return handleRequest(request, resolvedParams.path);
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
    const resolvedParams = await params;
    return handleRequest(request, resolvedParams.path);
}

async function handleRequest(request: NextRequest, pathSegments: string[]) {
    const path = pathSegments.join('/');
    const searchParams = request.nextUrl.searchParams.toString();

    // In production (Vercel), we must proxy to the Render backend URL.
    // In local dev, we proxy to 127.0.0.1:8000.
    const targetBase = (process.env.BACKEND_URL || 'http://127.0.0.1:8000').replace(/\/$/, "");
    const backendUrl = `${targetBase}/${path}${searchParams ? '?' + searchParams : ''}`;

    try {
        const method = request.method;
        const body = method !== 'GET' && method !== 'HEAD'
            ? await request.arrayBuffer()
            : undefined;

        const headers: Record<string, string> = {};
        request.headers.forEach((value, key) => {
            const lowerKey = key.toLowerCase();
            // Crucial: remove headers that cause networking faults
            if (lowerKey !== 'host' && lowerKey !== 'connection' && lowerKey !== 'content-length') {
                headers[key] = value;
            }
        });

        // Use axios for a robust network abstraction over underlying TCP sockets
        const response = await axios({
            method: method,
            url: backendUrl,
            headers: headers,
            data: body ? Buffer.from(body) : undefined,
            responseType: 'arraybuffer', // Get raw bytes to forward safely
            validateStatus: () => true,  // Resolve promise for ALL HTTP status codes (400, 500, etc)
        });

        const resHeaders = new Headers();
        for (const [key, value] of Object.entries(response.headers)) {
            const lowerKey = key.toLowerCase();
            if (lowerKey !== 'content-encoding' && lowerKey !== 'content-length' && lowerKey !== 'transfer-encoding') {
                if (Array.isArray(value)) {
                    value.forEach(v => resHeaders.append(key, v));
                } else if (value !== undefined) {
                    resHeaders.set(key, value.toString());
                }
            }
        }
        resHeaders.set('Access-Control-Allow-Origin', '*');

        return new NextResponse(new Uint8Array(response.data as ArrayBuffer), {
            status: response.status,
            headers: resHeaders,
        });

    } catch (error: any) {
        console.error('[Universal Proxy Error]:', error.message);
        return NextResponse.json({ detail: `Proxy Error: ${error.message}` }, { status: 502 });
    }
}
