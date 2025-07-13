import React, { useState, useRef, useEffect } from 'react'
import type { RealTimeRecordingProps, RecordingInterfaceProps } from '../types/real_time_recording'
import { Mic, Square, Play, Pause, Save, RotateCcw, AlertCircle, Loader2 } from 'lucide-react'
import { getTemporaryToken } from '../services/api'

const RealTimeRecording: React.FC<RealTimeRecordingProps> = ({ 
  onTranscriptionComplete, 
  onError,
  isSaving = false
}) => {
  const [isRecording, setIsRecording] = useState(false)
  const [isConnectingToSpeechmatics, setIsConnectingToSpeechmatics] = useState(false)
  const [transcription, setTranscription] = useState('')
  const [finalTranscription, setFinalTranscription] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [audioLevel, setAudioLevel] = useState(0)
  const [connectionStatus, setConnectionStatus] = useState<'disconnected' | 'connecting' | 'connected' | 'error'>('disconnected')
  const [showPlayback, setShowPlayback] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)
  const [audioUrl, setAudioUrl] = useState<string | null>(null)
  const [accumulatedTranscript, setAccumulatedTranscript] = useState('')
  const [temporaryToken, setTemporaryToken] = useState<string | null>(null)
  const [waitingForEndOfTranscript, setWaitingForEndOfTranscript] = useState(false)

  const websocketRef = useRef<WebSocket | null>(null)
  const recognitionStartedRef = useRef(false)
  const audioChunkCountRef = useRef(0)
  const audioElementRef = useRef<HTMLAudioElement | null>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const microphoneRef = useRef<MediaStreamAudioSourceNode | null>(null)
  const dataArrayRef = useRef<Uint8Array | null>(null)
  const audioChunksRef = useRef<Blob[]>([])

  const startRecording = async () => {
    try {
      setError(null)
      setIsConnectingToSpeechmatics(true)
      setConnectionStatus('connecting')
      setWaitingForEndOfTranscript(false)

      // Get temporary token from Speechmatics API
      const token = await getTemporaryToken()
      setTemporaryToken(token)

      // Initialize audio context and get microphone access
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          sampleRate: 16000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        } 
      })

      // Set up audio analysis for level meter
      audioContextRef.current = new AudioContext({ sampleRate: 16000 })
      analyserRef.current = audioContextRef.current.createAnalyser()
      analyserRef.current.fftSize = 256
      microphoneRef.current = audioContextRef.current.createMediaStreamSource(stream)
      microphoneRef.current.connect(analyserRef.current)
      
      const bufferLength = analyserRef.current.frequencyBinCount
      dataArrayRef.current = new Uint8Array(bufferLength)

      // Set up MediaRecorder for audio capture and playback
      mediaRecorderRef.current = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      })

      // Store audio chunks for playback
      audioChunksRef.current = []
      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data)
        }
      }

      // Connect to Speechmatics WebSocket with temporary token
      const wsUrl = `wss://eu2.rt.speechmatics.com/v2?jwt=${token}`
      websocketRef.current = new WebSocket(wsUrl)

      websocketRef.current.onopen = () => {
        console.log('WebSocket connected')
        setConnectionStatus('connected')
        setIsConnectingToSpeechmatics(false)
        
        // Send StartRecognition message
        const startRecognitionMessage = {
          message: "StartRecognition",
          audio_format: {
            type: "raw",
            encoding: "pcm_s16le",
            sample_rate: 16000
          },
          transcription_config: {
            language: "en",
            operating_point: "enhanced",
            output_locale: "en-US",
            enable_partials: true,
            max_delay: 1.0
          }
        }
        
        websocketRef.current?.send(JSON.stringify(startRecognitionMessage))
      }

      websocketRef.current.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)
          console.log('WebSocket message received:', data)

          if (data.message === 'RecognitionStarted') {
            recognitionStartedRef.current = true
            console.log('Recognition started, ID:', data.id)
            setIsRecording(true)
            
            // Start MediaRecorder for playback recording
            mediaRecorderRef.current?.start(100)
            
            // Start sending raw audio data to Speechmatics
            startAudioStreaming(stream)
          } else if (data.message === 'AddPartialTranscript') {
            setTranscription(data.metadata.transcript)
          } else if (data.message === 'AddTranscript') {
            const newTranscript = data.metadata.transcript
            setFinalTranscription(prev => prev + ' ' + newTranscript)
            setTranscription('')
            setAccumulatedTranscript(prev => prev + ' ' + newTranscript)
          } else if (data.message === 'EndOfTranscript') {
            console.log('EndOfTranscript received - transcription complete')
            setWaitingForEndOfTranscript(false)
            // Final transcript is now complete in accumulatedTranscript
            setFinalTranscription(accumulatedTranscript.trim())
          } else if (data.message === 'Error') {
            console.error('Speechmatics error:', data)
            setError(`Speechmatics error: ${data.reason}`)
            onError(`Speechmatics error: ${data.reason}`)
          }
        } catch (error) {
          console.error('Error parsing WebSocket message:', error)
        }
      }

      websocketRef.current.onerror = (error) => {
        console.error('WebSocket error:', error)
        setError('WebSocket connection error')
        setConnectionStatus('error')
        setIsConnectingToSpeechmatics(false)
        onError('WebSocket connection error')
      }

      websocketRef.current.onclose = (event) => {
        console.log('WebSocket closed:', event.code, event.reason)
        setConnectionStatus('disconnected')
        setIsRecording(false)
        recognitionStartedRef.current = false
        setWaitingForEndOfTranscript(false)
      }

      // Update audio level meter
      const updateAudioLevel = () => {
        if (analyserRef.current && dataArrayRef.current && isRecording) {
          analyserRef.current.getByteFrequencyData(dataArrayRef.current)
          const average = dataArrayRef.current.reduce((a, b) => a + b) / dataArrayRef.current.length
          setAudioLevel(average / 255)
          requestAnimationFrame(updateAudioLevel)
        }
      }
      updateAudioLevel()

    } catch (error: any) {
      console.error('Failed to start recording:', error)
      setError(error.message)
      setConnectionStatus('error')
      setIsConnectingToSpeechmatics(false)
      onError(error.message)
    }
  }

  // Function to stream raw audio data to Speechmatics
  const startAudioStreaming = (stream: MediaStream) => {
    const audioContext = new AudioContext({ sampleRate: 16000 })
    const source = audioContext.createMediaStreamSource(stream)
    const processor = audioContext.createScriptProcessor(4096, 1, 1)
    
    processor.onaudioprocess = (event) => {
      if (websocketRef.current?.readyState === WebSocket.OPEN && recognitionStartedRef.current) {
        try {
          const inputBuffer = event.inputBuffer
          const inputData = inputBuffer.getChannelData(0)
          
          // Convert Float32Array to Int16Array (PCM 16-bit)
          const pcmData = new Int16Array(inputData.length)
          for (let i = 0; i < inputData.length; i++) {
            const sample = Math.max(-1, Math.min(1, inputData[i]))
            pcmData[i] = sample < 0 ? sample * 0x8000 : sample * 0x7FFF
          }
          
          // Send raw PCM data to Speechmatics
          websocketRef.current.send(pcmData.buffer)
          audioChunkCountRef.current++
        } catch (error) {
          console.error('Error sending audio data:', error)
        }
      }
    }
    
    source.connect(processor)
    processor.connect(audioContext.destination)
  }

  const stopRecording = () => {
    try {
      setIsRecording(false)
      setWaitingForEndOfTranscript(true)
      
      // Stop MediaRecorder
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop()
      }

      // Stop microphone stream
      if (mediaRecorderRef.current?.stream) {
        mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop())
      }

      // Close WebSocket connection
      if (websocketRef.current && websocketRef.current.readyState === WebSocket.OPEN) {
        // Send EndOfStream message
        const endOfStreamMessage = {
          message: "EndOfStream",
          last_seq_no: audioChunkCountRef.current
        }
        websocketRef.current.send(JSON.stringify(endOfStreamMessage))
        
        // Don't close connection immediately - wait for EndOfTranscript
        // The connection will be closed after EndOfTranscript is received
      }

      // Create audio URL for playback
      if (audioChunksRef.current.length > 0) {
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' })
        const url = URL.createObjectURL(blob)
        setAudioUrl(url)
        setShowPlayback(true)
      }

      // Reset audio analysis
      if (audioContextRef.current) {
        audioContextRef.current.close()
        audioContextRef.current = null
      }
      analyserRef.current = null
      microphoneRef.current = null
      dataArrayRef.current = null

      recognitionStartedRef.current = false
      audioChunkCountRef.current = 0

    } catch (error: any) {
      console.error('Error stopping recording:', error)
      setError(error.message)
      onError(error.message)
    }
  }

  const handlePlayPause = () => {
    if (audioElementRef.current) {
      if (isPlaying) {
        audioElementRef.current.pause()
      } else {
        audioElementRef.current.play()
      }
      setIsPlaying(!isPlaying)
    }
  }

  const handleSave = async () => {
    try {
      const audioBlob = audioUrl ? await fetch(audioUrl).then(r => r.blob()) : null
      await onTranscriptionComplete(accumulatedTranscript.trim(), audioBlob || undefined)
      
      // Clean up
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl)
        setAudioUrl(null)
      }
      setShowPlayback(false)
      setIsPlaying(false)
      setFinalTranscription('')
      setAccumulatedTranscript('')
      setTranscription('')
    } catch (error: any) {
      console.error('Error saving recording:', error)
      setError(error.message)
      onError(error.message)
    }
  }

  const handleRerecord = () => {
    // Clean up current recording
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl)
      setAudioUrl(null)
    }
    setShowPlayback(false)
    setIsPlaying(false)
    setFinalTranscription('')
    setAccumulatedTranscript('')
    setTranscription('')
    setError(null)
    setConnectionStatus('disconnected')
    setWaitingForEndOfTranscript(false)
    
    // Stop any ongoing recording
    if (isRecording) {
      stopRecording()
    }
  }

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (websocketRef.current) {
        websocketRef.current.close()
      }
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl)
      }
      if (audioContextRef.current) {
        audioContextRef.current.close()
      }
    }
  }, [audioUrl])

  return (
    <div className="space-y-6">
      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center space-x-2">
            <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0" />
            <span className="text-sm text-red-700">{error}</span>
          </div>
        </div>
      )}

      {/* Connection Status */}
      <div className="flex items-center justify-center">
        <div className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium ${
          connectionStatus === 'connected' 
            ? 'bg-green-50 text-green-700 border border-green-200'
            : connectionStatus === 'connecting'
            ? 'bg-yellow-50 text-yellow-700 border border-yellow-200'
            : connectionStatus === 'error'
            ? 'bg-red-50 text-red-700 border border-red-200'
            : 'bg-gray-50 text-gray-700 border border-gray-200'
        }`}>
          <div className={`w-2 h-2 rounded-full ${
            connectionStatus === 'connected' 
              ? 'bg-green-500 animate-pulse'
              : connectionStatus === 'connecting'
              ? 'bg-yellow-500 animate-pulse'
              : connectionStatus === 'error'
              ? 'bg-red-500'
              : 'bg-gray-500'
          }`}></div>
          <span>
            {connectionStatus === 'connected' && 'Connected'}
            {connectionStatus === 'connecting' && 'Connecting...'}
            {connectionStatus === 'error' && 'Connection Error'}
            {connectionStatus === 'disconnected' && 'Disconnected'}
          </span>
        </div>
      </div>

      {/* Audio Level Meter */}
      {isRecording && (
        <div className="flex items-center justify-center space-x-4">
          <div className="flex items-center space-x-2">
            <Mic className="h-5 w-5 text-red-500 animate-pulse" />
            <span className="text-sm font-medium text-gray-700">Recording...</span>
          </div>
          <div className="w-32 h-2 bg-gray-200 rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-green-500 to-red-500 transition-all duration-100"
              style={{ width: `${audioLevel * 100}%` }}
            ></div>
          </div>
        </div>
      )}

      {/* Recording Controls */}
      <div className="flex items-center justify-center space-x-4">
        {!isRecording ? (
          <button
            onClick={startRecording}
            disabled={isConnectingToSpeechmatics}
            className="flex items-center space-x-2 bg-red-500 hover:bg-red-600 text-white font-semibold py-3 px-6 rounded-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed min-h-[48px] min-w-[120px] justify-center"
          >
            {isConnectingToSpeechmatics ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                <span className="text-sm">Connecting...</span>
              </>
            ) : (
              <>
                <Mic className="h-5 w-5" />
                <span>Start Recording</span>
              </>
            )}
          </button>
        ) : (
          <button
            onClick={stopRecording}
            className="flex items-center space-x-2 bg-gray-500 hover:bg-gray-600 text-white font-semibold py-3 px-6 rounded-xl transition-all duration-200 min-h-[48px] min-w-[120px] justify-center"
          >
            <Square className="h-5 w-5" />
            <span>Stop Recording</span>
          </button>
        )}
      </div>

      {/* Live Transcription */}
      {transcription && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center space-x-2 mb-2">
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
            <span className="text-sm font-medium text-blue-800">Live Transcription</span>
          </div>
          <p className="text-sm text-gray-700 leading-relaxed">"{transcription}"</p>
        </div>
      )}

      {/* Final Transcription */}
      {finalTranscription && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span className="text-sm font-medium text-green-800">Final Transcription</span>
              {waitingForEndOfTranscript && (
                <div className="flex items-center space-x-2">
                  <Loader2 className="h-3 w-3 animate-spin text-green-600" />
                  <span className="text-xs text-green-600">Processing...</span>
                </div>
              )}
            </div>
          </div>
          <p className="text-sm text-gray-700 leading-relaxed mb-4">"{finalTranscription}"</p>
          
          {/* Playback Controls */}
          {showPlayback && audioUrl && (
            <div className="flex items-center space-x-2">
              <button
                onClick={handlePlayPause}
                className="flex items-center justify-center space-x-2 bg-blue-500 hover:bg-blue-600 text-white font-medium py-2 px-4 rounded-lg transition-colors"
              >
                {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                <span className="text-sm">{isPlaying ? 'Pause' : 'Play'}</span>
              </button>
              <audio
                ref={audioElementRef}
                src={audioUrl}
                onEnded={() => setIsPlaying(false)}
                className="hidden"
              />
            </div>
          )}
        </div>
      )}

      {/* Action Buttons */}
      {finalTranscription && !waitingForEndOfTranscript && (
        <div className="flex flex-col sm:flex-row items-center justify-center space-y-3 sm:space-y-0 sm:space-x-4">
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="flex items-center space-x-2 bg-green-500 hover:bg-green-600 text-white font-semibold py-3 px-6 rounded-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed min-h-[48px] min-w-[120px] justify-center"
          >
            {isSaving ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                <span className="text-sm">Saving...</span>
              </>
            ) : (
              <>
                <Save className="h-5 w-5" />
                <span>Save Recording</span>
              </>
            )}
          </button>
          
          <button
            onClick={handleRerecord}
            className="flex items-center space-x-2 bg-gray-500 hover:bg-gray-600 text-white font-semibold py-3 px-6 rounded-xl transition-all duration-200 min-h-[48px] min-w-[120px] justify-center"
          >
            <RotateCcw className="h-5 w-5" />
            <span>Record Again</span>
          </button>
        </div>
      )}
    </div>
  )
}

export default RealTimeRecording 