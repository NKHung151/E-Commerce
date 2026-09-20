import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import ProductService from '../../services/product';
import CategoryService from '../../services/category';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import Pagination from '../../components/common/Pagination';
import Alert from '../../components/common/Alert';

export const ProductListPage = () => {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadCategories();
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchQuery(searchInput);
      setCurrentPage(1);
    }, 400);
    return () => clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    loadProducts();
  }, [currentPage, selectedCategory, searchQuery]);

  const loadCategories = async () => {
    try {
      const response = await CategoryService.getCategories();
      setCategories(response.data.results || response.data);
    } catch (err) {
      console.error('Failed to load categories', err);
    }
  };

  const loadProducts = async () => {
    try {
      setLoading(true);
      const params = {};
      if (selectedCategory !== 'all') {
        params.category_id = selectedCategory;
      }
      if (searchQuery) {
        params.search = searchQuery;
      }
      const response = await ProductService.getProducts(currentPage, 10, params);
      setProducts(response.data.results || response.data);
      // DRF pagination uses `count` + `results`; compute pages from `count`
      const count = response.data.count ?? (response.data.total || 0);
      setTotalPages(count ? Math.max(1, Math.ceil(count / 10)) : 1);
      setError('');
    } catch (err) {
      setError('Download failed product list');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this product?')) return;

    try {
      await ProductService.deleteProduct(id);
      setSuccess('Product deletion successful');
      loadProducts();
    } catch (err) {
      setError('Delete failed product');
      console.error(err);
    }
  };

  if (loading && products.length === 0) return <LoadingSpinner />;

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Product management</h1>
        <div className="flex gap-4">
          <input
            type="text"
            placeholder="Search for products..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="px-4 py-2 border rounded font-semibold bg-white"
          />
          <select
            value={selectedCategory}
            onChange={(e) => {
              setSelectedCategory(e.target.value);
              setCurrentPage(1);
            }}
            className="px-4 py-2 border rounded font-bold bg-white"
          >
            <option value="all">All categories</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>{cat.name}</option>
            ))}
          </select>
          <Link
            to="/products/new"
            className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 font-bold flex items-center"
          >
            + Create products
          </Link>
        </div>
      </div>

      {error && <Alert type="error" message={error} />}
      {success && <Alert type="success" message={success} onClose={() => setSuccess('')} />}

      <div className="bg-white rounded-lg shadow overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-100 border-b">
            <tr>
              <th className="px-6 py-3 text-left font-bold w-24">Image</th>
              <th className="px-6 py-3 text-left font-bold">Product name</th>
              <th className="px-6 py-3 text-left font-bold">Category</th>
              <th className="px-6 py-3 text-left font-bold">Price</th>
              <th className="px-6 py-3 text-left font-bold">Quantity</th>
              <th className="px-6 py-3 text-left font-bold">Act</th>
            </tr>
          </thead>
          <tbody>
            {products.map((product) => (
              <tr key={product.id} className="border-b hover:bg-gray-50">
                <td className="px-6 py-3">
                  {product.image_url ? (
                    <img src={product.image_url} alt={product.name} className="w-16 h-16 object-cover rounded" />
                  ) : (
                    <div className="w-16 h-16 bg-gray-200 rounded flex items-center justify-center text-xs text-gray-500">No photo</div>
                  )}
                </td>
                <td className="px-6 py-3 font-medium">{product.name}</td>
                <td className="px-6 py-3">
                  <span className="bg-gray-100 text-gray-800 px-2 py-1 rounded text-sm">
                    {product.category_name || 'N/A'}
                  </span>
                </td>
                <td className="px-6 py-3">₫{(product.price !== undefined && product.price !== null && !Number.isNaN(Number(product.price))) ? Number(product.price).toLocaleString('en-US') : '0'}</td>
                <td className="px-6 py-3">{product.stock || 0}</td>
                <td className="px-6 py-3 space-x-4">
                  <Link
                    to={`/products/${product.id}/edit`}
                    className="text-blue-600 hover:underline font-bold"
                  >
                    Update
                  </Link>
                  <button
                    onClick={() => handleDelete(product.id)}
                    className="text-red-600 hover:underline font-bold"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
            {products.length === 0 && (
              <tr>
                <td colSpan="6" className="px-6 py-8 text-center text-gray-500">
                  No products found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
        />
      )}
    </div>
  );
};

export default ProductListPage;
