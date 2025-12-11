import { useState } from 'react';
import { supabase } from '../lib/supabaseClient';

export default function RegisterModal({ onClose }){
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleRegister(e){
    e.preventDefault();
    setLoading(true);
    const domain = email.split('@')[1]?.toLowerCase();
    if(!domain){ setLoading(false); return alert('Invalid email'); }
    const resp = await fetch(`/api/university?domain=${encodeURIComponent(domain)}`);
    const json = await resp.json();
    if(!json.found){ setLoading(false); return alert('Unrecognized university domain. Registration blocked.'); }

    const { data, error } = await supabase.auth.signUp({ email, password, options: { data: { username } } });
    if(error){ setLoading(false); return alert(error.message); }

    alert('Check your email for confirmation link/OTP. After confirming, login.');
    setLoading(false);
    onClose();
  }

  return (
    <div style={{position:'fixed', inset:0, display:'flex', alignItems:'center', justifyContent:'center', background:'rgba(0,0,0,0.6)'}}>
      <div style={{width:420, padding:20, background:'#0f1724', borderRadius:10}}>
        <h2 style={{marginBottom:12}}>Register</h2>
        <form onSubmit={handleRegister} style={{display:'flex', flexDirection:'column', gap:8}}>
          <input value={username} onChange={e=>setUsername(e.target.value)} placeholder="username" style={{padding:8, borderRadius:6, background:'#0b1220', color:'#e6eef8'}} />
          <input value={email} onChange={e=>setEmail(e.target.value)} placeholder="university email" style={{padding:8, borderRadius:6, background:'#0b1220', color:'#e6eef8'}} />
          <input value={password} onChange={e=>setPassword(e.target.value)} placeholder="password" type="password" style={{padding:8, borderRadius:6, background:'#0b1220', color:'#e6eef8'}} />
          <div style={{display:'flex', gap:8, marginTop:8}}>
            <button disabled={loading} style={{flex:1, padding:10, borderRadius:6, background:'#5b21b6', color:'white', border:'none'}}>Register</button>
            <button type="button" onClick={onClose} style={{flex:1, padding:10, borderRadius:6, background:'#111827', color:'#9aa9bf', border:'1px solid #1f2937'}}>Cancel</button>
          </div>
        </form>
      </div>
    </div>
  )
}
