import Link from 'next/link';

export default function ContactPage() {
  return (
    <div className="min-h-screen bg-gray-50 pt-24 pb-16">
      <div className="max-w-4xl mx-auto px-4">
        <h1 className="text-4xl font-bold mb-8 text-center">Contact Us</h1>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
          {/* Info */}
          <div className="bg-white rounded-xl p-8 shadow-sm">
            <h2 className="text-xl font-bold mb-6">Mustang Magic & American Speed</h2>
            <div className="space-y-4 text-gray-600">
              <p className="flex items-start gap-3"><span className="text-red-600 mt-1">📍</span> 160 Brook Ave, Deer Park NY 11729</p>
              <p className="flex items-start gap-3"><span className="text-red-600 mt-1">📞</span> <a href="tel:6312543430" className="text-blue-600 hover:underline">(631) 254-3430</a></p>
              <p className="flex items-start gap-3"><span className="text-red-600 mt-1">🕐</span> Tue: 10AM–6PM<br/>Wed: 10AM–8PM<br/>Thu-Sat: 10AM–6PM<br/><span className="text-red-500">Sun-Mon: Closed</span></p>
            </div>

            <h3 className="font-bold mt-8 mb-4">Our Expertise</h3>
            <ul className="space-y-2 text-sm">
              <li>🏎️ Dyno Tuning (in-house)</li>
              <li>🔥 Headers & Exhaust Systems</li>
              <li>💨 Forced Induction — Superchargers & Turbos</li>
              <li>⛽ E85 Flex Fuel Conversions</li>
              <li>🔧 Suspension & Gearing</li>
              <li>🏁 Remote Tune Support</li>
            </ul>
          </div>

          {/* Form */}
          <div className="bg-white rounded-xl p-8 shadow-sm">
            <h2 className="text-xl font-bold mb-6">Send Us a Message</h2>
            <form action="#" method="POST" className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Name</label>
                <input type="text" className="w-full px-4 py-3 border rounded-lg focus:border-red-600 focus:outline-none" placeholder="Your name" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Phone</label>
                <input type="tel" className="w-full px-4 py-3 border rounded-lg focus:border-red-600 focus:outline-none" placeholder="(555) 123-4567" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Email</label>
                <input type="email" className="w-full px-4 py-3 border rounded-lg focus:border-red-600 focus:outline-none" placeholder="you@email.com" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Mustang Year & Model</label>
                <input type="text" className="w-full px-4 py-3 border rounded-lg focus:border-red-600 focus:outline-none" placeholder="e.g. 2021 Mustang Mach 1" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Message</label>
                <textarea rows={4} className="w-full px-4 py-3 border rounded-lg focus:border-red-600 focus:outline-none" placeholder="What are you looking for?" />
              </div>
              <button type="submit" className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3 rounded-lg transition-colors">Send Message</button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
