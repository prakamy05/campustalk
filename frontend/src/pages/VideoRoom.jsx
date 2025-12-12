import React, { useEffect, useRef, useState } from 'react';
import { createSocket } from '../services/socket';
import ChatBox from '../components/ChatBox';

export default function VideoRoom({ supabaseSession, profile }) {
  const localRef = useRef(); const remoteRef = useRef(); const pcRef = useRef(null); const socketRef = useRef(null);
  const [inCall, setInCall] = useState(false); const [peerSocketId, setPeerSocketId] = useState(null); const [sessionId, setSessionId] = useState(null);

  useEffect(() => {
    if (!supabaseSession) return;
    const socket = createSocket(supabaseSession.access_token);
    socketRef.current = socket;

    socket.on('connect', ()=>console.log('socket connected'));
    socket.on('queue_joined', d => console.log('queue length', d.queue_length));
    socket.on('start_call', async ({ peerSocketId: peer, sessionId: sid }) => {
      setSessionId(sid); setPeerSocketId(peer); await startPeer(peer, true, sid);
    });
    socket.on('offer', async ({ fromSocketId, offer, sessionId: sid }) => {
      setSessionId(sid); setPeerSocketId(fromSocketId);
      if (!pcRef.current) await startPeer(fromSocketId, false, sid);
      await pcRef.current.setRemoteDescription(new RTCSessionDescription(offer));
      const answer = await pcRef.current.createAnswer(); await pcRef.current.setLocalDescription(answer);
      socket.emit('answer', { toSocketId: fromSocketId, answer, sessionId: sid });
    });
    socket.on('answer', async ({ answer }) => { if (pcRef.current) await pcRef.current.setRemoteDescription(new RTCSessionDescription(answer)); });
    socket.on('ice_candidate', ({ candidate }) => { if (candidate && pcRef.current) pcRef.current.addIceCandidate(new RTCIceCandidate(candidate)).catch(()=>{}); });
    socket.on('text_message', ({ fromSocketId, text }) => console.log('chat', text));
    socket.on('call_ended', () => endCall());

    return () => socket.disconnect();
  }, [supabaseSession]);

  async function startPeer(peerId, initiator=true, sid=null) {
    pcRef.current = new RTCPeerConnection();
    const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    localRef.current.srcObject = stream;
    stream.getTracks().forEach(t => pcRef.current.addTrack(t, stream));
    pcRef.current.ontrack = e => { remoteRef.current.srcObject = e.streams[0]; };
    pcRef.current.onicecandidate = e => {
      if (e.candidate) socketRef.current.emit('ice_candidate', { toSocketId: peerId, candidate: e.candidate, sessionId: sid });
    };
    setInCall(true);
    if (initiator) {
      const offer = await pcRef.current.createOffer(); await pcRef.current.setLocalDescription(offer);
      socketRef.current.emit('offer', { toSocketId: peerId, offer, sessionId: sid });
    }
  }

  function endCall() {
    if (pcRef.current) { pcRef.current.close(); pcRef.current = null; }
    setInCall(false); setPeerSocketId(null); setSessionId(null); if (remoteRef.current) remoteRef.current.srcObject = null;
  }

  function joinQueue() { socketRef.current.emit('join_queue', { username: profile?.username }); }
  function leaveQueue() { socketRef.current.emit('leave_queue'); }
  function handleNext() { socketRef.current.emit('next_call', { peerSocketId, username: profile?.username }); endCall(); }

  return (
    <div className="min-h-screen p-4">
      <div className="grid grid-cols-2 gap-4">
        <video ref={localRef} autoPlay muted playsInline className="w-full" />
        <video ref={remoteRef} autoPlay playsInline className="w-full" />
      </div>
      <div className="mt-4 flex gap-2">
        <button onClick={joinQueue} className="px-4 py-2 bg-gray-700 rounded">Start</button>
        <button onClick={leaveQueue} className="px-4 py-2 bg-gray-700 rounded">Leave Queue</button>
        <button onClick={() => { const tracks = localRef.current?.srcObject?.getAudioTracks() || []; tracks.forEach(t=>t.enabled=!t.enabled); }} className="px-4 py-2 bg-gray-700 rounded">Toggle Mic</button>
        <button onClick={() => { const tracks = localRef.current?.srcObject?.getVideoTracks() || []; tracks.forEach(t=>t.enabled=!t.enabled); }} className="px-4 py-2 bg-gray-700 rounded">Toggle Cam</button>
        <button onClick={handleNext} className="ml-auto px-4 py-2 bg-red-600 rounded">Next</button>
      </div>

      <div className="mt-4">
        <ChatBox socket={socketRef.current} toSocketId={peerSocketId} sessionId={sessionId} />
      </div>
    </div>
  );
}
