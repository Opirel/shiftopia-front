# ShifTopia Frontend - Render Deployment Guide

This guide explains how to deploy the ShifTopia Next.js frontend application to Render.

## Prerequisites

- Git repository pushed to GitHub
- Render account (free tier available)
- Node.js 18+ for local development

## Deployment Steps

### 1. Prepare Your Repository

Ensure your repository contains:
- `render.yaml` - Render configuration file
- `.env.production` - Production environment variables
- Updated `package.json` with deployment scripts

### 2. Create a New Web Service on Render

1. **Log in to Render**: Visit [render.com](https://render.com) and sign in
2. **Create New Web Service**: 
   - Click "New +" → "Web Service"
   - Connect your GitHub repository: `https://github.com/Opirel/shiftopia-front.git`
   - Select the repository and branch (`main`)

### 3. Configure Build Settings

Render will automatically detect the `render.yaml` file, but you can also configure manually:

- **Name**: `shiftopia-frontend`
- **Environment**: `Node`
- **Build Command**: `npm install && npm run build`
- **Start Command**: `npm run start`
- **Plan**: Free (or choose your preferred plan)

### 4. Environment Variables Setup

Add these environment variables in Render dashboard:

**Required Variables:**
```
NODE_ENV=production
NEXT_TELEMETRY_DISABLED=1
```

**Optional Variables (configure as needed):**
```
NEXT_PUBLIC_API_URL=https://your-backend-api.onrender.com
NEXT_PUBLIC_APP_URL=https://your-app-name.onrender.com
DATABASE_URL=your-database-connection-string
NEXTAUTH_SECRET=your-nextauth-secret
NEXTAUTH_URL=https://your-app-name.onrender.com
```

### 5. Deploy

1. Click **"Create Web Service"**
2. Render will automatically:
   - Clone your repository
   - Install dependencies
   - Build the application
   - Start the server
3. Monitor the build logs for any issues

### 6. Access Your Application

Once deployment is complete:
- Your app will be available at: `https://your-app-name.onrender.com`
- Custom domains can be configured in the Render dashboard

## Troubleshooting

### Common Issues and Solutions

#### Build Failures
- **Issue**: Dependencies not installing
- **Solution**: Ensure `package.json` and `package-lock.json` are committed

#### Runtime Errors
- **Issue**: Environment variables not found
- **Solution**: Double-check environment variables in Render dashboard

#### "Not Found" Errors
- **Issue**: Client-side routing not working
- **Solution**: Next.js handles this automatically, but ensure `next.config.mjs` is properly configured

#### Slow Build Times
- **Issue**: Build taking too long
- **Solution**: Consider upgrading to a paid Render plan for faster builds

### Local Testing

Before deploying, test your build locally:

```bash
# Install dependencies
npm install

# Build for production
npm run build

# Start production server
npm start
```

Visit `http://localhost:3000` to test your production build.

## Automatic Deployments

Render automatically deploys when you push to your connected branch:

1. Make changes to your code
2. Commit and push to GitHub
3. Render automatically detects changes and redeploys

## Performance Optimization

### For Better Performance:
- Use Next.js Image Optimization (enabled by default)
- Implement proper caching strategies
- Optimize bundle size with tree shaking
- Consider CDN for static assets

### Monitoring:
- Use Render's built-in metrics
- Set up health checks
- Monitor application logs

## Support

- [Render Documentation](https://render.com/docs)
- [Next.js Deployment Guide](https://nextjs.org/docs/deployment)
- [GitHub Repository Issues](https://github.com/Opirel/shiftopia-front/issues)

## Additional Configuration

### Custom Domain Setup:
1. Go to your service in Render dashboard
2. Navigate to "Settings" → "Custom Domains"
3. Add your domain and follow DNS configuration instructions

### SSL Certificate:
- Render provides automatic SSL certificates for all deployments
- Custom domains also get free SSL certificates

---

**Note**: This setup uses Render's free tier. For production applications with high traffic, consider upgrading to a paid plan for better performance and additional features.