import React from 'react'
import ChatbotButton from './ChatbotButton'
import ChatWindow from './ChatWindow'
import useChatbot from '../../hooks/useChatbot'
import { useAuth } from '../../customer-app/hooks/useAuth'

const ChatbotWidget = () => {
  const { user } = useAuth()
  const hook = useChatbot(user)

  if (!user || user.role !== 'customer') return null

  return (
    <>
      <ChatWindow {...hook} />
      <ChatbotButton {...hook} />
    </>
  )
}

export default ChatbotWidget
