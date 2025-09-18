'use client'

import { useState } from 'react'
import MarkdownRenderer from './MarkdownRenderer'
import ResponseActions from './ResponseActions'

interface ReflectionData {
  projectTitle: string
  teamMembers: string
  demoDate: string
  presentationDuration: string
  audienceType: string
  mainGoals: string
  keyPoints: string
  challenges: string
  feedback: string
  whatWentWell: string
  whatCouldImprove: string
  nextSteps: string
  learnings: string
}

export default function ReflectionApp() {
  const [currentStep, setCurrentStep] = useState(1)
  const [reflectionData, setReflectionData] = useState<ReflectionData>({
    projectTitle: '',
    teamMembers: '',
    demoDate: '',
    presentationDuration: '',
    audienceType: '',
    mainGoals: '',
    keyPoints: '',
    challenges: '',
    feedback: '',
    whatWentWell: '',
    whatCouldImprove: '',
    nextSteps: '',
    learnings: ''
  })
  
  const [aiResponse, setAiResponse] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [showAiAnalysis, setShowAiAnalysis] = useState(false)

  const totalSteps = 4

  const updateReflectionData = (field: keyof ReflectionData, value: string) => {
    setReflectionData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const generateAiAnalysis = async () => {
    setIsLoading(true)
    setShowAiAnalysis(true)
    
    try {
      const prompt = `
Als expert in sportmarketing en projectbegeleiding, analyseer de volgende demo reflectie van een Speco sportmarketing student:

**PROJECT INFORMATIE:**
- Project: ${reflectionData.projectTitle}
- Team: ${reflectionData.teamMembers}
- Demo datum: ${reflectionData.demoDate}
- Presentatie duur: ${reflectionData.presentationDuration}
- Doelgroep: ${reflectionData.audienceType}

**DOELEN EN INHOUD:**
- Hoofddoelen: ${reflectionData.mainGoals}
- Kernpunten gepresenteerd: ${reflectionData.keyPoints}

**UITDAGINGEN EN FEEDBACK:**
- Uitdagingen tijdens demo: ${reflectionData.challenges}
- Ontvangen feedback: ${reflectionData.feedback}

**REFLECTIE:**
- Wat ging goed: ${reflectionData.whatWentWell}
- Wat kan beter: ${reflectionData.whatCouldImprove}
- Volgende stappen: ${reflectionData.nextSteps}
- Belangrijkste lessen: ${reflectionData.learnings}

Geef een uitgebreide analyse met:

## 📊 Demo Analyse
Beoordeel de sterke punten en verbeterpunten van de demo

## 🎯 Sportmarketing Focus
Specifieke feedback op de sportmarketing aspecten van het project

## 💡 Concrete Verbetervoorstellen
Praktische tips voor de volgende demo/presentatie

## 🚀 Vervolgstappen
Prioriteiten voor de komende periode

## 📈 Leertraject
Hoe deze ervaring bijdraagt aan professionele ontwikkeling

Houd rekening met dat dit Speco studenten zijn die leren over sportmarketing. Geef constructieve, motiverende feedback die hen helpt groeien.
`

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: prompt,
          aiModel: 'smart'
        }),
      })

      if (!response.ok) {
        throw new Error('Fout bij het genereren van AI analyse')
      }

      const data = await response.json()
      setAiResponse(data.response)
    } catch (error) {
      console.error('Error:', error)
      setAiResponse('Er is een fout opgetreden bij het genereren van de analyse. Probeer het opnieuw.')
    } finally {
      setIsLoading(false)
    }
  }

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">
              📋 Project Informatie
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Project Titel
                </label>
                <input
                  type="text"
                  value={reflectionData.projectTitle}
                  onChange={(e) => updateReflectionData('projectTitle', e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Bijv. Nike Voetbalcampagne 2024"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Teamleden
                </label>
                <input
                  type="text"
                  value={reflectionData.teamMembers}
                  onChange={(e) => updateReflectionData('teamMembers', e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Bijv. Jan, Lisa, Mike, Sarah"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Demo Datum
                </label>
                <input
                  type="date"
                  value={reflectionData.demoDate}
                  onChange={(e) => updateReflectionData('demoDate', e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Presentatie Duur
                </label>
                <select
                  value={reflectionData.presentationDuration}
                  onChange={(e) => updateReflectionData('presentationDuration', e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Selecteer duur</option>
                  <option value="5-10 minuten">5-10 minuten</option>
                  <option value="10-15 minuten">10-15 minuten</option>
                  <option value="15-20 minuten">15-20 minuten</option>
                  <option value="20+ minuten">20+ minuten</option>
                </select>
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Doelgroep/Publiek
              </label>
              <textarea
                value={reflectionData.audienceType}
                onChange={(e) => updateReflectionData('audienceType', e.target.value)}
                rows={3}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Bijv. Medestudenten, docenten, externe experts, opdrachtgever..."
              />
            </div>
          </div>
        )
      
      case 2:
        return (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">
              🎯 Demo Inhoud & Doelen
            </h2>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Hoofddoelen van de Demo
              </label>
              <textarea
                value={reflectionData.mainGoals}
                onChange={(e) => updateReflectionData('mainGoals', e.target.value)}
                rows={4}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Wat wilde je bereiken met deze demo? Welke boodschap wilde je overbrengen?"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Kernpunten Gepresenteerd
              </label>
              <textarea
                value={reflectionData.keyPoints}
                onChange={(e) => updateReflectionData('keyPoints', e.target.value)}
                rows={5}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Welke belangrijkste punten heb je behandeld? Denk aan strategie, doelgroep, kanalen, budget, resultaten..."
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Uitdagingen Tijdens de Demo
              </label>
              <textarea
                value={reflectionData.challenges}
                onChange={(e) => updateReflectionData('challenges', e.target.value)}
                rows={4}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Welke moeilijkheden kwam je tegen? Technische problemen, tijdgebrek, nervositeit, vragen die je niet kon beantwoorden..."
              />
            </div>
          </div>
        )
      
      case 3:
        return (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">
              💬 Feedback & Reacties
            </h2>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Ontvangen Feedback
              </label>
              <textarea
                value={reflectionData.feedback}
                onChange={(e) => updateReflectionData('feedback', e.target.value)}
                rows={5}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Wat was de feedback van docenten, medestudenten of andere aanwezigen? Zowel positief als constructief..."
              />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  ✅ Wat Ging Goed
                </label>
                <textarea
                  value={reflectionData.whatWentWell}
                  onChange={(e) => updateReflectionData('whatWentWell', e.target.value)}
                  rows={5}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Waar ben je trots op? Wat liep soepel? Welke complimenten kreeg je?"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  🔄 Wat Kan Beter
                </label>
                <textarea
                  value={reflectionData.whatCouldImprove}
                  onChange={(e) => updateReflectionData('whatCouldImprove', e.target.value)}
                  rows={5}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Wat zou je anders doen? Welke aspecten kunnen worden verbeterd?"
                />
              </div>
            </div>
          </div>
        )
      
      case 4:
        return (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">
              🚀 Vervolgstappen & Lessen
            </h2>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Concrete Vervolgstappen
              </label>
              <textarea
                value={reflectionData.nextSteps}
                onChange={(e) => updateReflectionData('nextSteps', e.target.value)}
                rows={4}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Wat ga je nu doen? Welke acties neem je mee naar de volgende fase van het project?"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Belangrijkste Lessen Geleerd
              </label>
              <textarea
                value={reflectionData.learnings}
                onChange={(e) => updateReflectionData('learnings', e.target.value)}
                rows={4}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Wat heb je geleerd over sportmarketing, presenteren, teamwork, of jezelf?"
              />
            </div>
            
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-blue-800 mb-3">
                🤖 AI Analyse Genereren
              </h3>
              <p className="text-blue-700 mb-4">
                Laat AI je reflectie analyseren en krijg gepersonaliseerde feedback en verbetervoorstellen voor je sportmarketing project.
              </p>
              <button
                onClick={generateAiAnalysis}
                disabled={isLoading}
                className="w-full bg-blue-600 text-white py-3 px-6 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? '🔄 Analyse wordt gegenereerd...' : '✨ Genereer AI Analyse'}
              </button>
            </div>
          </div>
        )
      
      default:
        return null
    }
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Progress Bar */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700">Voortgang</span>
          <span className="text-sm font-medium text-gray-700">{currentStep}/{totalSteps}</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div 
            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${(currentStep / totalSteps) * 100}%` }}
          ></div>
        </div>
      </div>

      {/* Main Content */}
      <div className="bg-white rounded-xl shadow-lg p-8 mb-8">
        {renderStep()}
        
        {/* Navigation */}
        <div className="flex justify-between mt-8 pt-6 border-t border-gray-200">
          <button
            onClick={() => setCurrentStep(Math.max(1, currentStep - 1))}
            disabled={currentStep === 1}
            className="px-6 py-2 text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            ← Vorige
          </button>
          
          {currentStep < totalSteps && (
            <button
              onClick={() => setCurrentStep(Math.min(totalSteps, currentStep + 1))}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Volgende →
            </button>
          )}
        </div>
      </div>

      {/* AI Analysis Results */}
      {showAiAnalysis && (
        <div className="bg-white rounded-xl shadow-lg p-8">
          <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center">
            <span className="w-8 h-8 bg-purple-600 rounded-full flex items-center justify-center mr-3">
              🤖
            </span>
            AI Analyse & Feedback
          </h2>
          
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p className="text-gray-600">AI analyseert je reflectie...</p>
              </div>
            </div>
          ) : aiResponse ? (
            <div>
              <div className="bg-gray-50 rounded-lg p-6 mb-4">
                <MarkdownRenderer content={aiResponse} />
              </div>
              <ResponseActions 
                content={aiResponse}
                isMarkdown={true}
                isStreaming={false}
              />
            </div>
          ) : null}
        </div>
      )}
    </div>
  )
}