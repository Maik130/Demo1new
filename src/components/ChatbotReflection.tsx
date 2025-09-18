'use client'

import { useState, useRef, useEffect } from 'react'
import MarkdownRenderer from './MarkdownRenderer'
import ResponseActions from './ResponseActions'

interface Message {
  id: string
  type: 'bot' | 'user'
  content: string
  timestamp: Date
}

interface StudentData {
  voornaam: string
  pcnNummer: string
  aanwezigheidsPercentage?: number
  checkpoint3Resultaat?: string
  checkpoint6Resultaat?: string
  presentatieFile?: File
  feedbackFile?: File
  macroAnalyseFeedback?: string
  mesoAnalyseFeedback?: string
  bronnenlijstFeedback?: string
  opmaakFeedback?: string
  actielijst?: string[]
  persoonlijkeBijdrage?: string
  reflectieData?: any
}

type ChatPhase = 
  | 'welcome'
  | 'student_info'
  | 'file_upload'
  | 'feedback_analysis'
  | 'action_planning'
  | 'checkpoint_review'
  | 'attendance_review'
  | 'personal_contribution'
  | 'final_summary'
  | 'completed'

export default function ChatbotReflection() {
  const [messages, setMessages] = useState<Message[]>([])
  const [currentPhase, setCurrentPhase] = useState<ChatPhase>('welcome')
  const [studentData, setStudentData] = useState<StudentData>({
    voornaam: '',
    pcnNummer: ''
  })
  const [isLoading, setIsLoading] = useState(false)
  const [awaitingInput, setAwaitingInput] = useState(false)
  const [currentQuestion, setCurrentQuestion] = useState('')
  const [followUpCount, setFollowUpCount] = useState(0)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Mock data voor demonstratie - in productie zou dit uit Excel komen
  const mockStudentDatabase = {
    '1234567': {
      naam: 'Jan Jansen',
      aanwezigheid: 85,
      checkpoint3: '7.5',
      checkpoint6: '6.8'
    },
    '2345678': {
      naam: 'Lisa de Vries',
      aanwezigheid: 92,
      checkpoint3: '8.2',
      checkpoint6: '7.9'
    },
    '3456789': {
      naam: 'Mike van der Berg',
      aanwezigheid: 78,
      checkpoint3: '6.1',
      checkpoint6: '7.2'
    }
  }

  useEffect(() => {
    // Start met welkomstbericht
    if (messages.length === 0) {
      addBotMessage(getWelcomeMessage())
      setTimeout(() => {
        setCurrentPhase('student_info')
        addBotMessage("Laten we beginnen! Wat is je voornaam?")
        setAwaitingInput(true)
        setCurrentQuestion('voornaam')
      }, 2000)
    }
  }, [])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const addBotMessage = (content: string) => {
    const newMessage: Message = {
      id: Date.now().toString(),
      type: 'bot',
      content,
      timestamp: new Date()
    }
    setMessages(prev => [...prev, newMessage])
  }

  const addUserMessage = (content: string) => {
    const newMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content,
      timestamp: new Date()
    }
    setMessages(prev => [...prev, newMessage])
  }

  const getWelcomeMessage = () => {
    const today = new Date().toLocaleDateString('nl-NL', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })

    return `# 🏆 Welkom bij de Demo 1 Reflectie Tool

**Datum:** ${today}

**Let op:** Ik behandel maar één onderwerp tegelijk, zodat je niet overweldigd raakt. Neem de tijd voor je antwoorden - goede reflectie vraagt om eerlijkheid en diepgang.`
  }

  const handleUserInput = async (input: string) => {
    if (!awaitingInput) return

    addUserMessage(input)
    setAwaitingInput(false)
    setIsLoading(true)

    // Verwerk input op basis van huidige fase en vraag
    await processUserInput(input)
    
    setIsLoading(false)
  }

  const processUserInput = async (input: string) => {
    switch (currentPhase) {
      case 'student_info':
        await handleStudentInfo(input)
        break
      case 'file_upload':
        await handleFileUpload(input)
        break
      case 'feedback_analysis':
        await handleFeedbackAnalysis(input)
        break
      case 'action_planning':
        await handleActionPlanning(input)
        break
      case 'checkpoint_review':
        await handleCheckpointReview(input)
        break
      case 'attendance_review':
        await handleAttendanceReview(input)
        break
      case 'personal_contribution':
        await handlePersonalContribution(input)
        break
      default:
        break
    }
  }

  const handleStudentInfo = async (input: string) => {
    if (currentQuestion === 'voornaam') {
      if (input.trim().length < 2) {
        addBotMessage("Dat lijkt een erg korte naam. Kun je je volledige voornaam geven?")
        setAwaitingInput(true)
        return
      }
      
      setStudentData(prev => ({ ...prev, voornaam: input.trim() }))
      addBotMessage(`Hoi ${input.trim()}! Nu heb ik je **PCN-nummer** nodig. Dit is het 7-cijferige nummer uit je studentenemailadres (bijvoorbeeld: 1234567@student.nhlstenden.com).`)
      setCurrentQuestion('pcn_nummer')
      setAwaitingInput(true)
      
    } else if (currentQuestion === 'pcn_nummer') {
      const pcnPattern = /^\d{7}$/
      if (!pcnPattern.test(input.trim())) {
        addBotMessage("Een PCN-nummer bestaat uit precies 7 cijfers. Kun je het nogmaals invoeren? (bijvoorbeeld: 1234567)")
        setAwaitingInput(true)
        return
      }

      const pcnNummer = input.trim()
      const studentInfo = mockStudentDatabase[pcnNummer as keyof typeof mockStudentDatabase]
      
      if (!studentInfo) {
        addBotMessage(`Ik kan geen student vinden met PCN-nummer ${pcnNummer}. Controleer je nummer en probeer opnieuw.`)
        setAwaitingInput(true)
        return
      }

      // Verifieer naam
      const voornaamMatch = studentInfo.naam.toLowerCase().includes(studentData.voornaam.toLowerCase())
      if (!voornaamMatch) {
        addBotMessage(`⚠️ **Verificatie probleem**

Het PCN-nummer ${pcnNummer} hoort bij **${studentInfo.naam}**, maar je gaf als voornaam **${studentData.voornaam}**.

Klopt dit? Zo niet, geef dan je correcte voornaam of PCN-nummer.`)
        setCurrentQuestion('verify_mismatch')
        setAwaitingInput(true)
        return
      }

      // Succesvol geverifieerd
      setStudentData(prev => ({
        ...prev,
        pcnNummer,
        aanwezigheidsPercentage: studentInfo.aanwezigheid,
        checkpoint3Resultaat: studentInfo.checkpoint3,
        checkpoint6Resultaat: studentInfo.checkpoint6
      }))

      addBotMessage(`✅ **Gegevens geverifieerd!**

**Student:** ${studentInfo.naam}  
**PCN:** ${pcnNummer}  
**Aanwezigheid:** ${studentInfo.aanwezigheid}%  
**Checkpoint 3 resultaat:** ${studentInfo.checkpoint3}  
**Checkpoint 6 resultaat:** ${studentInfo.checkpoint6}  

Perfect! Nu kunnen we verder met je reflectie.`)

      // Ga naar volgende fase
      setTimeout(() => {
        setCurrentPhase('file_upload')
        addBotMessage(`## 📁 Bestanden Uploaden

Nu heb ik je **presentatie** nodig die je hebt gebruikt bij de demo, en het **document of audio-opname** met de feedback die je hebt ontvangen.

Kun je deze bestanden uploaden? Je kunt ze hier slepen of op de upload knop klikken.`)
        setAwaitingInput(true)
        setCurrentQuestion('files')
      }, 2000)
    }
  }

  const handleFileUpload = async (input: string) => {
    // Voor nu simuleren we file upload
    addBotMessage("Dank je! Ik heb je bestanden ontvangen en geanalyseerd.")
    
    setTimeout(() => {
      setCurrentPhase('feedback_analysis')
      addBotMessage(`## 📝 Feedback Analyse

Ik heb je feedback doorgenomen. Laten we dit per onderdeel bespreken.

**Eerst de Macro Analyse:** Wat was de specifieke feedback die je kreeg op je macro analyse (de grote marktomgeving, trends, ontwikkelingen)?

Geef niet alleen de feedback weer, maar vertel ook wat je ervan vindt en waarom je denkt dat je deze feedback kreeg.`)
      setCurrentQuestion('macro_feedback')
      setAwaitingInput(true)
      setFollowUpCount(0)
    }, 1500)
  }

  const handleFeedbackAnalysis = async (input: string) => {
    if (input.trim().length < 20) {
      setFollowUpCount(prev => prev + 1)
      if (followUpCount < 2) {
        addBotMessage(`Dat is nog vrij kort. Kun je wat meer vertellen? Bijvoorbeeld:
- Wat was de exacte feedback?
- Hoe kijk je daar zelf tegenaan?
- Waarom denk je dat je deze feedback kreeg?
- Wat had je anders kunnen doen?`)
        setAwaitingInput(true)
        return
      }
    }

    // Verwerk feedback per onderdeel
    if (currentQuestion === 'macro_feedback') {
      setStudentData(prev => ({ ...prev, macroAnalyseFeedback: input }))
      addBotMessage(`Dank je voor je uitgebreide antwoord over de macro analyse.

**Nu de Meso Analyse:** Wat was de feedback op je meso analyse (de specifieke sportbranche, concurrentie, doelgroepen)?

Vertel weer niet alleen wat de feedback was, maar ook je eigen reflectie daarop.`)
      setCurrentQuestion('meso_feedback')
      setFollowUpCount(0)
      setAwaitingInput(true)
      
    } else if (currentQuestion === 'meso_feedback') {
      setStudentData(prev => ({ ...prev, mesoAnalyseFeedback: input }))
      addBotMessage(`**Bronnenlijst feedback:** Wat was de feedback op je bronnenlijst en bronvermelding?

Denk aan:
- Kwaliteit van de bronnen
- Actualiteit
- Relevantie voor sportmarketing
- Correcte vermelding volgens APA-stijl`)
      setCurrentQuestion('bronnen_feedback')
      setFollowUpCount(0)
      setAwaitingInput(true)
      
    } else if (currentQuestion === 'bronnen_feedback') {
      setStudentData(prev => ({ ...prev, bronnenlijstFeedback: input }))
      addBotMessage(`**Opmaak en presentatie:** Wat was de feedback op de opmaak van je presentatie en je presentatiestijl?

Inclusief:
- Visuele aantrekkelijkheid
- Leesbaarheid
- Structuur en flow
- Je presentatievaardigheden`)
      setCurrentQuestion('opmaak_feedback')
      setFollowUpCount(0)
      setAwaitingInput(true)
      
    } else if (currentQuestion === 'opmaak_feedback') {
      setStudentData(prev => ({ ...prev, opmaakFeedback: input }))
      
      // Ga naar actieplan fase
      setTimeout(() => {
        setCurrentPhase('action_planning')
        addBotMessage(`## 🎯 Actieplan Opstellen

Nu we alle feedback hebben besproken, gaan we concrete acties formuleren.

**Welke 3 belangrijkste punten uit alle feedback ga je oppakken voor je volgende presentatie?**

Maak het concreet - niet "beter presenteren" maar bijvoorbeeld "meer oogcontact maken en langzamer spreken".`)
        setCurrentQuestion('action_points')
        setFollowUpCount(0)
        setAwaitingInput(true)
      }, 1500)
    }
  }

  const handleActionPlanning = async (input: string) => {
    if (input.trim().length < 50) {
      setFollowUpCount(prev => prev + 1)
      if (followUpCount < 2) {
        addBotMessage(`Je actiepunten kunnen nog concreter. Probeer voor elk punt te beschrijven:
- WAT ga je precies doen?
- HOE ga je het aanpakken?
- WANNEER ga je het doen?

Bijvoorbeeld: "Ik ga mijn bronnenlijst verbeteren door minimaal 5 recente (2023-2024) vakartikelen te zoeken via de NHL database, en deze volgens APA-stijl verwerken voor 15 maart."`)
        setAwaitingInput(true)
        return
      }
    }

    // Genereer AI-verbeterde actielijst
    setIsLoading(true)
    const improvedActionList = await generateImprovedActionList(input)
    setStudentData(prev => ({ ...prev, actielijst: improvedActionList }))
    
    addBotMessage(`## ✅ Je Actielijst

Ik heb je actiepunten omgezet naar een concrete checklist:

${improvedActionList.map((action, index) => `${index + 1}. ☐ ${action}`).join('\n')}

Ziet dit er goed uit? Nu gaan we je checkpoint resultaten bespreken.`)

    setTimeout(() => {
      setCurrentPhase('checkpoint_review')
      addBotMessage(`## 📊 Checkpoint Resultaten

**Checkpoint 3 (${studentData.checkpoint3Resultaat}):**

Kun je uitleggen waarom je dit resultaat hebt behaald? Wat ging goed en wat ging minder goed bij deze toets?

Vertel ook welke aanpak je gebruikte om te studeren en of je het beter deed dan je verwachtte.`)
      setCurrentQuestion('checkpoint3_analysis')
      setFollowUpCount(0)
      setAwaitingInput(true)
    }, 2000)
  }

  const generateImprovedActionList = async (userInput: string): Promise<string[]> => {
    // Simuleer AI verbetering van actielijst
    const actions = userInput.split(/[.!?]/).filter(s => s.trim().length > 10)
    return actions.map(action => 
      action.trim() + (action.includes('voor') ? '' : ' - deadline: voor volgende demo')
    ).slice(0, 5)
  }

  const handleCheckpointReview = async (input: string) => {
    if (currentQuestion === 'checkpoint3_analysis') {
      if (input.trim().length < 30) {
        addBotMessage("Kun je wat dieper ingaan op je resultaat? Wat was je studieaanpak? Welke onderdelen vond je moeilijk?")
        setAwaitingInput(true)
        return
      }

      addBotMessage(`**Checkpoint 6 (${studentData.checkpoint6Resultaat}):**

Hetzelfde voor checkpoint 6. Wat is je verklaring voor dit resultaat? Heb je je aanpak aangepast na checkpoint 3?

Kun je aan de hand van de testvision vertellen welke onderdelen je goed of slecht hebt gemaakt?`)
      setCurrentQuestion('checkpoint6_analysis')
      setFollowUpCount(0)
      setAwaitingInput(true)
      
    } else if (currentQuestion === 'checkpoint6_analysis') {
      if (input.trim().length < 30) {
        addBotMessage("Probeer specifieker te zijn over welke leerdoelen je wel/niet beheerste en waarom.")
        setAwaitingInput(true)
        return
      }

      // Ga naar aanwezigheid
      setTimeout(() => {
        setCurrentPhase('attendance_review')
        const percentage = studentData.aanwezigheidsPercentage || 0
        
        if (percentage < 80) {
          addBotMessage(`## 📅 Aanwezigheid (${percentage}%)

Je aanwezigheidspercentage is ${percentage}%. Dit is onder de 80% grens.

**Wat is de reden van je afwezigheid?** En belangrijker: **welke invloed denk je dat dit heeft gehad op je resultaten tot nu toe?**

Hoe ga je dit verbeteren voor de rest van het semester?`)
        } else {
          addBotMessage(`## 📅 Aanwezigheid (${percentage}%)

Je hebt een goede aanwezigheid van ${percentage}%. Dat is positief!

Zijn er nog lessen geweest die je hebt gemist? En zo ja, hoe heb je die gemiste stof ingehaald?`)
        }
        
        setCurrentQuestion('attendance_explanation')
        setFollowUpCount(0)
        setAwaitingInput(true)
      }, 1500)
    }
  }

  const handleAttendanceReview = async (input: string) => {
    if (input.trim().length < 20) {
      addBotMessage("Kun je wat uitgebreider antwoorden? Dit is belangrijk voor je studiesucces.")
      setAwaitingInput(true)
      return
    }

    // Ga naar persoonlijke bijdrage
    setTimeout(() => {
      setCurrentPhase('personal_contribution')
      addBotMessage(`## 👥 Persoonlijke Bijdrage in de Groep

Nu het laatste onderdeel: je rol in het team.

**Welke rol heb je op je genomen in de groep tijdens dit project?** Waar blijkt dat uit?

Denk aan:
- Welke taken heb je opgepakt?
- Hoe heb je bijgedragen aan de samenwerking?
- Wat waren je sterke punten in teamverband?
- Waar kun je nog groeien als teamlid?`)
      setCurrentQuestion('team_role')
      setFollowUpCount(0)
      setAwaitingInput(true)
    }, 1500)
  }

  const handlePersonalContribution = async (input: string) => {
    if (input.trim().length < 40) {
      setFollowUpCount(prev => prev + 1)
      if (followUpCount < 2) {
        addBotMessage(`Probeer concreter te zijn:
- Welke specifieke taken deed jij?
- Hoe reageerden je teamgenoten op jouw inbreng?
- Kun je een voorbeeld geven van hoe je het team hebt geholpen?
- Wat zou je volgende keer anders doen?`)
        setAwaitingInput(true)
        return
      }
    }

    setStudentData(prev => ({ ...prev, persoonlijkeBijdrage: input }))

    // Genereer final document
    setIsLoading(true)
    addBotMessage("Geweldig! Ik ga nu je complete reflectiedocument genereren...")

    setTimeout(async () => {
      const finalDocument = await generateFinalDocument()
      setCurrentPhase('completed')
      
      addBotMessage(`## 🎉 Reflectie Voltooid!

Je reflectie is compleet. Hieronder vind je je volledige reflectiedocument:

${finalDocument}

Je kunt dit document downloaden als Word-bestand met de download knop hieronder.

**Succes met het implementeren van je actiepunten! 💪**`)
      
      setIsLoading(false)
    }, 3000)
  }

  const generateFinalDocument = async (): Promise<string> => {
    const today = new Date().toLocaleDateString('nl-NL')
    
    return `# Demo 1 Feedback & Voortgangsformulier

**Student:** ${studentData.voornaam}  
**PCN-nummer:** ${studentData.pcnNummer}  
**Datum:** ${today}  

## 📊 Studieresultaten

**Aanwezigheid:** ${studentData.aanwezigheidsPercentage}%  
**Checkpoint 3:** ${studentData.checkpoint3Resultaat}  
**Checkpoint 6:** ${studentData.checkpoint6Resultaat}  

## 📝 Feedback Analyse

### Macro Analyse
${studentData.macroAnalyseFeedback || 'Nog in te vullen'}

### Meso Analyse  
${studentData.mesoAnalyseFeedback || 'Nog in te vullen'}

### Bronnenlijst
${studentData.bronnenlijstFeedback || 'Nog in te vullen'}

### Opmaak & Presentatie
${studentData.opmaakFeedback || 'Nog in te vullen'}

## 🎯 Actielijst

${studentData.actielijst?.map((action, index) => `${index + 1}. ${action}`).join('\n') || 'Nog in te vullen'}

## 👥 Persoonlijke Bijdrage

${studentData.persoonlijkeBijdrage || 'Nog in te vullen'}

---

*Gegenereerd door Demo Reflectie Tool - Speco Sportmarketing*`
  }

  const handleFileUploadClick = () => {
    fileInputRef.current?.click()
  }

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files
    if (files && files.length > 0) {
      const fileNames = Array.from(files).map(f => f.name).join(', ')
      handleUserInput(`Ik heb de volgende bestanden geüpload: ${fileNames}`)
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const formData = new FormData(e.target as HTMLFormElement)
    const input = formData.get('message') as string
    
    if (input.trim()) {
      handleUserInput(input.trim())
      ;(e.target as HTMLFormElement).reset()
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-purple-600 rounded-full mb-4">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
          </div>
          
          <h1 className="text-4xl font-bold text-gray-800 mb-2">
            Demo 1 Reflectie Assistent
          </h1>
          
          <p className="text-xl text-purple-700 font-medium mb-2">
            Speco Sportmarketing - Periode 1
          </p>
          
          <div className="flex items-center justify-center space-x-4 text-sm text-gray-600">
            <span className="flex items-center">
              <div className={`w-3 h-3 rounded-full mr-2 ${currentPhase === 'completed' ? 'bg-green-500' : 'bg-blue-500 animate-pulse'}`}></div>
              {currentPhase === 'completed' ? 'Reflectie voltooid' : 'Actief in gesprek'}
            </span>
            <span>•</span>
            <span>{messages.filter(m => m.type === 'user').length} antwoorden gegeven</span>
          </div>
        </div>

        {/* Chat Container */}
        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          {/* Messages */}
          <div className="h-96 overflow-y-auto p-6 space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-3xl rounded-lg p-4 ${
                    message.type === 'user'
                      ? 'bg-purple-600 text-white'
                      : 'bg-gray-100 text-gray-800'
                  }`}
                >
                  {message.type === 'bot' ? (
                    <MarkdownRenderer content={message.content} />
                  ) : (
                    <p className="whitespace-pre-wrap">{message.content}</p>
                  )}
                  
                  {message.type === 'bot' && currentPhase === 'completed' && message.content.includes('Reflectie Voltooid') && (
                    <div className="mt-4">
                      <ResponseActions 
                        content={message.content}
                        isMarkdown={true}
                        isStreaming={false}
                      />
                    </div>
                  )}
                </div>
              </div>
            ))}
            
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-gray-100 rounded-lg p-4 max-w-xs">
                  <div className="flex items-center space-x-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-purple-600"></div>
                    <span className="text-gray-600">Aan het nadenken...</span>
                  </div>
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          {awaitingInput && currentPhase !== 'completed' && (
            <div className="border-t border-gray-200 p-6">
              {currentPhase === 'file_upload' && currentQuestion === 'files' && (
                <div className="mb-4">
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept=".pdf,.ppt,.pptx,.doc,.docx,.mp3,.wav,.m4a"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  <button
                    onClick={handleFileUploadClick}
                    className="w-full p-4 border-2 border-dashed border-purple-300 rounded-lg text-purple-600 hover:border-purple-400 hover:bg-purple-50 transition-colors"
                  >
                    📁 Klik hier om bestanden te uploaden
                    <div className="text-sm text-gray-500 mt-1">
                      Ondersteunde formaten: PDF, PowerPoint, Word, Audio
                    </div>
                  </button>
                </div>
              )}
              
              <form onSubmit={handleSubmit} className="flex space-x-4">
                <textarea
                  name="message"
                  placeholder="Typ je antwoord hier... (neem de tijd voor een uitgebreid antwoord)"
                  className="flex-1 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
                  rows={3}
                  required
                />
                <button
                  type="submit"
                  className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                >
                  Verstuur
                </button>
              </form>
              
              <div className="mt-2 text-xs text-gray-500">
                💡 Tip: Geef uitgebreide antwoorden. Ik help je door te vragen als je antwoord te kort is.
              </div>
            </div>
          )}
        </div>

        {/* Progress Indicator */}
        <div className="mt-6 bg-white rounded-lg p-4 shadow-sm">
          <div className="flex items-center justify-between text-sm text-gray-600 mb-2">
            <span>Voortgang reflectie</span>
            <span>{getPhaseNumber(currentPhase)}/8</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-purple-600 h-2 rounded-full transition-all duration-500"
              style={{ width: `${(getPhaseNumber(currentPhase) / 8) * 100}%` }}
            ></div>
          </div>
          <div className="mt-2 text-xs text-gray-500">
            {getPhaseDescription(currentPhase)}
          </div>
        </div>
      </div>
    </div>
  )
}

function getPhaseNumber(phase: ChatPhase): number {
  const phases = {
    'welcome': 0,
    'student_info': 1,
    'file_upload': 2,
    'feedback_analysis': 3,
    'action_planning': 4,
    'checkpoint_review': 5,
    'attendance_review': 6,
    'personal_contribution': 7,
    'completed': 8
  }
  return phases[phase] || 0
}

function getPhaseDescription(phase: ChatPhase): string {
  const descriptions = {
    'welcome': 'Welkom en uitleg',
    'student_info': 'Studentgegevens verifiëren',
    'file_upload': 'Bestanden uploaden',
    'feedback_analysis': 'Feedback analyseren',
    'action_planning': 'Actiepunten formuleren',
    'checkpoint_review': 'Checkpoint resultaten bespreken',
    'attendance_review': 'Aanwezigheid evalueren',
    'personal_contribution': 'Persoonlijke bijdrage reflecteren',
    'completed': 'Reflectie voltooid!'
  }
  return descriptions[phase] || ''
}