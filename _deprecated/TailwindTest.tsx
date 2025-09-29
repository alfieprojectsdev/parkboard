// components/TailwindTest.tsx - Add this temporarily to test Tailwind
export default function TailwindTest() {
  return (
    <div className="p-8 bg-blue-50 border-2 border-blue-200 rounded-lg">
      <h1 className="text-2xl font-bold text-blue-900 mb-4">Tailwind Test</h1>
      <p className="text-gray-700 mb-4">If you can see blue background and styled text, Tailwind is working!</p>
      <button className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition-colors">
        Test Button
      </button>
    </div>
  );
}