# Eburon CSR Studio

**A VAPI-like Contact Center Studio focused on speed and user-friendliness. Create, test, and deploy conversational AI agents in just a few clicks, powered by Gemini.**

Eburon CSR Studio is a web-based interface designed for the rapid development and deployment of advanced conversational AI agents. It provides a comprehensive suite of tools for building, testing, and managing agents, all backed by the power of the Google Gemini API and a secure Supabase backend for data persistence and user management.

![Eburon CSR Studio Screenshot](https://i.imgur.com/your-screenshot.png) <!-- It's recommended to add a screenshot of the app -->

## ✨ Key Features

*   **V-API Inspired Interface:** A clean, intuitive, and efficient UI designed to minimize clicks and streamline the agent creation process.
*   **Comprehensive Agent Builder:** A multi-tab interface to configure every aspect of your agent:
    *   **Identity:** Define the agent's name, persona, and introductory spiel.
    *   **Brain:** Equip agents with tools, set safety levels, and define core behaviors.
    *   **Voice:** Select from a wide range of high-quality voices and customize their tone and speaking rate.
    *   **Knowledge:** Attach documents to create a knowledge base the agent can reference.
    *   **Telephony:** Configure inbound and outbound calling capabilities.
*   **Live Call Simulation:** A realistic, interactive test environment with a functional dialpad, live audio visualizers, and a real-time transcript.
*   **Knowledge Base Management:** Upload PDF, DOCX, or text files directly to Supabase Storage to be indexed and used by your agents.
*   **Call History & Playback:** Review all past calls. Listen to recordings with a synchronized transcript that highlights as the audio plays.
*   **Agent Versioning:** Save snapshots of your agent's configuration, view differences, and restore previous versions.
*   **Secure Backend:** Built on Supabase for authentication, database, and file storage, with Row Level Security (RLS) ensuring users can only access their own data.
*   **Template Library:** Get started quickly by using pre-built templates for various industries like E-commerce, Finance, and Travel.

## 🛠️ Tech Stack

*   **Frontend:** React, TypeScript, Tailwind CSS
*   **AI & Voice:** Google Gemini API (`gemini-2.5-flash-native-audio-preview-09-2025` for live calls, `gemini-2.5-flash-preview-tts` for voice generation)
*   **Backend:** Supabase (Authentication, PostgreSQL Database, Storage)
*   **UI Components:** `lucide-react` for icons

## 🚀 Getting Started

To run this project locally, you'll need a Supabase account and project.

### Prerequisites

1.  A Google account with the Gemini API enabled.
2.  A [Supabase](https://supabase.com/) account and a new project created.

### Setup Instructions

1.  **Clone the repository:**
    ```bash
    git clone <repository-url>
    cd eburon-csr-studio
    ```

2.  **Set up Supabase Database:**
    *   In your Supabase project dashboard, go to the **SQL Editor**.
    *   Click on **+ New query**.
    *   Navigate to the `pages/Database.tsx` file in this project. Copy the entire SQL content from the `schemaContent` constant.
    *   Paste the SQL into the Supabase SQL Editor and click **RUN**. This will create all the necessary tables, types, and security policies.

3.  **Set up Supabase Storage:**
    *   In your Supabase project dashboard, go to **Storage**.
    *   Click on **Create a new bucket**.
    *   Name the bucket `studio`.
    *   Make sure the bucket is **Public**. This is required for accessing call recordings and other assets via URL.
    *   Fine-tune the bucket's access policies as needed for your production environment. The application code handles creating the necessary sub-folders (`call_recordings`, `knowledge_files`).

4.  **Configure Environment Variables:**
    *   You will need two keys from your Supabase project: the **Project URL** and the **`anon` public key**.
    *   Go to **Project Settings** > **API**.
    *   You will find your Project URL and the `anon` key there.
    *   This project expects these keys to be available as environment variables named `SUPABASE_URL` and `SUPABASE_KEY`. Set these up in your development environment.

5.  **Run the Application:**
    *   Once the environment variables are set, you can run the application. Follow the instructions provided by your local development server.
    *   The application should now be running and connected to your Supabase backend. You can sign up for a new account and start building agents.

## 📂 File Structure

```
/
├── public/
├── src/
│   ├── components/      # Reusable React components (Header, LeftNav, etc.)
│   ├── pages/           # Main page components for each view (Home, Agents, Calls, etc.)
│   ├── services/        # Utility functions (e.g., audio processing)
│   ├── App.tsx          # Main application component, context provider, and routing
│   ├── index.tsx        # Entry point for the React application
│   └── types.ts         # TypeScript type definitions
├── index.html           # Main HTML file
└── README.md            # This file
```

## 📄 License

This project is licensed under the MIT License. See the `LICENSE` file for details.
