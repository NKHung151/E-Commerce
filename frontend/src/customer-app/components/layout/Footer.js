import React from 'react';
import { Link } from 'react-router-dom';

export const Footer = () => {
  return (
    <footer className="bg-gray-800 text-white mt-12">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-3 gap-8 mb-8">
          <div>
            <h4 className="font-bold mb-4">About us</h4>
            <p className="text-gray-400 text-sm">
              Your premier online shopping destination for quality products.
            </p>
          </div>
          <div>
            <h4 className="font-bold mb-4">Quick link</h4>
            <ul className="text-gray-400 text-sm space-y-2">
              <li><Link to="/" className="hover:text-white">Home page</Link></li>
              <li><Link to="/categories" className="hover:text-white">Category</Link></li>
              <li><Link to="/search" className="hover:text-white">Search</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="font-bold mb-4">Contact</h4>
            <p className="text-gray-400 text-sm">Email: support@eshop.com</p>
            <p className="text-gray-400 text-sm">Phone: 1-800-ESHOP</p>
          </div>
        </div>
        <div className="border-t border-gray-700 pt-4 text-center text-gray-400 text-sm">
          <p>&copy; 2024 E-Shop. Copyright protected.</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
