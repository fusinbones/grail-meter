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

  const handleImageUpload = (event) => {
    const files = Array.from(event.target.files);
    setSelectedFiles(prevFiles => [...prevFiles, ...files]);
    setError(null);
  };

  const handleCameraCapture = (event) => {
    const files = Array.from(event.target.files);
    setSelectedFiles(prevFiles => [...prevFiles, ...files]);
    setError(null);
  };

  const handleDrop = (event) => {
    event.preventDefault();
    const files = Array.from(event.dataTransfer.files);
    setSelectedFiles(prevFiles => [...prevFiles, ...files]);
    setError(null);
  };

  const handleDragOver = (event) => {
    event.preventDefault();
  };

  const handleAnalyze = async () => {
    if (selectedFiles.length === 0) {
      setError('Please select at least one image');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('file', selectedFiles[0]);

      const response = await fetch(`${import.meta.env.VITE_API_URL}/analyze`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Failed to analyze image');
      }

      const data = await response.json();
      setAnalysisResult(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveImage = (index) => {
    setSelectedFiles(prevFiles => prevFiles.filter((_, i) => i !== index));
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
        
        <Paper
          elevation={3}
          sx={{
            p: 3,
            backgroundColor: 'rgba(255, 255, 255, 0.9)',
            backdropFilter: 'blur(10px)'
          }}
        >
          {/* Upload Box */}
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
            onDrop={handleDrop}
            onDragOver={handleDragOver}
          >
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={handleImageUpload}
              style={{ display: 'none' }}
              ref={fileInputRef}
            />
            <input
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleCameraCapture}
              style={{ display: 'none' }}
              ref={cameraInputRef}
            />
            
            <Box sx={{ display: 'flex', justifyContent: 'center', mb: 2 }}>
              <ButtonGroup variant="contained">
                <Button
                  onClick={() => fileInputRef.current?.click()}
                  startIcon={<CloudUploadIcon />}
                >
                  Upload Photos
                </Button>
                <Button
                  onClick={() => cameraInputRef.current?.click()}
                  startIcon={<PhotoCameraIcon />}
                >
                  Take Photo
                </Button>
              </ButtonGroup>
            </Box>
            
            <Typography variant="body2" color="textSecondary">
              Supported formats: JPG, PNG, GIF
            </Typography>
            <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
              Or drag and drop your images here
            </Typography>
          </Box>

          {/* Selected Images Preview */}
          {selectedFiles.length > 0 && (
            <Box sx={{ mt: 2 }}>
              <Grid container spacing={2}>
                {selectedFiles.map((file, index) => (
                  <Grid item xs={6} sm={4} md={3} key={index}>
                    <Box
                      sx={{
                        position: 'relative',
                        paddingTop: '100%',
                        borderRadius: 1,
                        overflow: 'hidden',
                        bgcolor: 'rgba(0,0,0,0.03)'
                      }}
                    >
                      <img
                        src={URL.createObjectURL(file)}
                        alt={`Selected ${index + 1}`}
                        style={{
                          position: 'absolute',
                          top: 0,
                          left: 0,
                          width: '100%',
                          height: '100%',
                          objectFit: 'cover'
                        }}
                      />
                      <IconButton
                        size="small"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemoveImage(index);
                        }}
                        sx={{
                          position: 'absolute',
                          top: 4,
                          right: 4,
                          bgcolor: 'rgba(255,255,255,0.9)',
                          '&:hover': {
                            bgcolor: 'rgba(255,255,255,1)'
                          }
                        }}
                      >
                        <CloseIcon fontSize="small" />
                      </IconButton>
                    </Box>
                  </Grid>
                ))}
              </Grid>
              
              {/* Analyze Button */}
              <Box sx={{ mt: 2, display: 'flex', justifyContent: 'center' }}>
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
                <Paper elevation={3} sx={{ p: 3, height: '100%', minHeight: { xs: 400, md: 500 } }}>
                  <Typography variant="h6" gutterBottom>Market Trend</Typography>
                  {analysisResult.trend_data && analysisResult.trend_data.length > 0 ? (
                    <Box sx={{ 
                      width: '100%', 
                      height: 'calc(100% - 40px)',
                      '& .recharts-wrapper': {
                        '& .recharts-xAxis .recharts-cartesian-axis-tick-value': {
                          transform: 'translateY(5px)'
                        }
                      }
                    }}>
                      <TrendGraph 
                        title={`${analysisResult.brand} ${analysisResult.category}`}
                        trendData={analysisResult.trend_data}
                      />
                    </Box>
                  ) : (
                    <Box sx={{ 
                      height: 'calc(100% - 40px)', 
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
