import { getWsBaseUrl } from './apiConfig';

export class WebRTCManager {
    peerConnection: RTCPeerConnection;
    websocket: WebSocket;
    localStream: MediaStream | null = null;
    onRemoteStream: (stream: MediaStream) => void;
    onIceStateChange?: (state: string) => void;
    onCandidate?: (candidate: string) => void;
    onPeerJoin?: (remoteUserId: string) => void;
    userId: string;
    myId: string;
    currentFacingMode: 'user' | 'environment' = 'user';

    candidateQueue: RTCIceCandidateInit[] = [];
    isRemoteDescriptionSet = false;
    isReady = false;
    queuedOffer: any = null;
    signalQueue: any[] = [];
    audioTransceiver: RTCRtpTransceiver;
    videoTransceiver: RTCRtpTransceiver;

    private remoteStream: MediaStream = new MediaStream();

    // Callbacks
    onLog?: (message: string) => void;
    onConnectionStatusChange?: (status: string) => void;
    onWebSocketStateChange?: (state: string) => void;
    onChatMessage?: (message: any) => void;

    constructor(
        sessionId: string,
        userId: string,
        onRemoteStream: (stream: MediaStream) => void,
        onIceStateChange?: (state: string) => void,
        onCandidate?: (candidate: string) => void,
        onPeerJoin?: (remoteUserId: string) => void,
        onChatMessage?: (message: any) => void,
        onLog?: (message: string) => void,
        onConnectionStatusChange?: (status: string) => void,
        onWebSocketStateChange?: (state: string) => void
    ) {
        this.userId = userId;
        // Create a unique ID for this session to handle multiple tabs/same user
        this.myId = `${userId}-${Math.random().toString(36).substr(2, 9)}`;

        this.onRemoteStream = onRemoteStream;
        this.onIceStateChange = onIceStateChange;
        this.onCandidate = onCandidate;
        this.onPeerJoin = onPeerJoin;
        this.onChatMessage = onChatMessage;
        this.onLog = onLog;
        this.onConnectionStatusChange = onConnectionStatusChange;
        this.onWebSocketStateChange = onWebSocketStateChange;

        this.log(`WebRTCManager initializing for session: ${sessionId}, myId: ${this.myId}`);

        // Initialize WebRTC
        this.peerConnection = new RTCPeerConnection({
            iceServers: [
                { urls: 'stun:stun.l.google.com:19302' },
                { urls: 'stun:stun1.l.google.com:19302' }
            ]
        });

        // Add transceivers immediately to ensure SDP has media sections
        this.audioTransceiver = this.peerConnection.addTransceiver('audio', { direction: 'sendrecv' });
        this.videoTransceiver = this.peerConnection.addTransceiver('video', { direction: 'sendrecv' });

        this.peerConnection.ontrack = (event) => {
            const trackKind = event.track.kind;
            const streamId = event.streams[0]?.id || 'no-stream-id';
            this.log(`Received remote track: ${trackKind} (${streamId})`);

            // Always add to our persistent remoteStream
            // Check if track is already there to avoid duplicates (though addTrack handles this)
            this.remoteStream.addTrack(event.track);

            // Fire callback with our persistent stream
            // This ensures the UI always has the same stream object, 
            // but resizing/re-rendering might be needed if video track just arrived.
            this.onRemoteStream(this.remoteStream);
        };

        this.peerConnection.onicecandidate = (event) => {
            if (event.candidate) {
                const type = event.candidate.type; // 'host', 'srflx', 'relay'
                // this.log(`Generated ICE candidate: ${type}`);
                if (this.onCandidate) this.onCandidate(`${type} ${event.candidate.protocol} ${event.candidate.address}`);

                this.sendSignal({ type: 'candidate', candidate: event.candidate });
            } else {
                this.log('End of ICE candidates.');
            }
        };

        this.peerConnection.onconnectionstatechange = () => {
            this.log(`Connection state: ${this.peerConnection.connectionState}`);
            if (this.onIceStateChange) this.onIceStateChange(this.peerConnection.connectionState);
            if (this.onConnectionStatusChange) this.onConnectionStatusChange(this.peerConnection.connectionState);
        };

        this.peerConnection.oniceconnectionstatechange = () => {
            this.log(`ICE connection state: ${this.peerConnection.iceConnectionState}`);
        };

        // Initialize WebSocket
        const wsUrl = getWsBaseUrl(sessionId);
        this.log(`Connecting to WebSocket: ${wsUrl}`);
        this.websocket = new WebSocket(wsUrl);

        this.websocket.onopen = () => {
            this.log('WebSocket connected');
            if (this.onWebSocketStateChange) this.onWebSocketStateChange('OPEN');
            this.sendSignal({ type: 'join', userId: this.myId });
            this.processSignalQueue();
        };
        this.websocket.onerror = (e) => {
            console.error('WebSocket Error:', e);
            const msg = `WebSocket Error connecting to ${this.websocket.url}. Ensure you have trusted the backend certificate at https://${window.location.hostname}:8000`;
            this.log(msg);
            if (this.onWebSocketStateChange) this.onWebSocketStateChange('ERROR');
        };
        this.websocket.onclose = (e) => {
            this.log(`WebSocket Closed: ${e.code} ${e.reason}`);
            if (this.onWebSocketStateChange) this.onWebSocketStateChange('CLOSED');
        };
        this.websocket.onmessage = this.handleSignal.bind(this);
    }

