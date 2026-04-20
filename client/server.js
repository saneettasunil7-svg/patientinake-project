const { createServer } = require('https');
const { parse } = require('url');
const next = require('next');
const fs = require('fs');
const path = require('path');
const httpProxy = require('http-proxy');
const https = require('https');

const dev = process.env.NODE_ENV !== 'production';
const hostname = 'localhost';
const bindHost = '0.0.0.0';
const port = 3000;

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

const httpsOptions = {
    key: fs.readFileSync(path.join(__dirname, 'certificates', 'key.pem')),
    cert: fs.readFileSync(path.join(__dirname, 'certificates', 'cert.pem')),
};

const proxy = httpProxy.createProxyServer({
    target: 'https://127.0.0.1:8000',
    secure: false, // Don't verify the backend's self-signed cert
    changeOrigin: true,
    agent: new https.Agent({
        rejectUnauthorized: false
    })
});

proxy.on('error', (err, req, res) => {
    console.error('Proxy Error:', err);
    res.writeHead(500, {
        'Content-Type': 'text/plain',
    });
    res.end('Proxy Error: ' + err.message);
});

app.prepare().then(() => {
    const server = createServer(httpsOptions, async (req, res) => {
        try {
            const parsedUrl = parse(req.url, true);
            const { pathname } = parsedUrl;


            // Intercept /api/ requests
            if (pathname.startsWith('/api/')) {
                // Rewrite path: /api/users -> /users
                req.url = req.url.replace(/^\/api/, '');

                console.log(`Proxying ${pathname} -> ${req.url}`);
                return proxy.web(req, res);
            }

            await handle(req, res, parsedUrl);
        } catch (err) {
            console.error('Error occurred handling', req.url, err);
            res.statusCode = 500;
            res.end('internal server error');
        }
    });

    server.on('upgrade', (req, socket, head) => {
        const { pathname } = parse(req.url);
        if (pathname.startsWith('/api/')) {
            // Rewrite path for WS: /api/video/ws -> /video/ws
            req.url = req.url.replace(/^\/api/, '');
            console.log(`Proxying WS Upgrade: ${pathname} -> ${req.url}`);
            proxy.ws(req, socket, head);
        }
    });

    server.once('error', (err) => {
        console.error(err);
        process.exit(1);
    })
        .listen(port, bindHost, () => {
            console.log(`> Ready on https://0.0.0.0:${port}`);
        });
});
