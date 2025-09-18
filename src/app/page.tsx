import ReflectionApp from '@/components/ReflectionApp'

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-green-50">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 rounded-full mb-4">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
          </div>
          
          <h1 className="text-4xl font-bold text-gray-800 mb-2">
            Demo Reflectie Tool
          </h1>
          
          <p className="text-xl text-blue-700 font-medium mb-2">
            Sportmarketing Project - Speco
          </p>
          
          <p className="text-gray-600 max-w-2xl mx-auto">
            Reflecteer op je eerste demo presentatie en krijg AI-ondersteuning bij het verbeteren van je project
          </p>
        </div>

        {/* Main App */}
        <ReflectionApp />
      </div>
    </div>
  )
}