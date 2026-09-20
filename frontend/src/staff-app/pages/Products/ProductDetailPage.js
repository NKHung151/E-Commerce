import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import ProductService from '../../services/product';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import Alert from '../../components/common/Alert';

export const ProductDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadProduct();
  }, [id]);

  const loadProduct = async () => {
    try {
      const response = await ProductService.getProductById(id);
      setProduct(response.data);
    } catch (err) {
      console.error('Error loading product:', err);
      setError('Product not found or an error occurred while loading details');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <LoadingSpinner />;
  if (error) return <div className="p-8"><Alert type="error" message={error} /></div>;
  if (!product) return null;

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6 flex justify-between items-center">
        <button
          onClick={() => navigate('/products')}
          className="bg-gray-200 text-gray-800 px-4 py-2 rounded hover:bg-gray-300 flex items-center gap-2"
        >
          ← Back to list
        </button>
        <button
          onClick={() => navigate(`/products/${id}/edit`)}
          className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 font-bold"
        >
          Edit products
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-lg overflow-hidden">
        <div className="md:flex">
          <div className="md:w-1/3 bg-gray-100 flex items-center justify-center p-4">
            {product.image_url ? (
              <img 
                src={product.image_url} 
                alt={product.name} 
                className="max-w-full h-auto object-contain rounded"
                onError={(e) => {
                  e.target.onerror = null;
                  e.target.src = 'https://via.placeholder.com/300?text=No+Image';
                }}
              />
            ) : (
              <div className="text-8xl">📦</div>
            )}
          </div>
          <div className="p-8 md:w-2/3">
            <div className="uppercase tracking-wide text-sm text-blue-600 font-semibold mb-1">
              Category: {product.category_id || 'Chung'}
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-4">{product.name}</h1>
            
            <div className="grid grid-cols-2 gap-6 mb-8">
              <div className="bg-blue-50 p-4 rounded-lg">
                <p className="text-gray-500 text-sm uppercase">Selling price</p>
                <p className="text-2xl font-bold text-blue-700">
                  ₫{Number(product.price || 0).toLocaleString('en-US')}
                </p>
              </div>
              <div className="bg-green-50 p-4 rounded-lg">
                <p className="text-gray-500 text-sm uppercase">Quantity in stock</p>
                <p className="text-2xl font-bold text-green-700">
                  {product.stock} product
                </p>
              </div>
            </div>

            <div className="border-t pt-6">
              <h2 className="text-lg font-bold mb-2">Product description</h2>
              <p className="text-gray-600 leading-relaxed whitespace-pre-wrap">
                {product.description || 'This product has no description yet.'}
              </p>
            </div>

            <div className="mt-8 pt-6 border-t grid grid-cols-2 gap-4 text-sm text-gray-500">
              <div>
                <p>Creation date: {new Date(product.created_at).toLocaleString()}</p>
              </div>
              <div>
                <p>Last update: {new Date(product.updated_at).toLocaleString()}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductDetailPage;
