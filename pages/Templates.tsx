import React from 'react';
import { Bot, Plus } from 'lucide-react';
import { useAppContext, createSystemPrompt } from '../App';
import { TemplateAgent } from '../types';

const agentTemplates: TemplateAgent[] = [
  // E-commerce
  { name: 'Shopify Support Pro', company: 'Shopify Store', category: 'E-commerce', language: 'Multilingual', voice: 'Citrine', voiceDescription: 'Bright, helpful, and efficient.', personaShortText: 'Expertly handles order inquiries and returns for Shopify stores.', tools: ['Knowledge', 'Webhook'], introSpiel: { type: 'Warm' }, persona: '' },
  { name: 'Fashion Nova Returns', company: 'Fashion Nova', category: 'E-commerce', language: 'Multilingual', voice: 'Lyra', voiceDescription: 'Youthful, trendy, and understanding.', personaShortText: 'Manages fashion returns and exchanges with a casual, friendly vibe.', tools: ['Knowledge'], introSpiel: { type: 'Warm' }, persona: '' },
  { name: 'Amazon Order Desk', company: 'Amazon', category: 'E-commerce', language: 'Multilingual', voice: 'Echo', voiceDescription: 'Neutral, direct, and highly efficient.', personaShortText: 'Processes Amazon orders, tracks packages, and handles basic inquiries.', tools: ['Webhook'], introSpiel: { type: 'Concise' }, persona: '' },
  // Finance
  { name: 'Chase Bank Inquiries', company: 'Chase Bank', category: 'Finance', language: 'Multilingual', voice: 'Onyx', voiceDescription: 'Authoritative, secure, and professional.', personaShortText: 'Assists with bank account balances, transaction history, and general inquiries.', tools: ['Knowledge', 'Salesforce Lookup'], introSpiel: { type: 'Concise' }, persona: '' },
  { name: 'Amex Fraud Alert', company: 'American Express', category: 'Finance', language: 'Multilingual', voice: 'Helios', voiceDescription: 'Calm, serious, and reassuring.', personaShortText: 'Handles suspected fraudulent transactions and card security.', tools: ['Salesforce Lookup'], introSpiel: { type: 'Concise' }, persona: '' },
  { name: 'Wealthfront Onboarding', company: 'Wealthfront', category: 'Finance', language: 'Multilingual', voice: 'Diamond', voiceDescription: 'Clear, sophisticated, and encouraging.', personaShortText: 'Guides new users through the investment account setup process.', tools: ['Knowledge'], introSpiel: { type: 'Warm' }, persona: '' },
  // Travel
  { name: 'Turkish Airlines Reservations', company: 'Turkish Airlines', category: 'Travel', language: 'Multilingual', voice: 'Amber', voiceDescription: 'Warm, welcoming, and professional, with a hint of an international accent.', personaShortText: 'Manages flight bookings, changes, and provides flight information.', tools: ['Calendar', 'Webhook'], introSpiel: { type: 'Warm' }, persona: '' },
  { name: 'Expedia Bookings', company: 'Expedia', category: 'Travel', language: 'Multilingual', voice: 'Peridot', voiceDescription: 'Pleasant, approachable, and helpful.', personaShortText: 'Helps book hotels, flights, and vacation packages.', tools: ['Webhook', 'Calendar'], introSpiel: { type: 'Warm' }, persona: '' },
  { name: 'Marriott Concierge', company: 'Marriott', category: 'Travel', language: 'Multilingual', voice: 'Jade', voiceDescription: 'Serene, smooth, and accommodating.', personaShortText: 'Provides hotel information, books amenities, and offers local recommendations.', tools: ['Knowledge', 'Calendar'], introSpiel: { type: 'Warm' }, persona: '' },
  // Healthcare
  { name: 'BlueCross Pre-auth', company: 'BlueCross', category: 'Healthcare', language: 'Multilingual', voice: 'Calypso', voiceDescription: 'Mature, reassuring, and meticulous.', personaShortText: 'Handles pre-authorization requests for medical procedures.', tools: ['Knowledge'], introSpiel: { type: 'Concise' }, persona: '' },
  { name: 'CVS Pharmacy Refills', company: 'CVS Pharmacy', category: 'Healthcare', language: 'Multilingual', voice: 'Aura', voiceDescription: 'Neutral, clear, and discreet.', personaShortText: 'Processes prescription refill requests and provides pickup information.', tools: ['Webhook'], introSpiel: { type: 'Concise' }, persona: '' },
  { name: 'Kaiser Appointment Setter', company: 'Kaiser Permanente', category: 'Healthcare', language: 'Multilingual', voice: 'Orion', voiceDescription: 'Calm, professional, and trustworthy.', personaShortText: 'Schedules and manages doctor appointments for members.', tools: ['Calendar'], introSpiel: { type: 'Concise' }, persona: '' },
  // Utilities
  { name: 'PG&E Outage Report', company: 'PG&E', category: 'Utilities', language: 'Multilingual', voice: 'Onyx', voiceDescription: 'Clear, direct, and informative.', personaShortText: 'Reports power outages and provides estimated restoration times.', tools: ['Webhook'], introSpiel: { type: 'Concise' }, persona: '' },
  { name: 'Comcast Billing', company: 'Comcast', category: 'Utilities', language: 'Multilingual', voice: 'Echo', voiceDescription: 'Neutral, patient, and methodical.', personaShortText: 'Assists with billing questions and processes payments.', tools: ['Payments', 'Salesforce Lookup'], introSpiel: { type: 'Concise' }, persona: '' },
  // Tech Support
  { name: 'AppleCare Support', company: 'Apple', category: 'Tech Support', language: 'Multilingual', voice: 'Diamond', voiceDescription: 'Intelligent, patient, and articulate.', personaShortText: 'Troubleshoots issues with Apple devices and software.', tools: ['Knowledge', 'Webhook'], introSpiel: { type: 'Warm' }, persona: '' },
  { name: 'GoDaddy Domain Help', company: 'GoDaddy', category: 'Tech Support', language: 'Multilingual', voice: 'Citrine', voiceDescription: 'Energetic, positive, and solution-oriented.', personaShortText: 'Helps customers with domain registration and website builder issues.', tools: ['Knowledge', 'HubSpot Update'], introSpiel: { type: 'Warm' }, persona: '' },
  // Miscellaneous
  { name: 'DoorDash Order Status', company: 'DoorDash', category: 'Miscellaneous', language: 'Multilingual', voice: 'Lyra', voiceDescription: 'Upbeat, quick, and friendly.', personaShortText: 'Provides real-time status updates on food delivery orders.', tools: ['Webhook'], introSpiel: { type: 'Concise' }, persona: '' },
  { name: 'FedEx Package Tracker', company: 'FedEx', category: 'Miscellaneous', language: 'Multilingual', voice: 'Orion', voiceDescription: 'Reliable, clear, and efficient.', personaShortText: 'Tracks packages and provides delivery information.', tools: ['Webhook'], introSpiel: { type: 'Concise' }, persona: '' },
  { name: 'Spectrum Internet Sales', company: 'Spectrum', category: 'Miscellaneous', language: 'Multilingual', voice: 'Peridot', voiceDescription: 'Persuasive, friendly, and informative.', personaShortText: 'Presents internet plans to potential new customers.', tools: ['Knowledge', 'HubSpot Update'], introSpiel: { type: 'Warm' }, persona: '' },
  { name: 'City of Miami 311', company: 'City of Miami', category: 'Miscellaneous', language: 'Multilingual', voice: 'Aura', voiceDescription: 'Polite, calm, and helpful.', personaShortText: 'A general-purpose agent for non-emergency city service requests.', tools: ['Knowledge', 'Webhook'], introSpiel: { type: 'Concise' }, persona: '' },
];

