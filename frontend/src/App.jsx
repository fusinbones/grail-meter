import React, { useState, useRef } from 'react';
import {
  Box,
  Button,
  Container,
  Typography,
  Paper,
  Grid,
  List,
  ListItem,
  ListItemText,
  LinearProgress,
  Alert,
  Chip,
  CircularProgress
} from '@mui/material';
import { styled } from '@mui/material/styles';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import { Line } from 'react-chartjs-2';

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

const GlassPaper = styled(Paper)(({ theme }) => ({
  backgroundColor: 'rgba(255, 255, 255, 0.9)',
  backdropFilter: 'blur(10px)',
  padding: theme.spacing(3),
  marginBottom: theme.spacing(2)
}));

const TrendGraph = ({ title, trendData }) => {
  if (!trendData || !Array.isArray(trendData) || trendData.length === 0) {
    return (
      <Box sx={{ 
        height: 300, 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        flexDirection: 'column',
        gap: 2
      }}>
        <Typography variant="h6" color="textSecondary">
          No trend data available
        </Typography>
        <Typography variant="body2" color="textSecondary">
          Try uploading a different photo or checking back later
        </Typography>
      </Box>
    );
  }

  // Calculate trend direction and percentage
  const firstValue = trendData[0]?.volume || 0;
  const lastValue = trendData[trendData.length - 1]?.volume || 0;
  const trendPercentage = firstValue !== 0 
    ? ((lastValue - firstValue) / firstValue * 100).toFixed(1)
    : 0;
  const trendDirection = trendPercentage > 0 ? 'up' : trendPercentage < 0 ? 'down' : 'stable';
  
  // Calculate average volume
  const avgVolume = (trendData.reduce((sum, point) => sum + point.volume, 0) / trendData.length).toFixed(1);

  const chartData = {
    labels: trendData.map(d => d.date),
    datasets: [{
      label: 'Search Interest',
      data: trendData.map(d => d.volume),
      fill: true,
      borderColor: '#4CAF50',
      backgroundColor: 'rgba(76, 175, 80, 0.1)',
      tension: 0.4,
      pointRadius: 3,
      pointBackgroundColor: '#4CAF50',
      pointBorderColor: '#fff',
      pointBorderWidth: 2,
      pointHoverRadius: 5,
      pointHoverBackgroundColor: '#4CAF50',
      pointHoverBorderColor: '#fff',
      pointHoverBorderWidth: 2,
    }]
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false
      },
      tooltip: {
        backgroundColor: 'rgba(255, 255, 255, 0.9)',
        titleColor: '#000',
        bodyColor: '#666',
        borderColor: '#ddd',
        borderWidth: 1,
        padding: 10,
        displayColors: false,
        callbacks: {
          title: (items) => {
            if (!items.length) return '';
            const date = new Date(items[0].label);
            return date.toLocaleDateString('en-US', { 
              month: 'long', 
              year: 'numeric' 
            });
          },
          label: (item) => `Search Volume: ${item.raw}`
        }
      }
    },
    scales: {
      x: {
        grid: {
          display: false
        },
        ticks: {
          maxTicksLimit: 6,
          callback: function(value, index, values) {
            const date = new Date(this.getLabelForValue(value));
            return date.toLocaleDateString('en-US', { 
              month: 'short'
            });
          }
        }
      },
      y: {
        beginAtZero: true,
        grid: {
          color: 'rgba(0, 0, 0, 0.05)'
        },
        ticks: {
          maxTicksLimit: 5,
          callback: function(value) {
            return value + '%';
          }
        }
      }
    }
  };

  return (
    <Box sx={{ height: 400, position: 'relative' }}>
      <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 500 }}>
          12-Month Search Trend
        </Typography>
        <Box sx={{ display: 'flex', gap: 3 }}>
          <Typography variant="body2" color="textSecondary">
            Average Volume: {avgVolume}%
          </Typography>
          <Typography 
            variant="body2" 
            sx={{ 
              color: trendDirection === 'up' ? 'success.main' 
                : trendDirection === 'down' ? 'error.main' 
                : 'text.secondary'
            }}
          >
            {trendDirection === 'up' ? '↑' : trendDirection === 'down' ? '↓' : '→'} {Math.abs(trendPercentage)}%
          </Typography>
        </Box>
      </Box>
      <Line data={chartData} options={options} />
    </Box>
  );
};

