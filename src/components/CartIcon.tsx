'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';

export default function CartIcon() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const saved = localStorage.getItem('mm_cart');
    if (saved) {
      try {
        const cart = JSON.parse(saved);
        setCount(cart.reduce((sum: number, item: any) => sum + item.quantity, 0));
      } catch {
        setCount(0);
      }
    }
  }, []);

  return (
    <Link href="/cart" className="relative">
      <svg className="w-6 h-6 text-gray-600 hover:text-red-600 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 100 4 2 2 0 000-4z" />
      </svg>
      {count > 0 && (
        <span className="absolute -top-2 -right-2 bg-red-600 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
          {count}
        </span>
      )}
    </Link>
  );
}
