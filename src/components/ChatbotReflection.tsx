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
  const [isListening, setIsListening] = useState(false)
  const [speechRecognition, setSpeechRecognition] = useState<SpeechRecognition | null>(null)
  const [voiceInputText, setVoiceInputText] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const messageIdCounter = useRef(0)
  const [showDownloadButton, setShowDownloadButton] = useState(true) // Always show download button

  // CONFIDENTIAL: Student database from Excel - NEVER show this to students
  const studentDatabase = {
    '545192': {
      naam: 'Ruben',
      aanwezigheid: 53,
      checkpoint3: '65%',
      checkpoint6: '41%'
    },
    '553780': {
      naam: 'Sam',
      aanwezigheid: 81,
      checkpoint3: '30%',
      checkpoint6: '66%'
    },
    '548222': {
      naam: 'Mees',
      aanwezigheid: 88,
      checkpoint3: '40%',
      checkpoint6: '55%'
    },
    '548111': {
      naam: 'Jos',
      aanwezigheid: 40,
      checkpoint3: '50%',
      checkpoint6: '75%'
    }
  }

  // Security function - prevents accidental exposure of student data
  const getStudentData = (pcnNummer: string) => {
    // CRITICAL: This function must NEVER return the full database
    // Only return data for the specific requested student
    const student = studentDatabase[pcnNummer as keyof typeof studentDatabase]
    if (!student) {
      return null
    }
    
    // Return only the specific student's data
    return {
      naam: student.naam,
      aanwezigheid: student.aanwezigheid,
      checkpoint3: student.checkpoint3,
      checkpoint6: student.checkpoint6
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

  // Initialize speech recognition
  useEffect(() => {
    if (typeof window !== 'undefined' && 'webkitSpeechRecognition' in window) {
      const recognition = new (window as any).webkitSpeechRecognition()
      recognition.continuous = false
      recognition.interimResults = true
      recognition.lang = 'nl-NL'
      
      recognition.onstart = () => {
        setIsListening(true)
      }
      
      recognition.onresult = (event: any) => {
        let finalTranscript = ''
        let interimTranscript = ''
        
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript
          if (event.results[i].isFinal) {
            finalTranscript += transcript
          } else {
            interimTranscript += transcript
          }
        }
        
        if (finalTranscript) {
          setVoiceInputText(finalTranscript)
          if (textareaRef.current) {
            textareaRef.current.value = finalTranscript
          }
        }
      }
      
      recognition.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error)
        setIsListening(false)
      }
      
      recognition.onend = () => {
        setIsListening(false)
      }
      
      setSpeechRecognition(recognition)
    }
  }, [])

  const startVoiceInput = () => {
    if (speechRecognition) {
      setVoiceInputText('')
      speechRecognition.start()
    }
  }

  const stopVoiceInput = () => {
    if (speechRecognition) {
      speechRecognition.stop()
    }
  }

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const addBotMessage = (content: string) => {
    messageIdCounter.current += 1
    const newMessage: Message = {
      id: `${Date.now()}-${messageIdCounter.current}`,
      type: 'bot',
      content,
      timestamp: new Date()
    }
    setMessages(prev => [...prev, newMessage])
  }

  const addUserMessage = (content: string) => {
    messageIdCounter.current += 1
    const newMessage: Message = {
      id: `${Date.now()}-${messageIdCounter.current}`,
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

    return `**Datum:** ${today}

Dit is de ai reflectie tool, die jou gaat helpen met het reflecteren op jouw voortgang in de eerste 3 weken. Volg rustig de stappen en download aan het einde het gesprekverslag. Dit heb je nodig bij het gesprek aanstaande maandag.`
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
      addBotMessage(`Hoi ${input.trim()}! Nu heb ik je **PCN-nummer** nodig. Dit is het 6-cijferige nummer uit je studentenemailadres (bijvoorbeeld: 123456@student.fontys.nl).`)
      setCurrentQuestion('pcn_nummer')
      setAwaitingInput(true)
      
    } else if (currentQuestion === 'pcn_nummer') {
      const pcnPattern = /^\d{6}$/
      if (!pcnPattern.test(input.trim())) {
        addBotMessage("Een PCN-nummer bestaat uit precies 6 cijfers. Kun je het nogmaals invoeren? (bijvoorbeeld: 123456)")
        setAwaitingInput(true)
        return
      }

      const pcnNummer = input.trim()
      const studentInfo = getStudentData(pcnNummer)
      
      if (!studentInfo) {
        addBotMessage(`Ik kan geen student vinden met PCN-nummer ${pcnNummer}. Controleer je nummer en probeer opnieuw.`)
        setAwaitingInput(true)
        return
      }

      // Verifieer naam
      const voornaamMatch = studentInfo.naam.toLowerCase().includes(studentData.voornaam.toLowerCase()) ||
                           studentData.voornaam.toLowerCase().includes(studentInfo.naam.split(' ')[0].toLowerCase())
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
        addBotMessage(`## 📁 **Stap 1: Beroepsproduct Uploaden**

Nu heb ik je **beroepsproduct/presentatie** nodig die je hebt gebruikt bij de demo.

Dit kan zijn:
- PowerPoint presentatie (.ppt, .pptx)
- PDF document
- Word document
- Ander presentatieformaat

Kun je je beroepsproduct uploaden? Je kunt het hier slepen of op de upload knop klikken.`)
        setAwaitingInput(true)
        setCurrentQuestion('beroepsproduct')
      }, 2000)
    }
  }

  const handleFileUpload = async (input: string) => {
    if (currentQuestion === 'presentation_only') {
      // Eerste bestand ontvangen (presentatie)
      addBotMessage("Perfect! Ik heb je presentatie ontvangen.")
      
      setTimeout(() => {
        addBotMessage(`**Stap 2: Upload je feedbackformulier**

Nu heb ik het **feedbackformulier** of **document met feedback** nodig dat je hebt ontvangen na je demo.

Heb je geen schriftelijke feedback ontvangen? Typ dan **"geen feedback"** en we gaan samen inhoudelijk je presentatie doorlopen.`)
        setCurrentQuestion('feedback_only')
        setAwaitingInput(true)
      }, 1500)
      
    } else if (currentQuestion === 'feedback_only') {
      // Check of student geen feedback heeft
      if (input.toLowerCase().includes('geen feedback')) {
        addBotMessage(`Geen probleem! Dan gaan we samen inhoudelijk je presentatie doorlopen.

Ik ga je helpen reflecteren op basis van wat je zelf hebt gepresenteerd.`)
        
        setTimeout(() => {
          setCurrentPhase('feedback_analysis')
          addBotMessage(`## 📝 Inhoudelijke Presentatie Review

Laten we je presentatie samen doorlopen per onderdeel.

**Eerst de Macro Analyse:** Welke trends, ontwikkelingen en factoren uit de grote marktomgeving heb je behandeld in je presentatie?

Vertel niet alleen wat je hebt gepresenteerd, maar ook:
- Waarom heb je deze trends gekozen?
- Hoe actueel waren je bronnen?
- Wat vond je zelf van de diepgang?`)
          setCurrentQuestion('macro_feedback')
          setAwaitingInput(true)
          setFollowUpCount(0)
        }, 2000)
        
      } else {
        // Tweede bestand ontvangen (feedback)
        addBotMessage("Uitstekend! Ik heb nu beide bestanden: je presentatie én je feedback.")
        
        setTimeout(() => {
          setCurrentPhase('feedback_analysis')
          addBotMessage(`## 📝 Feedback Analyse

Ik heb je feedback doorgenomen. Laten we dit per onderdeel bespreken.

**Eerst de Macro Analyse:** Wat was de specifieke feedback die je kreeg op je macro analyse (de grote marktomgeving, trends, ontwikkelingen)?

Geef niet alleen de feedback weer, maar vertel ook wat je ervan vindt en waarom je denkt dat je deze feedback kreeg.`)
          setCurrentQuestion('macro_feedback')
          setAwaitingInput(true)
          setFollowUpCount(0)
        }, 2000)
      }
    } else {
      // Eerste keer files uploaden
      addBotMessage("Dank je! Ik heb je bestanden ontvangen.")
      
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
  }

  // Inhoudelijke validatie functies
  const validateFeedbackContent = (input: string, question: string) => {
    const text = input.toLowerCase()
    
    switch (question) {
      case 'macro_feedback':
        const hasMacroElements = [
          text.includes('trend') || text.includes('ontwikkeling'),
          text.includes('markt') || text.includes('omgeving'),
          text.includes('feedback') || text.includes('opmerking'),
          text.includes('waarom') || text.includes('omdat') || text.includes('reden')
        ]
        
        if (hasMacroElements.filter(Boolean).length < 2) {
          return {
            isComplete: false,
            followUpMessage: `Je antwoord over de macro analyse kan nog completer. Probeer alle aspecten te behandelen:

🔍 **Wat ontbreekt nog:**
- Welke **specifieke feedback** kreeg je op je macro analyse?
- Welke **trends/ontwikkelingen** had je behandeld?
- **Waarom** denk je dat je deze feedback kreeg?
- Wat had je **anders** kunnen doen?
- Hoe kijk je **zelf** tegen deze feedback aan?`
          }
        }
        break
        
      case 'meso_feedback':
        const hasMesoElements = [
          text.includes('sport') || text.includes('branche'),
          text.includes('concurrent') || text.includes('doelgroep'),
          text.includes('feedback') || text.includes('opmerking'),
          input.trim().length > 30
        ]
        
        if (hasMesoElements.filter(Boolean).length < 3) {
          return {
            isComplete: false,
            followUpMessage: `Je meso analyse antwoord kan nog uitgebreider. Behandel deze punten:

🎯 **Meso analyse aspecten:**
- Feedback op je **sportbranche** analyse
- Feedback op **concurrentieanalyse**
- Feedback op **doelgroep** onderzoek
- Je **eigen reflectie** op deze feedback
- Wat zou je **volgende keer** anders doen?`
          }
        }
        break
        
      case 'bronnen_feedback':
        const hasBronnenElements = [
          text.includes('bron') || text.includes('referentie'),
          text.includes('apa') || text.includes('stijl') || text.includes('vermelding'),
          text.includes('actueel') || text.includes('recent') || text.includes('kwaliteit'),
          input.trim().length > 25
        ]
        
        if (hasBronnenElements.filter(Boolean).length < 2) {
          return {
            isComplete: false,
            followUpMessage: `Je bronnenlijst feedback kan nog specifieker. Behandel deze aspecten:

📚 **Bronnenlijst feedback:**
- Feedback op **kwaliteit** van je bronnen
- Feedback op **APA-stijl** vermelding
- Feedback op **actualiteit** (recente bronnen?)
- Feedback op **relevantie** voor sportmarketing
- Wat ga je **verbeteren** aan je bronnengebruik?`
          }
        }
        break
        
      case 'opmaak_feedback':
        const hasOpmaakElements = [
          text.includes('opmaak') || text.includes('layout') || text.includes('design'),
          text.includes('presentatie') || text.includes('presenteren'),
          text.includes('feedback') || text.includes('opmerking'),
          input.trim().length > 25
        ]
        
        if (hasOpmaakElements.filter(Boolean).length < 2) {
          return {
            isComplete: false,
            followUpMessage: `Je opmaak feedback kan nog completer. Behandel deze punten:

🎨 **Opmaak & Presentatie feedback:**
- Feedback op **visuele opmaak** van je presentatie
- Feedback op je **presentatiestijl** en vaardigheden
- Feedback op **leesbaarheid** en structuur
- Je **eigen ervaring** tijdens het presenteren
- Wat ga je **verbeteren** voor volgende keer?`
          }
        }
        break
    }
    
    return { isComplete: true, followUpMessage: '' }
  }

  const validateActionPoints = (input: string) => {
    const text = input.toLowerCase()
    const hasActionElements = [
      text.includes('ga ik') || text.includes('wil ik') || text.includes('plan ik'),
      text.includes('voor') || text.includes('tot') || text.includes('datum') || text.includes('week'),
      text.split(/[.!?]/).length >= 3, // Minimaal 3 zinnen/actiepunten
      input.trim().length > 60
    ]
    
    if (hasActionElements.filter(Boolean).length < 3) {
      return {
        isComplete: false,
        followUpMessage: `Je actiepunten kunnen nog SMART-er. Maak ze concreter:

🎯 **SMART Actiepunten (minimaal 3):**
- **Specifiek:** WAT ga je precies doen?
- **Meetbaar:** HOE weet je dat het gelukt is?
- **Acceptabel:** Waarom is dit belangrijk?
- **Realistisch:** Kun je dit echt doen?
- **Tijdgebonden:** WANNEER ga je dit doen?

**Voorbeeld:** "Ik ga voor 20 maart minimaal 5 recente (2023-2024) sportmarketing artikelen zoeken via de NHL database en deze volgens APA-stijl verwerken in mijn bronnenlijst."`
      }
    }
    
    return { isComplete: true, followUpMessage: '' }
  }

  const validateCheckpointAnalysis = (input: string, checkpoint: string) => {
    const text = input.toLowerCase()
    const hasAnalysisElements = [
      text.includes('studie') || text.includes('leren') || text.includes('voorbereid'),
      text.includes('moeilijk') || text.includes('makkelijk') || text.includes('onderdeel'),
      text.includes('omdat') || text.includes('doordat') || text.includes('reden'),
      input.trim().length > 40
    ]
    
    if (hasAnalysisElements.filter(Boolean).length < 3) {
      return {
        isComplete: false,
        followUpMessage: `Je ${checkpoint} analyse kan nog dieper. Behandel deze aspecten:

📊 **${checkpoint.toUpperCase()} Analyse:**
- **Studieaanpak:** Hoe heb je je voorbereid?
- **Moeilijke onderdelen:** Welke leerdoelen waren lastig?
- **Makkelijke onderdelen:** Wat ging goed?
- **Verklaring:** WAAROM behaalde je dit resultaat?
- **Verwachting:** Deed je het beter/slechter dan verwacht?
- **Aanpak:** Wat zou je anders doen?`
      }
    }
    
    return { isComplete: true, followUpMessage: '' }
  }

  const validateAttendanceResponse = (input: string, attendancePercentage: number) => {
    const text = input.toLowerCase()
    const isLowAttendance = attendancePercentage < 80
    
    const hasAttendanceElements = [
      isLowAttendance ? (text.includes('reden') || text.includes('omdat') || text.includes('door')) : true,
      text.includes('invloed') || text.includes('gevolg') || text.includes('impact') || text.includes('effect'),
      text.includes('verbeteren') || text.includes('anders') || text.includes('plan'),
      input.trim().length > 30
    ]
    
    if (hasAttendanceElements.filter(Boolean).length < 3) {
      const lowAttendanceMessage = isLowAttendance ? 
        `Je aanwezigheid (${attendancePercentage}%) is onder de 80% grens. Behandel deze punten:

📅 **Aanwezigheid Analyse:**
- **Reden:** Waarom was je vaak afwezig?
- **Impact:** Welke invloed had dit op je resultaten?
- **Gemiste stof:** Hoe heb je dit ingehaald?
- **Verbeterplan:** Hoe ga je dit aanpakken?
- **Concrete acties:** Wat doe je anders?` :
        `Je hebt goede aanwezigheid (${attendancePercentage}%). Vertel meer:

📅 **Aanwezigheid Reflectie:**
- **Gemiste lessen:** Welke lessen heb je gemist?
- **Inhalen:** Hoe heb je gemiste stof ingehaald?
- **Impact:** Merkte je verschil bij gemiste lessen?
- **Voordeel:** Hoe helpt goede aanwezigheid je?`
      
      return {
        isComplete: false,
        followUpMessage: lowAttendanceMessage
      }
    }
    
    return { isComplete: true, followUpMessage: '' }
  }

  const validateTeamContribution = (input: string) => {
    const text = input.toLowerCase()
    const hasTeamElements = [
      text.includes('taak') || text.includes('deed ik') || text.includes('verantwoordelijk'),
      text.includes('team') || text.includes('groep') || text.includes('samen'),
      text.includes('bijdrage') || text.includes('geholpen') || text.includes('ondersteund'),
      text.includes('volgende keer') || text.includes('anders') || text.includes('verbeteren'),
      input.trim().length > 50
    ]
    
    if (hasTeamElements.filter(Boolean).length < 4) {
      return {
        isComplete: false,
        followUpMessage: `Je teambijdrage reflectie kan nog concreter. Behandel alle aspecten:

👥 **Persoonlijke Teambijdrage:**
- **Specifieke taken:** Welke taken deed JIJ precies?
- **Teamrol:** Welke rol nam je op je (leider, onderzoeker, presentator)?
- **Bijdrage:** Hoe heb je het team geholpen/ondersteund?
- **Reacties:** Hoe reageerden teamgenoten op jouw inbreng?
- **Voorbeeld:** Geef een concreet voorbeeld van je bijdrage
- **Verbetering:** Wat zou je volgende keer anders doen?
- **Groei:** Waarin wil je groeien als teamlid?`
      }
    }
    
    return { isComplete: true, followUpMessage: '' }
  }

  const handleFeedbackAnalysis = async (input: string) => {
    // Inhoudelijke validatie per onderdeel
    const validationResult = validateFeedbackContent(input, currentQuestion)
    
    if (!validationResult.isComplete) {
      setFollowUpCount(prev => prev + 1)
      if (followUpCount < 3) {
        addBotMessage(validationResult.followUpMessage)
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
    // Valideer actiepunten op SMART criteria
    const actionValidation = validateActionPoints(input)
    
    if (!actionValidation.isComplete) {
      setFollowUpCount(prev => prev + 1)
      if (followUpCount < 3) {
        addBotMessage(actionValidation.followUpMessage)
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
    try {
      // Generate AI-improved action list via API
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: `Verbeter deze actiepunten tot concrete, meetbare taken met deadlines:

${userInput}

Maak er maximaal 5 SMART actiepunten van (Specifiek, Meetbaar, Acceptabel, Realistisch, Tijdgebonden). 
Geef alleen de actiepunten terug, elk op een nieuwe regel, zonder nummering.`,
          aiModel: 'smart'
        }),
      })

      if (response.ok) {
        const data = await response.json()
        const improvedActions = data.response
          .split('\n')
          .filter((line: string) => line.trim().length > 10)
          .map((line: string) => line.replace(/^\d+\.\s*/, '').trim())
          .slice(0, 5)
        
        return improvedActions.length > 0 ? improvedActions : [userInput.trim()]
      }
    } catch (error) {
      console.error('Error improving action list:', error)
    }
    
    // Fallback: basic processing
    const actions = userInput.split(/[.!?]/).filter(s => s.trim().length > 10)
    return actions.map(action => 
      action.trim() + (action.includes('voor') ? '' : ' - deadline: voor volgende demo')
    ).slice(0, 3)
  }

  const handleCheckpointReview = async (input: string) => {
    if (currentQuestion === 'checkpoint3_analysis') {
      const checkpointValidation = validateCheckpointAnalysis(input, 'checkpoint3')
      
      if (!checkpointValidation.isComplete) {
        setFollowUpCount(prev => prev + 1)
        if (followUpCount < 3) {
          addBotMessage(checkpointValidation.followUpMessage)
          setAwaitingInput(true)
          return
        }
      }

      addBotMessage(`**Checkpoint 6 (${studentData.checkpoint6Resultaat}):**

Hetzelfde voor checkpoint 6. Wat is je verklaring voor dit resultaat? Heb je je aanpak aangepast na checkpoint 3?

Kun je aan de hand van de testvision vertellen welke onderdelen je goed of slecht hebt gemaakt?`)
      setCurrentQuestion('checkpoint6_analysis')
      setFollowUpCount(0)
      setAwaitingInput(true)
      
    } else if (currentQuestion === 'checkpoint6_analysis') {
      const checkpointValidation = validateCheckpointAnalysis(input, 'checkpoint6')
      
      if (!checkpointValidation.isComplete) {
        setFollowUpCount(prev => prev + 1)
        if (followUpCount < 3) {
          addBotMessage(checkpointValidation.followUpMessage)
          setAwaitingInput(true)
          return
        }
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
    const attendanceValidation = validateAttendanceResponse(input, studentData.aanwezigheidsPercentage || 0)
    
    if (!attendanceValidation.isComplete) {
      setFollowUpCount(prev => prev + 1)
      if (followUpCount < 3) {
        addBotMessage(attendanceValidation.followUpMessage)
        setAwaitingInput(true)
        return
      }
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
    const teamValidation = validateTeamContribution(input)
    
    if (!teamValidation.isComplete) {
      setFollowUpCount(prev => prev + 1)
      if (followUpCount < 3) {
        addBotMessage(teamValidation.followUpMessage)
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

  const downloadConversationReport = async () => {
    try {
      // Import docx dynamically
      const { Document, Paragraph, TextRun, Packer } = await import('docx')
      
      const finalDocument = await generateFinalDocument()
      
      // Convert to Word document
      const doc = new Document({
        creator: "Demo Reflectie Tool",
        title: "Gespreksverslag Demo 1 Reflectie",
        description: "Reflectie gesprek voor Speco Sportmarketing Demo 1",
        sections: [{
          properties: {},
          children: finalDocument.split('\n').map(line => 
            new Paragraph({
              children: [new TextRun({ text: line })],
              spacing: { after: 120 }
            })
          )
        }]
      })
      
      const blob = await Packer.toBlob(doc)
      
      // Create download link
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      
      // Generate filename with student info and timestamp
      const now = new Date()
      const timestamp = now.toISOString().slice(0, 16).replace('T', '_').replace(/:/g, '-')
      const studentName = studentData.voornaam || 'Student'
      const pcnNumber = studentData.pcnNummer || 'Unknown'
      link.download = `Demo1_Reflectie_${studentName}_${pcnNumber}_${timestamp}.docx`
      
      // Trigger download
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      
      // Cleanup
      URL.revokeObjectURL(url)
      
    } catch (error) {
      console.error('Download failed:', error)
      alert('Er is een fout opgetreden bij het downloaden van het gespreksverslag.')
    }
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
            <span>•</span>
            <button
              onClick={downloadConversationReport}
              className="flex items-center space-x-1 px-3 py-1 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-xs font-medium"
              title="Download het gespreksverslag als Word document"
            >
              <span>📄</span>
              <span>Download Gespreksverslag</span>
            </button>
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
              {currentPhase === 'file_upload' && (currentQuestion === 'beroepsproduct' || currentQuestion === 'feedback_only' || currentQuestion === 'presentation_only') && (
                <div className="mb-4">
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple={false}
                    accept=".pdf,.ppt,.pptx,.doc,.docx,.mp3,.wav,.m4a"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  <button
                    onClick={handleFileUploadClick}
                    className="w-full p-4 border-2 border-dashed border-purple-300 rounded-lg text-purple-600 hover:border-purple-400 hover:bg-purple-50 transition-colors"
                  >
                    📁 {currentQuestion === 'beroepsproduct' ? 'Klik hier om je beroepsproduct te uploaden' : 
                         currentQuestion === 'presentation_only' ? 'Klik hier om je beroepsproduct te uploaden' :
                         'Klik hier om je feedbackformulier te uploaden'}
                    <div className="text-sm text-gray-500 mt-1">
                      {(currentQuestion === 'beroepsproduct' || currentQuestion === 'presentation_only') ? 
                       'Ondersteunde formaten: PDF, PowerPoint, Word' : 
                       'Ondersteunde formaten: PDF, Word, Audio'}
                    </div>
                  </button>
                </div>
              )}
              
              <form onSubmit={handleSubmit} className="space-y-3">
                <div className="flex space-x-2">
                  <textarea
                    ref={textareaRef}
                    name="message"
                    placeholder="Typ je antwoord hier... (neem de tijd voor een uitgebreid antwoord)"
                    className="flex-1 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
                    rows={3}
                    required
                    defaultValue={voiceInputText}
                  />
                  
                  {/* Voice Input Button */}
                  <div className="flex flex-col space-y-2">
                    <button
                      type="button"
                      onClick={isListening ? stopVoiceInput : startVoiceInput}
                      className={`p-3 rounded-lg transition-all duration-200 ${
                        isListening 
                          ? 'bg-red-500 text-white animate-pulse' 
                          : 'bg-blue-500 hover:bg-blue-600 text-white'
                      }`}
                      title={isListening ? 'Stop opname' : 'Start spraakopname'}
                    >
                      {isListening ? '⏹️' : '🎤'}
                    </button>
                    
                    <button
                      type="submit"
                      className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                    >
                      Verstuur
                    </button>
                  </div>
                </div>
                
                {isListening && (
                  <div className="text-sm text-blue-600 flex items-center space-x-2">
                    <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                    <span>Luistert... Spreek duidelijk in het Nederlands</span>
                  </div>
                )}
              </form>
              
              <div className="mt-2 text-xs text-gray-500 space-y-1">
                <div>💡 Tip: Geef uitgebreide antwoorden. Ik help je door te vragen als je antwoord te kort is.</div>
                <div>🎤 Gebruik de microfoon knop om je antwoord in te spreken (Nederlands)</div>
              </div>
            </div>
          )}
        </div>

        {/* Voice Recognition Status */}
        {isListening && (
          <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center space-x-3">
              <div className="flex space-x-1">
                <div className="w-2 h-6 bg-blue-500 rounded animate-pulse"></div>
                <div className="w-2 h-4 bg-blue-400 rounded animate-pulse" style={{animationDelay: '0.1s'}}></div>
                <div className="w-2 h-8 bg-blue-500 rounded animate-pulse" style={{animationDelay: '0.2s'}}></div>
                <div className="w-2 h-3 bg-blue-400 rounded animate-pulse" style={{animationDelay: '0.3s'}}></div>
              </div>
              <div>
                <p className="text-blue-800 font-medium">🎤 Aan het luisteren...</p>
                <p className="text-blue-600 text-sm">Spreek duidelijk in het Nederlands. Klik op ⏹️ om te stoppen.</p>
              </div>
            </div>
          </div>
        )}

        {/* Browser Compatibility Warning */}
        {typeof window !== 'undefined' && !('webkitSpeechRecognition' in window) && (
          <div className="mt-4 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-center space-x-2">
              <span className="text-yellow-600">⚠️</span>
              <div>
                <p className="text-yellow-800 font-medium">Spraakherkenning niet ondersteund</p>
                <p className="text-yellow-700 text-sm">
                  Gebruik Chrome of Edge voor de beste ervaring met spraakherkenning.
                </p>
              </div>
            </div>
          </div>
        )}

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