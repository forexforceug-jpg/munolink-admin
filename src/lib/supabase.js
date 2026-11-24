import { createClient } from '@supabase/supabase-js';

const supabaseUrl =
  import.meta.env.VITE_SUPABASE_URL || 'https://ffbjvrwkvnwocuyapajo.supabase.co';
const supabaseKey =
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  'sb_publishable_ufEz20LhJXOkvNUBfWT-GQ_ZK-e75fo';

export const supabase = createClient(supabaseUrl, supabaseKey);
