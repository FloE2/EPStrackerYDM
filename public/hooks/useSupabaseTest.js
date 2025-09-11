// src/hooks/useSupabaseTest.js
import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export const useSupabaseTest = () => {
  const [isConnected, setIsConnected] = useState(false)
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    testSupabaseConnection()
  }, [])

  const testSupabaseConnection = async () => {
    try {
      setLoading(true)
      
      // Test 1: Connexion de base
      const { data: classes, error: classError } = await supabase
        .from('classes')
        .select('*')
        .limit(5)

      if (classError) throw classError

      // Test 2: Compter les données
      const [classesCount, testsCount] = await Promise.all([
        supabase.from('classes').select('*', { count: 'exact' }),
        supabase.from('tests').select('*', { count: 'exact' })
      ])

      setData({
        sampleClasses: classes,
        stats: {
          classes: classesCount.count,
          tests: testsCount.count
        }
      })
      
      setIsConnected(true)
      setError(null)
      
      console.log('🎉 Supabase fonctionne parfaitement !', {
        classes: classesCount.count,
        tests: testsCount.count
      })

    } catch (err) {
      setError(err.message)
      setIsConnected(false)
      console.error('❌ Erreur Supabase:', err.message)
    } finally {
      setLoading(false)
    }
  }

  return {
    isConnected,
    loading,
    data,
    error,
    retestConnection: testSupabaseConnection
  }
}