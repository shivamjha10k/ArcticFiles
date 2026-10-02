import React, { useState } from 'react';
import { apiService } from '../services/api';
import { User, Lock, Sparkles, BrainCircuit } from 'lucide-react';

const Login = ({ onLogin }) => {
  const [isRegistering, setIsRegistering] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    
    try {
      if (isRegistering) {
        const res = await apiService.auth.register(username, password);
        if (res.success) {
          setIsRegistering(false);
          setUsername('');
          setPassword('');
          setError('Registration successful! Please login.');
        }
      } else {
        const res = await apiService.auth.login(username, password);
        if (res.success && res.user) {
          localStorage.setItem('user', JSON.stringify(res.user));
          onLogin(res.user);
        }
      }
    } catch (err) {
      setError(err.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-screen w-screen flex items-center justify-center font-inter dark cyber-grid bg-[#0a0a14] overflow-hidden relative">
      
      {/* Decorative Orbs */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-neon-500/20 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-cyber-500/20 rounded-full blur-[120px] pointer-events-none" />

      {/* Main Glass Card */}
      <div className="relative z-10 w-full max-w-md p-8 glass neon-border rounded-2xl shadow-2xl backdrop-blur-xl animate-fade-in-up">
        
        {/* Logo and Header */}
        <div className="flex flex-col items-center justify-center mb-10">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-neon-400 to-cyber-600 flex items-center justify-center mb-4 shadow-[0_0_20px_rgba(217,70,239,0.4)] relative">
             <BrainCircuit className="w-8 h-8 text-white z-10" />
             <div className="absolute inset-0 rounded-full bg-white opacity-20 animate-ping" style={{ animationDuration: '3s' }} />
          </div>
          <h1 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-neon-400 to-cyber-400 tracking-tight">
            ArcticFiles
          </h1>
          <p className="text-gray-400 mt-2 flex items-center gap-2 font-medium">
            <Sparkles className="w-4 h-4 text-neon-400" />
            {isRegistering ? 'Create your neural profile' : 'Access your semantic workspace'}
          </p>
        </div>
        
        {/* Alerts */}
        {error && (
          <div className={`p-4 rounded-xl mb-6 text-sm font-medium border ${
            error.includes('successful') 
              ? 'bg-green-500/10 border-green-500/30 text-green-400' 
              : 'bg-red-500/10 border-red-500/30 text-red-400'
          }`}>
            {error}
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2">
            <label className="text-sm font-semibold text-gray-300 ml-1">Username</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <User className="h-5 w-5 text-gray-500 group-focus-within:text-neon-400 transition-colors" />
              </div>
              <input 
                type="text" 
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter your username"
                className="w-full bg-gray-900/50 border border-gray-700/50 text-white rounded-xl pl-12 pr-4 py-3 focus:outline-none focus:ring-2 focus:ring-neon-500/50 focus:border-neon-500/50 transition-all duration-300 placeholder-gray-600"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold text-gray-300 ml-1">Password</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Lock className="h-5 w-5 text-gray-500 group-focus-within:text-neon-400 transition-colors" />
              </div>
              <input 
                type="password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                className="w-full bg-gray-900/50 border border-gray-700/50 text-white rounded-xl pl-12 pr-4 py-3 focus:outline-none focus:ring-2 focus:ring-neon-500/50 focus:border-neon-500/50 transition-all duration-300 placeholder-gray-600"
                required
              />
            </div>
          </div>
          
          <button 
            type="submit" 
            disabled={loading}
            className="w-full mt-8 py-3.5 px-4 bg-gradient-to-r from-neon-600 to-cyber-600 hover:from-neon-500 hover:to-cyber-500 text-white font-bold rounded-xl shadow-[0_0_15px_rgba(217,70,239,0.3)] hover:shadow-[0_0_25px_rgba(217,70,239,0.5)] transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed transform hover:-translate-y-0.5 active:translate-y-0"
          >
            {loading ? 'Processing...' : (isRegistering ? 'Initialize Profile' : 'Authenticate')}
          </button>
        </form>

        <div className="mt-8 text-center">
          <button 
            onClick={() => { setIsRegistering(!isRegistering); setError(''); }}
            className="text-sm text-gray-400 hover:text-white transition-colors duration-200 border-b border-transparent hover:border-white pb-0.5"
          >
            {isRegistering ? 'Already have an account? Login' : 'Need an account? Register'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Login;
