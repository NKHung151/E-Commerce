import React, { useState, useEffect } from 'react';
import CustomerApp from './customer-app/App';
import StaffApp from './staff-app/App';
import AdminApp from './admin-app/App';

function App() {
  const [role, setRole] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const path = window.location.pathname;
    let token = null;
    
    // Choose token based on path to prevent role leakage
    if (path.startsWith('/staff')) {
      token = localStorage.getItem('staff_access_token');
    } else if (path.startsWith('/admin')) {
      token = localStorage.getItem('admin_access_token');
    } else {
      token = localStorage.getItem('access_token');
    }
    
    if (token) {
      try {
        const base64Url = token.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(
          atob(base64)
            .split('')
            .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
            .join('')
        );
        const decoded = JSON.parse(jsonPayload);
        
        const deriveRole = (d) => {
          if (!d) return null;
          if (d.role) return d.role;
          if (d.is_superuser || d.is_admin) return 'admin';
          if (d.is_staff) return 'staff';
          return 'customer';
        };
        
        const userRole = deriveRole(decoded);
        setRole(userRole);
      } catch (e) {
        console.error('Token parse error:', e);
      }
    }
    
    setLoading(false);
  }, []);

  if (loading) {
    return <div className="flex justify-center items-center min-h-screen">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600"></div>
    </div>;
  }

  const path = window.location.pathname;

  // 1. Check path first (allows staff/admin to see storefront at root)
  if (path.startsWith('/admin')) {
    return <AdminApp />;
  }
  
  if (path.startsWith('/staff')) {
    return <StaffApp />;
  }

  // 2. Default to CustomerApp (Storefront)
  return <CustomerApp />;
}

export default App;
