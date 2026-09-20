import React, { useState, useEffect } from 'react';
import ProductService from '../../services/product';
import ProductCard from './ProductCard';
import LoadingSpinner from './LoadingSpinner';

const SimilarProducts = ({ categoryId, currentProductId, limit = 4 }) => {
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchSimilar = async () => {
            if (!categoryId) return;
            setLoading(true);
            try {
                // Get products by category, we use a larger limit to filter out the current product
                const response = await ProductService.getProductsByCategory(categoryId, limit + 1);
                const filtered = (response.data.results || [])
                    .filter(p => p.id !== currentProductId)
                    .slice(0, limit);
                setProducts(filtered);
            } catch (error) {
                console.error('Failed to fetch similar products:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchSimilar();
    }, [categoryId, currentProductId, limit]);

    if (loading) return <div className="py-8"><LoadingSpinner /></div>;
    if (products.length === 0) return null;

    return (
        <section className="similar-products-section py-8">
            <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-800 flex items-center">
                    <span className="mr-2">📦</span> Similar Products
                </h2>
                <div className="h-px flex-grow bg-gray-200 ml-4"></div>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                {products.map(product => (
                    <ProductCard key={product.id} product={product} />
                ))}
            </div>
        </section>
    );
};

export default SimilarProducts;
