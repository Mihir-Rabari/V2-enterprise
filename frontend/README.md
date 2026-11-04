<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/drive/1hHy9msJlgA3gZOgn11TI6UOoMM00OF-Q

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`

Set `VITE_API_URL=http://localhost:5000/api/v1` in `.env.local` when running
the frontend against a separately hosted local backend. Leave it unset when
the frontend and API share an origin; client API and media URLs then stay
relative. Set `VITE_USE_MOCK_API=true` only when intentionally using mock
responses in a Vite development build. Production builds always use the real
API.
