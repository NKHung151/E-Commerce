import React from 'react'
import './chatbot.css'

const chips = [
  { id: 'laptop', label: '💻 Laptop under 15 million' },
  { id: 'phone', label: '📱 Phone with long battery life' },
  { id: 'books', label: '📚 Best selling books' },
  { id: 'deals', label: '🔥 Promotion today' }
]

const QuickReplies = ({ onQuick }) => {
  return (
    <div className="quick-replies">
      {chips.map(c => (
        <button key={c.id} className="quick-chip" onClick={() => onQuick(c.label)}>{c.label}</button>
      ))}
    </div>
  )
}

export default QuickReplies
