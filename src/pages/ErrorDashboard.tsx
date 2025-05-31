import React, { useState, useEffect } from 'react';
import { format, subDays, isToday, parseISO } from 'date-fns';
import { it } from 'date-fns/locale';
import { supabase } from '../lib/supabase';
import type { ErrorLog } from '../types';
import { BarChart, Calendar, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';

function ErrorDashboard() {
  const [errors, setErrors] = useState<ErrorLog[]>([]);
  const [filter, setFilter] = useState({
    level: 'all',
    days: 7,
    search: '',
    resolved: 'all'
  });
  const [stats, setStats] = useState({
    total: 0,
    critical: 0,
    resolved: 0,
    today: 0
  });

  useEffect(() => {
    fetchErrors();
    subscribeToErrors();
  }, [filter]);

  const subscribeToErrors = () => {
    const subscription = supabase
      .channel('error_logs')
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'error_logs' },
        (payload) => {
          setErrors(prev => [payload.new as ErrorLog, ...prev]);
          updateStats([payload.new as ErrorLog, ...errors]);
        }
      )
      .subscribe();

    return () => { subscription.unsubscribe(); };
  };

  const fetchErrors = async () => {
    const since = subDays(new Date(), filter.days);

    let query = supabase
      .from('error_logs')
      .select('*')
      .gte('created_at', since.toISOString())
      .order('created_at', { ascending: false });

    if (filter.level !== 'all') {
      query = query.eq('level', filter.level);
    }

    if (filter.resolved !== 'all') {
      query = query.is('resolved_at', filter.resolved === 'resolved' ? 'not.null' : 'null');
    }

    if (filter.search) {
      query = query.or(`message.ilike.%${filter.search}%,error_stack.ilike.%${filter.search}%`);
    }

    const { data } = await query;
    if (data) {
      setErrors(data);
      updateStats(data);
    }
  };

  const updateStats = (data: ErrorLog[]) => {
    setStats({
      total: data.length,
      critical: data.filter(e => e.level === 'critical').length,
      resolved: data.filter(e => e.resolved_at).length,
      today: data.filter(e => isToday(parseISO(e.created_at!))).length
    });
  };

  const markAsResolved = async (id: number, notes: string) => {
    const { error } = await supabase
      .from('error_logs')
      .update({ resolved_at: new Date().toISOString(), resolution_notes: notes })
      .eq('id', id);

    if (!error) {
      fetchErrors();
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Error Dashboard</h1>
        <div className="flex space-x-4">
          <select
            value={filter.level}
            onChange={(e) => setFilter({ ...filter, level: e.target.value })}
            className="rounded-md border-gray-300"
          >
            <option value="all">Tutti i livelli</option>
            <option value="critical">Critical</option>
            <option value="error">Error</option>
            <option value="warning">Warning</option>
            <option value="info">Info</option>
            <option value="debug">Debug</option>
          </select>
          <select
            value={filter.days}
            onChange={(e) => setFilter({ ...filter, days: Number(e.target.value) })}
            className="rounded-md border-gray-300"
          >
            <option value={1}>Ultimo giorno</option>
            <option value={7}>Ultimi 7 giorni</option>
            <option value={30}>Ultimi 30 giorni</option>
            <option value={90}>Ultimi 90 giorni</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <BarChart className="h-10 w-10 text-blue-500" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Errori Totali</p>
              <p className="text-2xl font-semibold text-gray-900">{stats.total}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <AlertTriangle className="h-10 w-10 text-red-500" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Errori Critici</p>
              <p className="text-2xl font-semibold text-gray-900">{stats.critical}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <Calendar className="h-10 w-10 text-green-500" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Errori Oggi</p>
              <p className="text-2xl font-semibold text-gray-900">{stats.today}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <CheckCircle className="h-10 w-10 text-purple-500" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Risolti</p>
              <p className="text-2xl font-semibold text-gray-900">{stats.resolved}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-4 py-5 border-b border-gray-200 sm:px-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg leading-6 font-medium text-gray-900">
              Log degli Errori
            </h3>
            <input
              type="text"
              placeholder="Cerca negli errori..."
              value={filter.search}
              onChange={(e) => setFilter({ ...filter, search: e.target.value })}
              className="rounded-md border-gray-300"
            />
          </div>
        </div>
        <div className="divide-y divide-gray-200">
          {errors.map((error) => (
            <div key={error.id} className="p-4 hover:bg-gray-50">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center mb-2">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      error.level === 'critical' ? 'bg-red-100 text-red-800' :
                      error.level === 'error' ? 'bg-orange-100 text-orange-800' :
                      error.level === 'warning' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-blue-100 text-blue-800'
                    }`}>
                      {error.level}
                    </span>
                    <span className="ml-2 text-sm text-gray-500">
                      {format(parseISO(error.created_at!), 'dd/MM/yyyy HH:mm:ss', { locale: it })}
                    </span>
                  </div>
                  <p className="text-sm font-medium text-gray-900">{error.message}</p>
                  {error.error_stack && (
                    <pre className="mt-2 text-xs text-gray-600 overflow-x-auto">
                      {error.error_stack}
                    </pre>
                  )}
                  {error.context && (
                    <details className="mt-2">
                      <summary className="text-sm text-gray-500 cursor-pointer">
                        Dettagli contestuali
                      </summary>
                      <pre className="mt-2 text-xs text-gray-600 overflow-x-auto">
                        {JSON.stringify(error.context, null, 2)}
                      </pre>
                    </details>
                  )}
                </div>
                {!error.resolved_at && (
                  <button
                    onClick={() => {
                      const notes = prompt('Note di risoluzione:');
                      if (notes) markAsResolved(error.id!, notes);
                    }}
                    className="ml-4 inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700"
                  >
                    Risolto
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default ErrorDashboard;