import React from 'react';
import Tooltip from '../components/Tooltip';
import { Lock } from 'lucide-react';

const IntegrationCard: React.FC<{
  iconClass: string;
  title: string;
  description: string;
  isComingSoon?: boolean;
}> = ({ iconClass, title, description, isComingSoon }) => {
  return (
    <div className="bg-surface border border-border rounded-xl p-4 relative overflow-hidden">
      {isComingSoon && (
        <div className="absolute top-2 right-2">
          <Tooltip text="This feature is under development and will be available soon.">
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-warn/20 text-warn">
              <Lock size={12} className="mr-1.5" />
              Under Development
            </span>
          </Tooltip>
        </div>
      )}
      <div className="flex items-center space-x-4">
        <div className="flex-shrink-0">
          <i className={`${iconClass} text-4xl`}></i>
        </div>
        <div>
          <h3 className="text-lg font-semibold text-text">{title}</h3>
          <p className="text-sm text-subtle mt-1">{description}</p>
        </div>
      </div>
      <div className="mt-4">
        <button
          disabled={isComingSoon}
          className="w-full bg-panel text-text font-semibold px-4 py-2 rounded-lg hover:bg-border transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isComingSoon ? 'Coming Soon' : 'Configure'}
        </button>
      </div>
    </div>
  );
};

const IntegrationsPage: React.FC = () => {
  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-text">Integrations</h1>
        <p className="text-subtle">Connect Eburon Studio to your favorite tools and services.</p>
      </div>
      <div className="space-y-8">
        <div>
          <h2 className="text-lg font-semibold text-text mb-4">Google Services</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <IntegrationCard
              iconClass="fa-brands fa-google-drive text-green-500"
              title="Google Drive"
              description="Connect documents and sheets for knowledge base."
              isComingSoon
            />
            <IntegrationCard
              iconClass="fa-regular fa-calendar-days text-blue-500"
              title="Google Calendar"
              description="Enable agents to book and manage appointments."
              isComingSoon
            />
            <IntegrationCard
              iconClass="fa-regular fa-envelope text-red-500"
              title="Gmail"
              description="Allow agents to send emails and follow-ups."
              isComingSoon
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default IntegrationsPage;
