'use client';

import { products } from '@/data/mock-products';

interface ProductDetailProps {
  productId: string;
}

export default function ProductDetail({ productId }: ProductDetailProps) {
  const product = products.find(p => p.id === productId);
  if (!product) return <div className="py-20 text-center text-xl text-gray-400">Product not found</div>;

  const fallbackImg = `https://placehold.co/800x500/1a1a2e/e5e7eb?text=${encodeURIComponent(product.brandName)}`;

  return (
    <div className="min-h-screen bg-white pt-24 pb-16">
      <div className="max-w-6xl mx-auto px-4 grid grid-cols-1 lg:grid-cols-2 gap-12">
        {/* Image */}
        <div>
          <img src={product.imageUrl || fallbackImg} alt={product.name} className="w-full rounded-xl bg-gray-100" />
        </div>

        {/* Details */}
        <div className="flex flex-col justify-center">
          <p className="text-sm text-gray-400 uppercase tracking-wider mb-2">{product.brandName}</p>
          <h1 className="text-3xl font-bold mb-4">{product.name}</h1>

          <div className="flex items-center gap-4 mb-6">
            <span className="text-4xl font-bold text-red-600">${product.price.toLocaleString()}</span>
            {product.mapPrice > 0 && product.mapPrice !== product.price && (
              <span className="text-lg text-gray-400 line-through">MAP: ${product.mapPrice.toLocaleString()}</span>
            )}
          </div>

          {!product.inStock && (
            <p className="bg-yellow-50 border border-yellow-300 text-yellow-800 px-4 py-3 rounded-lg mb-6">
              ⚠️ This item is currently on special order. Call us at <strong>(631) 254-3430</strong> for availability.
            </p>
          )}

          <p className="text-gray-600 mb-6">{product.longDescription}</p>

          {/* Fitment */}
          <div className="mb-8">
            <h3 className="font-bold text-sm uppercase tracking-wider text-gray-400 mb-2">Fits These Mustangs:</h3>
            <div className="flex flex-wrap gap-2">
              {product.yearMakeModel.map((m, i) => (
                <span key={i} className="bg-gray-100 px-3 py-1 rounded text-sm">{m.year}</span>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-4">
            {product.inStock ? (
              <button className="bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-8 rounded-lg transition-colors flex-1 max-w-xs">
                Add to Cart — ${product.price.toLocaleString()}
              </button>
            ) : (
              <a href="tel:6312543430" className="bg-gray-900 hover:bg-gray-800 text-white font-bold py-3 px-8 rounded-lg transition-colors flex items-center justify-center gap-2">
                📞 Call to Order — (631) 254-3430
              </a>
            )}
          </div>

          <p className="text-gray-400 text-sm mt-4 text-center">Free shipping on orders $99+ • Installation available at Deer Park shop</p>
        </div>
      </div>
    </div>
  );
}
