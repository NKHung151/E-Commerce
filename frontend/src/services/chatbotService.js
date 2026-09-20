const API_BASE = 'http://localhost:8080'

export const sendChatMessage = async (userId, message) => {
  const token = localStorage.getItem('access_token')
  const resp = await fetch(`${API_BASE}/chatbot`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ user_id: userId, message })
  })

  if (resp.status === 401) {
    throw { status: 401, message: 'Session expired' }
  }
  if (!resp.ok) {
    const text = await resp.text().catch(() => '')
    throw { status: resp.status, message: text || 'Chatbot API error' }
  }
  return resp.json()
}

export const getProductById = async (productId) => {
  const token = localStorage.getItem('access_token')
  const resp = await fetch(`http://localhost:8080/products/${productId}`, {
    headers: { 'Authorization': `Bearer ${token}` }
  })
  if (!resp.ok) throw new Error('Product fetch failed')
  return resp.json()
}

export const trackOpenChatbot = async (user) => {
  try {
    const token = localStorage.getItem('access_token')
    await fetch(`${API_BASE}/behavior/track`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        user_id: user?.id,
        product_id: null,
        action: 'open_chatbot',
        timestamp: new Date().toISOString()
      })
    })
  } catch (e) {
    // silent
  }
}

export default { sendChatMessage, getProductById, trackOpenChatbot }
