import React, { useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { NotificationType } from '../types';
import { Loader2 } from 'lucide-react';

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
    const [loading, setLoading] = useState(false);

    const handleAuthAction = async (e: React.FormEvent) => {
        e.preventDefault();
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
                    redirectTo: window.location.origin,
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

    const AuthForm = () => (
        <form onSubmit={handleAuthAction} className="space-y-4">
            <input
                type="email"
                placeholder="Email address"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                className="w-full bg-background border border-border rounded-lg p-3 focus:ring-2 focus:ring-brand-teal focus:outline-none"
            />
            {authView !== 'forgotPassword' && (
                <input
                    type="password"
                    placeholder="Password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    required={authView !== 'forgotPassword'}
                    className="w-full bg-background border border-border rounded-lg p-3 focus:ring-2 focus:ring-brand-teal focus:outline-none"
                />
            )}
            <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center p-3 rounded-lg bg-brand-teal text-eburon-bg font-semibold hover:opacity-90 disabled:opacity-50"
            >
                {loading && <Loader2 size={20} className="animate-spin mr-2" />}
                {authView === 'signIn' && 'Sign In'}
                {authView === 'signUp' && 'Sign Up'}
                {authView === 'forgotPassword' && 'Send Reset Link'}
            </button>
        </form>
    );

    return (
        <div className="h-screen w-screen bg-background flex items-center justify-center p-4 font-sans">
            <div className="w-full max-w-md mx-auto">
                <div className="text-center mb-8">
                    <img src="https://eburon.vercel.app/logo-dark.png" alt="Eburon Logo" className="h-12 w-12 mx-auto mb-4 dark:invert-0 invert" />
                    <h1 className="text-2xl font-bold text-text">Welcome to Eburon Studio</h1>
                    <p className="text-muted">
                        {authView === 'signIn' && 'Sign in to continue to your workspace.'}
                        {authView === 'signUp' && 'Create an account to get started.'}
                        {authView === 'forgotPassword' && 'Enter your email to reset your password.'}
                    </p>
                </div>

                <div className="bg-card border border-border rounded-xl p-8">
                    {AuthForm()}
                    <div className="mt-6 text-center text-sm">
                        {authView === 'signIn' && (
                            <>
                                <p className="text-muted">
                                    Don't have an account?{' '}
                                    <button onClick={() => setAuthView('signUp')} className="font-medium text-brand-teal hover:underline">Sign up</button>
                                </p>
                                <button onClick={() => setAuthView('forgotPassword')} className="mt-2 font-medium text-muted hover:text-brand-teal hover:underline text-xs">Forgot password?</button>
                            </>
                        )}
                        {(authView === 'signUp' || authView === 'forgotPassword') && (
                            <p className="text-muted">
                                Already have an account?{' '}
                                <button onClick={() => setAuthView('signIn')} className="font-medium text-brand-teal hover:underline">Sign in</button>
                            </p>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AuthPage;
