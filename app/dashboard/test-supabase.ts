// pages/api/test-supabase.ts
import { supabaseAdmin } from '@/lib/supabase-server';

export default async function handler(req, res) {
  try {
    console.log('Testing Supabase connection...');
    
    const { data, error } = await supabaseAdmin
      .from('servers') // or any table you have
      .select('count')
      .limit(1);
    
    if (error) throw error;
    
    return res.status(200).json({ success: true, message: 'Supabase connected!' });
  } catch (error) {
    console.error('Connection failed:', error);
    return res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
}