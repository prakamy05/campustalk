// Supabase Edge Function: match-attempt
import { serve } from 'std/server';
import { createClient } from '@supabase/supabase-js';

serve(async (req) => {
  try {
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const body = await req.json();
    const user_id = body.user_id;
    if(!user_id) return new Response(JSON.stringify({ error:'user_id required' }), { status:400 });

    const { data: meArr } = await supabase.from('profiles').select('*').eq('id', user_id).limit(1);
    const me = meArr && meArr[0];
    if(!me) return new Response(JSON.stringify({ error:'profile not found' }), { status:404 });

    const { data: candidates } = await supabase.from('waiting_queue').select('user_id, filters, created_at').neq('user_id', user_id).limit(20);
    if(!candidates || candidates.length === 0){
      return new Response(JSON.stringify({ matched:false }));
    }

    // try same university
    let other = null;
    for(const c of candidates){
      const { data: profArr } = await supabase.from('profiles').select('id, username, university_id').eq('id', c.user_id).limit(1);
      const prof = profArr && profArr[0];
      if(prof && prof.university_id === me.university_id){ other = prof; break; }
    }
    if(!other){
      const { data: profArr } = await supabase.from('profiles').select('id, username, university_id').eq('id', candidates[0].user_id).limit(1);
      other = profArr && profArr[0];
    }
    if(!other) return new Response(JSON.stringify({ matched:false }));

    const { data: sessionArr } = await supabase.from('sessions').insert([{ user_a: user_id, user_b: other.id, uni_a: me.university_id, uni_b: other.university_id }]).select().limit(1);
    const session = sessionArr && sessionArr[0];

    await supabase.from('waiting_queue').delete().or(`user_id.eq.${user_id},user_id.eq.${other.id}`);

    return new Response(JSON.stringify({ matched:true, session_id: session.id, other_user_id: other.id, other_user_public: { username: other.username, university_id: other.university_id }, offerer: user_id }), { status:200 });

  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({ error: String(err) }), { status:500 });
  }
});
