#!/usr/bin/env node
// Simula exactamente lo que hace el frontend con _sb.functions.invoke()
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://qxoomcqaafogczrvsyhg.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF4b29tY3FhYWZvZ2N6cnZzeWhnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc0MDAyMzgsImV4cCI6MjA5Mjk3NjIzOH0.HRer4Z0vx1sNbxpZelIiHOqdGwSgpykEOZM5p2To2Vs';

const sb = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function test() {
  console.log('Testing _sb.functions.invoke() exactly as frontend does...\n');
  const t0 = Date.now();
  try {
    const result = await sb.functions.invoke('generate-website-config', {
      body: { medico_id: 'eb5246e4-92d9-465b-809e-1d24befd8876' }
    });
    const latency = Date.now() - t0;
    console.log('Latency:', latency + 'ms');
    console.log('Result:', JSON.stringify(result, null, 2));
  } catch (e) {
    const latency = Date.now() - t0;
    console.log('FAILED after', latency + 'ms');
    console.log('Error name:', e.name);
    console.log('Error message:', e.message);
    console.log('Error stack:', e.stack);
  }
}

test().catch(console.error);
