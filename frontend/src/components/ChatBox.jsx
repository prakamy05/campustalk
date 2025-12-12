import React, { useState } from 'react';
export default function ChatBox({ socket, toSocketId, sessionId }) {
  const [text, setText] = useState('');
  function send() {
    if (!text || !socket) return;
    socket.emit('text_message', { toSocketId, text, sessionId });
    setText('');
  }
  return (
    <div className="p-2 bg-gray-800 rounded">
      <div className="flex gap-2">
        <input value={text} onChange={e=>setText(e.target.value)} className="flex-1 p-2 bg-gray-700 rounded" placeholder="Type message..." />
        <button onClick={send} className="px-3 py-2 bg-gray-600 rounded">Send</button>
      </div>
    </div>
  );
}
