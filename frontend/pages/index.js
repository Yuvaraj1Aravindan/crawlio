import { useState } from 'react';
import Head from 'next/head';
import '../styles/globals.css';

export default function Home() {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [options, setOptions] = useState({
    extractText: true,
    extractLinks: true,
    extractImages: false,
    extractMeta: false,
    screenshot: false,
  });

  const handleCrawl = async (e) => {
    e.preventDefault();
    if (!url) return;

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch('/api/crawl/url', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          url,
          options
        })
      });

      const data = await response.json();
      
      if (data.success) {
        setResult(data);
      } else {
        setError(data.error || 'Crawling failed');
      }
    } catch (error) {
      console.error('Crawl error:', error);
      setError('Failed to connect to the API. Make sure the backend is running.');
    } finally {
      setLoading(false);
    }
  };

  const handleOptionChange = (option) => {
    setOptions(prev => ({
      ...prev,
      [option]: !prev[option]
    }));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <Head>
        <title>Crawlio - Web Crawling & Scraping Service</title>
        <meta name="description" content="Powerful web crawling and scraping service" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <main className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold text-gray-900 mb-4">
            🕷️ Crawlio
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
            Powerful web crawling and scraping service with JavaScript rendering support
          </p>
        </div>

        {/* Main Crawling Interface */}
        <div className="max-w-4xl mx-auto">
          <div className="bg-white shadow-xl rounded-lg p-8 mb-8">
            <h2 className="text-2xl font-semibold mb-6 text-gray-800">Web Crawler</h2>
            
            <form onSubmit={handleCrawl} className="space-y-6">
              {/* URL Input */}
              <div>
                <label htmlFor="url" className="block text-sm font-medium text-gray-700 mb-2">
                  URL to Crawl
                </label>
                <input
                  type="url"
                  id="url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://example.com"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>

              {/* Options */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Extraction Options
                </label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {Object.entries(options).map(([key, value]) => (
                    <label key={key} className="flex items-center space-x-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={value}
                        onChange={() => handleOptionChange(key)}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-700 capitalize">
                        {key.replace(/([A-Z])/g, ' $1').trim()}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading || !url}
                className="w-full bg-blue-600 text-white py-3 px-6 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-colors"
              >
                {loading ? (
                  <span className="flex items-center justify-center">
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Crawling...
                  </span>
                ) : (
                  'Start Crawling'
                )}
              </button>
            </form>
          </div>

          {/* Error Display */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-800">Error</h3>
                  <div className="mt-2 text-sm text-red-700">{error}</div>
                </div>
              </div>
            </div>
          )}

          {/* Results Display */}
          {result && (
            <div className="bg-white shadow-xl rounded-lg p-8">
              <h3 className="text-xl font-semibold mb-4 text-gray-800">Crawl Results</h3>
              
              {/* Metadata */}
              <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                <h4 className="font-medium text-gray-700 mb-2">Page Information</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium">Title:</span> {result.metadata?.title || 'N/A'}
                  </div>
                  <div>
                    <span className="font-medium">Status:</span> {result.metadata?.statusCode || 'N/A'}
                  </div>
                  <div>
                    <span className="font-medium">Final URL:</span> {result.metadata?.finalUrl || 'N/A'}
                  </div>
                  <div>
                    <span className="font-medium">Load Time:</span> {result.metadata?.loadTime || 'N/A'}ms
                  </div>
                </div>
              </div>

              {/* Extracted Data */}
              {result.data && (
                <div className="space-y-6">
                  {/* Text Content */}
                  {result.data.text && (
                    <div>
                      <h4 className="font-medium text-gray-700 mb-2">Text Content</h4>
                      <div className="bg-gray-50 p-4 rounded-lg max-h-40 overflow-y-auto text-sm">
                        {result.data.text.substring(0, 500)}
                        {result.data.text.length > 500 && '...'}
                      </div>
                    </div>
                  )}

                  {/* Links */}
                  {result.data.links && result.data.links.length > 0 && (
                    <div>
                      <h4 className="font-medium text-gray-700 mb-2">Links ({result.data.links.length})</h4>
                      <div className="bg-gray-50 p-4 rounded-lg max-h-40 overflow-y-auto">
                        {result.data.links.slice(0, 10).map((link, index) => (
                          <div key={index} className="mb-2 text-sm">
                            <a href={link.href} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                              {link.text || link.href}
                            </a>
                          </div>
                        ))}
                        {result.data.links.length > 10 && (
                          <div className="text-gray-500 text-sm">... and {result.data.links.length - 10} more links</div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Images */}
                  {result.data.images && result.data.images.length > 0 && (
                    <div>
                      <h4 className="font-medium text-gray-700 mb-2">Images ({result.data.images.length})</h4>
                      <div className="bg-gray-50 p-4 rounded-lg max-h-40 overflow-y-auto">
                        {result.data.images.slice(0, 5).map((image, index) => (
                          <div key={index} className="mb-2 text-sm">
                            <img src={image.src} alt={image.alt || 'Image'} className="h-16 w-auto object-contain" />
                            <div className="text-gray-600">{image.alt || 'No alt text'}</div>
                          </div>
                        ))}
                        {result.data.images.length > 5 && (
                          <div className="text-gray-500 text-sm">... and {result.data.images.length - 5} more images</div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Meta Tags */}
                  {result.data.meta && Object.keys(result.data.meta).length > 0 && (
                    <div>
                      <h4 className="font-medium text-gray-700 mb-2">Meta Tags</h4>
                      <div className="bg-gray-50 p-4 rounded-lg max-h-40 overflow-y-auto">
                        {Object.entries(result.data.meta).slice(0, 10).map(([key, value]) => (
                          <div key={key} className="mb-1 text-sm">
                            <span className="font-medium">{key}:</span> {value}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Raw JSON */}
              <details className="mt-6">
                <summary className="cursor-pointer text-sm font-medium text-gray-700 hover:text-gray-900">
                  View Raw JSON
                </summary>
                <pre className="mt-2 bg-gray-50 p-4 rounded-lg overflow-auto text-xs">
                  {JSON.stringify(result, null, 2)}
                </pre>
              </details>
            </div>
          )}
        </div>

        {/* Features Section */}
        <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="text-center">
            <div className="bg-blue-100 w-12 h-12 rounded-lg flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold mb-2">Fast & Reliable</h3>
            <p className="text-gray-600">High-performance crawling with JavaScript rendering support</p>
          </div>
          
          <div className="text-center">
            <div className="bg-blue-100 w-12 h-12 rounded-lg flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold mb-2">Flexible Extraction</h3>
            <p className="text-gray-600">Extract text, links, images, meta tags, and structured data</p>
          </div>
          
          <div className="text-center">
            <div className="bg-blue-100 w-12 h-12 rounded-lg flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold mb-2">Secure & Scalable</h3>
            <p className="text-gray-600">Enterprise-grade security with subscription management</p>
          </div>
        </div>
      </main>
    </div>
  );
}
