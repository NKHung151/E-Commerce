import React, { useEffect, useState } from 'react'
import chatbotService from '../../services/chatbotService'
import { useNavigate } from 'react-router-dom'
import './chatbot.css'

const ProductCard = ({ productId, productData }) => {
  const [p, setP] = useState(productData || null)
  const navigate = useNavigate()

  useEffect(() => {
    if (productData) {
      setP(productData)
      return
    }
    if (productId) {
      let mounted = true
      chatbotService.getProductById(productId).then((res) => {
        if (mounted) setP(res)
      }).catch(() => {})
      return () => { mounted = false }
    }
  }, [productId, productData])

  if (!p) return <div className="product-card placeholder">Loading...</div>

  const price = Number(p.price ?? p.unit_price ?? 0);

  return (
    <div 
      className="product-card" 
      onClick={() => navigate(`/products/${p.id || productId}`)} 
      role="button" 
      tabIndex={0}
    >
      <div className="product-thumb">
        {(p.image || p.image_url) ? <img src={p.image || p.image_url} alt={p.name} /> : '🛍️'}
      </div>
      <div className="product-info">
        <div className="product-name">{p.name}</div>
        <div className="product-price">₫{price.toLocaleString('vi-VN')}</div>
        <button className="product-view-btn">Xem ngay</button>
      </div>
    </div>
  )
}

export default ProductCard
