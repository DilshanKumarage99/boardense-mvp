import React, { useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { login } = useContext(AuthContext);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await axios.post('/api/auth/login', { email, password });
      login(response.data.access_token, response.data.user);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
  <div className="h-screen w-screen flex flex-col lg:flex-row">

    {/* LEFT SIDE — HERO SECTION */}
    <div className="hidden lg:flex w-1/2 bg-gradient-to-br from-gray-900 via-black to-gray-800 text-white p-12 flex-col justify-between">
      <div>
        <h1 className="text-5xl font-bold mb-6">
          Hello Boardense 👋
        </h1>

        <p className="text-lg opacity-90 max-w-md">
          Strategic intelligence for startup founders. Automate insights,
          improve decisions, and scale smarter.
        </p>
      </div>

      <p className="text-sm opacity-70">
        © {new Date().getFullYear()} Boardense. All rights reserved.
      </p>
    </div>

    {/* RIGHT SIDE — LOGIN FORM */}
    <div className="w-full lg:w-1/2 h-full flex items-center justify-center bg-gray-50 p-6">
      <div className="w-full max-w-md text-center">

        <h2 className="text-3xl font-bold mb-2">Welcome Back!</h2>

        <p className="text-gray-600 mb-8">
          Don’t have an account?{" "}
          <button
            onClick={() => navigate("/register")}
            className="text-brand-orange font-semibold hover:underline"
          >
            Create one now
          </button>
        </p>

        <form onSubmit={handleSubmit} className="text-left">
          {error && (
            <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
              {error}
            </div>
          )}

          <div className="mb-4">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-orange"
              placeholder="Email address"
              required
            />
          </div>

          <div className="mb-4">
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-orange"
              placeholder="Password"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-brand-orange text-white font-semibold py-3 rounded-lg hover:bg-brand-orange-dark transition disabled:opacity-50"
          >
            {loading ? "Logging in..." : "Login Now"}
          </button>
        </form>

        <div className="mt-6 text-center">
          <button className="text-sm text-gray-500 hover:underline">
            Forgot password?
          </button>
        </div>

      </div>
    </div>

  </div>
);
}
