import { io } from 'socket.io-client';
export function createSocket(accessToken) {
  return io(import.meta.env.VITE_BACKEND_URL, { auth: { token: accessToken } });
}
