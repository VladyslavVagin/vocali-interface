import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Heart, Play, Trash2, Plus } from 'lucide-react'
import Logo from '../components/Logo'

interface FavoriteCommand {
  id: string
  name: string
  command: string
  description: string
  category: string
}

const Favorites = () => {
  const navigate = useNavigate()
  const [favorites, setFavorites] = useState<FavoriteCommand[]>([
    {
      id: '1',
      name: 'Open Email',
      command: 'Open my email',
      description: 'Opens the email application',
      category: 'Productivity'
    },
    {
      id: '2',
      name: 'Set Reminder',
      command: 'Set a reminder for tomorrow',
      description: 'Creates a new reminder',
      category: 'Productivity'
    },
    {
      id: '3',
      name: 'Play Music',
      command: 'Play my favorite playlist',
      description: 'Starts playing music',
      category: 'Entertainment'
    }
  ])

  const handleDelete = (id: string) => {
    setFavorites(favorites.filter(fav => fav.id !== id))
  }

  const handlePlay = (command: FavoriteCommand) => {
    // TODO: Implement voice command execution
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => navigate('/')}
                className="flex items-center space-x-2 text-gray-600 hover:text-gray-800 transition-colors"
              >
                <ArrowLeft className="h-5 w-5" />
                <span>Back</span>
              </button>
              <Logo size="sm" />
              <h1 className="text-2xl font-bold text-gray-800">Favorites</h1>
            </div>
            <button className="flex items-center space-x-2 bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-semibold py-2 px-4 rounded-lg hover:from-blue-600 hover:to-indigo-700 transition-all duration-200">
              <Plus className="h-5 w-5" />
              <span>Add New</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {favorites.length === 0 ? (
          <div className="text-center py-12">
            <Heart className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-600 mb-2">No favorites yet</h3>
            <p className="text-gray-500">Start adding your favorite voice commands</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {favorites.map((favorite) => (
              <div key={favorite.id} className="bg-white rounded-2xl shadow-lg p-6 hover:shadow-xl transition-shadow">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center space-x-2">
                    <Heart className="h-5 w-5 text-red-500" />
                    <span className="text-sm font-medium text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                      {favorite.category}
                    </span>
                  </div>
                  <button
                    onClick={() => handleDelete(favorite.id)}
                    className="text-gray-400 hover:text-red-500 transition-colors"
                  >
                    <Trash2 className="h-5 w-5" />
                  </button>
                </div>
                
                <h3 className="text-xl font-semibold text-gray-800 mb-2">{favorite.name}</h3>
                <p className="text-gray-600 mb-3">{favorite.description}</p>
                
                <div className="bg-gray-50 rounded-lg p-3 mb-4">
                  <p className="text-sm text-gray-700 font-mono">"{favorite.command}"</p>
                </div>
                
                <button
                  onClick={() => handlePlay(favorite)}
                  className="w-full flex items-center justify-center space-x-2 bg-gradient-to-r from-green-500 to-emerald-600 text-white font-semibold py-3 px-6 rounded-lg hover:from-green-600 hover:to-emerald-700 transition-all duration-200"
                >
                  <Play className="h-5 w-5" />
                  <span>Execute Command</span>
                </button>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}

export default Favorites 