import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useCart } from '../../hooks/useCart';
import { useAuth } from '../../hooks/useAuth';
import { aiService } from '../../../services/aiService';

export const ProductCard = ({ product, showAddToCart = true }) => {
  const { addItem, loading } = useCart();
  const { isAuthenticated, user } = useAuth();
  const navigate = useNavigate();

  const handleAddToCart = async (e) => {
    e.preventDefault();
    e.stopPropagation();

    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    try {
      const unitPrice = Number(product.price ?? product.unit_price ?? product.price_amount ?? product.cost ?? 0) || 0;
      await addItem(product.id, 1, unitPrice);
      
      // TRACK BEHAVIOR: add_to_cart
      if (isAuthenticated && user?.id) {
        aiService.trackBehavior(user.id, product.id, 'add_to_cart');
      }
      
      alert('Product added to cart!');
    } catch (error) {
      alert('Error adding product to cart');
    }
  };

  // Extract database properties
  const price = Number(product.price ?? product.unit_price ?? product.price_amount ?? 0);
  const discountPercent = Math.round(Number(product.discount || 0));
  const originalPrice = discountPercent > 0 ? (price / (1 - discountPercent / 100)) : price;
  const ratingVal = Number(product.rating || 0);
  const views = Number(product.views || 0);

  const formattedPrice = price.toLocaleString('en-US');
  const formattedOriginalPrice = originalPrice.toLocaleString('en-US');

  const imageUrl = product.image || product.image_url || `https://placehold.co/300x300?text=${encodeURIComponent(product.name)}`;

  return (
    <Link 
      to={`/products/${product.id}`}
      onClick={() => {
        if (isAuthenticated && user?.id) {
          aiService.trackBehavior(user.id, product.id, 'click');
        }
      }}
      className="group relative bg-white border border-gray-100 rounded-lg shadow-sm hover:shadow-lg transition-all duration-300 flex flex-col h-full overflow-hidden"
    >



      {/* Product Image Container (60% Height) */}
      <div className="relative aspect-square w-full bg-gray-50 overflow-hidden flex items-center justify-center">
        <img
          src={imageUrl}
          alt={product.name}
          loading="lazy"
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
      </div>

      {/* Product Details */}
      <div className="p-3 flex flex-col flex-grow justify-between">
        {/* Title */}
        <h3 className="text-sm font-semibold text-gray-800 line-clamp-2 h-10 mb-2 leading-tight group-hover:text-[#EE4D2D] transition-colors">
          {product.name}
        </h3>

        {/* Pricing & Sold Count */}
        <div className="flex flex-col gap-1.5">
          {/* Price line */}
          <div className="flex items-baseline flex-wrap gap-1">
            <span className="text-base font-bold text-[#EE4D2D]">
              ₫{formattedPrice}
            </span>
            {discountPercent > 0 && (
              <>
                <span className="text-xs text-gray-400 line-through">
                  ₫{formattedOriginalPrice}
                </span>
                <span className="bg-red-50 text-[#EE4D2D] text-[10px] font-bold px-1 rounded-sm">
                  -{discountPercent}%
                </span>
              </>
            )}
          </div>

          {/* Ratings & Views Count */}
          <div className="flex items-center justify-between text-xs text-gray-500">
            <div className="flex items-center text-yellow-500 gap-0.5">
              <span>★</span>
              <span className="text-gray-700 font-medium">{ratingVal.toFixed(1)}</span>
            </div>
            <span>View: {views}</span>
          </div>
        </div>

        {/* Quick Add to Cart button */}
        {showAddToCart && (
          <button
            onClick={handleAddToCart}
            disabled={loading}
            className="mt-3 w-full bg-orange-50 hover:bg-[#EE4D2D] text-[#EE4D2D] hover:text-white border border-[#EE4D2D] py-1.5 rounded text-xs font-bold transition-all disabled:opacity-50 flex items-center justify-center gap-1"
          >
            {loading ? 'Adding...' : '🛒 Add to cart'}
          </button>
        )}
      </div>
    </Link>
  );
};

export default ProductCard;
