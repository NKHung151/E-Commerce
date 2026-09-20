import React, { useRef, useEffect } from 'react'
import './chatbot.css'
import MessageBubble from './MessageBubble'
import TypingIndicator from './TypingIndicator'
import ProductCard from './ProductCard'
import QuickReplies from './QuickReplies'

const ChatWindow = ({ isOpen, messages, input, setInput, isLoading, sendMessage, toggleOpen, clearChat }) => {
  const listRef = useRef(null)

  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight
    }
  }, [messages, isOpen, isLoading])

  if (!isOpen) return null

  const onSubmit = (e) => {
    e.preventDefault()
    if (!input || input.trim().length === 0) return
    sendMessage(input.trim())
    setInput('')
  }

  return (
    <div className="chat-window" role="dialog" aria-label="AI shopping assistant">
      <div className="chat-header">
        <div className="chat-header-left">
          <div className="bot-avatar">🤖</div>
          <div className="bot-meta">
            <div className="bot-name">AI shopping assistant</div>
            <div className="bot-status">Active</div>
          </div>
        </div>
        <div className="chat-header-right">
          <button className="chat-close" onClick={toggleOpen} aria-label="Close">×</button>
        </div>
      </div>

      <div className="chat-body" ref={listRef} aria-live="polite">
        {messages.map((m) => (
          <div key={m.id} className="chat-message-row">
            <MessageBubble message={m} />
            {m.products && m.products.length > 0 && (
              <div className="product-suggestions">
                {m.products.map((p, idx) => (
                  <ProductCard key={p.id || idx} productData={typeof p === 'object' ? p : null} productId={typeof p !== 'object' ? p : null} />
                ))}
              </div>
            )}
          </div>
        ))}

        {isLoading && <TypingIndicator />}
      </div>

      {/* Quick Replies Chips */}
      <QuickReplies onQuick={sendMessage} />

      <form className="chat-input-form" onSubmit={onSubmit}>
        <input
          className="chat-input"
          placeholder="Ask about products, prices..."
          value={input}
          maxLength={500}
          onChange={(e) => setInput(e.target.value)}
          disabled={isLoading}
        />
        <button type="submit" className="chat-send" disabled={isLoading || input.trim().length === 0}>
          {isLoading ? '...' : 'Send'}
        </button>
      </form>
    </div>
  )
}

export default ChatWindow
