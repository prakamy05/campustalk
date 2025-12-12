import React, { useState } from 'react';
import { supabase } from '../services/supabaseClient';

export default function Login() {
  const [email,setEmail]=useState(''); const [password,setPassword]=useState(''); const [msg,setMsg]=useState('');
  async function handle(e) {
    e.preventDefault();
    setMsg('');
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) setMsg(error.message); else setMsg('Logged in');
  }
  return (
    <form onSubmit={handle} className="p-6 bg-gray-800 rounded">
      <h2 className="text-xl mb-4">Login</h2>
      <input className="w-full mb-2 p-2" placeholder="email" value={email} onChange={e=>setEmail(e.target.value)} />
      <input type="password" className="w-full mb-2 p-2" placeholder="password" value={password} onChange={e=>setPassword(e.target.value)} />
      <button className="w-full p-2 bg-gray-700 rounded" type="submit">Login</button>
      {msg && <p className="mt-2">{msg}</p>}
    </form>
  );
}
