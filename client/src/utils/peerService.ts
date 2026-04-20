import Peer, { DataConnection, MediaConnection } from 'peerjs';

export class PeerService {
    peer: Peer | null = null;
    myPeerId: string;
    onStream: (stream: MediaStream) => void;
    onData: (data: any) => void;
    onLog: (msg: string) => void;
    onReady: (id: string) => void;
    onDisconnected?: () => void;

    localStream: MediaStream | null = null;
    connections: DataConnection[] = [];
    call: MediaConnection | null = null;
    private _destroyed = false;

    constructor(
        peerId: string,
        onStream: (stream: MediaStream) => void,
        onData: (data: any) => void,
        onLog: (msg: string) => void,
        onReady: (id: string) => void
    ) {
        this.myPeerId = peerId;
        this.onStream = onStream;
        this.onData = onData;
        this.onLog = onLog;
        this.onReady = onReady;
    }

    initialize() {
        if (this._destroyed) return;

        this.onLog(`Initializing PeerJS with ID: ${this.myPeerId}`);

        // Use public PeerJS cloud server with multiple STUN/TURN servers
        this.peer = new Peer(this.myPeerId, {
            debug: 2,
            config: {
                iceServers: [
                    { urls: 'stun:stun.l.google.com:19302' },
                    { urls: 'stun:stun1.l.google.com:19302' },
                    { urls: 'stun:stun2.l.google.com:19302' },
                    { urls: 'stun:stun3.l.google.com:19302' },
                    { urls: 'stun:stun4.l.google.com:19302' },
                    // Free TURN server for devices behind strict NAT
                    {
                        urls: 'turn:openrelay.metered.ca:80',
                        username: 'openrelayproject',
                        credential: 'openrelayproject',
                    },
                    {
                        urls: 'turn:openrelay.metered.ca:443',
                        username: 'openrelayproject',
                        credential: 'openrelayproject',
                    },
                ]
            }
        });

        this.peer.on('open', (id) => {
            this.onLog(`PeerJS Ready. My ID: ${id}`);
            this.onReady(id);
        });

        // PATIENT SIDE: listen for incoming calls from the doctor
        this.peer.on('call', async (incomingCall) => {
            this.onLog(`📞 INCOMING CALL from: ${incomingCall.peer}`);

            // Ensure we have a local stream before answering
            if (!this.localStream) {
                this.onLog('No local stream, starting one to answer...');
                try {
                    await this.startLocalStream();
                } catch (e: any) {
                    this.onLog(`Failed to start stream for answer: ${e.message}`);
                    // Answer with a null stream to at least get the doctor's video
                    // This is a fallback - try to get ANY stream
                }
            }

            this.onLog('Answering call...');
            incomingCall.answer(this.localStream!);
            this.call = incomingCall;
            this.setupCall(incomingCall);
        });

        this.peer.on('connection', (conn) => {
            this.onLog(`Incoming data connection from: ${conn.peer}`);
            this.setupConnection(conn);
        });

        this.peer.on('disconnected', () => {
            this.onLog('PeerJS disconnected from server. Attempting reconnect...');
            if (!this._destroyed && this.peer && !this.peer.destroyed) {
                try { this.peer.reconnect(); } catch (e) { }
            }
        });

        this.peer.on('error', (err) => {
            this.onLog(`PeerJS Error [${err.type}]: ${err.message}`);
            if (err.type === 'unavailable-id') {
                // ID is taken - wait and retry with a slightly different ID
                this.onLog('Peer ID conflict detected.');
            }
            if (err.type === 'peer-unavailable') {
                // Remote peer is not online yet
                this.onLog('Remote peer not online yet. Will retry when they join.');
            }
        });
    }

