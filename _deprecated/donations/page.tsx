import Navigation from '../../components/Navigation';
import DonationForm from '../../components/forms/DonationForm';

export default function DonationsPage() {
  return (
    <div className="min-h-screen bg-white">
      <Navigation />
      <main className="max-w-3xl mx-auto p-6">
        <h1 className="text-2xl font-semibold mb-4">Donations</h1>
        <p className="mb-4 text-gray-700">Support the project with a small donation.</p>
        <DonationForm />
      </main>
    </div>
  );
}
