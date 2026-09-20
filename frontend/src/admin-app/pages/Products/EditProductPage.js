import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import ProductService from '../../services/product';
import CategoryService from '../../services/category';
import Alert from '../../components/common/Alert';
import LoadingSpinner from '../../components/common/LoadingSpinner';

const CATEGORY_MODELS = {
  'Books': { fields: ['author', 'publisher', 'isbn'] },
  'Electronics': { fields: ['brand', 'warranty'] },
  'Fashion': { fields: ['size', 'color'] },
  'Home & Living': { fields: ['material', 'dimensions'] },
  'Sports & Outdoors': { fields: ['sport_type', 'weight'] },
  'Beauty & Health': { fields: ['ingredient', 'volume'] },
  'Toys & Games': { fields: ['age_range', 'players'] },
  'Automotive': { fields: ['vehicle_type', 'compatibility'] },
  'Food & Grocery': { fields: ['expiry_days', 'weight'] },
  'Office Supplies': { fields: ['pack_size', 'material'] },
};

export const EditProductPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [categories, setCategories] = useState([]);
  
  const [formData, setFormData] = useState({
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
    loadData();
  }, [id]);

  const loadData = async () => {
    try {
      // Load categories and product details in parallel
      const [catRes, prodRes] = await Promise.all([
        CategoryService.getCategories(),
        ProductService.getProductById(id)
      ]);
      
      setCategories(catRes.data.results || catRes.data);
      
      const product = prodRes.data;
      setFormData({
        name: product.name || '',
        description: product.description || '',
        price: product.price || '',
        stock: product.stock || '',
        discount: product.discount || 0,
        image_url: product.image_url || '',
        category: product.category || ''
      });
      setSpecificData(product.details || {});
    } catch (err) {
      setError('Downloading product details failed');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const selectedCategoryObj = categories.find(c => c.id === parseInt(formData.category));
  const categoryName = selectedCategoryObj?.name;
  const modelConfig = CATEGORY_MODELS[categoryName];

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSpecificChange = (e) => {
    setSpecificData({ ...specificData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');

    try {
      await ProductService.updateProduct(id, {
        name: formData.name,
        description: formData.description,
        price: parseFloat(formData.price),
        stock: parseInt(formData.stock),
        discount: parseFloat(formData.discount) || 0,
        image_url: formData.image_url,
        category: parseInt(formData.category),
        details: specificData
      });

      navigate('/admin/products');
    } catch (err) {
      setError(err.response?.data?.detail || 'Product update failed');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Product Editing</h1>

      {error && <Alert type="error" message={error} />}

      <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-lg p-6">
        <h2 className="text-xl font-bold mb-4 border-b pb-2">General information</h2>
        
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="col-span-2">
            <label className="block text-gray-700 font-bold mb-2">Category</label>
            <select
              name="category"
              value={formData.category}
              onChange={handleChange}
              className="w-full px-4 py-2 border rounded font-bold bg-gray-100"
              required
              disabled
            >
              <option value="" disabled>Select category</option>
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
              value={formData.name}
              onChange={handleChange}
              className="w-full px-4 py-2 border rounded"
              required
            />
          </div>

          <div className="col-span-2">
            <label className="block text-gray-700 font-bold mb-2">Product description</label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows="3"
              className="w-full px-4 py-2 border rounded"
            />
          </div>

          <div>
            <label className="block text-gray-700 font-bold mb-2">Selling price (VND)</label>
            <input
              type="number"
              name="price"
              value={formData.price}
              onChange={handleChange}
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
              value={formData.stock}
              onChange={handleChange}
              className="w-full px-4 py-2 border rounded"
              required
            />
          </div>

          <div>
            <label className="block text-gray-700 font-bold mb-2">% Discount</label>
            <input
              type="number"
              name="discount"
              value={formData.discount}
              onChange={handleChange}
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
              value={formData.image_url}
              onChange={handleChange}
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
            disabled={saving}
            className="flex-1 bg-blue-600 text-white py-3 rounded hover:bg-blue-700 disabled:bg-gray-400 font-bold text-lg"
          >
            {saving ? 'Saving...' : 'Update'}
          </button>
          <button
            type="button"
            onClick={() => navigate('/admin/products')}
            className="flex-1 bg-gray-300 py-3 rounded hover:bg-gray-400 font-bold text-lg"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
};

export default EditProductPage;
