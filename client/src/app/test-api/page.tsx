"use client";

import { useState } from 'react';
import { getApiBaseUrl } from '@/utils/apiConfig';

export default function TestAPI() {
    const [result, setResult] = useState<string>('');
    const [loading, setLoading] = useState(false);

    const testConnection = async () => {
        setLoading(true);
        setResult('Testing...');

        const apiUrl = getApiBaseUrl();
        console.log('Testing API URL:', apiUrl);

        try {
            // Test 1: Basic connection
            const response = await fetch(`${apiUrl}/`);
            if (!response.ok) {
                throw new Error(`HTTP Error: ${response.status}`);
            }
            const data = await response.json();
            setResult(`✅ SUCCESS!\n\nAPI URL: ${apiUrl}\nResponse: ${JSON.stringify(data, null, 2)}`);
        } catch (error: any) {
            console.error('Test failed:', error);

            let errorMsg = `❌ FAILED\n\nAPI URL: ${apiUrl}\n\n`;

            if (error.message === 'Failed to fetch') {
                errorMsg += `Error: Network Error\n\nThis means:\n1. The browser cannot connect to ${apiUrl}\n2. You need to accept the SSL certificate\n\nSTEPS TO FIX:\n1. Open a new tab\n2. Go to: ${apiUrl}/docs\n3. Click "Advanced" → "Proceed to... (unsafe)"\n4. Come back here and try again`;
            } else {
                errorMsg += `Error: ${error.message}`;
            }

            setResult(errorMsg);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 p-8">
            <div className="max-w-2xl mx-auto">
                <h1 className="text-3xl font-bold mb-6">API Connection Test</h1>

                <div className="bg-white rounded-lg shadow p-6 mb-6">
                    <p className="mb-4">Click the button below to test the backend API connection:</p>
                    <button
                        onClick={testConnection}
                        disabled={loading}
                        className="px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
                    >
                        {loading ? 'Testing...' : 'Test Connection'}
                    </button>
                </div>

                {result && (
                    <div className="bg-slate-900 text-green-400 rounded-lg p-6 font-mono text-sm whitespace-pre-wrap">
                        {result}
                    </div>
                )}

                <div className="mt-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <h2 className="font-bold text-yellow-900 mb-2">⚠️ Important</h2>
                    <p className="text-yellow-800 text-sm">
                        If you see "Network Error", you MUST accept the backend SSL certificate first.
                        Open <code className="bg-yellow-100 px-1 rounded">{getApiBaseUrl()}/docs</code> in a new tab and accept the security warning.
                    </p>
                </div>
            </div>
        </div>
    );
}
