import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import ProductService from '../../services/product';
import CategoryService from '../../services/category';
import Alert from '../../components/common/Alert';

const CATEGORY_MODELS = {
  'Books': { service: ProductService.createBook, fields: ['author', 'publisher', 'isbn'] },
  'Electronics': { service: ProductService.createElectronics, fields: ['brand', 'warranty'] },
  'Fashion': { service: ProductService.createFashion, fields: ['size', 'color'] },
  'Home & Living': { service: ProductService.createHomeLiving, fields: ['material', 'dimensions'] },
  'Sports & Outdoors': { service: ProductService.createSportsOutdoors, fields: ['sport_type', 'weight'] },
  'Beauty & Health': { service: ProductService.createBeautyHealth, fields: ['ingredient', 'volume'] },
  'Toys & Games': { service: ProductService.createToysGames, fields: ['age_range', 'players'] },
  'Automotive': { service: ProductService.createAutomotive, fields: ['vehicle_type', 'compatibility'] },
  'Food & Grocery': { service: ProductService.createFoodGrocery, fields: ['expiry_days', 'weight'] },
  'Office Supplies': { service: ProductService.createOfficeSupplies, fields: ['pack_size', 'material'] },
};

export const CreateProductPage = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [categories, setCategories] = useState([]);
  
  const [baseData, setBaseData] = useState({
    name: '',
    description: '',
    price: '',
    stock: '',
    discount: '',
    image_url: '',
    category: ''
  });

  const [specificData, setSpecificData] = useState({});

  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    try {
      const response = await CategoryService.getCategories();
      const cats = response.data.results || response.data;
      setCategories(cats);
      if (cats.length > 0) {
        setBaseData(prev => ({ ...prev, category: cats[0].id }));
      }
    } catch (err) {
      console.error('Failed to load categories', err);
    }
  };

  const selectedCategoryObj = categories.find(c => c.id === parseInt(baseData.category));
  const categoryName = selectedCategoryObj?.name;
  const modelConfig = CATEGORY_MODELS[categoryName];

  const handleBaseChange = (e) => {
    setBaseData({ ...baseData, [e.target.name]: e.target.value });
  };

  const handleSpecificChange = (e) => {
    setSpecificData({ ...specificData, [e.target.name]: e.target.value });
  };

  // Reset specific data when category changes
  useEffect(() => {
    setSpecificData({});
  }, [baseData.category]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const productPayload = {
        name: baseData.name,
        description: baseData.description,
        price: parseFloat(baseData.price),
        stock: parseInt(baseData.stock),
        discount: parseFloat(baseData.discount) || 0,
        image_url: baseData.image_url,
        category: parseInt(baseData.category)
      };

      if (modelConfig) {
        // Send nested payload
        await modelConfig.service({
          product: productPayload,
          ...specificData
        });
      } else {
        // Fallback to generic product creation if category doesn't have a specific model
        await ProductService.createProduct(productPayload);
      }

      navigate('/products');
    } catch (err) {
      setError(err.response?.data?.detail || 'Create failed products');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Add New Products</h1>

      {error && <Alert type="error" message={error} />}

      <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-lg p-6">
        <h2 className="text-xl font-bold mb-4 border-b pb-2">General information</h2>
        
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="col-span-2">
            <label className="block text-gray-700 font-bold mb-2">Category</label>
            <select
              name="category"
              value={baseData.category}
              onChange={handleBaseChange}
              className="w-full px-4 py-2 border rounded font-bold"
              required
            >
              {categories.map(cat => (
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))}
            </select>
          </div>

          <div className="col-span-2">
            <label className="block text-gray-700 font-bold mb-2">Product name</label>
            <input
              type="text"
              name="name"
              value={baseData.name}
              onChange={handleBaseChange}
              className="w-full px-4 py-2 border rounded"
              required
            />
          </div>

          <div className="col-span-2">
            <label className="block text-gray-700 font-bold mb-2">Product description</label>
            <textarea
              name="description"
              value={baseData.description}
              onChange={handleBaseChange}
              rows="3"
              className="w-full px-4 py-2 border rounded"
            />
          </div>

          <div>
            <label className="block text-gray-700 font-bold mb-2">Selling price (VND)</label>
            <input
              type="number"
              name="price"
              value={baseData.price}
              onChange={handleBaseChange}
              step="0.01"
              className="w-full px-4 py-2 border rounded"
              required
            />
          </div>

          <div>
            <label className="block text-gray-700 font-bold mb-2">Quantity in stock</label>
            <input
              type="number"
              name="stock"
              value={baseData.stock}
              onChange={handleBaseChange}
              className="w-full px-4 py-2 border rounded"
              required
            />
          </div>

          <div>
            <label className="block text-gray-700 font-bold mb-2">% Discount</label>
            <input
              type="number"
              name="discount"
              value={baseData.discount}
              onChange={handleBaseChange}
              min="0"
              max="100"
              step="0.01"
              className="w-full px-4 py-2 border rounded"
            />
          </div>

          <div className="col-span-2">
            <label className="block text-gray-700 font-bold mb-2">Image path (URL)</label>
            <input
              type="url"
              name="image_url"
              value={baseData.image_url}
              onChange={handleBaseChange}
              className="w-full px-4 py-2 border rounded"
            />
          </div>
        </div>

        {modelConfig && (
          <div className="mt-8">
            <h2 className="text-xl font-bold mb-4 border-b pb-2 text-blue-600">
              Detailed information: {categoryName}
            </h2>
            <div className="grid grid-cols-2 gap-4">
              {modelConfig.fields.map(field => (
                <div key={field}>
                  <label className="block text-gray-700 font-bold mb-2 capitalize">
                    {field.replace('_', ' ')}
                  </label>
                  <input
                    type={field === 'warranty' || field === 'pack_size' || field === 'expiry_days' ? 'number' : 'text'}
                    name={field}
                    value={specificData[field] || ''}
                    onChange={handleSpecificChange}
                    className="w-full px-4 py-2 border rounded bg-blue-50"
                    required
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex gap-4 mt-8 pt-4 border-t">
          <button
            type="submit"
            disabled={loading}
            className="flex-1 bg-red-600 text-white py-3 rounded hover:bg-red-700 disabled:bg-gray-400 font-bold text-lg"
          >
            {loading ? 'Saving...' : 'Create Products'}
          </button>
          <button
            type="button"
            onClick={() => navigate('/products')}
            className="flex-1 bg-gray-300 py-3 rounded hover:bg-gray-400 font-bold text-lg"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
};

export default CreateProductPage;
