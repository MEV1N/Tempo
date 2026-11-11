import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import {
  UserDTO,
  UserPreferenceDTO,
  RegisterInput,
  LoginInput,
  UpdatePreferencesInput,
  UpdateProfileInput,
  AuthResponseData,
} from '@tempo/shared';
import { apiRequest } from '../api/client';

interface AuthContextType {
  user: UserDTO | null;
  preference: UserPreferenceDTO | null;
  loading: boolean;
  login: (data: LoginInput) => Promise<void>;
  register: (data: RegisterInput) => Promise<void>;
  logout: () => Promise<void>;
  updatePreferences: (data: UpdatePreferencesInput) => Promise<UserPreferenceDTO>;
  updateProfile: (data: UpdateProfileInput) => Promise<UserDTO>;
  refreshAuth: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserDTO | null>(null);
  const [preference, setPreference] = useState<UserPreferenceDTO | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshAuth = async () => {
    try {
      const data = await apiRequest<AuthResponseData>('/api/auth/me');
      setUser(data.user);
      setPreference(data.preference);
    } catch {
      setUser(null);
      setPreference(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshAuth();
  }, []);

  const login = async (data: LoginInput) => {
    const res = await apiRequest<AuthResponseData>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    setUser(res.user);
    setPreference(res.preference);
  };

  const register = async (data: RegisterInput) => {
    const res = await apiRequest<AuthResponseData>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    setUser(res.user);
    setPreference(res.preference);
  };

  const logout = async () => {
    try {
      await apiRequest('/api/auth/logout', { method: 'POST' });
    } finally {
      setUser(null);
      setPreference(null);
    }
  };

  const updatePreferences = async (data: UpdatePreferencesInput): Promise<UserPreferenceDTO> => {
    const res = await apiRequest<UserPreferenceDTO>('/api/preferences', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
    setPreference(res);
    if (res.onboardingCompleted && user) {
      setUser({ ...user, onboardingCompleted: true });
    }
    return res;
  };

  const updateProfile = async (data: UpdateProfileInput): Promise<UserDTO> => {
    const res = await apiRequest<{ user: UserDTO; preference: UserPreferenceDTO | null }>(
      '/api/profile',
      {
        method: 'PATCH',
        body: JSON.stringify(data),
      }
    );
    setUser(res.user);
    if (res.preference) {
      setPreference(res.preference);
    }
    return res.user;
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        preference,
        loading,
        login,
        register,
        logout,
        updatePreferences,
        updateProfile,
        refreshAuth,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
