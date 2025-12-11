import { supabase } from '../../lib/supabaseClient';

export default async function handler(req, res) {
  const { domain } = req.query;
  if (!domain) return res.status(400).json({ error: 'missing domain' });
  const d = domain.toLowerCase();
  const { data, error } = await supabase
    .from('universities')
    .select('*')
    .ilike('domain', d)
    .limit(1);
  if (error) return res.status(500).json({ error: error.message });
  if (!data || data.length === 0) return res.json({ found: false });
  return res.json({ found: true, university: data[0] });
}
