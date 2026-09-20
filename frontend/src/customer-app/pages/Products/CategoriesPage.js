import React, { useState, useEffect } from 'react';
import ProductService from '../../services/product';
import ProductCard from '../../components/common/ProductCard';
import LoadingSpinner from '../../components/common/LoadingSpinner';

export const CategoriesPage = () => {
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    try {
      const response = await ProductService.getCategories();
      setCategories(response.data.results || response.data || []);
    } catch (error) {
      console.error('Error loading categories:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectCategory = (category) => {
    setSelectedCategory(category);
    // In a real app, you would filter products by category
    // For now, just load all products
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Product catalog</h1>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        {categories.map((category) => (
          <button
            key={category.id}
            onClick={() => handleSelectCategory(category)}
            className={`p-4 rounded-lg border-2 text-left ${
              selectedCategory?.id === category.id
                ? 'border-blue-600 bg-blue-50'
                : 'border-gray-300 bg-white hover:border-blue-400'
            }`}
          >
            <p className="font-bold">{category.name}</p>
            <p className="text-sm text-gray-600">{category.description}</p>
          </button>
        ))}
      </div>

      {categories.length === 0 && (
        <p className="text-center text-gray-500">No categories available</p>
      )}
    </div>
  );
};

export default CategoriesPage;

