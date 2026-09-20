import React, { useState, useEffect } from 'react';
import { aiService } from '../../../services/aiService';
import ProductService from '../../services/product';
import { useAuth } from '../../hooks/useAuth';
import ProductCard from './ProductCard';

const SkeletonCard = () => (
  <div className="bg-white border border-gray-100 rounded-lg p-3 space-y-3 animate-pulse h-full">
    <div className="bg-gray-200 aspect-square w-full rounded-md"></div>
    <div className="space-y-2">
      <div className="bg-gray-200 h-4 w-5/6 rounded"></div>
      <div className="bg-gray-200 h-4 w-2/3 rounded"></div>
    </div>
    <div className="flex gap-2">
      <div className="bg-gray-200 h-5 w-1/3 rounded"></div>
      <div className="bg-gray-200 h-5 w-1/4 rounded"></div>
    </div>
  </div>
);

const RecommendedForYouProducts = () => {
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [limit, setLimit] = useState(5);
    const [hasMore, setHasMore] = useState(false);
    const [isFallback, setIsFallback] = useState(false);
    const { user, isAuthenticated } = useAuth();

    useEffect(() => {
        const fetchRecs = async () => {
            setLoading(true);
            const userId = isAuthenticated ? user?.id : null;
            try {
                // Get recommendations from AI service
                const data = await aiService.getRecommendations(userId, limit, "");
                
                if (data.products && data.products.length > 0) {
                    setProducts(data.products.slice(0, limit));
                    setIsFallback(data.source === 'fallback' || data.source === 'error');
                } else {
                    // Fallback to rule-based popular products from standard catalog
                    const popular = await fetchPopularFallback();
                    setProducts(popular.slice(0, limit));
                    setIsFallback(true);
                }
            } catch (error) {
                console.error('Error fetching recommendations, loading popular products:', error);
                const popular = await fetchPopularFallback();
                setProducts(popular.slice(0, limit));
                setIsFallback(true);
            }
            setLoading(false);
        };

        fetchRecs();
    }, [user, isAuthenticated, limit]);

    const fetchPopularFallback = async () => {
        try {
            const res = await ProductService.getProducts(1, 24);
            return res.data.results || [];
        } catch (e) {
            console.error('Failed to load fallback catalog:', e);
            return [];
        }
    };

    const handleLoadMore = () => {
        if (!loading) {
            setLimit(prev => prev + 6);
        }
    };

    // Section will now always render (either recommendations or fallback popular products)

    return (
        <section className="py-10 border-t border-gray-100">
            <div className="flex items-center justify-between mb-8">
                <h2 className="text-2xl font-black text-gray-900 flex items-center gap-2">
                    <span className="text-red-500 animate-bounce">🔥</span> 
                    {isFallback ? 'Best selling product today' : 'Suggestions just for you'}
                </h2>
                <div className="h-0.5 flex-grow bg-gray-100 ml-4 hidden sm:block"></div>

            </div>
            
            {loading && products.length === 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                    {Array.from({ length: 12 }).map((_, idx) => (
                        <SkeletonCard key={idx} />
                    ))}
                </div>
            ) : (
                <>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                        {products.map(product => (
                            <ProductCard key={product.id} product={product} showAddToCart={true} />
                        ))}
                    </div>

                    {products.length === 0 && (
                        <div className="bg-gray-50 border border-gray-100 rounded-xl p-12 text-center">
                            <p className="text-gray-500 font-medium">There are no product recommendations.</p>
                        </div>
                    )}
                </>
            )}
        </section>
    );
};

export default RecommendedForYouProducts;
