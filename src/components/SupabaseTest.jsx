// src/components/SupabaseTest.jsx
import React from 'react'
import { useSupabaseTest } from '../hooks/useSupabaseTest'
import { CheckCircle, XCircle, Loader, RefreshCw } from 'lucide-react'

const SupabaseTest = () => {
  const { isConnected, loading, data, error, retestConnection } = useSupabaseTest()

  if (loading) {
    return (
      <div className="max-w-md mx-auto mt-8 p-6 bg-white rounded-lg shadow-lg">
        <div className="flex items-center space-x-3">
          <Loader className="animate-spin text-blue-500" size={24} />
          <span className="text-lg font-medium">Test de connexion Supabase...</span>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="max-w-md mx-auto mt-8 p-6 bg-red-50 border border-red-200 rounded-lg">
        <div className="flex items-center space-x-3 mb-4">
          <XCircle className="text-red-500" size={24} />
          <span className="text-lg font-semibold text-red-700">Erreur de connexion</span>
        </div>
        <p className="text-red-600 mb-4">{error}</p>
        <button
          onClick={retestConnection}
          className="flex items-center space-x-2 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
        >
          <RefreshCw size={16} />
          <span>Retester</span>
        </button>
        <div className="mt-4 text-sm text-red-500">
          <p>Vérifiez :</p>
          <ul className="list-disc list-inside mt-2 space-y-1">
            <li>Votre fichier .env est créé</li>
            <li>Votre application a été redémarrée après ajout du .env</li>
            <li>Vos clés Supabase sont correctes</li>
          </ul>
        </div>
      </div>
    )
  }

  if (isConnected && data) {
    return (
      <div className="max-w-2xl mx-auto mt-8 p-6 bg-green-50 border border-green-200 rounded-lg">
        <div className="flex items-center space-x-3 mb-6">
          <CheckCircle className="text-green-500" size={24} />
          <span className="text-lg font-semibold text-green-700">Supabase connecté avec succès !</span>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-white p-4 rounded border">
            <h3 className="font-semibold text-gray-700 mb-2">📊 Statistiques</h3>
            <p>Classes: <span className="font-bold text-blue-600">{data.stats.classes}</span></p>
            <p>Tests: <span className="font-bold text-blue-600">{data.stats.tests}</span></p>
          </div>

          <div className="bg-white p-4 rounded border">
            <h3 className="font-semibold text-gray-700 mb-2">🎯 Statut</h3>
            <p className="text-green-600 font-medium">✅ Base de données prête</p>
            <p className="text-blue-600 font-medium">🚀 Prêt pour la migration</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded border">
          <h3 className="font-semibold text-gray-700 mb-3">📝 Exemples de classes</h3>
          <div className="grid grid-cols-3 gap-2">
            {data.sampleClasses.map(classe => (
              <div key={classe.id} className="text-sm bg-blue-100 px-2 py-1 rounded">
                {classe.name} ({classe.level})
              </div>
            ))}
          </div>
        </div>

        <div className="mt-6 p-4 bg-blue-50 rounded border border-blue-200">
          <h4 className="font-semibold text-blue-800 mb-2">🎉 Félicitations !</h4>
          <p className="text-blue-700">
            Votre base de données Supabase fonctionne parfaitement. Vous pouvez maintenant :
          </p>
          <ul className="list-disc list-inside mt-2 text-blue-700 space-y-1">
            <li>Supprimer la classe 6A de démonstration de votre code</li>
            <li>Migrer vos composants pour utiliser Supabase</li>
            <li>Ajouter de vraies classes et élèves</li>
          </ul>
        </div>

        <button
          onClick={retestConnection}
          className="mt-4 flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
        >
          <RefreshCw size={16} />
          <span>Tester à nouveau</span>
        </button>
      </div>
    )
  }

  return null
}

export default SupabaseTest