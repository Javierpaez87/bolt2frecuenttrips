import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Car, Menu, X, LogOut, User as UserIcon } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';

const Header: React.FC = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { user, isAuthenticated, logout } = useAuthStore();
  const location = useLocation();

  const toggleMenu = () => setIsMenuOpen(!isMenuOpen);
  const closeMenu = () => setIsMenuOpen(false);
  const isActive = (path: string) => location.pathname === path;

  return (
    <header className="bg-gradient-mountain sticky top-0 z-50 shadow-strong border-b-2 border-primary-500">
      <div className="container mx-auto px-4 py-3 flex justify-between items-center">
        {/* Logo */}
        <Link to="/" className="flex items-center space-x-3 group">
          <div className="relative">
            <svg className="h-10 w-12 text-slate-500 absolute -top-1 -left-1 group-hover:text-slate-400 transition-colors" viewBox="0 0 48 40" fill="currentColor">
              <path d="M0 30 L12 15 L24 25 L36 10 L48 20 L48 40 L0 40 Z" opacity="0.6"/>
              <path d="M0 35 L8 22 L16 28 L28 18 L40 25 L48 30 L48 40 L0 40 Z" opacity="0.4"/>
            </svg>
            <Car className="h-8 w-8 text-primary-400 relative z-10 group-hover:text-primary-300 transition-colors" />
          </div>
          <span className="text-xl font-bold text-white">
            Bondi<span className="text-primary-400 group-hover:text-primary-300 transition-colors">Car</span>
          </span>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center space-x-8">
          <Link 
            to="/search" 
            className={`text-sm font-medium hover:text-primary-300 transition-colors ${
              isActive('/search') ? 'text-primary-300' : 'text-slate-200'
            }`}
          >
            Buscar Viajes
          </Link>

          {isAuthenticated ? (
            <>
              <Link 
                to="/dashboard" 
                className={`text-sm font-medium hover:text-primary-300 transition-colors ${
                  isActive('/dashboard') ? 'text-primary-300' : 'text-slate-200'
                }`}
              >
                Mi Panel
              </Link>
              <Link 
                to="/create-trip" 
                className="px-4 py-2 bg-primary-600 text-white font-medium rounded-lg shadow-soft hover:bg-primary-500 transition-all duration-200 border border-primary-500 hover:shadow-medium"
              >
                Publicar Viaje
              </Link>
              <div className="relative group">
                <button className="flex items-center space-x-2">
                  <div className="h-8 w-8 rounded-full bg-slate-500 flex items-center justify-center overflow-hidden border-2 border-primary-400 hover:border-primary-300 transition-colors">
                    {user?.profilePicture ? (
                      <img src={user.profilePicture} alt={user.name} className="h-full w-full object-cover" />
                    ) : (
                      <UserIcon className="h-5 w-5 text-primary-300" />
                    )}
                  </div>
                </button>
                <div className="absolute right-0 mt-2 w-48 bg-slate-800 rounded-lg shadow-strong py-2 invisible group-hover:visible opacity-0 group-hover:opacity-100 transition-all duration-200 transform translate-y-1 group-hover:translate-y-0 border border-primary-500">
                  <Link to="/search" className="flex items-center px-4 py-2 text-sm text-slate-200 hover:bg-slate-700 hover:text-primary-300 transition-colors">
                    🔍 <span className="ml-2">Buscar Viajes</span>
                  </Link>
                  <Link to="/dashboard" className="flex items-center px-4 py-2 text-sm text-slate-200 hover:bg-slate-700 hover:text-primary-300 transition-colors">
                    🧭 <span className="ml-2">Mi Panel</span>
                  </Link>
                  <Link to="/create-trip" className="flex items-center px-4 py-2 text-sm text-slate-200 hover:bg-slate-700 hover:text-primary-300 transition-colors">
                    🚗 <span className="ml-2">Publicar Viaje</span>
                  </Link>
                  <Link to="/dashboard?tab=profile" className="flex items-center px-4 py-2 text-sm text-slate-200 hover:bg-slate-700 hover:text-primary-300 transition-colors">
                    👤 <span className="ml-2">Mi Perfil</span>
                  </Link>
                  <button 
                    onClick={logout}
                    className="w-full flex items-center px-4 py-2 text-sm text-error-400 hover:bg-slate-700 hover:text-error-300 transition-colors"
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    Cerrar Sesión
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex items-center space-x-4">
              <Link 
                to="/login" 
                className="text-sm font-medium text-slate-200 hover:text-primary-300 transition-colors"
              >
                Iniciar Sesión
              </Link>
              <Link 
                to="/register" 
                className="px-4 py-2 bg-primary-600 text-white font-medium rounded-lg shadow-soft hover:bg-primary-500 transition-all duration-200 border border-primary-500 hover:shadow-medium"
              >
                Registrarse
              </Link>
            </div>
          )}
        </nav>

        {/* Mobile Menu Button */}
        <button 
          className="md:hidden text-white focus:outline-none hover:text-primary-300 transition-colors"
          onClick={toggleMenu}
        >
          {isMenuOpen ? (
            <X className="h-6 w-6" />
          ) : (
            <Menu className="h-6 w-6" />
          )}
        </button>
      </div>

                 {/* Mobile Menu */}
      {isMenuOpen && (
        <div className="md:hidden bg-slate-800 border-t border-primary-500 animate-slide-down">
          <div className="container mx-auto px-4 py-3">
            <nav className="flex flex-col space-y-4">
              {isAuthenticated ? (
                <>
                  <Link 
                    to="/search" 
                    className="text-sm font-medium text-slate-200 hover:text-primary-300 transition-colors"
                    onClick={closeMenu}
                  >
                    Buscar Viajes
                  </Link>
                  <Link 
                    to="/dashboard" 
                    className="text-sm font-medium text-slate-200 hover:text-primary-300 transition-colors"
                    onClick={closeMenu}
                  >
                    Mi Panel
                  </Link>
                  <Link 
                    to="/create-trip" 
                    className="px-4 py-2 bg-primary-600 text-white font-medium rounded-lg shadow-soft hover:bg-primary-500 transition-colors text-center border border-primary-500"
                    onClick={closeMenu}
                  >
                    Publicar Viaje
                  </Link>
                  <Link 
                    to="/dashboard?tab=profile" 
                    className="text-sm font-medium text-slate-200 hover:text-primary-300 transition-colors"
                    onClick={closeMenu}
                  >
                    👤 Mi Perfil
                  </Link>
                  <button 
                    onClick={() => {
                      logout();
                      closeMenu();
                    }}
                    className="flex items-center text-sm font-medium text-error-400 hover:text-error-300 transition-colors"
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    Cerrar Sesión
                  </button>
                </>
              ) : (
                <Link 
                  to="/login" 
                  onClick={closeMenu}
                  className="block px-4 py-2 rounded bg-primary-600 text-white text-center font-semibold hover:bg-primary-500 transition-colors"
                >
                  🔐 Ingresar / Registrarse
                </Link>
              )}
            </nav>
          </div> {/* cierre de container mobile */}
        </div> /* cierre de mobile menu */
      )}
    </header>
  );
};

export default Header;

