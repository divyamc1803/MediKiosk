import os

base_dir = "/Users/divyam/.gemini/antigravity/scratch/medikiosk/frontend"

files = {
"src/types/index.ts": """
export type Role = 'PATIENT' | 'DOCTOR' | 'DRIVER' | 'STAFF' | 'ADMIN';
export interface User { id: string; email: string; role: Role; name: string; }
export interface Patient extends User { age: number; gender: string; phone: string; abha_id?: string; language: string; }
""",
"src/api/client.ts": """
import axios from 'axios';
const client = axios.create({ baseURL: '/api' });
client.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});
export const api = {
  auth: {
    login: (data: any) => client.post('/auth/login', data),
    register: (data: any) => client.post('/auth/register', data),
    me: () => client.get('/auth/me'),
  }
};
export default client;
""",
"src/hooks/useAuth.tsx": """
import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../api/client';
import { User } from '../types';

interface AuthContextType { user: User | null; login: (token: string, u: User) => void; logout: () => void; loading: boolean; }
const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const init = async () => {
      const token = localStorage.getItem('token');
      if (token) {
        try {
          const res = await api.auth.me();
          setUser(res.data);
        } catch { localStorage.removeItem('token'); }
      }
      setLoading(false);
    };
    init();
  }, []);

  const login = (token: string, u: User) => {
    localStorage.setItem('token', token);
    setUser(u);
  };
  const logout = () => {
    localStorage.removeItem('token');
    setUser(null);
  };

  return <AuthContext.Provider value={{ user, login, logout, loading }}>{children}</AuthContext.Provider>;
};
export const useAuth = () => useContext(AuthContext);
""",
"src/hooks/useWebSocket.ts": """
import { useEffect, useState, useRef } from 'react';

export const useWebSocket = (channel: string) => {
  const [messages, setMessages] = useState<any[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const ws = useRef<WebSocket | null>(null);

  useEffect(() => {
    ws.current = new WebSocket(`ws://localhost:8000/ws/${channel}`);
    ws.current.onopen = () => setIsConnected(true);
    ws.current.onclose = () => setIsConnected(false);
    ws.current.onmessage = (e) => setMessages(prev => [...prev, JSON.parse(e.data)]);
    return () => ws.current?.close();
  }, [channel]);

  const sendMessage = (msg: any) => {
    if (ws.current?.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify(msg));
    }
  };

  return { messages, isConnected, sendMessage };
};
""",
"src/components/ui/Button.tsx": """
import React from 'react';
export const Button = ({ children, onClick, className = '', ...props }: any) => (
  <button onClick={onClick} className={`px-4 py-2 bg-primary-600 text-white rounded hover:bg-primary-700 ${className}`} {...props}>
    {children}
  </button>
);
""",
"src/components/ui/Card.tsx": """
import React from 'react';
export const Card = ({ children, className = '' }: any) => (
  <div className={`bg-white shadow rounded-lg p-4 ${className}`}>{children}</div>
);
""",
"src/components/ui/Badge.tsx": """
import React from 'react';
export const Badge = ({ children, className = '' }: any) => (
  <span className={`px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800 ${className}`}>{children}</span>
);
""",
"src/components/ui/Input.tsx": """
import React from 'react';
export const Input = ({ label, ...props }: any) => (
  <div className="flex flex-col gap-1 mb-4">
    {label && <label className="text-sm font-medium text-gray-700">{label}</label>}
    <input className="border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500" {...props} />
  </div>
);
""",
"src/components/shared/Navbar.tsx": """
import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { Button } from '../ui/Button';

export const Navbar = () => {
  const { user, logout } = useAuth();
  return (
    <nav className="bg-white shadow-sm px-6 py-3 flex justify-between items-center">
      <Link to="/" className="text-xl font-bold text-primary-600">MediKiosk</Link>
      <div className="flex gap-4 items-center">
        {user ? (
          <>
            <span className="text-sm text-gray-600">Hi, {user.name}</span>
            <Button onClick={logout} className="bg-gray-200 text-gray-800 hover:bg-gray-300">Logout</Button>
          </>
        ) : (
          <Link to="/login"><Button>Login</Button></Link>
        )}
      </div>
    </nav>
  );
};
""",
"src/App.tsx": """
import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { AuthProvider } from './hooks/useAuth';
import { Navbar } from './components/shared/Navbar';
import { LandingPage } from './pages/website/LandingPage';
import { LoginPage } from './pages/auth/LoginPage';
import { RegisterPage } from './pages/auth/RegisterPage';

export default function App() {
  return (
    <AuthProvider>
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <main className="flex-grow">
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
          </Routes>
        </main>
      </div>
    </AuthProvider>
  );
}
""",
"src/pages/website/LandingPage.tsx": """
import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../../components/ui/Button';

export const LandingPage = () => (
  <div className="flex flex-col items-center">
    <section className="w-full bg-primary-900 text-white py-20 px-6 text-center">
      <h1 className="text-5xl font-bold mb-4">MEDIKIOSK</h1>
      <p className="text-xl mb-8">Next-generation AI clinical interview and emergency platform</p>
      <div className="flex justify-center gap-4">
        <Link to="/login"><Button className="bg-white text-primary-900 hover:bg-gray-100">Login</Button></Link>
        <Link to="/register"><Button className="border border-white bg-transparent hover:bg-white/10">Register</Button></Link>
      </div>
    </section>
  </div>
);
""",
"src/pages/auth/LoginPage.tsx": """
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';

export const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    login('dummy-token', { id: '1', email, name: 'Test User', role: 'PATIENT' });
    navigate('/');
  };

  return (
    <div className="flex justify-center items-center h-full mt-20">
      <Card className="w-96">
        <h2 className="text-2xl font-bold mb-6 text-center">Login</h2>
        <form onSubmit={handleSubmit}>
          <Input label="Email" type="email" value={email} onChange={(e: any) => setEmail(e.target.value)} required />
          <Input label="Password" type="password" value={password} onChange={(e: any) => setPassword(e.target.value)} required />
          <Button type="submit" className="w-full">Login</Button>
        </form>
      </Card>
    </div>
  );
};
""",
"src/pages/auth/RegisterPage.tsx": """
import React from 'react';
import { Card } from '../../components/ui/Card';

export const RegisterPage = () => (
  <div className="flex justify-center items-center h-full mt-20">
    <Card className="w-96 text-center p-8">
      <h2 className="text-2xl font-bold mb-4">Register</h2>
      <p className="text-gray-600">Registration form goes here.</p>
    </Card>
  </div>
);
"""
}

for filepath, content in files.items():
    full_path = os.path.join(base_dir, filepath)
    os.makedirs(os.path.dirname(full_path), exist_ok=True)
    with open(full_path, "w") as f:
        f.write(content.strip() + "\n")
print("Files generated successfully.")
