import { useState, useRef, useEffect } from 'react'
import { Mic, MicOff, Square, Loader2, AlertCircle } from 'lucide-react'

interface RealTimeRecordingProps {
  onTranscriptionComplete: (text: string) => void
  onError: (error: string) => void
}

const RealTimeRecording: React.FC<RealTimeRecordingProps> = ({ 
  onTranscriptionComplete, 
  onError 
}) => {
  const [isRecording, setIsRecording] = useState(false)
  const [isConnecting, setIsConnecting] = useState(false)
  const [transcription, setTranscription] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [audioLevel, setAudioLevel] = useState(0)
  const [connectionStatus, setConnectionStatus] = useState<string>('disconnected')
  
  const audioContextRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const microphoneRef = useRef<MediaStreamAudioSourceNode | null>(null)
  const workletNodeRef = useRef<AudioWorkletNode | null>(null)
  const animationFrameRef = useRef<number | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const websocketRef = useRef<WebSocket | null>(null)
  const recognitionStartedRef = useRef(false)
  const audioChunkCountRef = useRef(0)

  // Speechmatics configuration
  const SPEECHMATICS_API_KEY = import.meta.env.VITE_SPEECHMATICS_API_KEY

  const startRecording = async () => {
    try {
      setIsConnecting(true)
      setError(null)
      setTranscription('')
      setConnectionStatus('connecting')

      // Get microphone access
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 16000
        } 
      })

      streamRef.current = stream

      // Set up audio context and processing
      audioContextRef.current = new AudioContext({ sampleRate: 16000 })
      analyserRef.current = audioContextRef.current.createAnalyser()
      microphoneRef.current = audioContextRef.current.createMediaStreamSource(stream)
      
      // Connect microphone to analyser for level meter
      microphoneRef.current.connect(analyserRef.current)
      
      // Set up analyser for level meter
      analyserRef.current.fftSize = 256
      const bufferLength = analyserRef.current.frequencyBinCount
      const dataArray = new Uint8Array(bufferLength)

      const updateAudioLevel = () => {
        if (analyserRef.current && isRecording) {
          analyserRef.current.getByteFrequencyData(dataArray)
          const average = dataArray.reduce((a, b) => a + b) / bufferLength
          setAudioLevel(average / 255)
          animationFrameRef.current = requestAnimationFrame(updateAudioLevel)
        }
      }

      // Create AudioWorklet for processing audio data
      const workletCode = `
        class AudioProcessor extends AudioWorkletProcessor {
          process(inputs, outputs, parameters) {
            const input = inputs[0];
            if (input.length > 0) {
              const inputChannel = input[0];
              // Send audio data to main thread
              this.port.postMessage({
                audioData: inputChannel
              });
            }
            return true;
          }
        }
        registerProcessor('audio-processor', AudioProcessor);
      `;

      const workletBlob = new Blob([workletCode], { type: 'application/javascript' });
      const workletUrl = URL.createObjectURL(workletBlob);
      
      await audioContextRef.current.audioWorklet.addModule(workletUrl);
      
      workletNodeRef.current = new AudioWorkletNode(audioContextRef.current, 'audio-processor');
      
      workletNodeRef.current.port.onmessage = (event) => {
        if (event.data.audioData && websocketRef.current && recognitionStartedRef.current) {
          const audioData = new Float32Array(event.data.audioData);
          // Convert Float32Array to binary data for WebSocket
          const buffer = audioData.buffer;
          websocketRef.current.send(buffer);
          audioChunkCountRef.current++;
        }
      };

      // Connect the audio processing chain
      microphoneRef.current.connect(workletNodeRef.current);
      workletNodeRef.current.connect(audioContextRef.current.destination);

      setIsRecording(true)
      setIsConnecting(false)
      setConnectionStatus('connected')
      updateAudioLevel()

    } catch (error: any) {
      setError(error.message || 'Failed to start recording')
      onError(error.message || 'Failed to start recording')
      setIsConnecting(false)
      setConnectionStatus('error')
    }
  }

  const stopRecording = () => {
    // Send EndOfStream message
    if (websocketRef.current && websocketRef.current.readyState === WebSocket.OPEN) {
      websocketRef.current.send(JSON.stringify({
        message: "EndOfStream",
        last_seq_no: audioChunkCountRef.current
      }));
    }

    // Close WebSocket
    if (websocketRef.current) {
      websocketRef.current.close()
      websocketRef.current = null
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
      streamRef.current = null
    }
    
    if (workletNodeRef.current) {
      workletNodeRef.current.disconnect()
      workletNodeRef.current = null
    }
    
    if (audioContextRef.current) {
      audioContextRef.current.close()
      audioContextRef.current = null
    }
    
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current)
      animationFrameRef.current = null
    }
    
    setIsRecording(false)
    setAudioLevel(0)
    setConnectionStatus('disconnected')
    recognitionStartedRef.current = false
    audioChunkCountRef.current = 0
  }

  useEffect(() => {
    return () => {
      if (isRecording) {
        stopRecording()
      }
    }
  }, [])

  if (!SPEECHMATICS_API_KEY || SPEECHMATICS_API_KEY === 'your_speechmatics_api_key_here') {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <div className="flex items-center space-x-2">
          <AlertCircle className="h-5 w-5 text-yellow-600" />
          <span className="text-sm text-yellow-800">
            Speechmatics API key not configured. Please add your actual API key to VITE_SPEECHMATICS_API_KEY in your .env file.
          </span>
        </div>
      </div>
    )
  }

  return (
    <RecordingInterface 
      isRecording={isRecording}
      isConnecting={isConnecting}
      transcription={transcription}
      error={error}
      audioLevel={audioLevel}
      connectionStatus={connectionStatus}
      onStartRecording={startRecording}
      onStopRecording={stopRecording}
      onTranscriptionComplete={onTranscriptionComplete}
      onError={onError}
      apiKey={SPEECHMATICS_API_KEY}
      websocketRef={websocketRef}
      recognitionStartedRef={recognitionStartedRef}
      setTranscription={setTranscription}
      setConnectionStatus={setConnectionStatus}
    />
  )
}

