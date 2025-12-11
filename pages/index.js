import { useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import RegisterModal from '../components/RegisterModal';
import { useRouter } from 'next/router';

export default function Home(){
  const [showReg, setShowReg] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const router = useRouter();

  async function handleLogin(e){
    e.preventDefault();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return alert(error.message);
    router.push('/video');
  }

  return (
    <div style={{minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'#0b0f17'}}>
      <div style={{width:420, padding:28, background:'#0f1724', borderRadius:12}}>
        <h1 style={{fontSize:24, marginBottom:16}}>CampusTalk</h1>
        <form onSubmit={handleLogin} style={{display:'flex', flexDirection:'column', gap:12}}>
          <input value={email} onChange={e=>setEmail(e.target.value)} placeholder="email" style={{padding:10, borderRadius:8, background:'#0b1220', color:'#e6eef8', border:'1px solid #16202b'}} />
          <input value={password} onChange={e=>setPassword(e.target.value)} type="password" placeholder="password" style={{padding:10, borderRadius:8, background:'#0b1220', color:'#e6eef8', border:'1px solid #16202b'}} />
          <button style={{padding:10, borderRadius:8, background:'#5b21b6', color:'white', border:'none'}}>Login</button>
        </form>
        <div style={{marginTop:12, textAlign:'center'}}>
          <button onClick={()=>setShowReg(true)} style={{background:'none', border:'none', color:'#9aa9bf', textDecoration:'underline'}}>Register</button>
        </div>
      </div>
      {showReg && <RegisterModal onClose={()=>setShowReg(false)} />}
    </div>
  )
}
