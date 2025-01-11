import React, { useState, useRef } from 'react';
import {
  Container,
  Box,
  Typography,
  Paper,
  Button,
  Grid,
  List,
  ListItem,
  ListItemText,
  LinearProgress,
  Alert,
  CircularProgress,
  IconButton,
  ButtonGroup,
} from '@mui/material';
import { styled } from '@mui/material/styles';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import CloseIcon from '@mui/icons-material/Close';
import PhotoCameraIcon from '@mui/icons-material/PhotoCamera';
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
  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [analysisResult, setAnalysisResult] = useState(null);

  const handleFileSelect = (event) => {
    const files = Array.from(event.target.files);
    if (files.length > 0) {
      // Validate file types
      const validFiles = files.filter(file => 
        file.type.startsWith('image/')
      );
      
      if (validFiles.length === 0) {
        setError('Please select valid image files (JPG, PNG, GIF)');
        return;
      }

      setSelectedFiles(prevFiles => [...prevFiles, ...validFiles]);
      event.target.value = ''; // Reset input
    }
  };

  const handleRemoveImage = (index) => {
    setSelectedFiles(prevFiles => 
      prevFiles.filter((_, i) => i !== index)
    );
  };

  const handleAnalyze = async () => {
    if (selectedFiles.length === 0) {
      setError('Please select at least one image to analyze');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const formData = new FormData();
      selectedFiles.forEach((file) => {
        formData.append('files', file);
      });

      const response = await fetch('http://localhost:8000/analyze', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Failed to analyze images');
      }

      const result = await response.json();
      setAnalysisResult(result);
      setSelectedFiles([]); // Clear selected files after successful analysis
    } catch (err) {
      setError(err.message || 'An error occurred during analysis');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container maxWidth="lg" sx={{ my: 4, pb: 4 }}>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom align="center">
          Grail Meter
        </Typography>
        <Typography variant="subtitle1" align="center" color="textSecondary" gutterBottom>
          Upload your fashion item to get instant market analysis and trend insights
        </Typography>
        
        <Paper elevation={3} sx={{ p: 3, mb: 3 }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <ButtonGroup variant="contained" sx={{ mb: 2 }}>
              <Button
                component="label"
                startIcon={<CloudUploadIcon />}
              >
                Upload Photos
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={handleFileSelect}
                  style={{ display: 'none' }}
                />
              </Button>
              <Button
                component="label"
                startIcon={<PhotoCameraIcon />}
              >
                Take Photo
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={handleFileSelect}
                  style={{ display: 'none' }}
                />
              </Button>
            </ButtonGroup>

            {/* Image Preview Grid */}
            {selectedFiles.length > 0 && (
              <Box sx={{ width: '100%', mt: 2 }}>
                <Grid container spacing={2}>
                  {Array.from(selectedFiles).map((file, index) => (
                    <Grid item xs={12} sm={6} md={4} key={index}>
                      <Paper
                        elevation={2}
                        sx={{
                          position: 'relative',
                          paddingTop: '100%',
                          borderRadius: 1,
                          overflow: 'hidden',
                        }}
                      >
                        <Box
                          component="img"
                          src={URL.createObjectURL(file)}
                          alt={`Preview ${index + 1}`}
                          sx={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            width: '100%',
                            height: '100%',
                            objectFit: 'contain',
                            bgcolor: 'background.default'
                          }}
                        />
                        <IconButton
                          size="small"
                          onClick={() => handleRemoveImage(index)}
                          sx={{
                            position: 'absolute',
                            top: 8,
                            right: 8,
                            bgcolor: 'rgba(255, 255, 255, 0.9)',
                            '&:hover': {
                              bgcolor: 'rgba(255, 255, 255, 1)'
                            }
                          }}
                        >
                          <CloseIcon fontSize="small" />
                        </IconButton>
                      </Paper>
                    </Grid>
                  ))}
                </Grid>

                {/* Analyze Button */}
                <Box sx={{ mt: 3, display: 'flex', justifyContent: 'center' }}>
                  <Button
                    variant="contained"
                    onClick={handleAnalyze}
                    disabled={loading}
                    startIcon={loading ? <CircularProgress size={20} /> : null}
                  >
                    {loading ? 'Analyzing...' : 'Analyze Images'}
                  </Button>
                </Box>
              </Box>
            )}
          </Box>
        </Paper>

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
                      height: { xs: 300, md: 400 },
                      borderRadius: 2,
                      overflow: 'hidden',
                      display: 'flex',
                      justifyContent: 'center',
                      alignItems: 'center',
                      bgcolor: 'rgba(0,0,0,0.03)'
                    }}
                  >
                    {selectedFiles[0] && (
                      <img
                        src={URL.createObjectURL(selectedFiles[0])}
                        alt="Uploaded item"
                        style={{
                          width: '100%',
                          height: '100%',
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

            {/* SEO Keywords and Trend Graph */}
            <Grid container spacing={3}>
              {/* Trend Graph */}
              <Grid item xs={12} md={7}>
                <Paper 
                  elevation={3} 
                  sx={{ 
                    p: 3,
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    overflow: 'hidden'
                  }}
                >
                  <Typography variant="h6" sx={{ mb: 3, px: 1 }}>Market Trend</Typography>
                  {analysisResult.trend_data && analysisResult.trend_data.length > 0 ? (
                    <Box sx={{ 
                      flex: 1,
                      minHeight: 400,
                      maxHeight: 450,
                      width: '100%',
                      position: 'relative',
                    }}>
                      <TrendGraph 
                        title={`${analysisResult.brand} ${analysisResult.category}`}
                        trendData={analysisResult.trend_data}
                      />
                    </Box>
                  ) : (
                    <Box sx={{ 
                      flex: 1,
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center',
                      flexDirection: 'column',
                      gap: 2
                    }}>
                      <Typography variant="body1" color="textSecondary">
                        No trend data available
                      </Typography>
                      <Typography variant="body2" color="textSecondary">
                        Try a different search term or check back later
                      </Typography>
                    </Box>
                  )}
                </Paper>
              </Grid>

              {/* SEO Keywords */}
              <Grid item xs={12} md={5}>
                <Paper elevation={3} sx={{ p: 3, height: '100%', minHeight: { xs: 400, md: 500 } }}>
                  <Typography variant="h6" gutterBottom>SEO Keywords</Typography>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    {analysisResult.seo_keywords && 
                      [...analysisResult.seo_keywords]
                        .sort((a, b) => b.volume - a.volume)
                        .map((keywordObj, index) => (
                          <Box
                            key={index}
                            sx={{
                              display: 'flex',
                              flexDirection: 'column',
                              gap: 1
                            }}
                          >
                            <Box sx={{ 
                              display: 'flex', 
                              justifyContent: 'space-between',
                              alignItems: 'center'
                            }}>
                              <Typography 
                                variant="body1" 
                                sx={{ 
                                  fontWeight: index === 0 ? 500 : 400,
                                  color: index === 0 ? 'primary.main' : 'text.primary'
                                }}
                              >
                                {keywordObj.keyword}
                              </Typography>
                              <Typography 
                                variant="body2" 
                                color="textSecondary"
                              >
                                {keywordObj.volume.toLocaleString()} searches
                              </Typography>
                            </Box>
                            <LinearProgress 
                              variant="determinate" 
                              value={(keywordObj.volume / 1000) * 100}
                              sx={{ 
                                height: 6,
                                borderRadius: 3,
                                backgroundColor: 'rgba(0,0,0,0.05)',
                                '& .MuiLinearProgress-bar': {
                                  borderRadius: 3,
                                  backgroundColor: index === 0 ? 'primary.main' : 'primary.light'
                                }
                              }}
                            />
                          </Box>
                        ))
                    }
                  </Box>
                </Paper>
              </Grid>
            </Grid>
          </Box>
        )}
      </Box>
    </Container>
  );
};

export default App;
