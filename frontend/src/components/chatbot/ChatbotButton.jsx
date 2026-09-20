import React, { useEffect, useState } from 'react'
import './chatbot.css'

const RobotSVG = ({ className = '' }) => (
  <svg viewBox="0 0 24 24" className={className} width="22" height="22" fill="currentColor" aria-hidden>
    <path d="M12 2a3 3 0 0 0-3 3v1H7a3 3 0 0 0-3 3v3a3 3 0 0 0 3 3h1v1a3 3 0 0 0 3 3h2a3 3 0 0 0 3-3v-1h1a3 3 0 0 0 3-3v-3a3 3 0 0 0-3-3h-2V5a3 3 0 0 0-3-3h-2zM9 6a3 3 0 1 1 6 0v1H9V6z" />
  </svg>
)

const CloseSVG = () => (
  <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" aria-hidden>
    <path d="M6 6l12 12M6 18L18 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
)

const ChatbotButton = ({ isOpen, toggleOpen, unreadCount }) => {
  const [pulse, setPulse] = useState(true)

  useEffect(() => {
    const timer = setTimeout(() => setPulse(false), 2200)
    return () => clearTimeout(timer)
  }, [])

  if (isOpen) return null;

  return (
    <button
      aria-expanded={isOpen}
      aria-label="Chat with AI Advisor"
      className={`chatbot-button ${pulse ? 'pulse-once' : ''}`}
      onClick={toggleOpen}
      title="Chat with AI Advisor"
    >
      <span className="chatbot-icon">
        <RobotSVG />
      </span>
      {unreadCount > 0 && <span className="chatbot-badge" aria-hidden>{unreadCount}</span>}
    </button>
  )
}

export default ChatbotButton
