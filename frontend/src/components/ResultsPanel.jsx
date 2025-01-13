import React from 'react';
import { Box, Typography, Paper, List, ListItem, ListItemText, Link, CircularProgress } from '@mui/material';

const ResultsPanel = ({ results }) => {
  if (!results) return null;

  const { product, ebayListings, averagePrice } = results;

  return (
    <Box sx={{ mt: 4, width: '100%', maxWidth: 800, mx: 'auto' }}>
      {/* Product Details */}
      <Paper elevation={3} sx={{ p: 3, mb: 3 }}>
        <Typography variant="h5" gutterBottom>
          Product Details
        </Typography>
        <Typography><strong>Title:</strong> {product.title}</Typography>
        <Typography><strong>Category:</strong> {product.category}</Typography>
        <Typography><strong>Color:</strong> {product.color}</Typography>
        <Typography><strong>Gender:</strong> {product.gender}</Typography>
        <Typography><strong>Size:</strong> {product.size}</Typography>
        <Typography><strong>Material:</strong> {product.material}</Typography>
      </Paper>

      {/* eBay Listings */}
      <Paper elevation={3} sx={{ p: 3, mb: 3 }}>
        <Typography variant="h5" gutterBottom>
          Current eBay Listings
        </Typography>
        <List>
          {ebayListings.map((listing, index) => (
            <ListItem key={index} divider={index !== ebayListings.length - 1}>
              <ListItemText
                primary={
                  <Link href={listing.url} target="_blank" rel="noopener noreferrer">
                    {listing.title}
                  </Link>
                }
                secondary={
                  <>
                    <Typography component="span" sx={{ display: 'block' }}>
                      Price: ${listing.price.toFixed(2)}
                    </Typography>
                    <Typography component="span" sx={{ display: 'block' }}>
                      Condition: {listing.condition}
                    </Typography>
                  </>
                }
              />
            </ListItem>
          ))}
        </List>

        {/* Average Price with Circle */}
        <Box 
          sx={{ 
            display: 'flex', 
            justifyContent: 'center', 
            alignItems: 'center', 
            mt: 3 
          }}
        >
          <Box 
            sx={{ 
              position: 'relative',
              display: 'inline-flex',
              border: '3px solid #1976d2',
              borderRadius: '50%',
              padding: '2rem',
            }}
          >
            <Typography 
              variant="h4" 
              component="div" 
              sx={{ 
                fontWeight: 'bold',
                color: '#1976d2',
              }}
            >
              ${averagePrice.toFixed(2)}
            </Typography>
            <Typography 
              variant="subtitle1" 
              sx={{ 
                position: 'absolute',
                bottom: '0.5rem',
                width: '100%',
                textAlign: 'center',
                color: '#1976d2',
                fontWeight: 'bold',
              }}
            >
              Average Price
            </Typography>
          </Box>
        </Box>
      </Paper>

      {/* Market Analysis Box */}
      {results.marketMetrics && (
        <Paper elevation={3} sx={{ p: 3, mb: 3 }}>
          <Typography variant="h5" gutterBottom>
            Market Analysis
          </Typography>
          
          <Box sx={{ display: 'flex', justifyContent: 'space-around', alignItems: 'center', mb: 3 }}>
            {/* Sell Through Rate Circle */}
            <Box sx={{ textAlign: 'center' }}>
              <Box sx={{ 
                position: 'relative',
                display: 'inline-flex',
                border: '3px solid #4CAF50',
                borderRadius: '50%',
                padding: '2rem',
              }}>
                <Typography 
                  variant="h4" 
                  component="div" 
                  sx={{ 
                    fontWeight: 'bold',
                    color: '#4CAF50',
                  }}
                >
                  {results.marketMetrics.sellThroughRate}%
                </Typography>
                <Typography 
                  variant="subtitle1" 
                  sx={{ 
                    position: 'absolute',
                    bottom: '0.5rem',
                    width: '100%',
                    textAlign: 'center',
                    color: '#4CAF50',
                    fontWeight: 'bold',
                  }}
                >
                  Sell Rate
                </Typography>
              </Box>
            </Box>

            {/* Market Stats */}
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="h6" color="text.secondary">Market Stats</Typography>
              <Typography><strong>Sold (90d):</strong> {results.marketMetrics.soldCount}</Typography>
              <Typography><strong>Available:</strong> {results.marketMetrics.availableCount}</Typography>
              <Typography><strong>Avg Sold:</strong> ${results.marketMetrics.averageSoldPrice.toFixed(2)}</Typography>
            </Box>
          </Box>

          {/* Recent Sales */}
          <Typography variant="h6" sx={{ mb: 1 }}>Recent Sales</Typography>
          <List>
            {results.marketMetrics.recentSales.map((sale, index) => (
              <ListItem key={index} divider={index !== results.marketMetrics.recentSales.length - 1}>
                <ListItemText
                  primary={sale.title}
                  secondary={
                    <>
                      <Typography component="span" sx={{ display: 'block' }}>
                        Price: ${sale.price.toFixed(2)}
                      </Typography>
                      <Typography component="span" sx={{ display: 'block' }}>
                        Sold: {sale.date}
                      </Typography>
                    </>
                  }
                />
              </ListItem>
            ))}
          </List>
        </Paper>
      )}
    </Box>
  );
};

export default ResultsPanel;
