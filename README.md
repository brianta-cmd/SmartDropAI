# 💧 SmartDrop AI

SmartDrop AI is an intelligent WhatsApp assistant that helps communities track and predict water availability in their local suburbs. It combines real-time community reporting with Google's Gemini AI to deliver localized predictions directly through WhatsApp.

## 🚀 Architecture

*   **Backend:** Node.js with Express.js
*   **Hosting:** Dockerized container running on Railway (Cloud Run ready)
*   **AI Engine:** Google Gemini 1.5 Pro via Google AI Studio
*   **Messaging Layer:** Meta WhatsApp Cloud API (Graph API v18.0)
*   **Database:** In-memory state machine for conversation routing (with planned Firebase Firestore integration).

## 🧠 How it Works

1.  **Context Injection:** When a user asks for a prediction, the server pulls recent crowdsourced water data from `water_reports.json`.
2.  **AI Prompting:** It dynamically generates a prompt containing the user's selected suburb, language preference (English or Shona), and the recent data, sending it to Gemini.
3.  **WhatsApp Delivery:** Gemini generates an empathetic, factual prediction which the Node server immediately forwards back to the user via Meta's API.

## 🛠️ Local Development

To run this project locally, you will need a Meta Developer Account, a Google AI Studio API Key, and a local tunnel (like `ngrok` or `railway`).

1. Clone the repository:
   ```bash
   git clone <repository_url>
   cd SmartDropAI/functions
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Setup Environment Variables:
   Copy `.env.example` to `.env` and fill in your keys:
   ```bash
   cp .env.example .env
   ```

4. Start the server:
   ```bash
   node server.js
   ```

## 🤖 Conversation State Machine

The bot uses a custom 9-step state machine to track users:
*   **NEW** -> **LANGUAGE** (EN/Shona) -> **NAME** -> **LOCATION** -> **MAIN MENU** -> **AI PREDICTION** -> **COMMUNITY REPORTING**

*Built for GDG Harare Build with AI Hackathon 2026*
