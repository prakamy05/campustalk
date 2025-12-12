import React, { useEffect, useState } from 'react';
import { supabase } from './services/supabaseClient';
import Login from './pages/Login';
import Register from './pages/Register';
import VideoRoom from './pages/VideoRoom';

export default function App() {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);

  useEffect(() => {
    supabase.auth.getSession().then(r => setSession(r.data.session ?? null));
    const { data: sub } = supabase.auth.onAuthStateChange(() => {
      supabase.auth.getSession().then(r => setSession(r.data.session ?? null));
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!session) return setProfile(null);
    async function load() {
      const { data } = await supabase.from('profiles').select('*').eq('user_id', session.user.id).single();
      setProfile(data ?? null);
    }
    load();
  }, [session]);

  if (!session) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-full max-w-md p-4 space-y-4">
        <Login />
        <Register />
      </div>
    </div>
  );

  return <VideoRoom supabaseSession={session} profile={profile} />;
}