const TemplatesPage: React.FC = () => {
  const { createAgent } = useAppContext();
  const categories = [...new Set(agentTemplates.map(t => t.category))];

  const handleCreateFromTemplate = (template: TemplateAgent) => {
    const { category, company, ...agentData } = template;
    const finalPersona = createSystemPrompt(agentData.name, company, agentData.voiceDescription);
    createAgent({ ...agentData, persona: finalPersona }, true);
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-text">Agent Templates</h1>
        <p className="text-subtle">Jumpstart your project with pre-built agents for common use cases.</p>
      </div>
      <div className="space-y-8">
        {categories.map(category => (
          <div key={category}>
            <h2 className="text-lg font-semibold text-text mb-4">{category}</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {agentTemplates.filter(t => t.category === category).map(template => (
                <div key={template.name} className="bg-surface border border-border rounded-xl p-4 flex flex-col justify-between hover:shadow-xl hover:-translate-y-1 transition-all">
                  <div>
                    <div className="flex items-start justify-between mb-2">
                        <Bot size={24} className="text-primary" />
                        <span className="text-xs bg-panel px-2 py-1 rounded-full font-medium">{template.voice}</span>
                    </div>
                    <h3 className="font-semibold text-text">{template.name}</h3>
                    <p className="text-sm text-subtle mt-1 h-16">{template.personaShortText}</p>
                  </div>
                  <button
                    onClick={() => handleCreateFromTemplate(template)}
                    className="w-full mt-4 flex items-center justify-center space-x-2 bg-primary text-white font-semibold px-4 py-2 rounded-lg hover:opacity-90 transition-opacity"
                  >
                    <Plus size={18} />
                    <span>Create Agent</span>
                  </button>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default TemplatesPage;