const App = () => {
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef(null);

  const handleImageUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setLoading(true);
    setError(null);
    setAnalysisResult(null);

    const formData = new FormData();
    formData.append('file', file, file.name);

    try {
      console.log('Sending request to backend...');
      const response = await fetch(`${import.meta.env.VITE_API_URL}/analyze`, {
        method: 'POST',
        body: formData,
        headers: {
          'Accept': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(`HTTP error! status: ${response.status}${errorData ? ` - ${JSON.stringify(errorData)}` : ''}`);
      }

      const result = await response.json();
      console.log("Analysis result:", result);
      
      if (result.error) {
        setError(`Analysis error: ${result.error}`);
        return;
      }
      
      if (result.brand === "Unknown" && result.category === "Unknown" && result.condition === 0) {
        setError("Failed to analyze image. Please try again with a clearer image.");
        return;
      }

      setAnalysisResult(result);
    } catch (error) {
      console.error("Error analyzing images:", error);
      setError(`Error analyzing images: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDrop = (event) => {
    event.preventDefault();
    const files = Array.from(event.dataTransfer.files);
    setSelectedFiles(files);
    setError(null);
  };

  const handleDragOver = (event) => {
    event.preventDefault();
  };

  const handleAnalyze = async () => {
    if (selectedFiles.length === 0) {
      setError("Please select at least one image");
      return;
    }

    setLoading(true);
    setError(null);
    setAnalysisResult(null);

    const formData = new FormData();
    selectedFiles.forEach((file) => {
      formData.append('files', file);
    });

    try {
      console.log('Sending request to backend...');
      const response = await fetch(`${import.meta.env.VITE_API_URL}/analyze`, {
        method: 'POST',
        body: formData,
      });

      console.log('Response received:', response);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      console.log('Parsed result:', result);
      
      if (result.error) {
        setError(result.message);
      } else if (result.keywords === "Unable to fetch") {
        setError("Unable to fetch keyword data. Please try again.");
      } else {
        setAnalysisResult(result);
      }
    } catch (err) {
      console.error('Error details:', err);
      setError(`Error analyzing images: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container maxWidth="lg">
      <Box sx={{ my: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom align="center">
          Grail Meter
        </Typography>
        <Typography variant="subtitle1" align="center" color="textSecondary" gutterBottom>
          Upload your fashion item to get instant market analysis and trend insights
        </Typography>
        
        <Paper
          elevation={3}
          sx={{
            p: 3,
            backgroundColor: 'rgba(255, 255, 255, 0.9)',
            backdropFilter: 'blur(10px)'
          }}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
        >
          <Box
            sx={{
              border: '2px dashed #ccc',
              borderRadius: 2,
              p: 3,
              textAlign: 'center',
              mb: 2,
              cursor: 'pointer',
              '&:hover': {
                borderColor: '#666'
              }
            }}
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              style={{ display: 'none' }}
              ref={fileInputRef}
            />
            <CloudUploadIcon sx={{ fontSize: 48, color: 'primary.main', mb: 1 }} />
            <Typography variant="h6" gutterBottom>
              Drop image here or click to select
            </Typography>
            <Typography variant="body2" color="textSecondary">
              Supported formats: JPG, PNG, GIF
            </Typography>
          </Box>
        </Paper>

        {/* Loading State */}
        {loading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
            <CircularProgress />
          </Box>
        )}

        {/* Error Message */}
        {error && (
          <Alert severity="error" sx={{ mt: 2 }}>
            {error}
          </Alert>
        )}

        {/* Analysis Results */}
        {analysisResult && (
          <Box sx={{ mt: 4 }}>
            <Typography variant="h5" gutterBottom align="center">Analysis Results</Typography>
            
            {/* Image Preview and Item Details */}
            <Paper elevation={3} sx={{ p: 3, mb: 3 }}>
              <Grid container spacing={3}>
                {/* Image Preview */}
                <Grid item xs={12} md={6}>
                  <Box
                    sx={{
                      width: '100%',
                      height: 400,
                      borderRadius: 2,
                      overflow: 'hidden',
                      display: 'flex',
                      justifyContent: 'center',
                      alignItems: 'center',
                      bgcolor: 'rgba(0,0,0,0.03)'
                    }}
                  >
                    {selectedFiles.length > 0 && (
                      <img
                        src={URL.createObjectURL(selectedFiles[0])}
                        alt="Uploaded item"
                        style={{
                          maxWidth: '100%',
                          maxHeight: '100%',
                          objectFit: 'contain'
                        }}
                      />
                    )}
                  </Box>
                </Grid>

                {/* Item Details */}
                <Grid item xs={12} md={6}>
                  <Typography variant="h6" gutterBottom>Item Details</Typography>
                  <List>
                    <ListItem>
                      <ListItemText 
                        primary={
                          <Typography variant="subtitle1" sx={{ fontWeight: 500 }}>Brand</Typography>
                        }
                        secondary={
                          <Typography variant="body1" sx={{ mt: 0.5 }}>{analysisResult.brand || 'Unknown'}</Typography>
                        }
                      />
                    </ListItem>
                    <ListItem>
                      <ListItemText 
                        primary={
                          <Typography variant="subtitle1" sx={{ fontWeight: 500 }}>Category</Typography>
                        }
                        secondary={
                          <Typography variant="body1" sx={{ mt: 0.5 }}>{analysisResult.category || 'Unknown'}</Typography>
                        }
                      />
                    </ListItem>
                    <ListItem>
                      <ListItemText 
                        primary={
                          <Typography variant="subtitle1" sx={{ fontWeight: 500 }}>Condition</Typography>
                        }
                        secondary={
                          <Typography variant="body1" sx={{ mt: 0.5 }}>{analysisResult.condition}/10</Typography>
                        }
                      />
                    </ListItem>
                  </List>
                </Grid>
              </Grid>
            </Paper>

            {/* SEO Keywords */}
            <Paper elevation={3} sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>SEO Keywords</Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                {analysisResult.seo_keywords && analysisResult.seo_keywords.map((keyword, index) => (
                  <Chip 
                    key={index}
                    label={keyword}
                    color={index === 0 ? "primary" : "default"}
                    sx={{ 
                      fontSize: '1rem',
                      py: 2.5,
                      bgcolor: index === 0 ? 'primary.main' : 'rgba(0,0,0,0.08)',
                      color: index === 0 ? 'white' : 'text.primary',
                      '&:hover': {
                        bgcolor: index === 0 ? 'primary.dark' : 'rgba(0,0,0,0.12)'
                      }
                    }}
                  />
                ))}
              </Box>
            </Paper>
          </Box>
        )}
      </Box>
    </Container>
  );
};

export default App;
