import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { aiService } from '../../../services/aiService';

const MiniProductCard = ({ product }) => {
  const price = Number(product.price ?? product.unit_price ?? 0);
  const formattedPrice = price.toLocaleString('en-US');
  const imageUrl = product.image || product.image_url || `https://placehold.co/150x150?text=${encodeURIComponent(product.name)}`;
  
  return (
    <Link 
      to={`/products/${product.id}`} 
      className="flex-shrink-0 w-40 sm:w-44 bg-white border border-gray-100 rounded-lg p-2.5 hover:shadow-md hover:-translate-y-0.5 transition-all duration-300"
    >
      <div className="aspect-square w-full rounded overflow-hidden bg-gray-50 mb-2">
        <img src={imageUrl} alt={product.name} loading="lazy" className="w-full h-full object-cover" />
      </div>
      <h4 className="text-xs font-semibold text-gray-800 line-clamp-2 h-8 leading-tight mb-1">{product.name}</h4>
      <div className="text-sm font-bold text-[#EE4D2D]">₫{formattedPrice}</div>
    </Link>
  );
};

export const SimilarProductsCarousel = ({ productId }) => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const scrollContainerRef = useRef(null);

  useEffect(() => {
    const fetchSimilar = async () => {
      if (!productId) return;
      setLoading(true);
      try {
        const data = await aiService.getSimilarProducts(productId, 10);
        setProducts(data.products || []);
      } catch (error) {
        console.error('Error fetching similar products:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchSimilar();
  }, [productId]);

  const scroll = (direction) => {
    if (scrollContainerRef.current) {
      const scrollAmount = direction === 'left' ? -250 : 250;
      scrollContainerRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  if (loading) {
    return (
      <div className="py-10 animate-pulse">
        <div className="h-6 w-48 bg-gray-200 rounded mb-6"></div>
        <div className="flex gap-4 overflow-hidden">
          {Array.from({ length: 5 }).map((_, idx) => (
            <div key={idx} className="w-44 h-56 bg-gray-100 rounded-lg flex-shrink-0"></div>
          ))}
        </div>
      </div>
    );
  }

  if (products.length === 0) return null;

  return (
    <section className="py-10 border-t border-gray-100 relative group">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-black text-gray-900 flex items-center gap-2">
          <span>📦</span> You may also like (Similar products)
        </h3>
        <div className="h-0.5 flex-grow bg-gray-100 ml-4 hidden sm:block"></div>
      </div>

      {/* Slide Navigation Arrows */}
      <div className="relative">
        <button
          onClick={() => scroll('left')}
          className="absolute -left-4 top-1/2 -translate-y-1/2 z-20 w-8 h-8 rounded-full bg-white shadow hover:shadow-md border border-gray-100 text-gray-600 hover:text-gray-900 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300"
          aria-label="Scroll left"
        >
          ‹
        </button>

        <div
          ref={scrollContainerRef}
          className="flex gap-4 overflow-x-auto pb-4 scrollbar-none scroll-smooth"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {products.map((p) => (
            <MiniProductCard key={p.id} product={p} />
          ))}
        </div>

        <button
          onClick={() => scroll('right')}
          className="absolute -right-4 top-1/2 -translate-y-1/2 z-20 w-8 h-8 rounded-full bg-white shadow hover:shadow-md border border-gray-100 text-gray-600 hover:text-gray-900 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300"
          aria-label="Scroll right"
        >
          ›
        </button>
      </div>
    </section>
  );
};

export default SimilarProductsCarousel;
