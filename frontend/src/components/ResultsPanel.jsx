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
    </Box>
  );
};

export default ResultsPanel;
