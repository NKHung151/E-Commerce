import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { aiService } from '../../../services/aiService';
import { useCart } from '../../hooks/useCart';
import { useAuth } from '../../hooks/useAuth';

export const BoughtTogetherBundle = ({ currentProduct }) => {
  const [bundleProducts, setBundleProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const { addItem } = useCart();
  const { isAuthenticated } = useAuth();
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    const fetchBundle = async () => {
      if (!currentProduct?.id) return;
      setLoading(true);
      try {
        const data = await aiService.getBoughtTogether(currentProduct.id, 2);
        setBundleProducts(data.products || []);
      } catch (error) {
        console.error('Error fetching bought together bundle:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchBundle();
  }, [currentProduct]);

  if (loading) {
    return (
      <div className="py-8 animate-pulse border-t border-gray-100">
        <div className="h-6 w-56 bg-gray-200 rounded mb-6"></div>
        <div className="flex gap-4 items-center">
          <div className="w-32 h-44 bg-gray-100 rounded-lg"></div>
          <span className="text-xl text-gray-300 font-bold">+</span>
          <div className="w-32 h-44 bg-gray-100 rounded-lg"></div>
          <span className="text-xl text-gray-300 font-bold">+</span>
          <div className="w-32 h-44 bg-gray-100 rounded-lg"></div>
        </div>
      </div>
    );
  }

  if (bundleProducts.length === 0) return null;

  // Build the list of all products in the bundle (current product + recommended ones)
  const allBundleItems = [
    {
      id: currentProduct.id,
      name: currentProduct.name,
      price: Number(currentProduct.price ?? currentProduct.unit_price ?? 0),
      image: currentProduct.image_url || currentProduct.image
    },
    ...bundleProducts.map(p => ({
      id: p.id,
      name: p.name,
      price: Number(p.price),
      image: p.image
    }))
  ];

  // Calculate total bundle price
  const totalBundlePrice = allBundleItems.reduce((sum, item) => sum + item.price, 0);

  const handleAddBundleToCart = async () => {
    if (!isAuthenticated) {
      alert('Please log in to add products to cart!');
      return;
    }

    setAdding(true);
    try {
      // Add each item in sequence
      for (const item of allBundleItems) {
        // add_to_cart behaviour is tracked server-side by cart-service. The old client-side
        // call double-counted it and attributed it to user 1 (`currentProduct.userId || 1`).
        await addItem(item.id, 1, item.price);
      }
      alert('All products in the combo have been added to the cart!');
    } catch (e) {
      console.error('Error adding bundle to cart:', e);
      alert('Error adding combo to cart.');
    } finally {
      setAdding(false);
    }
  };

  return (
    <section className="py-10 border-t border-gray-100">
      <div className="flex items-center justify-between mb-8">
        <h3 className="text-xl font-black text-gray-900 flex items-center gap-2">
          <span>🤝</span> Often purchased together
        </h3>
        <div className="h-0.5 flex-grow bg-gray-100 ml-4 hidden sm:block"></div>
      </div>

      <div className="flex flex-col lg:flex-row gap-8 items-stretch bg-gray-50/50 p-6 rounded-2xl border border-gray-100">
        {/* Products List in Bundle */}
        <div className="flex flex-wrap items-center gap-4 flex-grow">
          {allBundleItems.map((item, idx) => {
            const imageUrl = item.image || `https://placehold.co/120x120?text=${encodeURIComponent(item.name)}`;
            return (
              <React.Fragment key={item.id}>
                {idx > 0 && (
                  <span className="text-2xl text-gray-300 font-extrabold px-1">+</span>
                )}
                <div className="w-28 sm:w-32 bg-white p-2 rounded-xl border border-gray-100 shadow-sm flex flex-col justify-between h-44">
                  <div>
                    <div className="aspect-square w-full rounded overflow-hidden bg-gray-50 mb-1.5">
                      <img src={imageUrl} alt={item.name} className="w-full h-full object-cover" />
                    </div>
                    <h4 className="text-[11px] font-semibold text-gray-800 line-clamp-2 leading-tight mb-1">
                      {item.name}
                    </h4>
                  </div>
                  <div className="text-xs font-bold text-[#EE4D2D]">
                    ₫{item.price.toLocaleString('en-US')}
                  </div>
                </div>
              </React.Fragment>
            );
          })}
        </div>

        {/* Pricing and Action Panel */}
        <div className="w-full lg:w-72 bg-white p-6 rounded-xl border border-gray-100 shadow-sm flex flex-col justify-between">
          <div className="space-y-4">
            <h4 className="text-sm font-bold text-gray-500 uppercase tracking-wider">
              Total combo cost ({allBundleItems.length} product)
            </h4>
            <div className="space-y-1">
              <div className="text-3xl font-black text-[#EE4D2D]">
                ₫{totalBundlePrice.toLocaleString('en-US')}
              </div>
              <div className="text-xs text-gray-400">
                Save delivery time.
              </div>
            </div>
          </div>

          <button
            onClick={handleAddBundleToCart}
            disabled={adding}
            className="mt-6 w-full bg-[#EE4D2D] hover:bg-[#EE4D2D]/90 text-white font-bold py-3.5 rounded-lg shadow transition-all active:scale-95 disabled:opacity-50 text-sm flex items-center justify-center gap-2"
          >
            {adding ? '⏳ Adding...' : '📥 Add everything to cart'}
          </button>
        </div>
      </div>
    </section>
  );
};

export default BoughtTogetherBundle;
