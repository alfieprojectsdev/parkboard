import Navigation from '../../components/Navigation';
import RegisterForm from '../../components/forms/RegisterForm';

export default function RegisterPage() {
  return (
    <div className="min-h-screen bg-white">
      <Navigation />
      <main className="max-w-2xl mx-auto p-6">
        <h1 className="text-2xl font-semibold mb-4">Create an account</h1>
        <RegisterForm />
      </main>
    </div>
  );
}
