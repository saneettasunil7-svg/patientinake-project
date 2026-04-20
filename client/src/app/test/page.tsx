export default function TestPage() {
    return (
        <div style={{ padding: '20px', backgroundColor: '#000', color: '#fff', minHeight: '100vh' }}>
            <h1>Test Page - No Auto Refresh</h1>
            <p>If this page does NOT auto-refresh, the issue is with the home page components.</p>
            <p>If this page DOES auto-refresh, the issue is with the layout or providers.</p>
            <p>Current time: {new Date().toLocaleTimeString()}</p>
        </div>
    );
}
