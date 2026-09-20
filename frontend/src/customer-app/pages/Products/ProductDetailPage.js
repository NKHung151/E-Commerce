import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import ProductService from '../../services/product';
import CommentService from '../../services/comment';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import Alert from '../../components/common/Alert';
import { useCart } from '../../hooks/useCart';
import { useAuth } from '../../hooks/useAuth';
import ProductCard from '../../components/common/ProductCard';
import { aiService } from '../../../services/aiService';

export const ProductDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addItem, loading: cartLoading } = useCart();
  const { isAuthenticated, user } = useAuth();

  
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [similarProducts, setSimilarProducts] = useState([]);
  const [loadingSimilar, setLoadingSimilar] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [message, setMessage] = useState('');

  // Comment states
  const [comments, setComments] = useState([]);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [newRating, setNewRating] = useState(5);
  const [newCommentText, setNewCommentText] = useState('');
  const [commentError, setCommentError] = useState('');
  const [commentSuccess, setCommentSuccess] = useState('');

  useEffect(() => {
    loadProduct();
    loadComments();
  }, [id]);

  const loadProduct = async () => {
    setLoading(true);
    try {
      const response = await ProductService.getProductById(id, { increment_view: 'true' });
      const productData = response.data;
      setProduct(productData);
      
      // TRACK BEHAVIOR: Send behavior 'view' Go to AI Service
      if (isAuthenticated && user?.id) {
        aiService.trackBehavior(user.id, id, 'view');
      }

      
      // NEW LOGIC: Get products IN THE SAME CATEGORY from Database
      const categoryId = productData.category?.id || productData.category || productData.category_id;
      console.log('Detected categoryId for similar products:', categoryId);
      
      if (categoryId) {
        fetchProductsByCategory(categoryId, productData.id);
      }
    } catch (error) {
      console.error('Error loading product:', error);
      setMessage('No products found');
    } finally {
      setLoading(false);
    }
  };

  const fetchProductsByCategory = async (categoryId, currentProductId) => {
    setLoadingSimilar(true);
    try {
      // Call API to get products by category_id, get 5 items
      const response = await ProductService.getProductsByCategory(categoryId, 5);
      const list = response.data.results || response.data || [];
      // Remove the current product from the suggestion list
      const filtered = list.filter(p => p.id !== parseInt(currentProductId)).slice(0, 4);
      setSimilarProducts(filtered);
    } catch (error) {
      console.warn('Could not load similar products from database:', error);
    } finally {
      setLoadingSimilar(false);
    }
  };

  const loadComments = async () => {
    setCommentsLoading(true);
    try {
      const response = await CommentService.getCommentsByProductId(id);
      setComments(response.data.results || response.data || []);
    } catch (error) {
      console.error('Error loading comments:', error);
    } finally {
      setCommentsLoading(false);
    }
  };

  const handleCommentSubmit = async (e) => {
    e.preventDefault();
    if (!newCommentText.trim()) {
      setCommentError('Please enter review content.');
      return;
    }
    setCommentError('');
    setCommentSuccess('');
    try {
      const data = {
        product_id: parseInt(id),
        rating: newRating,
        comment_text: newCommentText
      };
      await CommentService.createComment(data);
      setNewCommentText('');
      setNewRating(5);
      setCommentSuccess('Review has been sent successfully!');
      loadComments();
    } catch (err) {
      console.error('Error submitting comment:', err);
      setCommentError(err.response?.data?.detail || 'Error sending review.');
    }
  };

  const handleCommentDelete = async (commentId) => {
    if (!window.confirm('Are you sure you want to delete this review?')) return;
    try {
      await CommentService.deleteComment(commentId);
      loadComments();
    } catch (err) {
      console.error('Error deleting comment:', err);
      alert('This review cannot be deleted.');
    }
  };

  const handleAddToCart = async () => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    try {
      const unitPrice = Number(product.price ?? product.unit_price ?? 0);
      await addItem(product.id, quantity, unitPrice);
      
      // TRACK BEHAVIOR: Send behavior 'add_to_cart' Go to AI Service
      if (isAuthenticated && user?.id) {
        aiService.trackBehavior(user.id, product.id, 'add_to_cart');
      }
      
      setMessage('Successfully added to cart!');

    } catch (error) {
      setMessage('Error adding to cart');
    }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center"><LoadingSpinner /></div>;
  if (!product) return <div className="max-w-7xl mx-auto px-4 py-8"><Alert type="error" message="No products found" /></div>;

  return (
    <div className="min-h-screen bg-slate-50 pb-16">
      <div className="max-w-5xl mx-auto px-4 py-6">
        {message && (
          <Alert
            type={message.includes('Error') ? 'error' : 'success'}
            message={message}
            onClose={() => setMessage('')}
          />
        )}

        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start mt-6">
          {/* IMAGE SECTION */}
          <div className="md:col-span-5 bg-white p-4 rounded-2xl shadow-sm border border-gray-100 group overflow-hidden">
            <img
              src={product.image_url || product.image || 'https://placehold.co/800x800?text=No+Image'}
              alt={product.name}
              className="w-full h-auto object-contain rounded-xl max-h-[350px] transform group-hover:scale-105 transition-transform duration-500"
            />
          </div>

          {/* PRODUCT INFO SECTION */}
          <div className="md:col-span-7 flex flex-col">
            <nav className="inline-flex items-center space-x-2 text-xs font-bold tracking-wider text-indigo-500 uppercase bg-indigo-50 px-3 py-1 rounded-full w-max mb-4">
              <span>{product.category?.name || 'Category'}</span>
            </nav>
            
            <h1 className="text-2xl md:text-3xl font-black mb-4 text-slate-900 leading-tight">
              {product.name}
            </h1>
            
            <div className="flex flex-wrap items-center gap-4 mb-6">
              <span className="text-3xl font-black text-rose-600">
                ₫{Number(product.price || 0).toLocaleString('en-US')}
              </span>
              {product.stock > 0 ? (
                <span className="bg-emerald-50 text-emerald-600 px-3 py-1 rounded-lg text-xs font-bold border border-emerald-100">
                  In stock: {product.stock} items
                </span>
              ) : (
                <span className="bg-rose-50 text-rose-600 px-3 py-1 rounded-lg text-xs font-bold border border-rose-100">
                  Out of stock
                </span>
              )}
            </div>

            <div className="prose prose-sm prose-indigo mb-8 text-slate-600 leading-relaxed">
              <p>
                {product.description || 'Detailed product information will be updated soon...'}
              </p>
            </div>

            {/* ACTION CARD */}
            <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm mb-8">
              <div className="flex flex-wrap items-center gap-6 mb-6">
                <div className="flex flex-col">
                  <label className="text-xs font-bold text-gray-500 mb-2">Quantity</label>
                  <div className="flex items-center bg-gray-50 rounded-lg p-1 border border-gray-200">
                    <button
                      onClick={() => setQuantity(Math.max(1, quantity - 1))}
                      className="w-8 h-8 flex items-center justify-center rounded-md hover:bg-white text-gray-600 font-bold"
                    >
                      −
                    </button>
                    <input
                      type="number"
                      value={quantity}
                      onChange={(e) => setQuantity(Math.min(product.stock, Math.max(1, parseInt(e.target.value) || 1)))}
                      className="w-12 bg-transparent text-center outline-none font-bold text-gray-800"
                      max={product.stock}
                    />
                    <button
                      onClick={() => setQuantity(Math.min(product.stock, quantity + 1))}
                      className="w-8 h-8 flex items-center justify-center rounded-md hover:bg-white text-gray-600 font-bold"
                      disabled={quantity >= product.stock}
                    >
                      +
                    </button>
                  </div>
                </div>
                
                <div className="flex flex-col flex-grow">
                  <label className="text-xs font-bold text-gray-500 mb-2">Total Estimated</label>
                  <span className="text-2xl font-black text-rose-600">
                    ₫{(Number(product.price || 0) * quantity).toLocaleString('en-US')}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={handleAddToCart}
                  disabled={product.stock <= 0 || cartLoading}
                  className="bg-indigo-50 text-indigo-600 hover:bg-indigo-100 py-3 rounded-xl disabled:opacity-50 font-bold transition-all flex items-center justify-center gap-2"
                >
                  {cartLoading ? 'Adding...' : (
                    <>
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
                      Add to cart
                    </>
                  )}
                </button>
                <button
                  onClick={async () => {
                    await handleAddToCart();
                    navigate('/checkout');
                  }}
                  disabled={product.stock <= 0 || cartLoading}
                  className="bg-rose-600 hover:bg-rose-700 text-white py-3 rounded-xl disabled:opacity-50 font-bold transition-all flex items-center justify-center gap-2"
                >
                  Buy Now
                </button>
              </div>
            </div>

          <button
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-2 text-slate-500 hover:text-indigo-600 font-bold transition-all group"
          >
            <span className="bg-white p-2 rounded-full shadow-sm border border-slate-100 group-hover:-translate-x-1 transition-transform group-hover:border-indigo-200">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
            </span>
            Return to list
          </button>
        </div>
      </div>
      
      {/* REVIEW & COMMENT SECTION */}
      <div className="mt-12 bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
        <h2 className="text-xl font-bold text-gray-900 mb-6">Reviews & Comments</h2>

        {/* Review writing form */}
        {isAuthenticated ? (
          <form onSubmit={handleCommentSubmit} className="mb-10 bg-gray-50 p-6 rounded-xl border border-gray-100">
            <h3 className="text-base font-bold text-gray-800 mb-4">Share Your Experience</h3>
            
            {commentError && <div className="mb-4 text-sm text-red-600">{commentError}</div>}
            {commentSuccess && <div className="mb-4 text-sm text-green-600">{commentSuccess}</div>}

            <div className="flex items-center gap-3 mb-4">
              <span className="text-sm font-medium text-gray-600">Rating</span>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    type="button"
                    key={star}
                    onClick={() => setNewRating(star)}
                    className="text-2xl focus:outline-none"
                  >
                    <span className={star <= newRating ? 'text-yellow-400' : 'text-gray-300'}>★</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="mb-4">
              <textarea
                value={newCommentText}
                onChange={(e) => setNewCommentText(e.target.value)}
                placeholder="What do you think about this product?"
                rows="3"
                className="w-full p-3 border border-gray-200 rounded-lg focus:outline-none focus:border-indigo-500 text-sm"
              ></textarea>
            </div>

            <button
              type="submit"
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-6 rounded-lg text-sm transition-colors"
            >
              Post Review
            </button>
          </form>
        ) : (
          <div className="mb-10 p-4 bg-amber-50 rounded-lg flex items-center justify-between">
            <span className="text-sm text-amber-800">Please log in to write a review.</span>
            <button
              onClick={() => navigate('/login')}
              className="bg-amber-100 hover:bg-amber-200 text-amber-800 font-bold py-2 px-4 rounded text-sm transition-colors"
            >
              Sign In
            </button>
          </div>
        )}

        {/* List of reviews */}
        {commentsLoading ? (
          <div className="flex justify-center py-10"><LoadingSpinner /></div>
        ) : comments.length > 0 ? (
          <div className="space-y-4">
            {comments.map((c) => (
              <div key={c.id} className="bg-gray-50 p-4 rounded-xl border border-gray-100 relative group">
                <div className="flex justify-between items-start mb-2">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-600 font-bold text-sm">
                      {c.username.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h4 className="font-bold text-sm text-gray-900 leading-none">{c.username}</h4>
                      <span className="text-xs text-gray-400">
                        {new Date(c.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </span>
                    </div>
                  </div>
                  
                  {user && (user.id === c.user_id || user.role === 'admin') && (
                    <button
                      onClick={() => handleCommentDelete(c.id)}
                      className="text-red-400 hover:text-red-600 text-xs"
                      title="Delete Review"
                    >
                      Delete
                    </button>
                  )}
                </div>
                
                <div className="flex gap-1 text-yellow-400 mb-2 text-sm">
                  {Array.from({ length: 5 }).map((_, idx) => (
                    <span key={idx}>
                      {idx < c.rating ? '★' : <span className="text-gray-200">★</span>}
                    </span>
                  ))}
                </div>

                <p className="text-gray-700 text-sm">{c.comment_text}</p>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-16 bg-slate-50/50 rounded-3xl border border-dashed border-slate-200">
            <span className="text-4xl mb-4 block">💭</span>
            <h4 className="text-lg font-bold text-slate-700 mb-2">No Reviews Yet</h4>
            <p className="text-slate-500 font-medium max-w-sm mx-auto">Be the first to share your experience with this product!</p>
          </div>
        )}
      </div>
    </div>
  </div>
  );
};

export default ProductDetailPage;
