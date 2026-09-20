import { useState, useEffect, useCallback, useRef } from 'react'
import chatbotService from '../services/chatbotService'

const initialBotMessage = {
  id: Date.now(),
  role: 'bot',
  text: "Hi! I'm your AI shopping advisor 👋 What are you looking for today?",
  products: [],
  timestamp: new Date().toISOString(),
  isError: false
}

export const useChatbot = (user) => {
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState([initialBotMessage])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)
  
  const isOpenRef = useRef(isOpen)
  useEffect(() => {
    isOpenRef.current = isOpen
  }, [isOpen])

  useEffect(() => {
    const saved = sessionStorage.getItem('chatbot_history')
    if (saved && saved !== 'undefined') {
      try {
        setMessages(JSON.parse(saved))
      } catch (e) {
        console.error('Failed to parse chat history', e)
      }
    }
  }, [])

  useEffect(() => {
    sessionStorage.setItem('chatbot_history', JSON.stringify(messages))
  }, [messages])

  const sendMessage = useCallback(async (text) => {
    const msg = { id: Date.now(), role: 'user', text, products: [], timestamp: new Date().toISOString(), isError: false }
    setMessages((m) => [...m, msg])
    setIsLoading(true)
    try {
      const res = await chatbotService.sendChatMessage(user?.id, text)
      const botMsg = { id: Date.now() + 1, role: 'bot', text: res.reply || '', products: res.products || [], timestamp: new Date().toISOString(), isError: false }
      setMessages((m) => [...m, botMsg])
      setUnreadCount((c) => (isOpenRef.current ? c : c + 1))
    } catch (err) {
      const errorMsg = { id: Date.now() + 2, role: 'bot', text: err.message || 'Sorry, I\'m having trouble connecting. Please try again.', products: [], timestamp: new Date().toISOString(), isError: true }
      setMessages((m) => [...m, errorMsg])
      setUnreadCount((c) => (isOpenRef.current ? c : c + 1))
    } finally {
      setIsLoading(false)
    }
  }, [user])

  const toggleOpen = useCallback(() => {
    const opening = !isOpen
    setIsOpen(opening)
    if (opening) {
      chatbotService.trackOpenChatbot(user)
      setUnreadCount(0)
    }
  }, [isOpen, user])

  const clearChat = useCallback(() => {
    setMessages([initialBotMessage])
    sessionStorage.removeItem('chatbot_history')
  }, [])

  return { isOpen, messages, input, setInput, isLoading, unreadCount, sendMessage, toggleOpen, clearChat }
}

export default useChatbot
