import React, { useEffect, useRef } from 'react';
import { Link, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { Lock, Mail, User, Phone } from 'lucide-react';
import Layout from '../../components/layout/Layout';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import { useAuthStore } from '../../store/authStore';

interface RegisterFormData {
  name: string;
  email: string;
  phone: string;
  password: string;
  confirmPassword: string;
}

const Register: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const formRef = useRef<HTMLDivElement | null>(null);
  const { register: registerUser, loginWithGoogle, isAuthenticated, isLoading, error } = useAuthStore();
  const { register, handleSubmit, formState: { errors }, watch } = useForm<RegisterFormData>();

  useEffect(() => {
    const shouldScroll = new URLSearchParams(location.search).get('scrollToForm');
    if (shouldScroll && formRef.current) {
      formRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [location]);
  
  if (isAuthenticated) {
    return <Navigate to="/dashboard" />;
  }
  
  const onSubmit = async (data: RegisterFormData) => {
    try {
      const sanitizedName = data.name.trim();
      const sanitizedEmail = data.email.trim();
      const sanitizedPhone = data.phone.trim();
      const sanitizedPassword = data.password.trim();

      await registerUser(sanitizedName, sanitizedEmail, sanitizedPhone, sanitizedPassword);
      navigate('/dashboard');
    } catch (error) {
      // Error is handled in the store
    }
  };

  const handleGoogleRegister = async () => {
    try {
      await loginWithGoogle();
      navigate('/dashboard');
    } catch (error) {
      // Manejar error si quieres
    }
  };
  
  return (
    <Layout>
      <div className="min-h-[80vh] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-gray-50">
        <div ref={formRef} className="max-w-md w-full space-y-8 bg-white p-8 rounded-lg shadow-card">
          <div className="text-center">
            <h2 className="text-3xl font-bold text-gray-900">Crear Cuenta</h2>
            <p className="mt-2 text-sm text-gray-600">
              ¿Ya tienes una cuenta?{' '}
              <Link to="/login" className="font-medium text-primary-500 hover:text-primary-600">
                Inicia sesión
              </Link>
            </p>
          </div>
          
          <form className="mt-8 space-y-6" onSubmit={handleSubmit(onSubmit)}>
            {error && (
              <div className="p-3 bg-red-50 text-red-700 rounded-lg text-sm">
                {error}
              </div>
            )}
            
            <div className="space-y-4">
              <Input
                label="Nombre completo"
                type="text"
                autoComplete="name"
                leftIcon={<User className="h-5 w-5 text-gray-400" />}
                error={errors.name?.message}
                {...register('name', { 
                  required: 'El nombre es requerido'
                })}
              />
              
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
                label="Teléfono"
                type="tel"
                autoComplete="tel"
                leftIcon={<Phone className="h-5 w-5 text-gray-400" />}
                error={errors.phone?.message}
                {...register('phone', { 
                  required: 'El teléfono es requerido',
                  pattern: {
                    value: /^[+]?[(]?[0-9]{3}[)]?[-\s.]?[0-9]{3}[-\s.]?[0-9]{4,6}$/,
                    message: 'Formato de teléfono inválido'
                  }
                })}
              />
              
              <Input
                label="Contraseña"
                type="password"
                autoComplete="new-password"
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
              
              <Input
                label="Confirmar contraseña"
                type="password"
                autoComplete="new-password"
                leftIcon={<Lock className="h-5 w-5 text-gray-400" />}
                error={errors.confirmPassword?.message}
                {...register('confirmPassword', { 
                  required: 'Confirma tu contraseña',
                  validate: value => value === watch('password') || 'Las contraseñas no coinciden'
                })}
              />
            </div>
            
            <div className="flex items-center">
              <input
                id="terms"
                name="terms"
                type="checkbox"
                className="h-4 w-4 text-primary-500 border-gray-300 rounded focus:ring-primary-500"
                required
              />
              <label htmlFor="terms" className="ml-2 block text-sm text-gray-700">
                Acepto los{' '}
                <Link to="/terms" className="font-medium text-primary-500 hover:text-primary-600">
                  Términos y Condiciones
                </Link>
              </label>
            </div>
            
            <Button
              type="submit"
              variant="primary"
              fullWidth
              size="lg"
              isLoading={isLoading}
            >
              Crear Cuenta
            </Button>
          </form>

          {/* Botón para registrarse con Google */}
          <div className="mt-6">
            <button
              type="button"
              onClick={handleGoogleRegister}
              disabled={isLoading}
              className="w-full inline-flex items-center justify-center gap-3 px-4 py-2 border border-gray-300 rounded-md shadow-sm bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <img
                src="https://developers.google.com/identity/images/g-logo.png"
                alt="Google logo"
                className="h-5 w-5"
              />
              Registrarse con Google
            </button>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default Register;
