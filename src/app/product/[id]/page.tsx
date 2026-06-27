'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import CartIcon from '@/components/CartIcon';

type Product = {
  id: string;
  sku: string;
  name: string;
  shortDescription: string;
  longDescription: string;
  price: number;
  mapPrice: number | null;
  listPrice: number | null;
  brandName: string;
  category: string;
  subcategory: string;
  imageUrl: string;
  imageUrls: string[];
  active: boolean;
  fitments: Array<{
    year: number;
    generation: string;
    body_style: string | null;
    engine: string | null;
  }>;
};

const QUOTE_TEXT = [
  "There's no substitute for displacement.",
  "Horsepower counts. Torque matters.",
  "Make it loud, make it fast.",
  "The best parts are the ones that stay on the car.",
];

export default function ProductDetailPage() {
  const params = useParams();
  const productId = params?.id as string;

  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);
  const [adding, setAdding] = useState(false);
  const [added, setAdded] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);

  useEffect(() => {
    async function loadProduct() {
      setLoading(true);
      try {
        if (!productId) return;

        // Try Supabase first
        let res = await fetch(`/api/products?product_id=${encodeURIComponent(productId)}`);

        if (res.ok) {
          const data = await res.json();
          if (data.product) {
            setProduct(data.product as Product);
            setLoading(false);
            return;
          }
        }

        // Fall back: try Turn 14 sync lookup
        res = await fetch(`/api/products?action=item&id=${encodeURIComponent(productId.replace('t14-', ''))}`);
        if (res.ok) {
          const t14 = await res.json();
          if (t14.item) {
            setProduct({
              id: `t14-${productId}`,
              sku: '',
              name: t14.item.product_name || productId,
              shortDescription: t14.item.part_description || '',
              longDescription: t14.item.part_description || '',
              price: 0,
              mapPrice: null,
              listPrice: null,
              brandName: t14.item.brand || 'Unknown',
              category: t14.item.category || '',
              subcategory: t14.item.subcategory || '',
              imageUrl: t14.item.thumbnail || '',
              imageUrls: [],
              active: true,
              fitments: [],
            });
          }
        }
      } catch (e) {
        console.error('Failed to load product:', e);
      }
      setLoading(false);
    }

    if (productId) loadProduct();
  }, [productId]);

  const handleAddToCart = async () => {
    if (!product || adding) return;
    setAdding(true);
    try {
      const res = await fetch('/api/cart', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ turn14ItemId: product.id, quantity }),
      });
      if (res.ok) {
        setAdded(true);
        setTimeout(() => setAdded(false), 2000);
      }
    } catch (e) {
      console.error('Cart error:', e);
    }
    setAdding(false);
  };

  const quote = QUOTE_TEXT[Math.floor(Math.random() * QUOTE_TEXT.length)];

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 pt-24 pb-16 flex items-center justify-center">
        <div className="text-gray-400 text-xl">Loading product details...</div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-gray-50 pt-24 pb-16 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-800 mb-4">Product Not Found</h1>
          <p className="text-gray-500 mb-8">This part may have been removed or is no longer available.</p>
          <Link href="/shop" className="bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-8 rounded-lg inline-block transition-colors">
            Browse Parts
          </Link>
        </div>
      </div>
    );
  }

  const fallbackImg = `https://placehold.co/800x600/1a1a2e/e5e7eb?text=${encodeURIComponent(product.brandName)}+${encodeURIComponent(product.sku || product.id)}`;

  return (
    <div className="min-h-screen bg-gray-50 pt-24 pb-16">
      <div className="max-w-7xl mx-auto px-4 grid grid-cols-1 lg:grid-cols-2 gap-12">
        {/* Product Image */}
        <div>
          <div className="bg-white rounded-xl overflow-hidden border border-gray-200 shadow-sm">
            <div className="relative bg-gray-100 h-[400px] md:h-[500px]">
              {!imageLoaded && <div className="absolute inset-0 bg-gray-200 animate-pulse" />}
              <img
                src={product.imageUrl || fallbackImg}
                alt={product.name}
                className={`w-full h-full object-contain p-8 ${imageLoaded ? 'opacity-100' : 'opacity-0'}`}
                onLoad={() => setImageLoaded(true)}
              />
            </div>
          </div>
        </div>

        {/* Product Info */}
        <div className="flex flex-col justify-between">
          <div>
            {/* Breadcrumb */}
            <nav className="text-sm text-gray-400 mb-4">
              <Link href="/" className="hover:text-red-600">Home</Link>
              {' / '}
              <Link href="/shop" className="hover:text-red-600">Shop Parts</Link>
              {' / '}
              <span className="text-gray-700">{product.subcategory || product.category}</span>
            </nav>

            {/* Brand + SKU */}
            <p className="text-sm text-red-600 font-semibold uppercase tracking-wider mb-2">{product.brandName}</p>
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-3 leading-tight">{product.name}</h1>

            {product.sku && (
              <p className="text-sm text-gray-400 mb-6">SKU: {product.sku}</p>
            )}

            <p className="text-lg text-gray-700 mb-8 leading-relaxed">{product.shortDescription}</p>

            {/* Price */}
            <div className="mb-8">
              <span className="text-4xl font-bold text-red-600">${product.price.toLocaleString()}</span>
              {product.mapPrice && product.mapPrice !== product.price && (
                <p className="text-gray-400 text-sm line-through mt-1">MAP: ${product.mapPrice.toLocaleString()}</p>
              )}
            </div>

            {/* Fitment info */}
            {product.fitments.length > 0 && (
              <div className="mb-8 p-4 bg-blue-50 rounded-lg border border-blue-100">
                <h3 className="font-bold text-blue-900 mb-2">Vehicle Compatibility</h3>
                <div className="flex flex-wrap gap-2">
                  {product.fitments.map((f, i) => (
                    <span key={i} className="text-sm bg-white border border-blue-200 px-3 py-1 rounded-full text-blue-800 font-medium">
                      {f.year} {f.generation}
                      {f.body_style ? ` · ${f.body_style}` : ''}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Quantity + Add to Cart */}
            <div className="flex items-center gap-4 mb-8">
              <div className="flex items-center border-2 border-gray-200 rounded-lg overflow-hidden">
                <button
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  className="w-12 h-12 flex items-center justify-center hover:bg-gray-100 font-bold text-xl"
                >−</button>
                <span className="w-16 h-12 flex items-center justify-center font-bold text-lg border-x-2 border-gray-200">{quantity}</span>
                <button
                  onClick={() => setQuantity(quantity + 1)}
                  className="w-12 h-12 flex items-center justify-center hover:bg-gray-100 font-bold text-xl"
                >+</button>
              </div>

              <button
                onClick={handleAddToCart}
                disabled={adding || !product.active}
                className={`flex-1 py-4 px-8 rounded-lg font-bold text-lg transition-colors flex items-center justify-center gap-3 ${
                  added
                    ? 'bg-green-600 text-white'
                    : adding
                    ? 'bg-gray-300 text-gray-500 cursor-wait'
                    : product.active
                    ? 'bg-red-600 hover:bg-red-700 text-white'
                    : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                }`}
              >
                {added ? (
                  <>✓ Added to Cart</>
                ) : adding ? (
                  <>Processing...</>
                ) : (
                  <>🛒 Add to Cart</>
                )}
              </button>
            </div>

            {/* Description */}
            {product.longDescription && product.longDescription !== product.shortDescription && (
              <div className="mb-8">
                <h3 className="font-bold text-lg mb-2">Details</h3>
                <p className="text-gray-600 leading-relaxed whitespace-pre-wrap">{product.longDescription}</p>
              </div>
            )}

            {/* Specs */}
            <div className="bg-zinc-50 rounded-xl p-6 border border-gray-200 mb-8">
              <h3 className="font-bold text-lg mb-4">Product Details</h3>
              <dl className="space-y-3 text-sm">
                <div className="flex justify-between"><dt className="text-gray-500">Brand</dt><dd className="font-medium">{product.brandName}</dd></div>
                {product.subcategory && <div className="flex justify-between"><dt className="text-gray-500">Subcategory</dt><dd className="font-medium">{product.subcategory}</dd></div>}
                {product.category && <div className="flex justify-between"><dt className="text-gray-500">Category</dt><dd className="font-medium">{product.category}</dd></div>}
                {product.sku && <div className="flex justify-between"><dt className="text-gray-500">Part Number</dt><dd className="font-mono font-medium">{product.sku}</dd></div>}
                <div className="flex justify-between"><dt className="text-gray-500">Availability</dt><dd className={`font-bold ${product.active ? 'text-green-600' : 'text-red-600'}`}>{product.active ? 'In Stock — Ships via Dropship' : 'Discontinued'}</dd></div>
              </dl>
            </div>
          </div>

          {/* Quote */}
          <div className="text-center text-gray-400 italic">"{quote}"</div>
        </div>
      </div>
    </div>
  );
}
