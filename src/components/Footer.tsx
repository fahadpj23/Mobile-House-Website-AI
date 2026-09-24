export default function Footer() {
  return (
    <footer className="bg-gray-900 text-white mt-16">
      <div className="max-w-7xl mx-auto px-4 py-10 grid grid-cols-1 md:grid-cols-4 gap-6">
        <div>
          <h3 className="text-xl font-bold text-blue-400 mb-2">Mobile_house</h3>
          <p className="text-sm text-gray-400">
            Your trusted mobile store. Buy latest smartphones at best prices.
          </p>
        </div>
        <div>
          <h4 className="font-semibold mb-2">Quick Links</h4>
          <ul className="text-sm space-y-1 text-gray-400">
            <li>
              <a href="/products">All Products</a>
            </li>
            <li>
              <a href="/cart">Cart</a>
            </li>
            <li>
              <a href="/orders">My Orders</a>
            </li>
          </ul>
        </div>
        <div>
          <h4 className="font-semibold mb-2">Payment</h4>
          <ul className="text-sm space-y-1 text-gray-400">
            <li>Cash on Delivery</li>
            <li>Card Payment</li>
            <li>bKash / Nagad</li>
          </ul>
        </div>
        <div>
          <h4 className="font-semibold mb-2">Contact</h4>
          <p className="text-sm text-gray-400">
            support@mobilehouse.com
            <br />
            +880 1234-567890
          </p>
        </div>
      </div>
      <div className="border-t border-gray-800 py-4 text-center text-xs text-gray-500">
        © {new Date().getFullYear()} Mobile_house. All rights reserved.
      </div>
    </footer>
  );
}
