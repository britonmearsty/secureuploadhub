'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface TestResult {
  status: number | string;
  ok: boolean;
  data: any;
  timestamp: string;
}

interface TestResults {
  [key: string]: TestResult;
}

export default function AnalyticsDebugPage() {
  const [results, setResults] = useState<TestResults>({});
  const [loading, setLoading] = useState(false);

  const testEndpoint = async (endpoint: string, name: string) => {
    try {
      console.log(`Testing ${name}: ${endpoint}`);
      const response = await fetch(endpoint);
      const data = await response.json();
      
      setResults((prev: TestResults) => ({
        ...prev,
        [name]: {
          status: response.status,
          ok: response.ok,
          data: response.ok ? data : { error: data },
          timestamp: new Date().toISOString()
        }
      }));
      
      console.log(`${name} result:`, { status: response.status, ok: response.ok, data });
    } catch (error) {
      console.error(`${name} error:`, error);
      setResults((prev: TestResults) => ({
        ...prev,
        [name]: {
          status: 'ERROR',
          ok: false,
          data: { error: error instanceof Error ? error.message : 'Unknown error' },
          timestamp: new Date().toISOString()
        }
      }));
    }
  };

  const runAllTests = async () => {
    setLoading(true);
    setResults({});
    
    const tests = [
      ['/api/admin/test-auth', 'Auth Test'],
      ['/api/admin/test-db', 'Database Test'],
      ['/api/admin/analytics/dashboard-simple?period=30d', 'Dashboard Simple'],
      ['/api/admin/analytics/dashboard?period=30d', 'Dashboard'],
      ['/api/admin/analytics/users?period=30d', 'Users'],
      ['/api/admin/analytics/uploads?period=30d', 'Uploads'],
      ['/api/admin/analytics/performance?period=24h', 'Performance'],
      ['/api/admin/analytics?days=30', 'Main Analytics'],
    ];

    for (const [endpoint, name] of tests) {
      await testEndpoint(endpoint, name);
      // Small delay between requests
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    setLoading(false);
  };

  useEffect(() => {
    // Auto-run tests on page load
    runAllTests();
  }, []);

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Analytics API Debug</h1>
        <Button onClick={runAllTests} disabled={loading}>
          {loading ? 'Testing...' : 'Run Tests'}
        </Button>
      </div>

      <div className="grid gap-4">
        {Object.entries(results).map(([name, result]: [string, TestResult]) => (
          <Card key={name}>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>{name}</span>
                <span className={`px-2 py-1 rounded text-sm ${
                  result.ok ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                }`}>
                  {result.status}
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="text-sm text-gray-600">
                  Timestamp: {result.timestamp}
                </div>
                <div className="text-sm">
                  Status: {result.ok ? '✅ Success' : '❌ Failed'}
                </div>
                <details className="mt-2">
                  <summary className="cursor-pointer text-sm font-medium">
                    Response Data
                  </summary>
                  <pre className="mt-2 p-2 bg-gray-100 rounded text-xs overflow-auto max-h-96">
                    {JSON.stringify(result.data, null, 2)}
                  </pre>
                </details>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Browser Console</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-600">
            Check the browser console (F12) for additional error messages and network requests.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}