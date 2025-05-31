import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import Calendar from './pages/Calendar';
import RoomSelection from './pages/RoomSelection';
import Bookings from './pages/Bookings';
import Settings from './pages/Settings';
import ErrorDashboard from './pages/ErrorDashboard';
import TestErrors from './pages/TestErrors';
import Login from './pages/Login';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import { ErrorBoundary } from './components/ErrorBoundary';

function App() {
  return (
    <ErrorBoundary>
      <Router>
        <Toaster position="top-right" />
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Layout>
                  <RoomSelection />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/calendar/:roomId"
            element={
              <ProtectedRoute>
                <Layout>
                  <Calendar />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/bookings"
            element={
              <ProtectedRoute>
                <Layout>
                  <Bookings />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/settings"
            element={
              <ProtectedRoute>
                <Layout>
                  <Settings />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/errors"
            element={
              <ProtectedRoute>
                <Layout>
                  <ErrorDashboard />
                </Layout>
              </ProtectedRoute>
            }
          />
          {process.env.NODE_ENV === 'development' && (
            <Route
              path="/test-errors"
              element={
                <ProtectedRoute>
                  <Layout>
                    <TestErrors />
                  </Layout>
                </ProtectedRoute>
              }
            />
          )}
        </Routes>
      </Router>
    </ErrorBoundary>
  );
}