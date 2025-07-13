# Deployment Guide

## Environment Variables

Before deploying, make sure to set up the following environment variables:

### Required Environment Variables

1. **VITE_API_BASE_URL**
   - Description: Base URL for your API endpoints
   - Example: `http://your-api-domain.com`
   - Default: `http://localhost:3000` (development only)

2. **VITE_SPEECHMATICS_API_KEY**
   - Description: API key for Speechmatics real-time transcription
   - Get your key from: https://portal.speechmatics.com/
   - Required for real-time audio recording functionality

### Setting Environment Variables

#### For Vercel Deployment:

1. Go to your Vercel project dashboard
2. Navigate to Settings > Environment Variables
3. Add each variable with the appropriate value
4. Make sure to set them for all environments (Production, Preview, Development)

**Example API URL**:
```
VITE_API_BASE_URL=http://your-production-api.com
```

#### For Local Development:

Create a `.env` file in the root directory:

```bash
VITE_API_BASE_URL=http://localhost:3000
VITE_SPEECHMATICS_API_KEY=your_speechmatics_api_key_here
```

## Deployment Steps

### 1. Prepare Your Repository

Make sure your code is pushed to a Git repository (GitHub, GitLab, etc.)

### 2. Deploy to Vercel

#### Option A: Via Vercel Dashboard (Recommended)

1. Go to [vercel.com](https://vercel.com)
2. Click "New Project"
3. Import your Git repository
4. Vercel will automatically detect the Vite configuration
5. Set your environment variables in the project settings
6. Deploy!

#### Option B: Via Vercel CLI

1. Install Vercel CLI:
```bash
npm i -g vercel
```

2. Login to Vercel:
```bash
vercel login
```

3. Deploy:
```bash
vercel
```

### 3. Configure Environment Variables

After deployment, make sure to set your environment variables in the Vercel dashboard:

1. Go to your project settings
2. Navigate to "Environment Variables"
3. Add:
   - `VITE_API_BASE_URL` = `http://your-production-api.com`
   - `VITE_SPEECHMATICS_API_KEY` = Your Speechmatics API key

### 4. Test Your Deployment

1. Visit your deployed URL
2. Test the authentication flow
3. Test the real-time recording functionality
4. Test file upload and transcription

## Troubleshooting

### Common Issues

1. **API Connection Issues**
   - **Problem**: API calls failing
   - **Solution**: Verify your `VITE_API_BASE_URL` is correct
   - **Check**: Ensure your API server is running and accessible

2. **404 Errors for Assets**
   - **Problem**: Assets not loading (images, videos)
   - **Solution**: Assets are now properly imported using Vite's asset handling
   - **Status**: ✅ Fixed in this update

3. **Environment Variables Not Working**
   - Make sure variables are prefixed with `VITE_`
   - Check that they're set for the correct environment
   - Redeploy after adding new environment variables

4. **Build Failures**
   - Check the build logs in Vercel dashboard
   - Ensure all dependencies are in `package.json`
   - Verify TypeScript compilation passes locally

5. **CORS Issues**
   - Verify your API server allows requests from your Vercel domain
   - Check CORS settings on your API
   - Ensure your API is accessible from Vercel's servers

### Performance Optimization

The project is already configured with:
- Code splitting for better performance
- Optimized build settings
- Proper caching headers
- Security headers
- Asset optimization

## Support

If you encounter issues:
1. Check the Vercel deployment logs
2. Verify environment variables are set correctly
3. Test locally with `npm run build` and `npm run preview`
4. Ensure your API server is running and accessible 