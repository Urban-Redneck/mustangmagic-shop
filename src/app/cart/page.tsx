'use client';

import { useState, useEffect } from 'react';
import { products } from '@/data/mock-products';
import Link from 'next/link';

type CartItem = { product: typeof products[0]; quantity: number };

export default function CartPage() {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);

  // For demo, use localStorage as cart store
  useEffect(() => {
    const saved = localStorage.getItem('mm_cart');
    if (saved) {
      setCart(JSON.parse(saved));
    }
    setLoading(false);
  }, []);

  const updateQty = (productId: string, delta: number) => {
    const updated = cart.map(item => {
      if (item.product.id === productId) {
        const newQty = Math.max(0, item.quantity + delta);
        return { ...item, quantity: newQty };
      }
      return item;
    }).filter(item => item.quantity > 0);
    setCart(updated);
    localStorage.setItem('mm_cart', JSON.stringify(updated));
  };

  const removeItem = (productId: string) => {
    const updated = cart.filter(item => item.product.id !== productId);
    setCart(updated);
    localStorage.setItem('mm_cart', JSON.stringify(updated));
  };

  const subtotal = cart.reduce((sum, i) => sum + i.product.price * i.quantity, 0);
  const shipping = subtotal >= 99 ? 0 : 12.99;
  const tax = subtotal * 0.08; // ~8% NY sales tax estimate
  const total = subtotal + shipping + tax;

  const handleCheckout = async () => {
    if (cart.length === 0) return;

    const items = cart.map(item => ({
      sku: item.product.sku,
      name: item.product.name,
      quantity: item.quantity,
      price: item.product.price,
      imageUrl: item.product.imageUrl,
    }));

    try {
      const res = await fetch('/api/checkout/stripe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items }),
      });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
    } catch (e) {
      alert('Checkout not available in local dev. Use Stripe CLI forward or deploy to test.');
    }
  };

  if (loading) return <div className="py-20 text-center text-gray-400">Loading cart...</div>;

  return (
    <div className="min-h-screen bg-gray-50 pt-24 pb-16">
      <div className="max-w-4xl mx-auto px-4">
        <h1 className="text-3xl font-bold mb-8">Your Cart</h1>

        {cart.length === 0 ? (
          <div className="bg-white rounded-xl p-16 text-center">
            <p className="text-gray-400 text-xl mb-6">Your cart is empty</p>
            <Link href="/" className="bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-8 rounded-lg inline-block transition-colors">
              Browse Parts
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Cart items */}
            <div className="lg:col-span-2 space-y-4">
              {cart.map(item => (
                <div key={item.product.id} className="bg-white rounded-xl p-5 flex gap-5 items-center shadow-sm">
                  <img src={item.product.imageUrl || `https://placehold.co/120x80/1a1a2e/e5e7eb?text=${item.product.brandName}`} alt={item.product.name} className="w-24 h-16 object-cover rounded-lg bg-gray-100" />
                  <div className="flex-1">
                    <h3 className="font-bold">{item.product.name}</h3>
                    <p className="text-sm text-gray-400">{item.product.brandName} · {item.product.sku}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => updateQty(item.product.id, -1)} className="w-8 h-8 rounded bg-gray-100 hover:bg-gray-200 font-bold text-lg">−</button>
                    <span className="w-8 text-center font-bold">{item.quantity}</span>
                    <button onClick={() => updateQty(item.product.id, 1)} className="w-8 h-8 rounded bg-gray-100 hover:bg-gray-200 font-bold text-lg">+</button>
                  </div>
                  <span className="font-bold w-24 text-right">${(item.product.price * item.quantity).toLocaleString()}</span>
                  <button onClick={() => removeItem(item.product.id)} className="text-gray-300 hover:text-red-500 ml-2">✕</button>
                </div>
              ))}
            </div>

            {/* Order summary */}
            <div className="bg-white rounded-xl p-6 shadow-sm h-fit sticky top-24">
              <h2 className="font-bold text-lg mb-4">Order Summary</h2>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between"><span>Subtotal ({cart.reduce((s, i) => s + i.quantity, 0)} items)</span><span>${subtotal.toLocaleString()}</span></div>
                <div className="flex justify-between"><span>Shipping</span><span>{shipping === 0 ? <span className="text-green-600 font-bold">FREE</span> : `$${shipping}`}</span></div>
                {shipping > 0 && <p className="text-xs text-gray-400">Free shipping on orders $99+</p>}
                <div className="flex justify-between"><span>Tax (est.)</span><span>${tax.toFixed(2)}</span></div>
                <div className="border-t pt-3 flex justify-between font-bold text-lg"><span>Total</span><span>${total.toFixed(2)}</span></div>
              </div>
              <button onClick={handleCheckout} disabled={cart.length === 0} className="w-full bg-red-600 hover:bg-red-700 disabled:bg-gray-300 text-white font-bold py-4 rounded-lg mt-6 transition-colors text-lg">
                Proceed to Checkout
              </button>
              <Link href="/" className="block text-center text-sm text-gray-500 mt-3 hover:text-red-600">Continue Shopping</Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
