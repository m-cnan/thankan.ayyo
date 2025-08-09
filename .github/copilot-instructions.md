# Copilot Instructions for Thankan.Ayyo

<!-- Use this file to provide workspace-specific custom instructions to Copilot. For more details, visit https://code.visualstudio.com/docs/copilot/copilot-customization#_use-a-githubcopilotinstructionsmd-file -->

## Project Overview
This is a Next.js 14+ App Router project for Thankan.Ayyo - a humorous Malayali uncle chatbot with two distinct personality modes.

## Tech Stack
- **Frontend**: Next.js (App Router), TypeScript, Tailwind CSS
- **UI Components**: Shadcn/UI components, Lucide Icons
- **Animations**: Framer Motion
- **AI**: Google Gemini Pro API
- **Deployment**: Vercel

## Key Features
- Chat interface similar to ChatGPT/Claude
- Streaming AI responses from Google Gemini
- Two personality modes: "Thankan Chetan" (sarcastic uncle) and "Thani Thankan" (brutally honest uncle)
- Responsive design with smooth animations
- Mode switching with UI theme changes

## Code Style Guidelines
- Use TypeScript with strict type checking
- Follow Next.js 14+ App Router patterns
- Use Tailwind CSS for styling with mobile-first approach
- Implement proper error handling for AI API calls
- Use server actions and API routes appropriately
- Ensure components are reusable and well-documented

## Character Personalities
- **Thankan Chetan**: Sarcastic, boastful, goes off-topic with old stories, occasionally starts conversations
- **Thani Thankan**: Verbally abusive in a funny way, uses mild Malayalam curse words, still helpful but insulting

## Environment Variables
- GOOGLE_GEMINI_API_KEY: Required for AI functionality
