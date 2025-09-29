// app/about/page.tsx
export default function AboutPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-12">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">About ParkBoard</h1>
        
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 space-y-4">
          <section>
            <h2 className="text-xl font-semibold text-gray-800 mb-3">Our Mission</h2>
            <p className="text-gray-600">
              ParkBoard simplifies parking management for residential communities, making it easy for residents to book parking slots and for administrators to manage facility usage efficiently.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-800 mb-3">Features</h2>
            <ul className="list-disc list-inside text-gray-600 space-y-2">
              <li>Real-time parking slot availability</li>
              <li>Easy booking and cancellation</li>
              <li>Mobile-friendly interface</li>
              <li>Admin tools for slot management</li>
              <li>Booking history and tracking</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-800 mb-3">Contact</h2>
            <p className="text-gray-600">
              For support or inquiries, please contact your building administrator.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}