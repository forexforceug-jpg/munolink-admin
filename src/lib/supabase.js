import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ffbjvrwkvnwocuyapajo.supabase.co';
const supabaseKey = 'sb_publishable_ufEz20LhJXOkvNUBfWT-GQ_ZK-e75fo';

export const supabase = createClient(supabaseUrl, supabaseKey);