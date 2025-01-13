# Grail Meter Development Rules

## Data Rules
1. NEVER use synthetic or fake data
2. Always use real data from:
   - Gemini API for image analysis
3. ONLY focus on the Vercel and Railway deployments

## UI/UX Rules
1. Grid layout must be responsive:
   - Preview image on left (md={6})
   - Analysis results on right (md={6})
2. All components must be mobile responsive
3. Camera functionality must work on all devices

## Code Quality Rules
1. Never modify working code unless absolutely necessary
2. Always test changes locally before pushing
3. Keep error handling robust and informative
4. Maintain clean separation of concerns between components

## Code Modification Rules
1. NEVER modify any working part of the code
2. When adding new features:
   - Only add new code in designated areas
   - Do not touch or modify existing working code
   - If unsure, ask before modifying any existing code
3. Keep all working functionality intact
4. Test new additions in isolation

## API Integration Rules
1. Gemini:
   - Proper image analysis
   - Accurate brand and category detection
   - Support for multiple image analysis

## Critical Development Rules
1. NEVER change working components or models that are already in production
   - If a component or model is working in production, do not modify it unless explicitly requested
   - Maintain consistency with existing implementation patterns
   - Do not switch or suggest switching models/frameworks that are already working

2. Maintain State Awareness
   - Keep track of which models and components we're using
   - Don't suggest changes to core functionality that's already working
   - If unsure about something, check the existing code first before suggesting changes

3. Version Control Best Practices
   - Don't make unnecessary commits or changes
   - Always verify the current implementation before suggesting modifications
   - Keep track of deployment methods and environments

## Current Project State (DO NOT MODIFY)

### Critical Configurations
1. Gemini Model Configuration
   - Model Name: `models/gemini-1.5-flash-latest`
   - This model name must be used in all Gemini API calls
   - Do not switch or suggest alternative models

2. Project Structure
   - Backend: `s:/grail-meter/backend`
   - Frontend: `s:/grail-meter/frontend`
   - Deployment: Railway via GitHub integration

3. API Endpoints
   - Production URL: `https://grail-meter-production.up.railway.app`
   - Main analysis endpoint: `/analyze` (supports multiple images)

4. Environment Requirements
   - GEMINI_API_KEY required in environment
   - No other API keys needed (OpenAI removed)

### Working Features (DO NOT MODIFY)
1. Multiple Image Analysis
   - Frontend supports multiple image upload
   - Backend processes all images together
   - First image shown as preview with navigation controls
   - All images analyzed together for better accuracy

2. Image Processing
   - Automatic conversion to RGB if needed
   - Support for various image formats
   - Error handling for invalid images

3. Analysis Output
   - Structured JSON response with product details
   - Includes brand, category, condition ratings
   - SEO keywords and marketplace-ready descriptions

### Deployment Process
1. All changes must be pushed to the main branch
2. Railway automatically deploys from main branch
3. No manual Railway CLI deployment needed

## Deployment Rules
1. Always check deployment status after pushing changes
2. Verify functionality in production environment
3. Monitor error logs for issues

*Note: This is a living document. Rules will be added and updated as needed.*
