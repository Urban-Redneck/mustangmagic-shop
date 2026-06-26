import Link from 'next/link';

export default function OrderConfirmed() {
  return (
    <div className="min-h-screen bg-green-50 flex items-center justify-center pt-24 pb-16">
      <div className="max-w-lg mx-auto px-4 text-center">
        <div className="bg-white rounded-xl p-12 shadow-sm">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-10 h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold mb-3">Thank You for Your Order!</h1>
          <p className="text-gray-500 mb-8">Your Mustang Magic order has been received. We'll send a confirmation email shortly.</p>
          
          <div className="bg-gray-50 rounded-lg p-6 text-left space-y-2 mb-8">
            <p className="font-bold">Mustang Magic & American Speed</p>
            <p className="text-sm text-gray-500">160 Brook Ave, Deer Park NY 11729</p>
            <p className="text-sm text-gray-500">(631) 254-3430</p>
          </div>

          <p className="text-gray-600 mb-8">Questions about your order? Call us at <a href="tel:6312543430" className="text-red-600 font-bold hover:underline">(631) 254-3430</a></p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/shop" className="bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-8 rounded-lg transition-colors">Continue Shopping</Link>
            <a href="tel:6312543430" className="border-2 border-gray-300 hover:border-red-600 text-gray-700 hover:text-red-600 font-bold py-3 px-8 rounded-lg transition-colors">📞 Call Us</a>
          </div>
        </div>
      </div>
    </div>
  );
}
