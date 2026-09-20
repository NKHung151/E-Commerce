import React, { useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useCart } from '../../hooks/useCart';
import { useAuth } from '../../hooks/useAuth';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import Alert from '../../components/common/Alert';

export const CartPage = () => {
  const navigate = useNavigate();
  const { cart, loading, updateItem, removeItem } = useCart();
  const { isAuthenticated } = useAuth();

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
    }
  }, [isAuthenticated, navigate]);

  // Only show full-page spinner on initial load
  if (loading && !cart) return <LoadingSpinner />;

  if (!cart || !cart.items || cart.items.length === 0) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-8">Shopping cart</h1>
        <Alert type="info" message="Your shopping cart is empty" />
        <button
          onClick={() => navigate('/')}
          className="mt-4 bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700"
        >
          Continue shopping
        </button>
      </div>
    );
  }

  const priceOf = (product) => {
    if (!product) return 0;
    const v = Number(product.price ?? product.unit_price ?? product.price_amount ?? product.cost ?? 0);
    return Number.isFinite(v) ? v : 0;
  };

  const subtotal = cart.items.reduce(
    (sum, item) => sum + priceOf(item.product) * (item.quantity || 0),
    0
  );
  const tax = subtotal * 0.1;
  const shipping = subtotal > 100 ? 0 : 5;
  const total = subtotal + tax + shipping;

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Shopping cart</h1>

      <div className="grid grid-cols-3 gap-8">
        <div className="col-span-2">
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <th className="text-left py-2">Product</th>
                <th className="text-center py-2">Unit price</th>
                <th className="text-center py-2">Quantity</th>
                <th className="text-right py-2">Temporarily calculated</th>
                <th className="text-center py-2">Act</th>
              </tr>
            </thead>
            <tbody>
              {cart.items.map((item) => (
                <tr key={item.product_id} className="border-b hover:bg-gray-50">
                  <td className="py-4">
                    <Link to={`/product/${item.product_id}`} className="flex items-center gap-4 hover:bg-gray-100 p-2 rounded transition cursor-pointer">
                      {(item.product.image || item.product.image_url) && (
                        <img
                          src={item.product.image || item.product.image_url}
                          alt={item.product.name}
                          className="w-16 h-16 object-cover rounded"
                        />
                      )}
                      <div>
                        <p className="font-bold text-blue-600 hover:underline">{item.product.name}</p>
                        <p className="text-sm text-gray-600">{item.product.description}</p>
                      </div>
                    </Link>
                  </td>
                  <td className="text-center py-4">
                    ₫{(() => {
                      const v = priceOf(item.product);
                      return v.toLocaleString('en-US');
                    })()}
                  </td>
                  <td className="text-center py-4">
                    <div className="flex items-center justify-center gap-2">
                      <button
                        onClick={() => {
                          if (item.quantity > 1) {
                            updateItem(item.product_id, item.quantity - 1);
                          } else if (window.confirm('Remove this product from cart?')) {
                            removeItem(item.product_id);
                          }
                        }}
                        className="bg-gray-200 hover:bg-gray-300 px-3 py-1 rounded transition"
                      >
                        -
                      </button>
                      <span className="w-10 text-center font-medium">{item.quantity}</span>
                      <button
                        onClick={() => updateItem(item.product_id, item.quantity + 1)}
                        className="bg-gray-200 hover:bg-gray-300 px-3 py-1 rounded transition"
                      >
                        +
                      </button>
                    </div>
                  </td>
                  <td className="text-right py-4">
                    ₫{(() => {
                      const v = priceOf(item.product) * (item.quantity || 0);
                      return v.toLocaleString('en-US');
                    })()}
                  </td>
                  <td className="text-center py-4">
                    <button
                      onClick={() => removeItem(item.product_id)}
                      className="text-red-600 hover:text-red-800"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="bg-gray-100 p-6 rounded-lg h-fit">
          <h3 className="text-xl font-bold mb-4">Order summary</h3>
          <div className="space-y-2 mb-4">
            <div className="flex justify-between">
              <span>Temporary calculation:</span>
              <span>₫{subtotal.toLocaleString('en-US')}</span>
            </div>
            <div className="flex justify-between">
              <span>Tax (10%):</span>
              <span>₫{tax.toLocaleString('en-US')}</span>
            </div>
            <div className="flex justify-between">
              <span>Shipping fee:</span>
              <span>₫{shipping.toLocaleString('en-US')}</span>
            </div>
            <div className="border-t pt-2 flex justify-between font-bold text-lg">
              <span>Total:</span>
              <span>₫{total.toLocaleString('en-US')}</span>
            </div>
          </div>

          <button
            onClick={() => navigate('/checkout')}
            className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 mb-2"
          >
            Pay
          </button>
          <button
            onClick={() => navigate('/')}
            className="w-full bg-gray-400 text-white py-2 rounded hover:bg-gray-500"
          >
            Continue shopping
          </button>
        </div>
      </div>
    </div>
  );
};

export default CartPage;
