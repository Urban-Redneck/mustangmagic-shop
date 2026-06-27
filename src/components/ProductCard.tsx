'use client';

import Link from 'next/link';
import { useState } from 'react';

interface ProductCardProps {
  product: {
    id: string;
    sku: string;
    name: string;
    shortDescription: string;
    price: number;
    mapPrice: number;
    brandName: string;
    imageUrl: string;
    imageUrls: string[];
    inStock: boolean;
  };
}

const PLACEHOLDER_IMAGES = [
  'https://placehold.co/400x300/1a1a2e/e5e7eb?text=Headers+%26+Exhaust',
  'https://placehold.co/400x300/2d1b1b/e5e7eb?text=Supercharger',
  'https://placehold.co/400x300/1b2d1b/e5e7eb?text=Turbo+Kit',
  'https://placehold.co/400x300/1b1b2d/e5e7eb?text=Fuel+System',
  'https://placehold.co/400x300/2d2d1b/e5e7eb?text=Suspension',
  'https://placehold.co/400x300/1b2d2d/e5e7eb?text=Engine+Parts',
];

export default function ProductCard({ product }: ProductCardProps) {
  const [imgLoaded, setImgLoaded] = useState(false);
  const [imgError, setImgError] = useState(false);

  const linkId = encodeURIComponent(product.id);
  const imgSrc = product.imageUrl && !imgError ? product.imageUrl : (PLACEHOLDER_IMAGES[Math.abs(product.id.length + product.name.split('').reduce((a,c) => a + c.charCodeAt(0), 0)) % PLACEHOLDER_IMAGES.length]);

  return (
    <Link href={`/product/${linkId}`}>
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-xl transition-shadow duration-300 h-full flex flex-col cursor-pointer group">
        {/* Image */}
        <div className="relative bg-gray-100 h-56 overflow-hidden">
          {!imgLoaded && !imgError && (
            <div className="absolute inset-0 bg-gray-200 animate-pulse" />
          )}
          <img
            src={imgSrc}
            alt={product.name}
            className={`w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ${imgLoaded ? 'opacity-100' : 'opacity-0'}`}
            onLoad={() => setImgLoaded(true)}
            onError={() => { setImgError(true); }}
          />
          {!product.inStock && (
            <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
              <span className="bg-gray-900 text-white px-4 py-2 font-bold rounded">Out of Stock</span>
            </div>
          )}
          <div className="absolute top-3 right-3 bg-red-600 text-white text-xs font-bold px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity">
            View Details →
          </div>
        </div>

        {/* Info */}
        <div className="p-5 flex flex-col flex-1">
          <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">{product.brandName}</p>
          <h3 className="font-bold text-lg leading-tight mb-2 group-hover:text-red-600 transition-colors">{product.name}</h3>
          <p className="text-gray-500 text-sm mb-4 flex-1 line-clamp-2">{product.shortDescription}</p>
          <div className="flex items-end justify-between">
            <div>
              <span className="text-2xl font-bold text-red-600">${product.price.toLocaleString()}</span>
              {product.mapPrice > 0 && product.mapPrice !== product.price && (
                <p className="text-gray-400 text-xs line-through">MAP: ${product.mapPrice.toLocaleString()}</p>
              )}
            </div>
            <span className={`px-3 py-1 rounded-full text-xs font-bold ${product.inStock ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
              {product.inStock ? 'In Stock' : 'Special Order'}
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}
