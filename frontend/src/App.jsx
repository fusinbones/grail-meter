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
import SearchIcon from '@mui/icons-material/Search';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import CameraAltIcon from '@mui/icons-material/CameraAlt';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import BarChartIcon from '@mui/icons-material/BarChart';
import KeywordIcon from '@mui/icons-material/Key';
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

  const API_URL = import.meta.env.VITE_API_URL || (import.meta.env.PROD 
    ? 'https://grail-meter-production.up.railway.app'
    : 'http://localhost:8000');

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
    setAnalysisResult(null);

    try {
      const formData = new FormData();
      selectedFiles.forEach((file) => {
        formData.append('files', file);
      });

      console.log('Sending request to:', API_URL);
      
      const response = await fetch(`${API_URL}/analyze`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Server error:', errorText);
        throw new Error(errorText || 'Failed to analyze images');
      }

      let result;
      try {
        const text = await response.text();
        console.log('Raw response:', text);
        result = JSON.parse(text);
      } catch (e) {
        console.error('Failed to parse JSON response:', e);
        throw new Error('Invalid response format from server');
      }

      if (!result || typeof result !== 'object') {
        console.error('Invalid response:', result);
        throw new Error('Invalid response from server');
      }

      // Ensure trend_data is in the correct format
      if (result.trend_data) {
        result.trend_data = Array.isArray(result.trend_data) ? result.trend_data : [];
      } else {
        result.trend_data = [];
      }

      // Transform seo_keywords to simple strings if they're objects
      if (result.seo_keywords && Array.isArray(result.seo_keywords)) {
        result.seo_keywords = result.seo_keywords.map(kw => 
          typeof kw === 'object' && kw !== null ? kw.keyword : String(kw)
        );
      }

      console.log('Processed analysis result:', result);
      setAnalysisResult(result);
    } catch (err) {
      console.error('Analysis error:', err);
      setError(err.message || 'An error occurred during analysis');
      setAnalysisResult(null);
    } finally {
      setLoading(false);
    }
  };

  const handleCameraCapture = () => {
    // Implement camera capture functionality
  };

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* Header */}
      <Box sx={{ mb: 6, textAlign: 'center' }}>
        <Typography variant="h3" component="h1" gutterBottom sx={{ fontWeight: 'bold', color: 'primary.main' }}>
          Grail Meter
        </Typography>
        <Typography variant="h6" color="text.secondary" sx={{ mb: 4 }}>
          Analyze your items and discover their market trends
        </Typography>
      </Box>

      {/* Main Content */}
      <Paper 
        elevation={0} 
        sx={{ 
          p: 4, 
          borderRadius: 3,
          backgroundColor: '#ffffff',
          border: '1px solid',
          borderColor: 'divider'
        }}
      >
        <Box>
          {/* Upload Section */}
          <Box sx={{ 
            display: 'flex', 
            flexDirection: 'column', 
            alignItems: 'center',
            gap: 2,
            mb: 4
          }}>
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={handleFileSelect}
              style={{ display: 'none' }}
              id="file-input"
            />
            
            {/* Upload Buttons */}
            <Box sx={{ 
              display: 'flex', 
              gap: 2, 
              flexWrap: 'wrap',
              justifyContent: 'center'
            }}>
              <label htmlFor="file-input">
                <Button
                  component="span"
                  variant="contained"
                  startIcon={<UploadFileIcon />}
                  sx={{ 
                    px: 4,
                    py: 1.5,
                    borderRadius: 2,
                    textTransform: 'none',
                    fontSize: '1.1rem'
                  }}
                >
                  Choose Files
                </Button>
              </label>
              <Button
                onClick={handleCameraCapture}
                variant="outlined"
                startIcon={<CameraAltIcon />}
                sx={{ 
                  px: 4,
                  py: 1.5,
                  borderRadius: 2,
                  textTransform: 'none',
                  fontSize: '1.1rem'
                }}
              >
                Take Photo
              </Button>
            </Box>
          </Box>

          {/* Image Preview Grid */}
          {selectedFiles.length > 0 && (
            <Box sx={{ width: '100%', mt: 3 }}>
              <Grid container spacing={3}>
                {Array.from(selectedFiles).map((file, index) => (
                  <Grid item xs={12} sm={6} md={4} key={index}>
                    <Paper
                      elevation={2}
                      sx={{
                        position: 'relative',
                        paddingTop: '100%',
                        borderRadius: 2,
                        overflow: 'hidden',
                        transition: 'transform 0.2s ease-in-out',
                        '&:hover': {
                          transform: 'scale(1.02)'
                        }
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
                          bgcolor: 'background.paper'
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
                          backdropFilter: 'blur(4px)',
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
              <Box sx={{ mt: 4, display: 'flex', justifyContent: 'center' }}>
                <Button
                  variant="contained"
                  onClick={handleAnalyze}
                  disabled={loading}
                  startIcon={loading ? <CircularProgress size={20} /> : <SearchIcon />}
                  sx={{ 
                    px: 6,
                    py: 1.5,
                    borderRadius: 2,
                    textTransform: 'none',
                    fontSize: '1.1rem'
                  }}
                >
                  {loading ? 'Analyzing...' : 'Analyze Images'}
                </Button>
              </Box>
            </Box>
          )}
        </Box>
      </Paper>

      {/* Loading State */}
      {loading && (
        <Paper 
          elevation={0} 
          sx={{ 
            mt: 4,
            p: 4,
            borderRadius: 3,
            backgroundColor: '#ffffff',
            border: '1px solid',
            borderColor: 'divider',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 2
          }}
        >
          <CircularProgress size={40} />
          <Typography variant="h6" color="text.secondary">
            Analyzing your images...
          </Typography>
          <Typography variant="body2" color="text.secondary">
            This may take a few moments
          </Typography>
        </Paper>
      )}

      {/* Error Message */}
      {error && (
        <Alert 
          severity="error" 
          sx={{ 
            mt: 3,
            borderRadius: 2,
            width: '100%',
            backgroundColor: '#fff3f3'
          }}
          action={
            <Button 
              color="inherit" 
              size="small" 
              onClick={() => setError(null)}
            >
              Dismiss
            </Button>
          }
        >
          {error}
        </Alert>
      )}

      {/* Analysis Results */}
      {analysisResult && (
        <Box sx={{ mt: 6 }}>
          <Typography 
            variant="h4" 
            gutterBottom 
            align="center"
            sx={{ 
              fontWeight: 'medium',
              color: '#1976d2',
              mb: 4
            }}
          >
            Analysis Results
          </Typography>
          
          {/* Image Preview and Item Details */}
          <Paper 
            elevation={0} 
            sx={{ 
              p: 4,
              borderRadius: 3,
              backgroundColor: '#ffffff',
              border: '1px solid',
              borderColor: 'divider'
            }}
          >
            <Grid container spacing={4}>
              {/* Image Preview */}
              <Grid item xs={12} md={6}>
                <Box
                  sx={{
                    width: '100%',
                    height: { xs: 300, md: 400 },
                    borderRadius: 3,
                    overflow: 'hidden',
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    backgroundColor: '#ffffff',
                    border: '1px solid',
                    borderColor: 'divider'
                  }}
                >
                  {selectedFiles[0] && (
                    <img
                      src={URL.createObjectURL(selectedFiles[0])}
                      alt="Analyzed item"
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
                <Box sx={{ 
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 3
                }}>
                  {/* Basic Details */}
                  {Object.entries(analysisResult)
                    .filter(([key]) => !['trend_data', 'seo_keywords'].includes(key))
                    .map(([key, value]) => (
                      <Box key={key}>
                        <Typography 
                          variant="subtitle1" 
                          color="text.secondary"
                          sx={{ mb: 1, textTransform: 'capitalize' }}
                        >
                          {key.replace(/_/g, ' ')}
                        </Typography>
                        <Typography 
                          variant="h6"
                          sx={{ 
                            fontWeight: 'medium',
                            color: value === 'Unknown' ? 'text.disabled' : 'text.primary'
                          }}
                        >
                          {value}
                        </Typography>
                      </Box>
                    ))}
                </Box>
              </Grid>
            </Grid>
          </Paper>

          {/* Trend Graph and SEO Keywords */}
          <Paper 
            elevation={0} 
            sx={{ 
              mt: 4,
              p: 4,
              borderRadius: 3,
              backgroundColor: '#ffffff',
              border: '1px solid',
              borderColor: 'divider'
            }}
          >
            <Grid container spacing={4}>
              {/* Trend Graph */}
              <Grid item xs={12} md={8}>
                <Typography variant="h6" gutterBottom>
                  Market Trend Analysis
                </Typography>
                <Box sx={{ height: 400 }}>
                  <TrendGraph trendData={analysisResult.trend_data} />
                </Box>
              </Grid>

              {/* SEO Keywords */}
              <Grid item xs={12} md={4}>
                <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                  <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <SearchIcon color="primary" />
                    Search Volume Analysis
                  </Typography>
                  {analysisResult.seo_keywords && analysisResult.seo_keywords.length > 0 ? (
                    <Box sx={{ 
                      flex: 1,
                      display: 'flex',
                      flexDirection: 'column',
                      height: '400px',
                      overflow: 'hidden',
                      bgcolor: 'background.paper',
                      borderRadius: 1,
                      border: '1px solid',
                      borderColor: 'divider'
                    }}>
                      <List sx={{ 
                        flex: 1,
                        overflow: 'auto',
                        '& .MuiListItem-root': {
                          transition: 'all 0.2s ease-in-out',
                          '&:hover': {
                            bgcolor: 'action.hover',
                            transform: 'translateX(8px)'
                          }
                        }
                      }}>
                        {[...analysisResult.seo_keywords]
                          .sort((a, b) => (b.volume || 0) - (a.volume || 0))
                          .map((keyword, index) => {
                            const volume = typeof keyword === 'object' ? keyword.volume : 0;
                            const maxVolume = Math.max(...analysisResult.seo_keywords.map(k => k.volume || 0));
                            const percentage = (volume / maxVolume) * 100;
                            
                            return (
                              <ListItem 
                                key={index}
                                divider={index < analysisResult.seo_keywords.length - 1}
                                sx={{
                                  position: 'relative',
                                  zIndex: 1,
                                  overflow: 'hidden',
                                  '&::after': {
                                    content: '""',
                                    position: 'absolute',
                                    left: 0,
                                    top: 0,
                                    height: '100%',
                                    width: `${percentage}%`,
                                    bgcolor: 'primary.light',
                                    opacity: 0.1,
                                    zIndex: -1
                                  }
                                }}
                              >
                                <Box sx={{ width: '100%' }}>
                                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                                    <KeywordIcon fontSize="small" color="primary" />
                                    <Typography variant="body1" sx={{ fontWeight: 'medium', flex: 1 }}>
                                      {typeof keyword === 'object' ? keyword.keyword : keyword}
                                    </Typography>
                                  </Box>
                                  {typeof keyword === 'object' && keyword.volume && (
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                      <BarChartIcon fontSize="small" color="action" />
                                      <Typography variant="body2" color="text.secondary">
                                        Volume: {keyword.volume.toLocaleString()}
                                      </Typography>
                                      <Typography 
                                        variant="caption" 
                                        sx={{ 
                                          ml: 'auto',
                                          color: 'primary.main',
                                          bgcolor: 'primary.light',
                                          px: 1,
                                          py: 0.5,
                                          borderRadius: 1,
                                          opacity: 0.9
                                        }}
                                      >
                                        Rank #{index + 1}
                                      </Typography>
                                    </Box>
                                  )}
                                </Box>
                              </ListItem>
                            );
                          })}
                      </List>
                    </Box>
                  ) : (
                    <Box sx={{ 
                      height: 400,
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 2,
                      bgcolor: 'background.paper',
                      borderRadius: 1,
                      border: '1px solid',
                      borderColor: 'divider'
                    }}>
                      <SearchIcon sx={{ fontSize: 48, color: 'text.disabled' }} />
                      <Typography color="text.secondary" align="center">
                        No keyword data available
                      </Typography>
                    </Box>
                  )}
                </Box>
              </Grid>
            </Grid>
          </Paper>
        </Box>
      )}
    </Container>
  );
};

export default App;
