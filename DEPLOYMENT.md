# Deployment Guide for Thankan.Ayyo

## Quick Deploy to Vercel

1. **Push to GitHub:**
   ```bash
   git add .
   git commit -m "Initial commit"
   git push origin main
   ```

2. **Connect to Vercel:**
   - Go to [vercel.com](https://vercel.com)
   - Import your GitHub repository
   - Framework will be auto-detected as Next.js

3. **Add Environment Variables:**
   In Vercel dashboard → Settings → Environment Variables:
   ```
   GOOGLE_GEMINI_API_KEY = your_api_key_here
   ```

4. **Deploy:**
   - Click "Deploy"
   - Your app will be live in minutes!

## Alternative Deployments

### Netlify
1. Connect your GitHub repo to Netlify
2. Set build command: `npm run build`
3. Set publish directory: `.next`
4. Add environment variable: `GOOGLE_GEMINI_API_KEY`

### Railway
1. Connect GitHub repo
2. Add `GOOGLE_GEMINI_API_KEY` environment variable
3. Railway will auto-deploy

### Self-Hosted
```bash
npm run build
npm start
```

## Environment Variables Needed
- `GOOGLE_GEMINI_API_KEY`: Get from [Google AI Studio](https://makersuite.google.com/app/apikey)

## Tips
- Always test locally before deploying
- Keep your API keys secure
- Enable analytics in production
- Consider rate limiting for public apps
