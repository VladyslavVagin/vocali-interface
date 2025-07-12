import { useState, useRef, useEffect } from 'react'
import { Mic, MicOff, Square, Loader2, AlertCircle, Play, Pause, Save, RotateCcw } from 'lucide-react'

interface RealTimeRecordingProps {
  onTranscriptionComplete: (text: string, audioBlob?: Blob) => Promise<void>
  onError: (error: string) => void
  isSaving?: boolean
}

const RealTimeRecording: React.FC<RealTimeRecordingProps> = ({ 
  onTranscriptionComplete, 
  onError,
  isSaving = false
}) => {
  const [isRecording, setIsRecording] = useState(false)
  const [isConnecting, setIsConnecting] = useState(false)
  const [transcription, setTranscription] = useState('')
  const [finalTranscription, setFinalTranscription] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [audioLevel, setAudioLevel] = useState(0)
  const [connectionStatus, setConnectionStatus] = useState<string>('disconnected')
  const [showPlayback, setShowPlayback] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null)
  const [audioUrl, setAudioUrl] = useState<string | null>(null)
  const [accumulatedTranscript, setAccumulatedTranscript] = useState('')
  
  const audioContextRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const microphoneRef = useRef<MediaStreamAudioSourceNode | null>(null)
  const workletNodeRef = useRef<AudioWorkletNode | null>(null)
  const animationFrameRef = useRef<number | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const websocketRef = useRef<WebSocket | null>(null)
  const recognitionStartedRef = useRef(false)
  const audioChunkCountRef = useRef(0)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const audioElementRef = useRef<HTMLAudioElement | null>(null)

  // Speechmatics configuration
  const SPEECHMATICS_API_KEY = import.meta.env.VITE_SPEECHMATICS_API_KEY

  const startRecording = async () => {
    try {
      setIsConnecting(true)
      setError(null)
      setTranscription('')
      setFinalTranscription('')
      setShowPlayback(false)
      setAudioBlob(null)
      setAudioUrl(null)
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

      // Set up MediaRecorder for audio capture
      mediaRecorderRef.current = new MediaRecorder(stream)
      audioChunksRef.current = []
      
      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data)
        }
      }

      mediaRecorderRef.current.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' })
        const audioUrl = URL.createObjectURL(audioBlob)
        setAudioBlob(audioBlob)
        setAudioUrl(audioUrl)
        setShowPlayback(true)
      }

      // Start MediaRecorder
      mediaRecorderRef.current.start()

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
          // Check WebSocket state before sending
          if (websocketRef.current.readyState === WebSocket.OPEN) {
            const audioData = new Float32Array(event.data.audioData);
            // Convert Float32Array to binary data for WebSocket
            const buffer = audioData.buffer;
            try {
              websocketRef.current.send(buffer);
              audioChunkCountRef.current++;
            } catch (error) {
              console.warn('Failed to send audio data:', error);
            }
          }
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
    // Stop MediaRecorder
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop()
    }

    // Wait a moment for any final transcript segments before sending EndOfStream
    setTimeout(() => {
      // Send EndOfStream message
      if (websocketRef.current && websocketRef.current.readyState === WebSocket.OPEN) {
        websocketRef.current.send(JSON.stringify({
          message: "EndOfStream",
          last_seq_no: audioChunkCountRef.current
        }));
        
        // Wait a moment for the message to be sent before closing
        setTimeout(() => {
          if (websocketRef.current) {
            websocketRef.current.close(1000, 'Normal closure')
            websocketRef.current = null
          }
        }, 100)
      } else if (websocketRef.current) {
        websocketRef.current.close(1000, 'Normal closure')
        websocketRef.current = null
      }
    }, 3000) // Wait 3 seconds for final transcript segments

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
    
    // Call handleRecordingComplete after a delay to ensure we have the latest transcripts
    setTimeout(() => {
      handleRecordingComplete()
    }, 1000)
  }

  const handlePlayPause = () => {
    if (!audioElementRef.current) return

    if (isPlaying) {
      audioElementRef.current.pause()
      setIsPlaying(false)
    } else {
      audioElementRef.current.play()
      setIsPlaying(true)
    }
  }

  const handleSave = async () => {
    if (finalTranscription) {
      try {
        await onTranscriptionComplete(finalTranscription, audioBlob || undefined)
        // Reset state only after successful save
        setShowPlayback(false)
        setFinalTranscription('')
        setTranscription('')
        setAudioBlob(null)
        setAudioUrl(null)
      } catch (error) {
        console.error('Failed to save recording:', error)
        // Don't reset state on error, let user retry
      }
    }
  }

  const handleRerecord = () => {
    setShowPlayback(false)
    setFinalTranscription('')
    setTranscription('')
    setAudioBlob(null)
    setAudioUrl(null)
    // Clean up audio URL
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl)
      setAudioUrl(null)
    }
  }

  const handleRecordingComplete = () => {
    // This is called when the recording is fully complete
    console.log('Recording complete. Available transcripts:')
    console.log('- Accumulated:', accumulatedTranscript)
    console.log('- Partial:', transcription)
    
    // Choose the most complete transcript
    let finalText = ''
    
    // If we have both accumulated and partial, try to combine them intelligently
    if (accumulatedTranscript && transcription) {
      const accumulated = accumulatedTranscript.trim()
      const partial = transcription.trim()
      
      // If partial seems to continue from where accumulated left off, combine them
      if (accumulated && partial && !accumulated.endsWith('.') && !accumulated.endsWith('!') && !accumulated.endsWith('?')) {
        // Accumulated doesn't end with punctuation, partial might continue it
        const combined = accumulated + ' ' + partial
        finalText = cleanTranscriptText(combined)
        console.log('Combining accumulated and partial:', finalText)
      } else {
        // Choose the longer/more complete one
        const accumulatedCleaned = cleanTranscriptText(accumulated)
        if (partial.length > accumulatedCleaned.length) {
          finalText = partial
          console.log('Using partial transcript (longer):', finalText)
        } else {
          finalText = accumulatedCleaned
          console.log('Using accumulated transcript (cleaned):', finalText)
        }
      }
    } else if (accumulatedTranscript) {
      finalText = cleanTranscriptText(accumulatedTranscript)
      console.log('Using accumulated transcript:', finalText)
    } else if (transcription) {
      finalText = transcription
      console.log('Using partial transcript:', finalText)
    }
    
    if (finalText) {
      setFinalTranscription(finalText)
    }
  }

  const cleanTranscriptText = (text: string) => {
    let cleanedText = text.trim();

    // Remove trailing incomplete words (words less than 3 characters at the end)
    const words = cleanedText.split(' ');
    if (words.length > 0 && words[words.length - 1].length < 3) {
      words.pop();
      cleanedText = words.join(' ');
    }

    // Remove *exact* duplicate sentences only
    const sentences = cleanedText.split(/[.!?]+/).map(s => s.trim()).filter(s => s.length > 0);
    const seen = new Set<string>();
    const uniqueSentences = sentences.filter(sentence => {
      if (seen.has(sentence)) return false;
      seen.add(sentence);
      return true;
    });

    // Join unique sentences with proper punctuation
    const finalText = uniqueSentences.join('. ') + (uniqueSentences.length > 0 ? '.' : '');

    return finalText;
  }

  useEffect(() => {
    return () => {
      if (isRecording) {
        stopRecording()
      }
      // Clean up audio URL
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl)
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
      finalTranscription={finalTranscription}
      error={error}
      audioLevel={audioLevel}
      connectionStatus={connectionStatus}
      showPlayback={showPlayback}
      isPlaying={isPlaying}
      audioUrl={audioUrl}
      onStartRecording={startRecording}
      onStopRecording={stopRecording}
      onTranscriptionComplete={onTranscriptionComplete}
      onError={onError}
      onPlayPause={handlePlayPause}
      onSave={handleSave}
      onRerecord={handleRerecord}
      setFinalTranscription={setFinalTranscription}
      setIsPlaying={setIsPlaying}
      apiKey={SPEECHMATICS_API_KEY}
      websocketRef={websocketRef}
      recognitionStartedRef={recognitionStartedRef}
      audioChunkCountRef={audioChunkCountRef}
      setTranscription={setTranscription}
      setConnectionStatus={setConnectionStatus}
      audioElementRef={audioElementRef}
      accumulatedTranscript={accumulatedTranscript}
      setAccumulatedTranscript={setAccumulatedTranscript}
      isSaving={isSaving}
    />
  )
}