    private log(message: string) {
        console.log(message);
        if (this.onLog) this.onLog(message);
    }

    setReady() {
        this.log('WebRTC Manager ready.');
        this.isReady = true;
        if (this.queuedOffer) {
            this.log('Processing queued offer');
            this.handleOffer(this.queuedOffer);
            this.queuedOffer = null;
        }
    }

    async startLocalStream() {
        try {
            // Check if mediaDevices API is available (requires HTTPS or localhost)
            if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
                throw new Error('Video/Audio access require a secure connection (HTTPS).');
            }

            // Mobile-friendly constraints
            // Mobile-friendly simplified constraints
            // We start with user facing, but don't force resolution to avoid "OverconstrainedError" or blank streams on some devices
            let constraints: MediaStreamConstraints = {
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true
                },
                video: {
                    facingMode: 'user'
                }
            };

            this.log('Requesting local stream...');
            try {
                this.localStream = await navigator.mediaDevices.getUserMedia(constraints);
            } catch (err: any) {
                this.log(`Initial camera request failed: ${err.name} - ${err.message}`);
                if (err.name === 'NotReadableError' || err.name === 'TrackStartError' || err.name === 'OverconstrainedError') {
                    this.log('Retrying with basic constraints (video: true, audio: true)...');
                    // Fallback: Try gaining any camera access without specific constraints
                    this.localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
                } else {
                    throw err;
                }
            }

            if ((this.peerConnection.signalingState as string) === 'closed') {
                this.log('PeerConnection closed before stream attached.');
                this.localStream.getTracks().forEach(track => track.stop());
                return this.localStream;
            }

            // Use replaceTrack to attach stream to existing transceivers
            const audioTrack = this.localStream.getAudioTracks()[0];
            const videoTrack = this.localStream.getVideoTracks()[0];

            if (audioTrack && this.audioTransceiver.sender) {
                await this.audioTransceiver.sender.replaceTrack(audioTrack);
            }
            if (videoTrack && this.videoTransceiver.sender) {
                await this.videoTransceiver.sender.replaceTrack(videoTrack);
            }

