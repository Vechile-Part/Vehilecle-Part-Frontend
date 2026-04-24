'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function Register() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    governmentId: ''
  });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const response = await fetch('http://localhost:5019/api/customers/self-register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      if (response.ok) {
        const id = await response.json();
        setSuccess(true);
        setTimeout(() => {
          router.push(`/dashboard?id=${id}`);
        }, 2000);
      }
    } catch (error) {
      console.error('Registration failed:', error);
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
        <div className="card max-w-md w-full text-center">
          <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold mb-2">Registration Successful!</h2>
          <p className="text-slate-500 mb-8">Your account has been created. You can now manage your profile and vehicles.</p>
          <Link href="/dashboard" className="btn btn-primary w-full">
            Go to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      <div className="hidden lg:flex bg-primary relative items-center justify-center overflow-hidden">
        <div className="relative z-10 text-white p-16">
          <h2 className="text-4xl font-bold mb-6 italic">Join the future of automotive care.</h2>
          <p className="text-primary-foreground/80 text-lg max-w-md">
            Register today to book appointments, track your vehicle's health, and get AI-powered insights on your driving patterns.
          </p>
        </div>
        <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-white/10 rounded-full blur-3xl -mr-96 -mt-96"></div>
      </div>
      
      <div className="flex items-center justify-center p-8 bg-white">
        <div className="max-w-md w-full">
          <div className="mb-10 text-center lg:text-left">
            <Link href="/" className="inline-flex items-center gap-2 mb-8 group">
              <svg className="w-5 h-5 text-slate-400 group-hover:text-primary transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              <span className="text-sm font-medium text-slate-500 group-hover:text-slate-700">Back to Home</span>
            </Link>
            <h1 className="text-3xl font-bold mb-2">Create an account</h1>
            <p className="text-slate-500">Sign up to get started as a Customer.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 gap-6">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Full Name</label>
                <input
                  required
                  className="input py-3.5"
                  placeholder="John Doe"
                  value={formData.fullName}
                  onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                />
              </div>
              
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Email Address</label>
                <input
                  type="email"
                  required
                  className="input py-3.5"
                  placeholder="john@example.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Phone Number</label>
                <input
                  type="tel"
                  required
                  className="input py-3.5"
                  placeholder="+1 (555) 000-0000"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                />
              </div>
            </div>

            <button disabled={loading} type="submit" className="btn btn-primary w-full py-4 text-lg mt-4 shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all">
              {loading ? 'Processing...' : 'Create Account'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
