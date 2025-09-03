import { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';

export default function Dashboard() {
  const [user, setUser] = useState(null);
  const [apiKey, setApiKey] = useState('');
  const [usage, setUsage] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = () => {
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');

    if (!token) {
      window.location.href = '/login';
      return;
    }

    if (userData) {
      setUser(JSON.parse(userData));
    }

    fetchUserData(token);
  };

  const fetchUserData = async (token) => {
    try {
      // Fetch user profile
      const profileResponse = await fetch('/api/user/profile', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (profileResponse.ok) {
        const profileData = await profileResponse.json();
        setUser(profileData.user);
      }

      // Fetch usage data
      const usageResponse = await fetch('/api/user/usage', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (usageResponse.ok) {
        const usageData = await usageResponse.json();
        setUsage(usageData.usage);
      }

      // Generate API key if not exists
      if (!apiKey) {
        const keyResponse = await fetch('/api/auth/regenerate-api-key', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (keyResponse.ok) {
          const keyData = await keyResponse.json();
          setApiKey(keyData.api_key);
        }
      }
    } catch (error) {
      setError('Failed to load user data');
    } finally {
      setLoading(false);
    }
  };

  const regenerateApiKey = async () => {
    const token = localStorage.getItem('token');
    if (!token) return;

    try {
      const response = await fetch('/api/auth/regenerate-api-key', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setApiKey(data.api_key);
        alert('API key regenerated successfully!');
      } else {
        alert('Failed to regenerate API key');
      }
    } catch (error) {
      alert('Network error');
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/login';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <Head>
        <title>Dashboard - Crawlio</title>
        <meta name="description" content="Your Crawlio dashboard" />
      </Head>

      {/* Navigation */}
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <Link href="/" className="text-xl font-bold text-gray-900">
                Crawlio
              </Link>
            </div>
            <div className="flex items-center space-x-4">
              <Link href="/" className="text-gray-700 hover:text-gray-900">
                Crawler
              </Link>
              <button
                onClick={logout}
                className="text-gray-700 hover:text-gray-900"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="mt-2 text-gray-600">Manage your account and API keys</p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-red-700">{error}</p>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* User Profile */}
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4">Profile</h2>
            {user && (
              <div className="space-y-2">
                <p><strong>Name:</strong> {user.first_name} {user.last_name}</p>
                <p><strong>Email:</strong> {user.email}</p>
                <p><strong>Subscription:</strong> {user.subscription_tier}</p>
                <p><strong>Status:</strong> {user.subscription_status}</p>
              </div>
            )}
          </div>

          {/* Usage Statistics */}
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4">Usage</h2>
            {usage && (
              <div className="space-y-2">
                <p><strong>Used:</strong> {usage.used} requests</p>
                <p><strong>Limit:</strong> {usage.limit} requests</p>
                <p><strong>Remaining:</strong> {usage.remaining} requests</p>
                <div className="w-full bg-gray-200 rounded-full h-2.5">
                  <div
                    className="bg-blue-600 h-2.5 rounded-full"
                    style={{ width: `${usage.percentage}%` }}
                  ></div>
                </div>
                <p className="text-sm text-gray-600">{usage.percentage}% used</p>
              </div>
            )}
          </div>

          {/* API Key Management */}
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4">API Key</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Your API Key
                </label>
                <div className="flex">
                  <input
                    type="text"
                    value={apiKey}
                    readOnly
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-l-md bg-gray-50 text-sm font-mono"
                  />
                  <button
                    onClick={() => navigator.clipboard.writeText(apiKey)}
                    className="px-3 py-2 bg-gray-100 border border-l-0 border-gray-300 rounded-r-md hover:bg-gray-200"
                  >
                    📋
                  </button>
                </div>
              </div>
              <button
                onClick={regenerateApiKey}
                className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 text-sm"
              >
                Regenerate API Key
              </button>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="mt-8 bg-white shadow rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Quick Actions</h2>
          <div className="flex flex-wrap gap-4">
            <Link
              href="/"
              className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
            >
              Start Crawling
            </Link>
            <button
              onClick={() => window.open('https://docs.crawlio.com', '_blank')}
              className="bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700"
            >
              View Documentation
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
