import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Calendar, BookOpen, Settings, LogOut } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useEmergencyStore } from '../stores/emergencyStore';

interface LayoutProps {
  children: React.ReactNode;
}

function Layout({ children }: LayoutProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { logout } = useAuth();
  const { isEmergencyActive } = useEmergencyStore();

  const navigation = [
    { name: 'Calendario', href: '/calendar', icon: Calendar },
    { name: 'Prenotazioni', href: '/bookings', icon: BookOpen },
    { name: 'Impostazioni', href: '/settings', icon: Settings },
  ];

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {isEmergencyActive && (
        <div className="bg-red-500 text-white text-center py-2 px-4 fixed top-0 left-0 right-0 z-50">
          ⚠️ MODALITÀ EMERGENZA ATTIVA - Prenotazioni Disabilitate
        </div>
      )}
      <nav className={`fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 md:top-0 md:bottom-auto ${isEmergencyActive ? 'md:mt-10' : ''}`}>
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex justify-between items-center">
            <div className="flex justify-around md:justify-start md:space-x-8 py-3 flex-1">
              {navigation.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.name}
                    to={item.href}
                    className={`flex flex-col md:flex-row items-center space-y-1 md:space-y-0 md:space-x-2 ${
                      location.pathname === item.href
                        ? 'text-blue-600'
                        : 'text-gray-600 hover:text-blue-500'
                    }`}
                  >
                    <Icon className="h-6 w-6" />
                    <span className="text-xs md:text-sm">{item.name}</span>
                  </Link>
                );
              })}
            </div>
            <button
              onClick={handleLogout}
              className="hidden md:flex items-center space-x-2 text-gray-600 hover:text-blue-500"
            >
              <LogOut className="h-5 w-5" />
              <span>Logout</span>
            </button>
          </div>
        </div>
      </nav>
      <main className={`max-w-7xl mx-auto px-4 py-6 mb-20 md:mb-0 md:py-12 ${isEmergencyActive ? 'md:mt-10' : ''}`}>
        {children}
      </main>
    </div>
  );
}

export default Layout