            this.log('Local stream started');
            return this.localStream;
        } catch (error) {
            console.error('Error accessing media devices:', error);
            this.log(`Error accessing media: ${error}`);
            if (error instanceof DOMException && error.name === 'NotAllowedError') {
                throw new Error('Camera/Microphone permission denied or dismissed. Please allow access.');
            }
            throw error;
        }
    }

    sendSignal(data: any) {
        if (this.websocket.readyState === WebSocket.OPEN) {
            this.websocket.send(JSON.stringify(data));
        } else {
            this.log(`WS not open, queuing: ${data.type}`);
            this.signalQueue.push(data);
        }
    }

    processSignalQueue() {
        if (this.signalQueue && this.signalQueue.length > 0) {
            this.log(`Processing ${this.signalQueue.length} queued signals`);
            while (this.signalQueue.length > 0) {
                const data = this.signalQueue.shift();
                this.sendSignal(data);
            }
        }
    }

    sendChat(text: string, sender: string) {
        this.sendSignal({ type: 'chat', text, sender, timestamp: new Date().toISOString() });
    }

    async handleSignal(event: MessageEvent) {
        let data;
        try {
            data = JSON.parse(event.data);
        } catch (e) {
            this.log('Error parsing signal data');
            return;
        }

        try {
            if (data.type === 'chat') {
                if (this.onChatMessage) this.onChatMessage(data);
            } else if (data.type === 'join') {
                const remoteUserId = data.userId || 'unknown';
                this.log(`Peer joined session: ${remoteUserId}`);
                if (this.onPeerJoin) this.onPeerJoin(remoteUserId);

                // IMPORTANT: Send presence back so the joining peer knows we are here
                this.sendSignal({ type: 'presence', userId: this.myId });

                this.handlePeerDiscovery(remoteUserId);

            } else if (data.type === 'presence') {
                const remoteUserId = data.userId || 'unknown';
                this.log(`Peer present: ${remoteUserId}`);

                this.handlePeerDiscovery(remoteUserId);

            } else if (data.type === 'offer') {
                this.log('Received Offer');
                if (this.isReady) {
                    await this.handleOffer(data.offer);
                } else {
                    this.log('Not ready for offer. Queuing.');
                    this.queuedOffer = data.offer;
                }
            } else if (data.type === 'answer') {
                this.log('Received Answer');
                if (this.peerConnection.signalingState !== 'have-local-offer') {
                    this.log(`Ignoring Answer in state: ${this.peerConnection.signalingState}`);
                    return;
                }
                await this.peerConnection.setRemoteDescription(new RTCSessionDescription(data.answer));
                this.isRemoteDescriptionSet = true;
                this.processCandidateQueue();
            } else if (data.type === 'candidate') {
                if (this.isRemoteDescriptionSet) {
                    await this.peerConnection.addIceCandidate(new RTCIceCandidate(data.candidate));
                } else {
                    // this.log('Buffering ICE candidate');
                    this.candidateQueue.push(data.candidate);
                }
            }
        } catch (e: any) {
            this.log(`Error handling signal ${data.type}: ${e.message}`);
        }
    }

    handlePeerDiscovery(remoteUserId: string) {
        // Tie-breaker: Compare myId (from manager) with remoteUserId
        // Only the one with "higher" string value creates the offer

        this.log(`Tie-breaker check: MyId=${this.myId} vs RemoteId=${remoteUserId}`);

        if (this.myId && remoteUserId && this.myId > remoteUserId) {
            this.log('I am the initiator (My ID is larger). Checking state...');
            this.createOffer();
        } else {
            this.log('I am the follower (Remote ID is larger). Waiting for offer.');
        }
    }

    async handleOffer(offer: RTCSessionDescriptionInit) {
        try {
            // If we are in 'have-local-offer' state, it means we also tried to offer.
            // This is a glare situation. We should back off if we lost the tie-breaker?
            // Actually, handleOffer is called when we receive an offer.
            // If we are 'stable', we accept.
            // If we are 'have-local-offer', we have a collision.

            if (this.peerConnection.signalingState !== 'stable') {
                this.log(`Handling Offer in state: ${this.peerConnection.signalingState}`);
                // Simple glare resolution: If we are here, we received an offer.
                // If we also sent an offer, the signalingState would be have-local-offer.
                // Standard: One side must yield.
                // Our tie-breaker logic should have prevented this, but if timing was tight:
                // If we are the "winner" (myId > remoteId), we should ignore this offer (they shouldn't have sent it).
                // If we are the "loser", we should accept it (and maybe rollback our local offer?)

                // For simplicity: If not stable, ignore, but log.
                this.log(`Ignoring Offer in non-stable state for now.`);
                return;
            }

            await this.peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
            this.isRemoteDescriptionSet = true;
            this.processCandidateQueue();

            const answer = await this.peerConnection.createAnswer();
            await this.peerConnection.setLocalDescription(answer);
            this.sendSignal({ type: 'answer', answer });
            this.log('Sent Answer');
        } catch (e: any) {
            this.log(`Error handling offer: ${e.message}`);
        }
    }

    async processCandidateQueue() {
        if (this.candidateQueue && this.candidateQueue.length > 0) this.log(`Processing ${this.candidateQueue.length} buffered candidates`);
        if (!this.candidateQueue) return;

        for (const candidate of this.candidateQueue) {
            try {
                await this.peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
            } catch (e: any) {
                this.log(`Error adding candidate: ${e.message}`);
            }
        }
        this.candidateQueue = [];
    }

    async createOffer() {
        if ((this.peerConnection.signalingState as string) === 'closed') return;

        if (this.peerConnection.signalingState !== 'stable') {
            this.log(`Skipping createOffer, state is ${this.peerConnection.signalingState}`);
            return;
        }

        this.log('Creating offer');
        try {
            const offer = await this.peerConnection.createOffer({
                offerToReceiveAudio: true,
                offerToReceiveVideo: true
            });
            if ((this.peerConnection.signalingState as string) === 'closed') return;

            // Glare check: If state changed while creating offer, abort
            if (this.peerConnection.signalingState !== 'stable') {
                this.log(`Aborting setLocalDescription for offer, state is: ${this.peerConnection.signalingState}`);
                return;
            }

            await this.peerConnection.setLocalDescription(offer);
            this.sendSignal({ type: 'offer', offer });
        } catch (e: any) {
            this.log(`Error creating offer: ${e.message}`);
        }
    }

    close() {
        this.log('Closing WebRTC connection');
        if (this.localStream) {
            this.localStream.getTracks().forEach(track => track.stop());
        }
        this.peerConnection.close();
        this.websocket.close();
    }
}
