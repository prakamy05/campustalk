import React, { useState } from 'react';
import { supabase } from '../services/supabaseClient';

export default function Register() {
  const [email,setEmail]=useState(''); const [username,setUsername]=useState(''); const [password,setPassword]=useState(''); const [msg,setMsg]=useState('');

  async function checkUniversity(domain) {
    const { data, error } = await supabase.from('universities').select('university_id, university_name').eq('university_domain', domain).limit(1).single();
    if (error) return null;
    return data;
  }

  async function handle(e) {
    e.preventDefault(); setMsg('');
    const domain = email.split('@')[1]; if (!domain) return setMsg('Invalid email');
    const uni = await checkUniversity(domain); if (!uni) return setMsg('University not supported');
    const { data: signUpData, error: signErr } = await supabase.auth.signUp({ email, password });
    if (signErr) return setMsg(signErr.message);
    const userId = signUpData.user?.id;
    if (!userId) return setMsg('Registration succeeded. Confirm your email.');
    const { error: pErr } = await supabase.from('profiles').insert([{ user_id: userId, username, university_id: uni.university_id }]);
    if (pErr) return setMsg('Profile creation failed: ' + pErr.message);
    setMsg('Registered. Please login.');
  }

  return (
    <form onSubmit={handle} className="p-6 bg-gray-800 rounded">
      <h2 className="text-xl mb-4">Register (university email)</h2>
      <input className="w-full mb-2 p-2" placeholder="email" value={email} onChange={e=>setEmail(e.target.value)} />
      <input className="w-full mb-2 p-2" placeholder="username" value={username} onChange={e=>setUsername(e.target.value)} />
      <input type="password" className="w-full mb-2 p-2" placeholder="password" value={password} onChange={e=>setPassword(e.target.value)} />
      <button className="w-full p-2 bg-gray-700 rounded" type="submit">Register</button>
      {msg && <p className="mt-2">{msg}</p>}
    </form>
  );
}
