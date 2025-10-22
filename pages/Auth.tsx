import React, { useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { NotificationType } from '../types';
import { Loader2, Eye, EyeOff } from 'lucide-react';

const getSupabaseClient = () => {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_ANON_KEY;
    if (url && key) {
        return createClient(url, key);
    }
    return null;
}

interface AuthPageProps {
    addNotification: (message: string, type?: NotificationType) => void;
}

const AuthPage: React.FC<AuthPageProps> = ({ addNotification }) => {
    const [authView, setAuthView] = useState<'signIn' | 'signUp' | 'forgotPassword'>('signIn');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    const handleAuthAction = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (authView === 'signUp' && password !== confirmPassword) {
            addNotification("Passwords do not match.", 'error');
            return;
        }

        setLoading(true);
        const supabase = getSupabaseClient();
        if (!supabase) {
            addNotification('Supabase client not configured.', 'error');
            setLoading(false);
            return;
        }

        try {
            if (authView === 'signIn') {
                const { error } = await supabase.auth.signInWithPassword({ email, password });
                if (error) throw error;
                addNotification('Signed in successfully!', 'success');
            } else if (authView === 'signUp') {
                const { error } = await supabase.auth.signUp({ email, password });
                if (error) throw error;
                addNotification('Confirmation email sent! Please check your inbox.', 'info');
            } else if (authView === 'forgotPassword') {
                const { error } = await supabase.auth.resetPasswordForEmail(email, {
                    redirectTo: 'http://localhost:3000',
                });
                if (error) throw error;
                addNotification('Password reset link sent! Please check your inbox.', 'info');
            }
        } catch (error) {
            const message = error instanceof Error ? error.message : "An unknown error occurred.";
            addNotification(message, 'error');
        } finally {
            setLoading(false);
        }
    };

    const PasswordInput: React.FC<{
        value: string;
        onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
        placeholder: string;
        show: boolean;
        toggleShow: () => void;
    }> = ({ value, onChange, placeholder, show, toggleShow }) => (
        <div className="relative">
            <input
                type={show ? 'text' : 'password'}
                placeholder={placeholder}
                value={value}
                onChange={onChange}
                required
                className="w-full bg-background border border-border rounded-lg p-3 pr-10 focus:ring-2 focus:ring-primary focus:outline-none"
            />
            <button
                type="button"
                onClick={toggleShow}
                className="absolute inset-y-0 right-0 flex items-center pr-3 text-subtle hover:text-text"
                aria-label={show ? 'Hide password' : 'Show password'}
            >
                {show ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
        </div>
    );

    const AuthForm = () => (
        <form onSubmit={handleAuthAction} className="space-y-4">
            <input
                type="email"
                placeholder="Email address"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                className="w-full bg-background border border-border rounded-lg p-3 focus:ring-2 focus:ring-primary focus:outline-none"
            />
            {authView !== 'forgotPassword' && (
                <PasswordInput
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="Password"
                    show={showPassword}
                    toggleShow={() => setShowPassword(prev => !prev)}
                />
            )}
            {authView === 'signUp' && (
                 <PasswordInput
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    placeholder="Confirm Password"
                    show={showConfirmPassword}
                    toggleShow={() => setShowConfirmPassword(prev => !prev)}
                />
            )}
            <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center p-3 rounded-lg bg-primary text-white font-semibold hover:opacity-90 disabled:opacity-50 transition-opacity"
            >
                {loading && <Loader2 size={20} className="animate-spin mr-2" />}
                {authView === 'signIn' && 'Sign In'}
                {authView === 'signUp' && 'Sign Up'}
                {authView === 'forgotPassword' && 'Send Reset Link'}
            </button>
        </form>
    );

    return (
        <div className="h-screen w-screen bg-background font-sans auth-waves">
            <div className="wave wave1"></div>
            <div className="wave wave2"></div>
            <div className="relative z-10 flex items-center justify-center h-full p-4">
                <div className="w-full max-w-md mx-auto">
                    <div className="text-center mb-8">
                        <img src="https://eburon.vercel.app/logo-dark.png" alt="Eburon Logo" className="h-[55px] w-[140px] object-contain mx-auto mb-4 dark:invert-0 invert" />
                        <h1 className="text-2xl font-bold text-text">Welcome to Eburon Studio</h1>
                        <p className="text-subtle">
                            {authView === 'signIn' && 'Sign in to continue to your workspace.'}
                            {authView === 'signUp' && 'Create an account to get started.'}
                            {authView === 'forgotPassword' && 'Enter your email to reset your password.'}
                        </p>
                    </div>

                    <div className="bg-surface/80 backdrop-blur-sm border border-border rounded-xl p-8 shadow-2xl">
                        {AuthForm()}
                        <div className="mt-6 text-center text-sm">
                            {authView === 'signIn' && (
                                <>
                                    <p className="text-subtle">
                                        Don't have an account?{' '}
                                        <button onClick={() => setAuthView('signUp')} className="font-medium text-primary hover:underline">Sign up</button>
                                    </p>
                                    <button onClick={() => setAuthView('forgotPassword')} className="mt-2 font-medium text-subtle hover:text-primary hover:underline text-xs">Forgot password?</button>
                                </>
                            )}
                            {(authView === 'signUp' || authView === 'forgotPassword') && (
                                <p className="text-subtle">
                                    Already have an account?{' '}
                                    <button onClick={() => setAuthView('signIn')} className="font-medium text-primary hover:underline">Sign in</button>
                                </p>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AuthPage;