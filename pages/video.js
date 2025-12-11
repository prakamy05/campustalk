import { useEffect, useRef, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useRouter } from 'next/router';

const STUN = { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] };

export default function VideoPage(){
  const router = useRouter();
  const [profile, setProfile] = useState(null);
  const [universities, setUniversities] = useState([]);
  const [searching, setSearching] = useState(false);
  const [matchInfo, setMatchInfo] = useState(null);

  const localVideoRef = useRef();
  const remoteVideoRef = useRef();
  const pcRef = useRef(null);
  const sessionRef = useRef(null);
  const channelRef = useRef(null);

  useEffect(()=>{
    (async ()=>{
      const { data: { user } } = await supabase.auth.getUser();
      if(!user) return router.push('/');
      const { data:profile } = await supabase.from('profiles').select('*').eq('id', user.id).single();
      setProfile(profile || { id: user.id, username: user.email });

      const { data:unis } = await supabase.from('universities').select('*').limit(100);
      setUniversities(unis || []);

      try{ const s = await navigator.mediaDevices.getUserMedia({ video:true, audio:true });
        if(localVideoRef.current) localVideoRef.current.srcObject = s;
      }catch(e){ console.error('getUserMedia', e); }
    })();

    return ()=>{ // cleanup
      if(channelRef.current) channelRef.current.unsubscribe();
      if(pcRef.current) pcRef.current.close();
    }
  },[]);

  async function startSearch(){
    if(!profile) return alert('No profile');
    setSearching(true);
    await supabase.from('waiting_queue').upsert({ user_id: profile.id, filters: { university_id: profile.university_id } });
    // call match attempt function via Supabase Functions endpoint
    const token = (await supabase.auth.getSession()).data.session?.access_token;
    const res = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/matchmake`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}`, 'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, 'Content-Type':'application/json' },
      body: JSON.stringify({ user_id: profile.id })
    });
    const json = await res.json();
    if(json.matched){
      setMatchInfo(json);
      sessionRef.current = json.session_id;
      await createPeerAndListen(json.session_id, json.other_user_id, json.offerer === profile.id);
    } else {
      // wait for realtime notification (match may happen later)
      listenForMatches(profile.id);
    }
  }

  function listenForMatches(userId){
    channelRef.current = supabase.channel('public:waiting_queue')
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'waiting_queue' }, payload => {
        // not used
      }).subscribe();
    // Also listen to sessions table for new sessions involving this user
    supabase.channel('public:sessions')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'sessions' }, payload => {
        const s = payload.new;
        if(s.user_a === userId || s.user_b === userId){
          setMatchInfo({ matched:true, session_id: s.id, other_user_id: s.user_a === userId ? s.user_b : s.user_a });
          sessionRef.current = s.id;
          createPeerAndListen(s.id, s.user_a === userId ? s.user_b : s.user_a, false);
        }
      }).subscribe();
  }

  async function createPeerAndListen(sessionId, otherUserId, amOfferer){
    pcRef.current = new RTCPeerConnection(STUN);
    const localStream = localVideoRef.current?.srcObject;
    if (localStream) localStream.getTracks().forEach(t => pcRef.current.addTrack(t, localStream));

    pcRef.current.ontrack = (ev)=>{ if(remoteVideoRef.current) remoteVideoRef.current.srcObject = ev.streams[0]; }

    pcRef.current.onicecandidate = async (e)=>{
      if(!e.candidate) return;
      await supabase.from('signals').insert([{ session_id: sessionId, from_user: profile.id, to_user: otherUserId, payload: { type: 'ice', candidate: e.candidate } }]);
    }

    // subscribe to signals for this session
    const channel = supabase.channel('signals:'+sessionId)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'signals', filter: `session_id=eq.${sessionId}` }, payload => {
        const sig = payload.new;
        if(sig.from_user === profile.id) return;
        const p = sig.payload;
        if(p.type === 'sdp'){
          const desc = new RTCSessionDescription(p.sdp);
          pcRef.current.setRemoteDescription(desc).then(async ()=>{
            if(desc.type === 'offer'){
              const answer = await pcRef.current.createAnswer();
              await pcRef.current.setLocalDescription(answer);
              await supabase.from('signals').insert([{ session_id: sessionId, from_user: profile.id, to_user: sig.from_user, payload: { type:'sdp', sdp: pcRef.current.localDescription } }]);
            }
          });
        } else if(p.type === 'ice'){
          pcRef.current.addIceCandidate(p.candidate).catch(console.error);
        }
      }).subscribe();
    // keep ref to unsubscribe later
    channelRef.current = channel;

    if(amOfferer){
      const offer = await pcRef.current.createOffer();
      await pcRef.current.setLocalDescription(offer);
      await supabase.from('signals').insert([{ session_id: sessionId, from_user: profile.id, to_user: otherUserId, payload: { type:'sdp', sdp: pcRef.current.localDescription } }]);
    }
  }

  return (
    <div style={{minHeight:'100vh', padding:20, background:'#0b0f17', color:'#e6eef8'}}>
      <div style={{maxWidth:1100, margin:'0 auto', display:'flex', gap:16}}>
        <div style={{flex:1}}>
          <div style={{background:'#0f1724', padding:12, borderRadius:10}}>
            <div style={{display:'flex', gap:12}}>
              <video ref={localVideoRef} autoPlay muted playsInline style={{width:180, height:120, background:'#000', borderRadius:8}} />
              <video ref={remoteVideoRef} autoPlay playsInline style={{flex:1, background:'#000', borderRadius:8}} />
            </div>
            <div style={{marginTop:12, display:'flex', gap:8, alignItems:'center'}}>
              <button onClick={startSearch} style={{padding:'10px 16px', background:'#5b21b6', borderRadius:8, border:'none'}}>{searching ? 'Searching...' : 'Start'}</button>
            </div>
          </div>
        </div>

        <div style={{width:300}}>
          <div style={{background:'#0f1724', padding:12, borderRadius:10}}>
            <h3>Chat</h3>
            <div style={{height:300, background:'#071026', borderRadius:8, marginTop:8}}></div>
          </div>

          <div style={{background:'#0f1724', padding:12, borderRadius:10, marginTop:12}}>
            <h4>Universities</h4>
            <div style={{display:'flex', flexWrap:'wrap', gap:8, marginTop:8}}>
              {universities.map(u=>(
                <div key={u.id} style={{width:72, height:44, background:'#071026', display:'flex', alignItems:'center', justifyContent:'center', borderRadius:6}}>
                  <img src={u.logo_url} alt="" style={{maxHeight:36}} />
                </div>
              ))}
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}
