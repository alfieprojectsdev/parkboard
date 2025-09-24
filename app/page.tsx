// export default function Home() {
//   return (
//     <main className="p-8">
//       <h1 className="text-2xl font-bold">🚗 ParkBoard MVP</h1>
//       <p className="mt-4">If you see this, Next.js is running locally!</p>
//     </main>
//   );
// }

// In app/page.tsx - add this temporarily
import TailwindTest from '@/components/TailwindTest'

export default function Home() {
  return (
    <main className="p-8">
      <TailwindTest />
      <h1 className="text-2xl font-bold">🚗 ParkBoard MVP</h1>
      <p className="mt-4">If you see this, Next.js is running locally!</p>
    </main>
  );
}