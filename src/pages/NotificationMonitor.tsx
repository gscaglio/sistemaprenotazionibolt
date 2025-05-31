import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import type { Database } from '../lib/database.types';

type NotificationQueueTableRow = Database['public']['Tables']['notification_queue']['Row'];

const NotificationMonitor: React.FC = () => {
  const [notifications, setNotifications] = useState<NotificationQueueTableRow[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');

  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      let query = supabase
        .from('notification_queue')
        .select('*')
        .order('created_at', { ascending: false });

      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }
      if (typeFilter !== 'all') {
        query = query.eq('type', typeFilter);
      }

      const { data, error: dbError } = await query;
      if (dbError) throw dbError;
      setNotifications(data || []);
    } catch (err: any) {
      console.error("Error fetching notifications:", err);
      setError(err.message);
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, typeFilter]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A';
    try {
      return new Date(dateString).toLocaleString();
    } catch (e) {
      return 'Invalid Date';
    }
  };

  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
      <h1>Notification Queue Monitor</h1>

      <div style={{ marginBottom: '20px', display: 'flex', gap: '20px' }}>
        <div>
          <label htmlFor="statusFilter" style={{ marginRight: '10px' }}>Status:</label>
          <select
            id="statusFilter"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
          >
            <option value="all">All</option>
            <option value="pending">Pending</option>
            <option value="processing">Processing</option>
            <option value="sent">Sent</option>
            <option value="failed">Failed</option>
          </select>
        </div>
        <div>
          <label htmlFor="typeFilter" style={{ marginRight: '10px' }}>Type:</label>
          <select
            id="typeFilter"
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
          >
            <option value="all">All</option>
            <option value="whatsapp">WhatsApp</option>
            <option value="email">Email</option>
          </select>
        </div>
        <button
            onClick={fetchNotifications}
            disabled={loading}
            style={{ padding: '8px 15px', borderRadius: '4px', border: '1px solid #007bff', backgroundColor: '#007bff', color: 'white', cursor: 'pointer' }}
        >
            {loading ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>

      {loading && <p>Loading notifications...</p>}
      {error && <p style={{ color: 'red' }}>Error fetching notifications: {error}</p>}

      {!loading && !error && notifications.length === 0 && <p>No notifications found for the selected filters.</p>}

      {!loading && !error && notifications.length > 0 && (
        <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '20px' }}>
          <thead>
            <tr style={{ backgroundColor: '#f0f0f0' }}>
              <th style={tableHeaderStyle}>ID</th>
              <th style={tableHeaderStyle}>Booking ID</th>
              <th style={tableHeaderStyle}>Type</th>
              <th style={tableHeaderStyle}>Status</th>
              <th style={tableHeaderStyle}>Attempts</th>
              <th style={tableHeaderStyle}>Last Attempt</th>
              <th style={tableHeaderStyle}>Next Retry</th>
              <th style={tableHeaderStyle}>Error</th>
              <th style={tableHeaderStyle}>Payload</th>
              <th style={tableHeaderStyle}>Created At</th>
              <th style={tableHeaderStyle}>Sent At</th>
            </tr>
          </thead>
          <tbody>
            {notifications.map((notification) => (
              <tr key={notification.id} style={{ borderBottom: '1px solid #ddd' }}>
                <td style={tableCellStyle}>{notification.id}</td>
                <td style={tableCellStyle}>{notification.booking_id || 'N/A'}</td>
                <td style={tableCellStyle}>{notification.type}</td>
                <td style={tableCellStyle}>{notification.status}</td>
                <td style={tableCellStyle}>{notification.attempts}</td>
                <td style={tableCellStyle}>{formatDate(notification.last_attempt)}</td>
                <td style={tableCellStyle}>{formatDate(notification.next_retry)}</td>
                <td style={tableCellStyle} title={notification.error_message || ''}>
                  {notification.error_message ? notification.error_message.substring(0, 50) + '...' : 'N/A'}
                </td>
                <td style={tableCellStyle} title={JSON.stringify(notification.payload, null, 2)}>
                  <details>
                    <summary>View</summary>
                    <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-all', maxHeight: '100px', overflowY: 'auto', backgroundColor: '#f9f9f9', padding: '5px' }}>
                      {JSON.stringify(notification.payload, null, 2)}
                    </pre>
                  </details>
                </td>
                <td style={tableCellStyle}>{formatDate(notification.created_at)}</td>
                <td style={tableCellStyle}>{formatDate(notification.sent_at)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

const tableHeaderStyle: React.CSSProperties = {
  border: '1px solid #ddd',
  padding: '10px',
  textAlign: 'left',
  fontWeight: 'bold',
};

const tableCellStyle: React.CSSProperties = {
  border: '1px solid #ddd',
  padding: '8px',
  textAlign: 'left',
  verticalAlign: 'top',
};

export default NotificationMonitor;

// To integrate this page, you would typically add a route in your main router file (e.g., App.tsx or a dedicated router config):
// import NotificationMonitor from './pages/NotificationMonitor';
// <Route path="/admin/notifications" element={<ProtectedRoute><NotificationMonitor /></ProtectedRoute>} />
// Ensure ProtectedRoute is correctly set up if authentication is required.
