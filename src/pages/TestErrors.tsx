import React, { useState } from 'react';
import { errorLogger } from '../lib/errorLogger';

function BrokenComponent() {
  throw new Error('Test React Component Error');
}

function TestErrors() {
  const [showBrokenComponent, setShowBrokenComponent] = useState(false);

  const generateJavaScriptError = () => {
    try {
      const obj = null;
      obj.nonexistentMethod();
    } catch (error) {
      errorLogger.log(error as Error, 'error', {
        operation: 'testJavaScriptError',
        context: 'Manual test'
      });
    }
  };

  const generatePromiseRejection = async () => {
    try {
      await new Promise((_, reject) => {
        reject(new Error('Test Promise Rejection'));
      });
    } catch (error) {
      errorLogger.log(error as Error, 'error', {
        operation: 'testPromiseRejection',
        context: 'Manual test'
      });
    }
  };

  const generateCriticalError = () => {
    errorLogger.log(
      new Error('Test Critical Error'),
      'critical',
      {
        operation: 'testCriticalError',
        context: 'Manual test'
      }
    );
  };

  const triggerErrorBoundary = () => {
    setShowBrokenComponent(true);
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-8">Test Error Logging</h1>
      
      <div className="grid gap-4">
        <div className="p-4 bg-white rounded-lg shadow">
          <h2 className="text-lg font-semibold mb-4">JavaScript Error</h2>
          <button
            onClick={generateJavaScriptError}
            className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
          >
            Generate JavaScript Error
          </button>
        </div>

        <div className="p-4 bg-white rounded-lg shadow">
          <h2 className="text-lg font-semibold mb-4">Promise Rejection</h2>
          <button
            onClick={generatePromiseRejection}
            className="bg-orange-600 text-white px-4 py-2 rounded hover:bg-orange-700"
          >
            Generate Promise Rejection
          </button>
        </div>

        <div className="p-4 bg-white rounded-lg shadow">
          <h2 className="text-lg font-semibold mb-4">Critical Error</h2>
          <button
            onClick={generateCriticalError}
            className="bg-yellow-600 text-white px-4 py-2 rounded hover:bg-yellow-700"
          >
            Generate Critical Error
          </button>
        </div>

        <div className="p-4 bg-white rounded-lg shadow">
          <h2 className="text-lg font-semibold mb-4">Error Boundary Test</h2>
          <button
            onClick={triggerErrorBoundary}
            className="bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700"
          >
            Trigger Error Boundary
          </button>
          {showBrokenComponent && <BrokenComponent />}
        </div>
      </div>

      <div className="mt-8 p-4 bg-gray-100 rounded-lg">
        <h2 className="text-lg font-semibold mb-2">Instructions</h2>
        <ul className="list-disc list-inside space-y-2">
          <li>Click each button to generate different types of errors</li>
          <li>Check the browser console for development logs</li>
          <li>Check the error_logs table in Supabase</li>
          <li>Visit the Error Dashboard to see logged errors</li>
          <li>The Error Boundary test will crash the component and show the fallback UI</li>
        </ul>
      </div>
    </div>
  );
}

export default TestErrors;