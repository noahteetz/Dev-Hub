import { useState } from 'react'
import './App.css'

function App() {
  const [apiStatus, setApiStatus] = useState('Not checked')

  async function checkBackend() {
    setApiStatus('Checking...')

    try {
      const response = await fetch('/api/status')

      if (!response.ok) {
        throw new Error(`Backend returned ${response.status}`)
      }

      const payload = (await response.json()) as { status: string }
      setApiStatus(`Backend is ${payload.status}`)
    } catch {
      setApiStatus('Backend is unavailable')
    }
  }

  return (
    <main>
      <section id="center">
        <div>
          <h1>Dev Hub</h1>
          <p>React + Vite and Spring Boot are ready.</p>
        </div>
        <button
          type="button"
          className="counter"
          onClick={checkBackend}
        >
          {apiStatus}
        </button>
      </section>
    </main>
  )
}

export default App
