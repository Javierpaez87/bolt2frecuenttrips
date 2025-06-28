import React, { useEffect, useRef, useState } from 'react';
import { Link, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { Lock, Mail } from 'lucide-react';
import Layout from '../../components/layout/Layout';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import { useAuthStore } from '../../store/authStore';

interface LoginFormData {
  email: string;
  password: string;
}

const Login: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
const formRef = useRef<HTMLFormElement | null>(null);
  const { login, loginWithGoogle, isAuthenticated, isLoading, error } = useAuthStore();
  const { register, handleSubmit, formState: { errors } } = useForm<LoginFormData>();

 useEffect(() => {
  const shouldScroll = new URLSearchParams(location.search).get('scrollToForm');
  if (shouldScroll && formRef.current) {
    let attempts = 0;

    const scrollToForm = () => {
      const top = formRef.current!.getBoundingClientRect().top + window.scrollY - 60;
      window.scrollTo({ top, behavior: 'smooth' });

      if (attempts < 5) {
        attempts++;
        requestAnimationFrame(scrollToForm);
      }
    };

    setTimeout(() => {
      scrollToForm();
    }, 600); // suficiente para que todo el layout se monte
  }
}, [location]);


  if (isAuthenticated) {
    return <Navigate to="/dashboard" />;
  }

  const onSubmit = async (data: LoginFormData) => {
    try {
      await login(data.email, data.password);
      navigate('/dashboard');
    } catch (error) {
      // Error is handled in the store
    }
  };

  const handleGoogleLogin = async () => {
    try {
      await loginWithGoogle();
      navigate('/dashboard');
    } catch (error) {
      // Error is handled in the store
    }
  };

  return (
    <Layout>
      <div className="min-h-[80vh] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-gray-50">
<div className="max-w-md w-full space-y-8 bg-white p-8 rounded-lg shadow-card">
          <div className="text-center">
            <h2 className="text-3xl font-bold text-gray-900">Iniciar Sesión</h2>
            <p className="mt-2 text-sm text-gray-600">
              ¿No tienes una cuenta?{' '}
              <Link to="/register" className="font-medium text-primary-500 hover:text-primary-600">
                Regístrate
              </Link>
            </p>
          </div>

<div ref={formRef}>
  <form className="mt-8 space-y-6" onSubmit={handleSubmit(onSubmit)}>
            {error && (
              <div className="p-3 bg-red-50 text-red-700 rounded-lg text-sm">
                {error}
              </div>
            )}

            <div className="space-y-4">
              <Input
                label="Correo electrónico"
                type="email"
                autoComplete="email"
                leftIcon={<Mail className="h-5 w-5 text-gray-400" />}
                error={errors.email?.message}
                {...register('email', {
                  required: 'El correo electrónico es requerido',
                  pattern: {
                    value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                    message: 'Correo electrónico inválido'
                  }
                })}
              />

              <Input
                label="Contraseña"
                type="password"
                autoComplete="current-password"
                leftIcon={<Lock className="h-5 w-5 text-gray-400" />}
                error={errors.password?.message}
                {...register('password', {
                  required: 'La contraseña es requerida',
                  minLength: {
                    value: 6,
                    message: 'La contraseña debe tener al menos 6 caracteres'
                  }
                })}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <input
                  id="remember-me"
                  name="remember-me"
                  type="checkbox"
                  className="h-4 w-4 text-primary-500 border-gray-300 rounded focus:ring-primary-500"
                />
                <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-700">
                  Recordarme
                </label>
              </div>

              <div className="text-sm">
                <a href="#" className="font-medium text-primary-500 hover:text-primary-600">
                  ¿Olvidaste tu contraseña?
                </a>
              </div>
            </div>

            <Button
  type="submit"
  variant="primary"
  fullWidth
  size="lg"
  isLoading={isLoading}
>
  Iniciar Sesión
</Button>
</form>
</div>

<div className="mt-6 text-center">

            <p className="text-sm text-gray-600 mb-2">O ingresa con:</p>
            <button
              type="button"
              onClick={handleGoogleLogin}
              disabled={isLoading}
              className="w-full inline-flex items-center justify-center gap-3 px-4 py-2 border border-gray-300 rounded-md shadow-sm bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <img
                src="https://developers.google.com/identity/images/g-logo.png"
                alt="Google logo"
                className="h-5 w-5"
              />
              Iniciar sesión con Google
            </button>
          </div>

          <div className="mt-4 text-center">
            <p className="text-sm text-gray-600">
              Para fines de demostración, usa:
            </p>
            <p className="text-xs text-gray-500">
              Email: carlos@example.com | Contraseña: cualquier valor
            </p>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default Login;
