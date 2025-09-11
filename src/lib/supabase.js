// src/lib/supabase.js
import { createClient } from '@supabase/supabase-js'

// Configuration depuis les variables d'environnement
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://jngzmclphkfoezgniexp.supabase.co'
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpuZ3ptY2xwaGtmb2V6Z25pZXhwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU4MDczMTYsImV4cCI6MjA3MTM4MzMxNn0.1kD4SPgxj5mWBXffwVhOFym4ueMzuiPvSKuJaQOSBS8'

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables. Check your .env file.')
}

// Instance unique de Supabase - SINGLETON
export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Test de connexion (optionnel - pour debug)
export const testConnection = async () => {
  try {
    const { data, error } = await supabase.from('classes').select('count')
    if (error) throw error
    console.log('✅ Supabase connected successfully')
    return true
  } catch (error) {
    console.error('❌ Supabase connection failed:', error.message)
    return false
  }
}