interface RecordingInterfaceProps {
  isRecording: boolean
  isConnecting: boolean
  transcription: string
  finalTranscription: string
  error: string | null
  audioLevel: number
  connectionStatus: string
  showPlayback: boolean
  isPlaying: boolean
  audioUrl: string | null
  onStartRecording: () => void
  onStopRecording: () => void
  onTranscriptionComplete: (text: string) => Promise<void>
  onError: (error: string) => void
  onPlayPause: () => void
  onSave: () => Promise<void>
  onRerecord: () => void
  setFinalTranscription: (text: string) => void
  setIsPlaying: (playing: boolean) => void
  accumulatedTranscript: string
  setAccumulatedTranscript: (text: string) => void
  apiKey: string
  websocketRef: React.MutableRefObject<WebSocket | null>
  recognitionStartedRef: React.MutableRefObject<boolean>
  audioChunkCountRef: React.MutableRefObject<number>
  setTranscription: (text: string) => void
  setConnectionStatus: (status: string) => void
  audioElementRef: React.MutableRefObject<HTMLAudioElement | null>
  isSaving?: boolean
}

const RecordingInterface: React.FC<RecordingInterfaceProps> = ({
  isRecording,
  isConnecting,
  transcription,
  finalTranscription,
  error,
  audioLevel,
  connectionStatus,
  showPlayback,
  isPlaying,
  audioUrl,
  onStartRecording,
  onStopRecording,
  onTranscriptionComplete,
  onError,
  onPlayPause,
  onSave,
  onRerecord,
  setFinalTranscription,
  setIsPlaying,
  apiKey,
  websocketRef,
  recognitionStartedRef,
  audioChunkCountRef,
  setTranscription,
  setConnectionStatus,
  audioElementRef,
  accumulatedTranscript,
  setAccumulatedTranscript,
  isSaving = false
}) => {

  const [localIsRecording, setLocalIsRecording] = useState(isRecording)
  const [localAudioLevel, setLocalAudioLevel] = useState(audioLevel)
  const [localAccumulatedTranscript, setLocalAccumulatedTranscript] = useState(accumulatedTranscript)

  // Synchronize local state with props
  useEffect(() => {
    setLocalIsRecording(isRecording)
  }, [isRecording])

  useEffect(() => {
    setLocalAudioLevel(audioLevel)
  }, [audioLevel])

  // Synchronize accumulated transcript with parent
  useEffect(() => {
    setLocalAccumulatedTranscript(accumulatedTranscript)
  }, [accumulatedTranscript])

  // Reset accumulated transcript when starting new recording
  useEffect(() => {
    if (isRecording && !localIsRecording) {
      setLocalAccumulatedTranscript('')
    }
  }, [isRecording, localIsRecording])

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
        
        // Send StartRecognition message with proper configuration
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
            max_delay: 6.0,
            max_delay_mode: "flexible",
            enable_entities: true,
            operating_point: "enhanced"
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
            if (data.metadata && data.metadata.transcript) {
              console.log('Partial transcript:', data.metadata.transcript)
              setTranscription(data.metadata.transcript)
              // Store the latest partial transcript as backup, but don't overwrite if it's shorter
              setLocalAccumulatedTranscript(prevText => {
                const newPartial = data.metadata.transcript
                // Only update if the new partial is longer or we don't have accumulated text
                if (!prevText || newPartial.length > prevText.length) {
                  console.log('Updating accumulated transcript with longer partial:', newPartial)
                  return newPartial
                }
                return prevText
              })
            }
          } else if (data.message === 'AddTranscript') {
            if (data.metadata && data.metadata.transcript) {
              console.log('Final transcript segment:', data.metadata.transcript)
              // Use final transcript segments as the primary source
              setLocalAccumulatedTranscript(prevText => {
                const currentText = prevText || ''
                const newSegment = data.metadata.transcript
                
                // Don't add very short segments that might be incomplete
                if (newSegment.trim().length < 3 && !newSegment.includes('.')) {
                  console.log('Skipping short incomplete segment:', newSegment)
                  return currentText
                }
                
                // Clean up the text by removing duplicates and repetitions
                const cleanText = currentText + (currentText && !currentText.endsWith(' ') ? ' ' : '') + newSegment
                console.log('Clean final transcript:', cleanText)
                // Update the parent component's accumulated transcript
                setAccumulatedTranscript(cleanText)
                // Update the parent component's finalTranscription
                setFinalTranscription(cleanText)
                return cleanText
              })
            }
          } else if (data.message === 'EndOfUtterance') {
            console.log('End of utterance detected')
            // Wait a bit more for any final transcript segments
            setTimeout(() => {
              console.log('Final transcript after utterance end:', localAccumulatedTranscript)
            }, 1000)
          } else if (data.message === 'AudioAdded') {
            console.log('Audio chunk acknowledged:', data.seq_no)
          } else if (data.message === 'Error') {
            console.error('Speechmatics error:', data)
            if (data.type === 'quota_exceeded') {
              onError('Speechmatics quota exceeded. Please try again later.')
            } else {
              onError(data.reason || 'Transcription error')
            }
            // Stop recording immediately on error
            setLocalIsRecording(false)
            setLocalAudioLevel(0)
            setConnectionStatus('error')
            recognitionStartedRef.current = false
            audioChunkCountRef.current = 0
          } else if (data.message === 'EndOfTranscript') {
            console.log('Transcription ended')
            // Handle the complete recording
            handleRecordingComplete()
            // Don't call onStopRecording here as it might cause a double close
            // Just update the UI state
            setLocalIsRecording(false)
            setLocalAudioLevel(0)
            setConnectionStatus('disconnected')
            recognitionStartedRef.current = false
            audioChunkCountRef.current = 0
          } else if (data.message === 'Info') {
            console.log('Info message:', data.reason)
          } else if (data.message === 'Warning') {
            console.warn('Warning message:', data.reason)
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

  const handleRecordingComplete = () => {
    // This is called when the recording is fully complete
    console.log('Recording complete. Available transcripts:')
    console.log('- Accumulated:', localAccumulatedTranscript)
    console.log('- Partial:', transcription)
    
    // Choose the most complete transcript
    let finalText = ''
    
    // If we have both accumulated and partial, try to combine them intelligently
    if (localAccumulatedTranscript && transcription) {
      const accumulated = localAccumulatedTranscript.trim()
      const partial = transcription.trim()
      
      // If partial seems to continue from where accumulated left off, combine them
      if (accumulated && partial && !accumulated.endsWith('.') && !accumulated.endsWith('!') && !accumulated.endsWith('?')) {
        // Accumulated doesn't end with punctuation, partial might continue it
        const combined = accumulated + ' ' + partial
        finalText = cleanTranscriptText(combined)
        console.log('Combining accumulated and partial:', finalText)
      } else {
        // Choose the longer/more complete one
        const accumulatedCleaned = cleanTranscriptText(accumulated)
        if (partial.length > accumulatedCleaned.length) {
          finalText = partial
          console.log('Using partial transcript (longer):', finalText)
        } else {
          finalText = accumulatedCleaned
          console.log('Using accumulated transcript (cleaned):', finalText)
        }
      }
    } else if (localAccumulatedTranscript) {
      finalText = cleanTranscriptText(localAccumulatedTranscript)
      console.log('Using accumulated transcript:', finalText)
    } else if (transcription) {
      finalText = transcription
      console.log('Using partial transcript:', finalText)
    }
    
    if (finalText) {
      setFinalTranscription(finalText)
    }
  }

  const cleanTranscriptText = (text: string) => {
    let cleanedText = text.trim();

    // Remove trailing incomplete words (words less than 3 characters at the end)
    const words = cleanedText.split(' ');
    if (words.length > 0 && words[words.length - 1].length < 3) {
      words.pop();
      cleanedText = words.join(' ');
    }

    // Remove *exact* duplicate sentences only
    const sentences = cleanedText.split(/[.!?]+/).map(s => s.trim()).filter(s => s.length > 0);
    const seen = new Set<string>();
    const uniqueSentences = sentences.filter(sentence => {
      if (seen.has(sentence)) return false;
      seen.add(sentence);
      return true;
    });

    // Join unique sentences with proper punctuation
    const finalText = uniqueSentences.join('. ') + (uniqueSentences.length > 0 ? '.' : '');

    return finalText;
  }

  // Ensure save is awaited so loading indicator works
  const handleSave = async () => {
    await onSave();
  };

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
      {localIsRecording && (
        <div className="mb-6">
          <div className="flex items-center justify-center space-x-2 mb-2">
            <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
            <span className="text-sm text-gray-600">Recording...</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-gradient-to-r from-green-400 to-blue-500 h-2 rounded-full transition-all duration-100"
              style={{ width: `${localAudioLevel * 100}%` }}
            ></div>
          </div>
        </div>
      )}

      {/* Recording Button */}
      <div className="flex justify-center mb-6">
        <button
          onClick={localIsRecording ? handleStopRecording : handleStartRecording}
          disabled={isConnecting}
          className={`flex items-center space-x-3 px-8 py-4 rounded-full font-semibold text-white transition-all duration-200 ${
            localIsRecording 
              ? 'bg-red-500 hover:bg-red-600 shadow-lg' 
              : 'bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 shadow-lg hover:shadow-xl'
          } disabled:opacity-50 disabled:cursor-not-allowed`}
        >
          {isConnecting ? (
            <>
              <Loader2 className="h-6 w-6 animate-spin" />
              <span>Connecting...</span>
            </>
          ) : localIsRecording ? (
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
      {transcription && !showPlayback && (
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

      {/* Final Transcription */}
      {finalTranscription && showPlayback && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 mt-4">
          <div className="flex items-center space-x-2 mb-2">
            <Mic className="h-4 w-4 text-green-600" />
            <span className="text-sm font-medium text-green-800">Final Transcription</span>
          </div>
          <p className="text-sm text-gray-700 leading-relaxed">
            "{finalTranscription}"
          </p>
        </div>
      )}

      {/* Audio Playback */}
      {showPlayback && audioUrl && (
        <div className="mt-6 bg-gray-100 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-lg font-semibold text-gray-800">Recorded Audio</h4>
            <button
              onClick={onPlayPause}
              className="p-2 rounded-full hover:bg-gray-200"
              title={isPlaying ? 'Pause' : 'Play'}
            >
              {isPlaying ? <Pause className="h-6 w-6" /> : <Play className="h-6 w-6" />}
            </button>
          </div>
          <audio
            ref={audioElementRef}
            src={audioUrl}
            controls
            className="w-full"
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
            onEnded={() => setIsPlaying(false)}
          />
          {/* Saving Indicator */}
          {isSaving && (
            <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center space-x-2">
                <Loader2 className="h-4 w-4 text-blue-600 animate-spin" />
                <span className="text-sm text-blue-700 font-medium">Saving recording...</span>
              </div>
            </div>
          )}

          <div className="mt-4 flex justify-end space-x-2">
            <button
              onClick={handleSave}
              disabled={!finalTranscription || isSaving}
              className="flex items-center space-x-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  <span>Save Transcription</span>
                </>
              )}
            </button>
            <button
              onClick={onRerecord}
              disabled={isSaving}
              className="flex items-center space-x-2 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <RotateCcw className="h-4 w-4" />
              <span>Rerecord</span>
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default RealTimeRecording 