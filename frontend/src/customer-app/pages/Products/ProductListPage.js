import React, { useState, useEffect, useRef } from 'react';
import ProductService from '../../services/product';
import ProductCard from '../../components/common/ProductCard';
import RecommendedForYouProducts from '../../components/common/RecommendedForYouProducts';
import { useAuth } from '../../hooks/useAuth';

import api from '../../services/api';

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

export const ProductListPage = () => {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [searchInput, setSearchInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const sentinelRef = useRef(null);
  const { user, isAuthenticated } = useAuth();

  useEffect(() => {
    loadCategories();
  }, []);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchQuery(searchInput);
    }, 400);
    return () => clearTimeout(timer);
  }, [searchInput]);

  // Reload products from page 1 when category or search query changes
  useEffect(() => {
    setCurrentPage(1);
    loadProducts(1, true);
  }, [selectedCategory, searchQuery]);

  // Load next pages
  useEffect(() => {
    if (currentPage > 1) {
      loadProducts(currentPage, false);
    }
  }, [currentPage]);

  const loadCategories = async () => {
    try {
      const response = await ProductService.getCategories();
      setCategories(response.data.results || []);
    } catch (error) {
      console.error('Error loading categories:', error);
    }
  };

  const loadProducts = async (pageToLoad, resetList) => {
    setLoading(true);
    try {
      const params = {};
      if (selectedCategory !== 'all') {
        params.category_id = selectedCategory;
      }
      if (searchQuery) {
        params.search = searchQuery;
      }
      if (isAuthenticated && user?.id) {
        params.user_id = user.id;
      }
      const response = await ProductService.getProducts(pageToLoad, 12, params);
      const newResults = response.data.results || [];
      
      setProducts(prev => resetList ? newResults : [...prev, ...newResults]);
      setHasMore(!!response.data.next);
    } catch (error) {
      console.error('Error loading products:', error);
    } finally {
      setLoading(false);
    }
  };

  // Intersection Observer to detect scroll to bottom
  useEffect(() => {
    const observerTarget = sentinelRef.current;
    if (!observerTarget || loading || !hasMore) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setCurrentPage((prev) => prev + 1);
        }
      },
      { threshold: 0.1 }
    );

    observer.observe(observerTarget);

    return () => {
      if (observerTarget) {
        observer.unobserve(observerTarget);
      }
    };
  }, [loading, hasMore]);

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">

      {/* Recommended For You Section */}
      <div className="mb-12">
        <RecommendedForYouProducts />
      </div>

      {/* Main Catalog Section */}
      <div className="pt-4">
        <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
          <h2 className="text-3xl font-black text-gray-900">All products</h2>
        
          <div className="flex flex-col sm:flex-row items-center gap-3">
            <input
              type="text"
              placeholder="Search for products..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="bg-white border border-gray-200 rounded-xl px-4 py-2 text-sm font-semibold focus:border-blue-600 outline-none transition shadow-sm hover:border-gray-300 w-full sm:w-64"
            />
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <label htmlFor="category-select" className="text-sm font-bold text-gray-500 whitespace-nowrap">Filter by category:</label>
              <select
                id="category-select"
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="bg-white border border-gray-200 rounded-xl px-4 py-2 text-sm font-semibold focus:border-blue-600 outline-none transition cursor-pointer shadow-sm hover:border-gray-300 w-full"
              >
                <option value="all">All categories</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

      {/* Grid Products */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
        {products.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}

        {/* Loading Skeletons at initial page */}
        {loading && currentPage === 1 && (
          Array.from({ length: 12 }).map((_, idx) => (
            <SkeletonCard key={`skeleton-init-${idx}`} />
          ))
        )}
      </div>

      {/* Empty State */}
      {products.length === 0 && !loading && (
        <div className="bg-gray-50 border border-gray-100 rounded-xl p-12 text-center my-8">
          <p className="text-gray-500 font-medium">No products found</p>
        </div>
      )}

      {/* Loading Skeletons for next pages */}
      {loading && currentPage > 1 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 mt-4">
          {Array.from({ length: 6 }).map((_, idx) => (
            <SkeletonCard key={`skeleton-more-${idx}`} />
          ))}
        </div>
      )}

      {/* Scroll Sentinel */}
      {hasMore && (
        <div ref={sentinelRef} className="h-20 flex items-center justify-center mt-4">
          {!loading && (
            <div className="text-gray-400 text-sm font-medium animate-pulse">
              Scroll down to download more products...
            </div>
          )}
        </div>
      )}

      {!hasMore && products.length > 0 && (
        <div className="text-center text-gray-400 text-sm font-medium my-12 border-t border-gray-100 pt-6">
          You have viewed all products 🎉
        </div>
      )}
      </div>
    </div>
  );
};

export default ProductListPage;
