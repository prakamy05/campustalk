import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import fetch from 'node-fetch';
import dotenv from 'dotenv';
dotenv.config();

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: { origin: process.env.FRONTEND_ORIGIN || '*' }
});

app.use(express.json());
app.get('/health', (req, res) => res.json({ ok: true }));

// In-memory FIFO queue
const waitingQueue = []; // { socketId, userId, username, joinedAt }

io.use(async (socket, next) => {
  try {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error('Auth token required'));
    const resp = await fetch(`${process.env.SUPABASE_URL}/auth/v1/user`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (resp.status !== 200) return next(new Error('Invalid token'));
    const user = await resp.json();
    socket.user = { user_id: user.id, email: user.email };
    return next();
  } catch (err) {
    return next(new Error('Auth verification failed'));
  }
});

io.on('connection', socket => {
  console.log('connect', socket.id, socket.user?.user_id);

  function removeFromQueue(sid) {
    const idx = waitingQueue.findIndex(x => x.socketId === sid);
    if (idx !== -1) waitingQueue.splice(idx, 1);
  }

  socket.on('join_queue', (payload = {}) => {
    // Prevent duplicates
    removeFromQueue(socket.id);
    const entry = { socketId: socket.id, userId: socket.user.user_id, username: payload.username || null, joinedAt: Date.now() };
    waitingQueue.push(entry);
    socket.emit('queue_joined', { ok: true, queue_length: waitingQueue.length });

    // match FIFO
    if (waitingQueue.length >= 2) {
      const u1 = waitingQueue.shift();
      const u2 = waitingQueue.shift();
      const sessionId = generateSessionId();
      io.to(u1.socketId).emit('start_call', { peerSocketId: u2.socketId, sessionId });
      io.to(u2.socketId).emit('start_call', { peerSocketId: u1.socketId, sessionId });
    }
  });

  socket.on('leave_queue', () => {
    removeFromQueue(socket.id);
    socket.emit('left_queue', { ok: true, queue_length: waitingQueue.length });
  });

  // Relay signaling
  socket.on('offer', data => {
    if (!data?.toSocketId) return;
    io.to(data.toSocketId).emit('offer', { fromSocketId: socket.id, offer: data.offer, sessionId: data.sessionId });
  });
  socket.on('answer', data => {
    if (!data?.toSocketId) return;
    io.to(data.toSocketId).emit('answer', { fromSocketId: socket.id, answer: data.answer, sessionId: data.sessionId });
  });
  socket.on('ice_candidate', data => {
    if (!data?.toSocketId) return;
    io.to(data.toSocketId).emit('ice_candidate', { candidate: data.candidate, fromSocketId: socket.id });
  });

  socket.on('text_message', data => {
    if (!data?.toSocketId || !data?.text) return;
    io.to(data.toSocketId).emit('text_message', { fromSocketId: socket.id, text: data.text, sessionId: data.sessionId });
  });

  socket.on('next_call', data => {
    const peerSocketId = data?.peerSocketId;
    if (peerSocketId) io.to(peerSocketId).emit('call_ended', { by: socket.id });
    removeFromQueue(socket.id);
    waitingQueue.push({ socketId: socket.id, userId: socket.user.user_id, username: data?.username || null, joinedAt: Date.now() });
    // try match again
    if (waitingQueue.length >= 2) {
      const u1 = waitingQueue.shift();
      const u2 = waitingQueue.shift();
      const sessionId = generateSessionId();
      io.to(u1.socketId).emit('start_call', { peerSocketId: u2.socketId, sessionId });
      io.to(u2.socketId).emit('start_call', { peerSocketId: u1.socketId, sessionId });
    }
  });

  socket.on('disconnect', () => {
    removeFromQueue(socket.id);
    console.log('disconnect', socket.id);
  });
});

function generateSessionId() {
  return [...Array(24)].map(()=>Math.random().toString(36)[2]).join('');
}

const PORT = process.env.PORT || 5000;
server.listen(PORT, ()=>console.log('Server listening on', PORT));