interface RecordingInterfaceProps {
  isRecording: boolean
  isConnecting: boolean
  transcription: string
  error: string | null
  audioLevel: number
  connectionStatus: string
  onStartRecording: () => void
  onStopRecording: () => void
  onTranscriptionComplete: (text: string) => void
  onError: (error: string) => void
  apiKey: string
  websocketRef: React.MutableRefObject<WebSocket | null>
  recognitionStartedRef: React.MutableRefObject<boolean>
  setTranscription: (text: string) => void
  setConnectionStatus: (status: string) => void
}

const RecordingInterface: React.FC<RecordingInterfaceProps> = ({
  isRecording,
  isConnecting,
  transcription,
  error,
  audioLevel,
  connectionStatus,
  onStartRecording,
  onStopRecording,
  onTranscriptionComplete,
  onError,
  apiKey,
  websocketRef,
  recognitionStartedRef,
  setTranscription,
  setConnectionStatus
}) => {

  const handleStartRecording = async () => {
    try {
      console.log('Starting transcription...')
      
      // Get JWT token
      const jwt = await getSpeechmaticsJWT(apiKey)
      console.log('Got JWT token:', jwt ? 'Success' : 'Failed')
      
      // Create WebSocket connection with JWT in query parameter
      const wsUrl = `wss://eu2.rt.speechmatics.com/v2?jwt=${jwt}`
      const ws = new WebSocket(wsUrl)
      
      ws.onopen = () => {
        console.log('WebSocket connected')
        setConnectionStatus('connected')
        
        // Send StartRecognition message
        const startMessage = {
          message: "StartRecognition",
          audio_format: {
            type: "raw",
            encoding: "pcm_f32le",
            sample_rate: 16000
          },
          transcription_config: {
            language: "en",
            enable_partials: true,
            max_delay: 2,
            enable_entities: true
          }
        }
        
        ws.send(JSON.stringify(startMessage))
        console.log('Sent StartRecognition message')
      }
      
      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)
          console.log('Received message:', data)
          
          if (data.message === 'RecognitionStarted') {
            console.log('Recognition started successfully')
            recognitionStartedRef.current = true
            // Start audio recording after recognition is started
            onStartRecording()
          } else if (data.message === 'AddPartialTranscript') {
            console.log('Partial transcript:', data.metadata.transcript)
            setTranscription(data.metadata.transcript)
          } else if (data.message === 'AddTranscript') {
            console.log('Final transcript:', data.metadata.transcript)
            setTranscription(data.metadata.transcript)
            onTranscriptionComplete(data.metadata.transcript)
          } else if (data.message === 'AudioAdded') {
            console.log('Audio chunk acknowledged:', data.seq_no)
          } else if (data.message === 'Error') {
            console.error('Speechmatics error:', data)
            onError(data.reason || 'Transcription error')
          } else if (data.message === 'EndOfTranscript') {
            console.log('Transcription ended')
            onStopRecording()
          }
        } catch (error) {
          console.log('Non-JSON message received')
        }
      }
      
      ws.onerror = (error) => {
        console.error('WebSocket error:', error)
        onError('WebSocket connection error')
      }
      
      ws.onclose = (event) => {
        console.log('WebSocket closed:', event.code, event.reason)
        if (event.code !== 1000) {
          onError(`WebSocket closed: ${event.reason || 'Unknown error'}`)
        }
        recognitionStartedRef.current = false
        setConnectionStatus('disconnected')
      }
      
      websocketRef.current = ws
      
    } catch (error: any) {
      console.error('Failed to start transcription:', error)
      onError(error.message || 'Failed to start recording')
    }
  }

  const handleStopRecording = () => {
    console.log('Stopping transcription...')
    onStopRecording()
  }

  // Helper function to get JWT token
  const getSpeechmaticsJWT = async (apiKey: string) => {
    try {
      console.log('Requesting JWT token...')
      const response = await fetch('https://mp.speechmatics.com/v1/api_keys?type=rt', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          ttl: 3600,
        }),
      })
      
      if (!response.ok) {
        const errorText = await response.text()
        console.error('JWT request failed:', response.status, errorText)
        throw new Error(`Failed to get JWT token: ${response.status}`)
      }
      
      const data = await response.json()
      console.log('JWT token received successfully')
      return data.key_value
    } catch (error: any) {
      console.error('JWT token error:', error)
      throw error
    }
  }

  return (
    <div className="bg-white rounded-2xl shadow-lg p-6">
      <div className="text-center mb-6">
        <h3 className="text-xl font-semibold text-gray-800 mb-2">Real-Time Recording</h3>
        <p className="text-gray-600">
          Record audio directly from your microphone and get real-time transcription
        </p>
      </div>

      {/* Connection Status */}
      <div className="mb-4 p-3 rounded-lg text-sm">
        <div className="flex items-center space-x-2">
          <div className={`w-2 h-2 rounded-full ${
            connectionStatus === 'connected' ? 'bg-green-500' :
            connectionStatus === 'connecting' ? 'bg-yellow-500' :
            connectionStatus === 'error' ? 'bg-red-500' : 'bg-gray-400'
          }`}></div>
          <span className={`${
            connectionStatus === 'connected' ? 'text-green-700' :
            connectionStatus === 'connecting' ? 'text-yellow-700' :
            connectionStatus === 'error' ? 'text-red-700' : 'text-gray-600'
          }`}>
            {connectionStatus === 'connected' ? 'Connected to Speechmatics' :
             connectionStatus === 'connecting' ? 'Connecting...' :
             connectionStatus === 'error' ? 'Connection Error' : 'Disconnected'}
          </span>
        </div>
      </div>

      {/* Audio Level Meter */}
      {isRecording && (
        <div className="mb-6">
          <div className="flex items-center justify-center space-x-2 mb-2">
            <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
            <span className="text-sm text-gray-600">Recording...</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-gradient-to-r from-green-400 to-blue-500 h-2 rounded-full transition-all duration-100"
              style={{ width: `${audioLevel * 100}%` }}
            ></div>
          </div>
        </div>
      )}

      {/* Recording Button */}
      <div className="flex justify-center mb-6">
        <button
          onClick={isRecording ? handleStopRecording : handleStartRecording}
          disabled={isConnecting}
          className={`flex items-center space-x-3 px-8 py-4 rounded-full font-semibold text-white transition-all duration-200 ${
            isRecording 
              ? 'bg-red-500 hover:bg-red-600 shadow-lg' 
              : 'bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 shadow-lg hover:shadow-xl'
          } disabled:opacity-50 disabled:cursor-not-allowed`}
        >
          {isConnecting ? (
            <>
              <Loader2 className="h-6 w-6 animate-spin" />
              <span>Connecting...</span>
            </>
          ) : isRecording ? (
            <>
              <Square className="h-6 w-6" />
              <span>Stop Recording</span>
            </>
          ) : (
            <>
              <Mic className="h-6 w-6" />
              <span>Start Recording</span>
            </>
          )}
        </button>
      </div>

      {/* Error Display */}
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-center space-x-2">
            <AlertCircle className="h-4 w-4 text-red-500" />
            <span className="text-sm text-red-600">{error}</span>
          </div>
        </div>
      )}

      {/* Live Transcription */}
      {transcription && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center space-x-2 mb-2">
            <Mic className="h-4 w-4 text-blue-600" />
            <span className="text-sm font-medium text-blue-800">Live Transcription</span>
          </div>
          <p className="text-sm text-gray-700 leading-relaxed">
            "{transcription}"
          </p>
        </div>
      )}

      {/* Debug Info */}
      <div className="mt-4 p-3 bg-gray-50 border border-gray-200 rounded-lg">
        <div className="text-xs text-gray-600">
          <div>Connection Status: {connectionStatus}</div>
          <div>Is Recording: {isRecording ? 'Yes' : 'No'}</div>
          <div>Recognition Started: {recognitionStartedRef.current ? 'Yes' : 'No'}</div>
          <div>Audio Level: {Math.round(audioLevel * 100)}%</div>
          <div>Transcription Length: {transcription.length} characters</div>
        </div>
      </div>
    </div>
  )
}

export default RealTimeRecording 