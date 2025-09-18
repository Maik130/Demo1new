'use client'

import { useState, useRef } from 'react'

// Gemini TTS Voice Options
export const GEMINI_VOICES = [
  { name: 'Zephyr', description: 'Bright and clear' },
  { name: 'Puck', description: 'Upbeat and energetic' },
  { name: 'Charon', description: 'Informative and steady' },
  { name: 'Kore', description: 'Firm and confident' },
  { name: 'Fenrir', description: 'Excitable and dynamic' },
  { name: 'Leda', description: 'Youthful and fresh' },
  { name: 'Orus', description: 'Firm and authoritative' },
  { name: 'Aoede', description: 'Breezy and light' },
  { name: 'Callirrhoe', description: 'Easy-going and relaxed' },
  { name: 'Autonoe', description: 'Bright and cheerful' }
]

// Emotion Styles for TTS
export const EMOTION_STYLES = [
  { name: 'Neutraal', value: 'neutral' },
  { name: 'Vrolijk', value: 'happy' },
  { name: 'Enthousiast', value: 'excited' },
  { name: 'Kalm', value: 'calm' },
  { name: 'Serieus', value: 'serious' },
  { name: 'Vriendelijk', value: 'friendly' },
  { name: 'Professioneel', value: 'formal' }
]

interface GeminiTTSProps {
  content: string
  isMarkdown?: boolean
  isStreaming?: boolean
  selectedVoice?: typeof GEMINI_VOICES[0]
  selectedEmotion?: typeof EMOTION_STYLES[0]
  hideSettings?: boolean
  className?: string
}

export default function GeminiTTS({ 
  content, 
  isMarkdown = true, 
  isStreaming = false,
  selectedVoice = GEMINI_VOICES[3], // Kore as default
  selectedEmotion = EMOTION_STYLES[0], // Neutraal as default
  hideSettings = false,
  className = ""
}: GeminiTTSProps) {
  const [ttsStatus, setTtsStatus] = useState<'idle' | 'generating' | 'playing' | 'error'>('idle')
  const [audioUrl, setAudioUrl] = useState<string | null>(null)
  const audioRef = useRef<HTMLAudioElement>(null)

  // Convert markdown to plain text for TTS
  const convertMarkdownToPlainText = (markdown: string): string => {
    return markdown
      .replace(/^#{1,6}\s+/gm, '') // Remove headers
      .replace(/\*\*([^*]+)\*\*/g, '$1') // Remove bold
      .replace(/\*([^*]+)\*/g, '$1') // Remove italic
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // Remove links but keep text
      .replace(/```[\s\S]*?```/g, '') // Remove code blocks
      .replace(/`([^`]+)`/g, '$1') // Remove inline code
      .replace(/^[\s]*[-*+]\s+/gm, '') // Remove list markers
      .replace(/\n\s*\n\s*\n/g, '\n\n') // Clean up extra whitespace
      .trim()
  }

  const handleGenerateTTS = async () => {
    if (isStreaming || !content.trim()) return

    setTtsStatus('generating')
    
    try {
      const textToSpeak = isMarkdown ? convertMarkdownToPlainText(content) : content
      
      const response = await fetch('/api/generate-tts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: textToSpeak,
          voiceName: selectedVoice.name,
          style: selectedEmotion.value
        }),
      })

      if (!response.ok) {
        throw new Error('TTS generation failed')
      }

      const audioBlob = await response.blob()
      const url = URL.createObjectURL(audioBlob)
      setAudioUrl(url)
      
      // Auto-play the generated audio
      if (audioRef.current) {
        audioRef.current.src = url
        audioRef.current.play()
        setTtsStatus('playing')
      }

    } catch (error) {
      console.error('TTS Error:', error)
      setTtsStatus('error')
      setTimeout(() => setTtsStatus('idle'), 3000)
    }
  }

  const handleAudioEnded = () => {
    setTtsStatus('idle')
  }

  const handleAudioError = () => {
    setTtsStatus('error')
    setTimeout(() => setTtsStatus('idle'), 3000)
  }

  const getTtsButtonText = () => {
    switch (ttsStatus) {
      case 'generating': return '⏳ Genereren...'
      case 'playing': return '🔊 Speelt af...'
      case 'error': return '❌ Fout'
      default: return `🚀 Gemini TTS (${selectedVoice.name})`
    }
  }

  const getTtsButtonClass = () => {
    const baseClass = "flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 disabled:cursor-not-allowed"
    
    switch (ttsStatus) {
      case 'generating':
        return `${baseClass} bg-orange-100 text-orange-700 border border-orange-200`
      case 'playing':
        return `${baseClass} bg-green-100 text-green-700 border border-green-200 animate-pulse`
      case 'error':
        return `${baseClass} bg-red-100 text-red-700 border border-red-200`
      default:
        return `${baseClass} bg-purple-100 hover:bg-purple-200 text-purple-700 hover:text-purple-800 border border-purple-200 hover:border-purple-300`
    }
  }

  if (!content.trim()) return null

  return (
    <div className={`flex items-center space-x-2 ${className}`}>
      <button
        onClick={handleGenerateTTS}
        disabled={isStreaming || ttsStatus === 'generating'}
        className={getTtsButtonClass()}
        title={`Genereer audio met Gemini TTS - ${selectedVoice.description}`}
      >
        <span>{getTtsButtonText()}</span>
      </button>

      {/* Hidden audio element for playback */}
      <audio
        ref={audioRef}
        onEnded={handleAudioEnded}
        onError={handleAudioError}
        style={{ display: 'none' }}
      />

      {/* Clean up audio URL when component unmounts */}
      {audioUrl && (
        <script
          dangerouslySetInnerHTML={{
            __html: `
              window.addEventListener('beforeunload', function() {
                URL.revokeObjectURL('${audioUrl}');
              });
            `
          }}
        />
      )}
    </div>
  )
}