    async startLocalStream(): Promise<MediaStream> {
        // First try: video + audio with relaxed constraints
        try {
            this.onLog('Requesting camera + microphone...');
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: 'user' },
                audio: true
            });
            const vt = stream.getVideoTracks().length;
            const at = stream.getAudioTracks().length;
            this.onLog(`✅ Media OK: ${vt} video track(s), ${at} audio track(s)`);
            this.localStream = stream;
            return stream;
        } catch (videoErr: any) {
            this.onLog(`Camera failed (${videoErr.name}): ${videoErr.message}`);
        }

        // Second try: audio only
        try {
            this.onLog('Trying audio-only fallback...');
            const stream = await navigator.mediaDevices.getUserMedia({
                video: false,
                audio: true
            });
            this.onLog(`✅ Audio-only stream active`);
            this.localStream = stream;
            return stream;
        } catch (audioErr: any) {
            this.onLog(`Audio also failed: ${audioErr.message}`);
            const err = audioErr as DOMException;
            if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
                throw new Error('Please allow camera/microphone access in your browser settings and refresh.');
            }
            throw audioErr;
        }
    }

    connectData(remotePeerId: string) {
        if (!this.peer || this.peer.destroyed) return;
        this.onLog(`Opening data channel to: ${remotePeerId}`);
        const conn = this.peer.connect(remotePeerId, { reliable: true });
        this.setupConnection(conn);
    }

    callPeer(remotePeerId: string) {
        if (!this.peer || this.peer.destroyed) {
            this.onLog('Cannot call: Peer is destroyed');
            return;
        }
        if (!this.localStream) {
            this.onLog('Cannot call: No local stream. Start media first.');
            return;
        }
        if (this.peer.disconnected) {
            this.onLog('Peer disconnected, cannot call right now.');
            return;
        }

        this.onLog(`📹 Calling ${remotePeerId}...`);
        try {
            const call = this.peer.call(remotePeerId, this.localStream);
            if (!call) {
                this.onLog('peer.call() returned null - peer may not be ready');
                return;
            }
            this.setupCall(call);
            this.call = call;
        } catch (e: any) {
            this.onLog(`callPeer error: ${e.message}`);
        }
    }

    setupConnection(conn: DataConnection) {
        conn.on('open', () => {
            this.onLog(`Data channel open: ${conn.peer}`);
            // Deduplicate
            if (!this.connections.find(c => c.peer === conn.peer)) {
                this.connections.push(conn);
            }
        });
        conn.on('data', (data) => { this.onData(data); });
        conn.on('close', () => {
            this.onLog(`Data channel closed: ${conn.peer}`);
            this.connections = this.connections.filter(c => c !== conn);
        });
        conn.on('error', (err) => this.onLog(`Data channel error: ${err}`));
    }

    setupCall(call: MediaConnection) {
        if (!call) return;
        call.on('stream', (remoteStream) => {
            const vt = remoteStream.getVideoTracks().length;
            const at = remoteStream.getAudioTracks().length;
            this.onLog(`📡 Remote stream: ${vt} video, ${at} audio track(s)`);
            this.onStream(remoteStream);
        });
        call.on('close', () => this.onLog('Call stream closed'));
        call.on('error', (err) => this.onLog(`Call error: ${err.type} - ${err.message}`));
    }

    sendData(data: any) {
        this.connections.forEach(conn => {
            if (conn.open) {
                try { conn.send(data); } catch (e) { }
            }
        });
    }

    toggleAudio(enabled: boolean) {
        this.localStream?.getAudioTracks().forEach(t => { t.enabled = enabled; });
    }

    toggleVideo(enabled: boolean) {
        this.localStream?.getVideoTracks().forEach(t => { t.enabled = enabled; });
    }

    isConnected(): boolean {
        return !!(this.peer && !this.peer.destroyed && !this.peer.disconnected);
    }

    destroy() {
        this._destroyed = true;
        this.onLog('Destroying PeerService...');
        this.localStream?.getTracks().forEach(t => t.stop());
        this.localStream = null;
        try { this.peer?.destroy(); } catch (e) { }
        this.peer = null;
    }
}
