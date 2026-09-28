import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import NeuralBackground from './components/NeuralBackground.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <NeuralBackground />
    <App />
  </StrictMode>,
)
