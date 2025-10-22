import React from 'react';
import { useAppContext } from '../App';

const ProfilePage: React.FC = () => {
    const { user } = useAppContext();

    if (!user) {
        return (
            <div className="p-6 text-center text-subtle">
                Loading user profile...
            </div>
        );
    }

    return (
        <div className="p-6">
            <h1 className="text-xl font-semibold text-text mb-6">User Profile</h1>
            <div className="max-w-2xl mx-auto bg-surface border border-border rounded-xl p-6 space-y-4">
                <div>
                    <label className="block text-sm font-medium text-subtle">Email Address</label>
                    <p className="text-text">{user.email}</p>
                </div>
                <div>
                    <label className="block text-sm font-medium text-subtle">User ID</label>
                    <p className="text-text font-mono text-xs">{user.id}</p>
                </div>
                <div>
                    <label className="block text-sm font-medium text-subtle">Last Sign In</label>
                    <p className="text-text">{new Date(user.last_sign_in_at || '').toLocaleString()}</p>
                </div>
                 <div>
                    <label className="block text-sm font-medium text-subtle">Email Confirmed</label>
                    <p className={`text-sm ${user.email_confirmed_at ? 'text-ok' : 'text-warn'}`}>
                        {user.email_confirmed_at ? `On ${new Date(user.email_confirmed_at).toLocaleDateString()}` : 'Pending confirmation'}
                    </p>
                </div>
            </div>
        </div>
    );
};

export default ProfilePage;