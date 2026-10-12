import React from 'react';
import { Link } from 'react-router-dom';
import { ProductImage } from '../../shared/ui';

/** Thumbnail + linked name used in back-office tables. */
export default function ProductCell({ product, productId, meta }) {
  const id = product?.id ?? productId;
  return (
    <div className="flex items-center gap-3">
      <span className="h-11 w-11 shrink-0 overflow-hidden rounded-lg bg-slate-100">
        <ProductImage src={product?.image_url} name={product?.name || ''} id={id} className="text-base" />
      </span>
      <div className="max-w-xs">
        <Link to={`/products/${id}/edit`} className="block truncate font-medium text-slate-900 hover:text-brand-700">
          {product?.name || `Sản phẩm #${id}`}
        </Link>
        {meta && <span className="text-xs text-slate-400">{meta}</span>}
      </div>
    </div>
  );
}
