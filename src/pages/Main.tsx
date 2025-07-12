import { useEffect, useRef, useState } from 'react'
import { useSelector, useDispatch } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import { LogOut, User, Mail, Loader2, Upload, AlertCircle, Play, FileAudio, Download, FileText, Mic, Trash2 } from 'lucide-react'
import { Notify, Confirm } from 'notiflix'
import { logout, getProfile } from '../redux/slices/authSlice'
import type { RootState, AppDispatch } from '../redux/store'
import Logo from '../components/Logo'
import RealTimeRecording from '../components/RealTimeRecording'
import Pagination from '../components/Pagination'
import api from '../services/api'
import type { AudioFile, PaginationInfo, AudioFilesResponse } from '../types/main_interfaces'

const Main = () => {
  const dispatch = useDispatch<AppDispatch>()
  const navigate = useNavigate()
  const { user, isAuthenticated, token, loading } = useSelector((state: RootState) => state.auth)
  const hasFetchedProfile = useRef(false)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [audioFiles, setAudioFiles] = useState<AudioFile[]>([])
  const [loadingFiles, setLoadingFiles] = useState(false)
  const [playingAudio, setPlayingAudio] = useState<string | null>(null)
  const [audioElements, setAudioElements] = useState<{ [key: string]: HTMLAudioElement }>({})
  const [showRealTimeRecording, setShowRealTimeRecording] = useState(false)
  const [savingRealTimeRecording, setSavingRealTimeRecording] = useState(false)
  const [deletingFiles, setDeletingFiles] = useState<{ [key: string]: boolean }>({})
  const [showSplash, setShowSplash] = useState(true)
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1)
  const [pagination, setPagination] = useState<PaginationInfo>({
    page: 1,
    limit: 10,
    totalItems: 0,
    totalPages: 0,
    hasNextPage: false,
    hasPreviousPage: false
  })

  useEffect(() => {
    // Only fetch profile if we have a valid token but no user data and haven't fetched yet
    if (token && token !== 'undefined' && token !== 'null' && isAuthenticated && !user && !hasFetchedProfile.current) {
      hasFetchedProfile.current = true
      dispatch(getProfile())
    }
  }, [token, isAuthenticated, dispatch])

  useEffect(() => {
    // If not authenticated or token is invalid, redirect to login
    if (!isAuthenticated || !token || token === 'undefined' || token === 'null') {
      hasFetchedProfile.current = false
      navigate('/auth#login')
    }
  }, [isAuthenticated, token, navigate])

  const handleLogout = () => {
    hasFetchedProfile.current = false
    dispatch(logout())
    navigate('/auth#login')
  }

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    // Check file size (20MB = 20 * 1024 * 1024 bytes)
    const maxSize = 20 * 1024 * 1024
    if (file.size > maxSize) {
      setUploadError('File size exceeds 20MB limit')
      return
    }

    // Check file type
    if (!file.type.startsWith('audio/')) {
      setUploadError('Please select an audio file')
      return
    }

    setUploadError(null)
    setUploading(true)

    try {
      const formData = new FormData()
      formData.append('file', file) // Changed from 'audio' to 'file'

      // Log file details for debugging
      console.log('Uploading file:', {
        name: file.name,
        size: file.size,
        type: file.type
      })

      const response = await api.post('/audio/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      })

      // Clear the file input
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
      
      // Handle successful upload
      const uploadResult = response.data
      
      // Refresh the audio files list after successful upload
      await fetchAudioFiles(1)
      
      // Show success notification
      Notify.success('Audio file uploaded successfully!', {
        position: 'center-top',
        timeout: 3000,
        clickToClose: true,
        pauseOnHover: true,
        borderRadius: '12px',
        fontFamily: 'Inter, system-ui, sans-serif',
        fontSize: '14px',
      })
      
    } catch (error: any) {
      console.error('Upload error:', error.response?.data || error.message)
      const errorMessage = error.response?.data?.message || 
        error.response?.data?.error || 
        error.message || 
        'Upload failed. Please try again.'
      
      setUploadError(errorMessage)
      
      // Show error notification
      Notify.failure(errorMessage, {
        position: 'center-top',
        timeout: 5000,
        clickToClose: true,
        pauseOnHover: true,
        borderRadius: '12px',
        fontFamily: 'Inter, system-ui, sans-serif',
        fontSize: '14px',
      })
    } finally {
      setUploading(false)
    }
  }

  const handleUploadClick = () => {
    fileInputRef.current?.click()
  }

  const handlePlayPause = (fileKey: string, downloadUrl: string) => {
    if (playingAudio === fileKey) {
      // Pause current audio
      const audio = audioElements[fileKey]
      if (audio) {
        audio.pause()
        setPlayingAudio(null)
      }
    } else {
      // Stop any currently playing audio
      if (playingAudio && audioElements[playingAudio]) {
        audioElements[playingAudio].pause()
      }

      // Play new audio
      let audio = audioElements[fileKey]
      if (!audio) {
        audio = new Audio(downloadUrl)
        audio.addEventListener('ended', () => {
          setPlayingAudio(null)
        })
        setAudioElements(prev => ({ ...prev, [fileKey]: audio }))
      }

      audio.play()
      setPlayingAudio(fileKey)
    }
  }

  const handleDownloadText = (fileName: string, transcriptionText: string) => {
    // Create a blob with the transcription text
    const blob = new Blob([transcriptionText], { type: 'text/plain' })
    const url = window.URL.createObjectURL(blob)
    
    // Create download link
    const a = document.createElement('a')
    a.href = url
    a.download = `${fileName.replace(/\.[^/.]+$/, '')}_transcription.txt`
    document.body.appendChild(a)
    a.click()
    
    // Cleanup
    window.URL.revokeObjectURL(url)
    document.body.removeChild(a)
  }

  const handleDeleteAudio = async (fileKey: string, fileName: string) => {
    // Confirm deletion with Notiflix
    const confirmed = await new Promise<boolean>((resolve) => {
      Confirm.show(
        'Delete Audio File',
        `Are you sure you want to delete "${fileName}"? This action cannot be undone.`,
        'Delete',
        'Cancel',
        () => resolve(true),
        () => resolve(false),
        {
          titleColor: '#ef4444',
          okButtonBackground: '#ef4444',
          okButtonColor: '#ffffff',
          cancelButtonBackground: '#6b7280',
          cancelButtonColor: '#ffffff',
          borderRadius: '12px',
          fontFamily: 'Inter, system-ui, sans-serif',
          titleFontSize: '18px',
          messageFontSize: '14px',
          buttonsFontSize: '14px',
          width: '400px',
        }
      )
    })

    if (!confirmed) {
      return
    }

    // Set deleting state for this file
    setDeletingFiles(prev => ({ ...prev, [fileKey]: true }))

    try {
      // Stop audio if it's playing
      if (playingAudio === fileKey) {
        const audio = audioElements[fileKey]
        if (audio) {
          audio.pause()
          setPlayingAudio(null)
        }
      }

      // Delete the file
      await api.delete(`/audio/files?fileKey=${encodeURIComponent(fileKey)}`)
      
      // Check if we're on a page that might become empty after deletion
      // If we're on page > 1 and this is the only item on the page, go to previous page
      if (currentPage > 1 && audioFiles.length === 1) {
        // Navigate to previous page after deletion
        await fetchAudioFiles(currentPage - 1)
      } else {
        // Refresh the audio files list to get updated data
        await fetchAudioFiles(currentPage)
      }
      
      // Clean up audio element
      if (audioElements[fileKey]) {
        audioElements[fileKey].pause()
        setAudioElements(prev => {
          const newElements = { ...prev }
          delete newElements[fileKey]
          return newElements
        })
      }

      console.log('Audio file deleted successfully:', fileKey)
      
      // Show success notification
      Notify.success('Audio file deleted successfully!', {
        position: 'center-top',
        timeout: 3000,
        clickToClose: true,
        pauseOnHover: true,
        borderRadius: '12px',
        fontFamily: 'Inter, system-ui, sans-serif',
        fontSize: '14px',
      })
      
    } catch (error: any) {
      console.error('Failed to delete audio file:', error)
      Notify.failure('Failed to delete file: ' + (error.response?.data?.message || error.message), {
        position: 'center-top',
        timeout: 5000,
        clickToClose: true,
        pauseOnHover: true,
        borderRadius: '12px',
        fontFamily: 'Inter, system-ui, sans-serif',
        fontSize: '14px',
      })
    } finally {
      // Clear deleting state
      setDeletingFiles(prev => {
        const newState = { ...prev }
        delete newState[fileKey]
        return newState
      })
    }
  }

  const handleRealTimeTranscriptionComplete = async (transcriptionText: string, audioBlob?: Blob) => {
    try {
      console.log('Real-time transcription completed:', transcriptionText)
      
      if (!audioBlob) {
        console.error('No audio blob available for saving')
        return
      }

      // Set saving state to show loading indicator
      setSavingRealTimeRecording(true)

      // Create a FormData object to send the audio file
      const formData = new FormData()
      formData.append('file', audioBlob, 'recording.wav')
      
      // Add transcription and recording type for real-time recordings
      formData.append('transcription', transcriptionText)
      formData.append('recordingType', 'real-time')

      // Upload to your API
      const response = await api.post('/audio/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      })

      console.log('Real-time recording saved successfully:', response.data)
      
      // Refresh the audio files list
      await fetchAudioFiles(1)
      
      // Show success notification
      Notify.success('Recording saved successfully!', {
        position: 'center-top',
        timeout: 3000,
        clickToClose: true,
        pauseOnHover: true,
        borderRadius: '12px',
        fontFamily: 'Inter, system-ui, sans-serif',
        fontSize: '14px',
      })
      
    } catch (error: any) {
      console.error('Failed to save real-time recording:', error)
      Notify.failure('Failed to save recording: ' + (error.response?.data?.message || error.message), {
        position: 'center-top',
        timeout: 5000,
        clickToClose: true,
        pauseOnHover: true,
        borderRadius: '12px',
        fontFamily: 'Inter, system-ui, sans-serif',
        fontSize: '14px',
      })
    } finally {
      // Clear saving state
      setSavingRealTimeRecording(false)
    }
  }

  const handleRealTimeError = (error: string) => {
    console.error('Real-time recording error:', error)
    // You could show a toast notification here
  }

  const fetchAudioFiles = async (page: number = currentPage) => {
    setLoadingFiles(true)
    try {
      const response = await api.get('/audio/files', {
        params: {
          page: page,
          limit: pagination.limit,
        },
      })
      const data: AudioFilesResponse = response.data
      setAudioFiles(data.items)
      setPagination(data.pagination)
      setCurrentPage(page)
    } catch (error: any) {
      console.error('Failed to fetch audio files:', error)
    } finally {
      setLoadingFiles(false)
    }
  }

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= pagination.totalPages) {
      fetchAudioFiles(newPage)
    }
  }



  // Fetch audio files when component mounts
  useEffect(() => {
    if (isAuthenticated && token) {
      fetchAudioFiles()
    }
  }, [isAuthenticated, token])

  // Hide splash screen after 5 seconds
  useEffect(() => {
    if (isAuthenticated && token && user) {
      const timer = setTimeout(() => {
        setShowSplash(false)
      }, 5000)
      
      return () => clearTimeout(timer)
    }
  }, [isAuthenticated, token, user])

  // Cleanup audio when component unmounts
  useEffect(() => {
    return () => {
      // Stop all audio when component unmounts
      Object.values(audioElements).forEach(audio => {
        audio.pause()
        audio.currentTime = 0
      })
    }
  }, [audioElements])



  // Show loading while fetching profile (only if we're authenticated and have a token)
  if (loading && !user && isAuthenticated && token && token !== 'undefined' && token !== 'null') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 text-blue-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading your profile...</p>
        </div>
      </div>
    )
  }

  // If not authenticated, show loading (will redirect in useEffect)
  if (!isAuthenticated || !token || token === 'undefined' || token === 'null') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 text-blue-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Redirecting to login...</p>
        </div>
      </div>
    )
  }

  // Show splash screen if authenticated and splash is active
  if (showSplash && isAuthenticated && token && user) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <video
            autoPlay
            muted
            loop
            className="w-64 h-64 mx-auto max-w-[300px] max-h-[300px]"
          >
            <source src="/src/assets/logo-vocali-animated.mp4" type="video/mp4" />
            Your browser does not support the video tag.
          </video>
          <div className="mt-8">
            <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin mx-auto"></div>
            <p className="text-white text-lg mt-4 font-medium">Welcome to Vocali</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <Logo size="md" />
              <h1 className="text-2xl font-bold text-gray-800">Vocali</h1>
            </div>
            <div className="flex items-center space-x-6">
              {/* Voice Status */}
              <div className="flex items-center space-x-2 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-sm text-green-700 font-medium">Voice recognition ready</span>
              </div>
              
              {user && (
                <div className="flex items-center space-x-3">
                  <div className="flex items-center space-x-2 text-gray-600">
                    <User className="h-4 w-4" />
                    <span className="font-medium">{user.name}</span>
                  </div>
                  <div className="flex items-center space-x-2 text-gray-500">
                    <Mail className="h-4 w-4" />
                    <span className="text-sm">{user.email}</span>
                  </div>
                </div>
              )}
              <button
                onClick={handleLogout}
                className="flex items-center space-x-2 text-gray-600 hover:text-gray-800 transition-colors"
              >
                <LogOut className="h-5 w-5" />
                <span>Logout</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-8">
          {/* Audio Recording Options */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-3xl mx-auto">
            {/* Upload Audio Card */}
            <div className="bg-white rounded-xl shadow-lg p-4 hover:shadow-xl transition-shadow">
              <div className="flex items-start space-x-3">
                <div className="flex items-center justify-center w-12 h-12 bg-blue-100 rounded-full flex-shrink-0">
                  <Upload className="h-6 w-6 text-blue-600" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-800 mb-2">Upload Audio</h3>
                  <p className="text-gray-600 mb-3 text-sm">
                    Upload your audio file for voice processing and analysis. Maximum file size: 20 MB.
                  </p>
                </div>
              </div>
              
              {/* Hidden file input */}
              <input
                ref={fileInputRef}
                type="file"
                accept="audio/*"
                onChange={handleFileUpload}
                className="hidden"
              />
              
              {/* Upload button with tooltip */}
              <div className="relative group">
                <button 
                  onClick={handleUploadClick}
                  disabled={uploading}
                  className="w-full bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-semibold py-2 px-4 rounded-lg hover:from-blue-600 hover:to-indigo-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2 text-sm"
                >
                  {uploading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Uploading...</span>
                    </>
                  ) : (
                    <>
                      <Upload className="h-4 w-4" />
                      <span>Upload Audio</span>
                    </>
                  )}
                </button>
                
                {/* Tooltip */}
                <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-sm rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap">
                  <div className="flex items-center space-x-1">
                    <AlertCircle className="h-4 w-4" />
                    <span>Maximum 20 MB audio files</span>
                  </div>
                  <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-gray-900"></div>
                </div>
              </div>
              
              {/* Error message */}
              {uploadError && (
                <div className="mt-3 p-2 bg-red-50 border border-red-200 rounded-lg">
                  <div className="flex items-center space-x-2">
                    <AlertCircle className="h-3 w-3 text-red-500" />
                    <span className="text-xs text-red-600">{uploadError}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Real-Time Recording Card */}
            <div className="bg-white rounded-xl shadow-lg p-4 hover:shadow-xl transition-shadow">
              <div className="flex items-start space-x-3">
                <div className="flex items-center justify-center w-12 h-12 bg-purple-100 rounded-full flex-shrink-0">
                  <Mic className="h-6 w-6 text-purple-600" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-800 mb-2">Real-Time Recording</h3>
                  <p className="text-gray-600 mb-3 text-sm">
                    Record audio directly from your microphone with live transcription.
                  </p>
                </div>
              </div>
              
              <button 
                onClick={() => setShowRealTimeRecording(!showRealTimeRecording)}
                className="w-full bg-gradient-to-r from-purple-500 to-pink-600 text-white font-semibold py-2 px-4 rounded-lg hover:from-purple-600 hover:to-pink-700 transition-all duration-200 flex items-center justify-center space-x-2 text-sm"
              >
                <Mic className="h-4 w-4" />
                <span>{showRealTimeRecording ? 'Hide Recorder' : 'Start Recording'}</span>
              </button>
            </div>
          </div>

          {/* Real-Time Recording Interface */}
          {showRealTimeRecording && (
            <div className="max-w-2xl mx-auto">
              <RealTimeRecording 
                onTranscriptionComplete={handleRealTimeTranscriptionComplete}
                onError={handleRealTimeError}
                isSaving={savingRealTimeRecording}
              />
            </div>
          )}

          {/* Audio Files List */}
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-3">
                <FileAudio className="h-6 w-6 text-blue-600" />
                <h2 className="text-2xl font-bold text-gray-800">Your Audio Files</h2>
              </div>
              {loadingFiles && (
                <div className="flex items-center space-x-2 text-gray-600">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="text-sm">Loading...</span>
                </div>
              )}
            </div>

            {audioFiles.length === 0 && !loadingFiles ? (
              <div className="text-center py-12">
                <FileAudio className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-600 mb-2">No audio files yet</h3>
                <p className="text-gray-500">Upload your first audio file to get started</p>
              </div>
            ) : (
              <>
                <div className="space-y-4">
                  {audioFiles.map((file) => (
                    <div key={file.fileKey} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          <div className="flex items-center justify-center w-12 h-12 bg-blue-100 rounded-lg">
                            <FileAudio className="h-6 w-6 text-blue-600" />
                          </div>
                          <div className="flex-1">
                            <h3 className="font-semibold text-gray-800">{file.metadata.originalName}</h3>
                            <div className="flex items-center space-x-4 text-sm text-gray-500 mt-1">
                              <span>{file.metadata.format}</span>
                              <span>•</span>
                              <span>{Math.round(file.fileSize / 1024)} KB</span>
                              <span>•</span>
                              <span>{file.duration}s</span>
                              {file.metadata.transcription?.status && (
                                <>
                                  <span>•</span>
                                  <span className={`px-2 py-1 rounded-full text-xs ${
                                    file.metadata.transcription.status === 'completed' 
                                      ? 'bg-green-100 text-green-700'
                                      : file.metadata.transcription.status === 'processing'
                                      ? 'bg-yellow-100 text-yellow-700'
                                      : file.metadata.transcription.status === 'failed'
                                      ? 'bg-red-100 text-red-700'
                                      : 'bg-gray-100 text-gray-700'
                                  }`}>
                                    {file.metadata.transcription.status}
                                  </span>
                                </>
                              )}
                            </div>
                            {file.metadata.transcription?.text && file.metadata.transcription.text.trim() !== '' && (
                              <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                                <div className="flex items-center justify-between mb-2">
                                  <div className="flex items-center space-x-2">
                                    <FileText className="h-4 w-4 text-blue-600" />
                                    <span className="text-sm font-medium text-blue-800">Transcription</span>
                                    {file.metadata.transcription?.status !== 'completed' && (
                                      <span className="text-xs text-orange-600 bg-orange-100 px-2 py-1 rounded-full">
                                        {file.metadata.transcription?.status}
                                      </span>
                                    )}
                                  </div>
                                  <button
                                    onClick={() => handleDownloadText(file.metadata.originalName, file.metadata.transcription.text)}
                                    className="p-1 text-blue-600 hover:text-blue-700 hover:bg-blue-100 rounded transition-colors"
                                    title="Download transcription"
                                  >
                                    <Download className="h-4 w-4" />
                                  </button>
                                </div>
                                <p className="text-sm text-gray-700 leading-relaxed">
                                  "{file.metadata.transcription.text}"
                                </p>
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => handlePlayPause(file.fileKey, file.downloadUrl)}
                            className={`p-2 transition-all duration-200 rounded-lg ${
                              playingAudio === file.fileKey 
                                ? 'bg-red-500 hover:bg-red-600 text-white shadow-lg' 
                                : 'text-gray-600 hover:text-green-600 hover:bg-green-50'
                            }`}
                            title={playingAudio === file.fileKey ? 'Pause' : 'Play'}
                          >
                            {playingAudio === file.fileKey ? (
                              <div className="h-5 w-5 flex items-center justify-center">
                                <div className="flex space-x-1">
                                  <div className="w-1 h-4 bg-white rounded-sm"></div>
                                  <div className="w-1 h-4 bg-white rounded-sm"></div>
                                </div>
                              </div>
                            ) : (
                              <Play className="h-5 w-5" />
                            )}
                          </button>
                          
                          <button
                            onClick={() => handleDeleteAudio(file.fileKey, file.metadata.originalName)}
                            disabled={deletingFiles[file.fileKey]}
                            className={`p-2 transition-all duration-200 rounded-lg ${
                              deletingFiles[file.fileKey]
                                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                : 'text-gray-600 hover:text-red-600 hover:bg-red-50'
                            }`}
                            title="Delete audio file"
                          >
                            {deletingFiles[file.fileKey] ? (
                              <Loader2 className="h-5 w-5 animate-spin" />
                            ) : (
                              <Trash2 className="h-5 w-5" />
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Pagination Controls */}
                <div className="mt-6">
                  <Pagination
                    pagination={pagination}
                    currentPage={currentPage}
                    onPageChange={handlePageChange}
                    showItemCount={true}
                    itemLabel="files"
                  />
                </div>
              </>
            )}
          </div>
        </div>


      </main>
    </div>
  )
}

export default Main 