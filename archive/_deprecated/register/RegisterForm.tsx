import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

export default function RegisterForm() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { name } },
      });

      if (error) {
        setErrorMsg(error.message);
        return;
      }

      // If user created immediately (no email confirm flows in some projects), create profile
      const user = data.user;
      if (user) {
        const { error: profileError } = await supabase.from('user_profiles').insert([
          {
            id: user.id,
            name: name || 'New User',
            email: user.email,
            unit_number: 'TBD',
            role: 'resident'
          }
        ]);

        if (profileError) {
          console.warn('Profile creation warning', profileError);
        }
      }

      // Redirect to dashboard (or a welcome page)
      router.push('/dashboard');
    } catch (e: any) {
      setErrorMsg(e?.message || 'Unexpected error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 bg-white p-4 rounded shadow">
      {errorMsg && <div className="text-red-600">{errorMsg}</div>}
      <div>
        <label className="block text-sm font-medium text-gray-700">Name</label>
        <input value={name} onChange={e => setName(e.target.value)} className="mt-1 block w-full rounded border-gray-300" placeholder="Your name" />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700">Email</label>
        <input value={email} onChange={e => setEmail(e.target.value)} className="mt-1 block w-full rounded border-gray-300" placeholder="you@example.com" />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700">Password</label>
        <input value={password} onChange={e => setPassword(e.target.value)} type="password" className="mt-1 block w-full rounded border-gray-300" placeholder="Password" />
      </div>
      <div>
        <button disabled={loading} type="submit" className="px-4 py-2 bg-blue-600 text-white rounded">
          {loading ? 'Creating...' : 'Create account'}
        </button>
      </div>
    </form>
  );
}
