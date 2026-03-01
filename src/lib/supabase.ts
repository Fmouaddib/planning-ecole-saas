/**
 * Configuration Supabase pour l'application de planning
 */

import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://placeholder.supabase.co'
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'placeholder-key'

export const isDemoMode = !import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_ANON_KEY

if (isDemoMode) {
  console.warn('Missing Supabase environment variables. Running in demo mode.')
}

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    // Désactive navigator.locks qui cause un deadlock quand on query
    // immédiatement après signInWithPassword (lock re-entrancy)
    lock: (_name: string, _acquireTimeout: number, fn: () => Promise<any>) => fn(),
  },
  db: {
    schema: 'public',
  },
  global: {
    headers: {
      'X-Client-Info': 'planning-ecole-saas',
    },
  },
})

/**
 * Client isolé (sans persistance de session) pour les opérations
 * qui ne doivent pas perturber la session principale (ex: vérification de mot de passe,
 * création de compte enseignant via signUp fallback).
 */
export const isolatedClient = createClient(supabaseUrl, supabaseAnonKey, {
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
})

// Types utilitaires pour Supabase
export type SupabaseClient = typeof supabase