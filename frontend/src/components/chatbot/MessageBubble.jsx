import { Link } from 'react-router-dom'

const formatTime = (iso) => {
  try {
    const d = new Date(iso)
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  } catch (e) { return '' }
}

const MessageBubble = ({ message }) => {
  const isBot = message.role === 'bot'
  
  // Function to process text to display link [text](/url)
  const renderText = (text) => {
    const regex = /\[([^\]]+)\]\(([^)]+)\)/g
    const parts = []
    let lastIndex = 0
    let match

    while ((match = regex.exec(text)) !== null) {
      // Add text before link
      if (match.index > lastIndex) {
        parts.push(text.substring(lastIndex, match.index))
      }
      // Add Link component
      parts.push(
        <Link key={match.index} to={match[2]} className="chat-link">
          {match[1]}
        </Link>
      )
      lastIndex = regex.lastIndex
    }
    // Add the remaining text
    if (lastIndex < text.length) {
      parts.push(text.substring(lastIndex))
    }
    
    return parts.length > 0 ? parts : text
  }

  return (
    <div className={`message-row ${isBot ? 'bot-row' : 'user-row'}`}>
      <div className={`message-bubble ${isBot ? 'bot' : 'user'}`}>
        <div className="bubble-avatar">
          {isBot ? '🤖' : '👤'}
        </div>
        <div className="bubble-content">
          <div className="bubble-text">{renderText(message.text)}</div>
          <div className="bubble-meta">{formatTime(message.timestamp)}</div>
        </div>
      </div>
    </div>
  )
}

export default MessageBubble
