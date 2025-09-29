import { useState } from 'react';

export default function DonationForm() {
  const [amount, setAmount] = useState<number>(5);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const handleDonate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      const res = await fetch('/api/donations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount })
      });

      const data = await res.json();
      if (!res.ok) {
        setMessage(data?.error || 'Donation failed');
      } else {
        setMessage('Thank you for your donation!');
      }
    } catch (e: any) {
      setMessage(e?.message || 'Unexpected error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleDonate} className="space-y-4 bg-white p-4 rounded shadow">
      {message && <div className="text-sm text-green-700">{message}</div>}
      <div>
        <label className="block text-sm font-medium text-gray-700">Amount (USD)</label>
        <input value={amount} onChange={e => setAmount(Number(e.target.value))} type="number" min={1} className="mt-1 block w-40 rounded border-gray-300" />
      </div>
      <div>
        <button disabled={loading} type="submit" className="px-4 py-2 bg-green-600 text-white rounded">
          {loading ? 'Processing...' : 'Donate'}
        </button>
      </div>
    </form>
  );
}
