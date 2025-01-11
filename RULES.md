# Grail Meter Development Rules

## Data Rules
1. NEVER use synthetic or fake data
2. Always use real data from:
   - Google Trends (PyTrends) for search volumes and trends
   - Gemini API for image analysis
3. All search volumes must show actual numbers from PyTrends
4. Trend graph must always display real historical data

## UI/UX Rules
1. Grid layout must be responsive:
   - Graph on left (md={8})
   - Search volumes on right (md={4})
2. All components must be mobile responsive
3. Camera functionality must work on all devices

## Code Quality Rules
1. Never modify working code unless absolutely necessary
2. Always test changes locally before pushing
3. Keep error handling robust and informative
4. Maintain clean separation of concerns between components

## API Integration Rules
1. PyTrends:
   - Use actual search volumes
   - Include historical trend data
   - Show related keywords with real volumes
2. Gemini:
   - Proper image analysis
   - Accurate brand and category detection

## Deployment Rules
1. Always check deployment status after pushing changes
2. Verify functionality in production environment
3. Monitor error logs for issues

*Note: This is a living document. Rules will be added and updated as needed.*
