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

  const handleFileSelect = (event) => {
    const files = Array.from(event.target.files);
    setSelectedFiles(files);
    setError(null);
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
      const response = await fetch('http://localhost:8000/upload', {
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
              multiple
              accept="image/*"
              onChange={handleFileSelect}
              style={{ display: 'none' }}
              ref={fileInputRef}
            />
            <CloudUploadIcon sx={{ fontSize: 48, color: 'primary.main', mb: 1 }} />
            <Typography variant="h6" gutterBottom>
              Drop images here or click to select
            </Typography>
            <Typography variant="body2" color="textSecondary">
              Upload multiple photos of your item (front, back, labels, etc.)
            </Typography>
          </Box>

          {selectedFiles.length > 0 && (
            <Box sx={{ mb: 2 }}>
              <Typography variant="subtitle1" gutterBottom>
                Selected Files:
              </Typography>
              {selectedFiles.map((file, index) => (
                <Chip
                  key={index}
                  label={file.name}
                  onDelete={() => {
                    const newFiles = selectedFiles.filter((_, i) => i !== index);
                    setSelectedFiles(newFiles);
                  }}
                  sx={{ m: 0.5 }}
                />
              ))}
            </Box>
          )}

          <Button
            variant="contained"
            onClick={handleAnalyze}
            disabled={selectedFiles.length === 0 || loading}
            fullWidth
            sx={{ mt: 2 }}
          >
            {loading ? (
              <CircularProgress size={24} color="inherit" />
            ) : (
              'Analyze Images'
            )}
          </Button>
        </Paper>

        {error && (
          <Alert severity="error" sx={{ mt: 2 }}>
            {error}
          </Alert>
        )}

        {analysisResult && (
          <Box sx={{ mt: 4 }}>
            <Typography variant="h5" gutterBottom align="center">Analysis Results</Typography>
            
            {/* Image Preview and Item Details */}
            <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
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
                        primary="Brand" 
                        secondary={analysisResult.analysis.brand || 'Unknown'} 
                      />
                    </ListItem>
                    <ListItem>
                      <ListItemText 
                        primary="Category" 
                        secondary={analysisResult.analysis.category || 'Unknown'} 
                      />
                    </ListItem>
                    <ListItem>
                      <ListItemText 
                        primary="Condition" 
                        secondary={`${analysisResult.analysis.condition}/10`} 
                      />
                    </ListItem>
                  </List>
                </Grid>
              </Grid>
            </Paper>

            {/* Trend Graph and Keywords */}
            <Grid container spacing={3}>
              {/* Trend Graph */}
              <Grid item xs={12} md={7}>
                <Paper elevation={2} sx={{ p: 2, height: '100%' }}>
                  <Typography variant="h6" gutterBottom>Search Trend</Typography>
                  {analysisResult.trend_data && analysisResult.trend_data.length > 0 ? (
                    <>
                      {console.log('Trend data:', analysisResult.trend_data)}
                      <TrendGraph 
                        title={`${analysisResult.analysis.brand} ${analysisResult.analysis.category}`}
                        trendData={analysisResult.trend_data}
                      />
                    </>
                  ) : (
                    <Typography color="textSecondary">
                      No trend data available
                    </Typography>
                  )}
                </Paper>
              </Grid>

              {/* SEO Keywords */}
              <Grid item xs={12} md={5}>
                <Paper elevation={2} sx={{ p: 2, height: '100%' }}>
                  <Typography variant="h6" gutterBottom>Top SEO Keywords</Typography>
                  {analysisResult.keywords && analysisResult.keywords.length > 0 ? (
                    <List sx={{ pt: 1 }}>
                      {analysisResult.keywords.map((keyword, index) => (
                        <ListItem 
                          key={index}
                          sx={{ 
                            flexDirection: 'column', 
                            alignItems: 'stretch',
                            py: 1.5
                          }}
                        >
                          <Box sx={{ 
                            display: 'flex', 
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            mb: 0.5
                          }}>
                            <Typography 
                              variant="body1" 
                              sx={{ 
                                fontWeight: index === 0 ? 500 : 400,
                                color: index === 0 ? 'primary.main' : 'text.primary'
                              }}
                            >
                              {keyword.keyword}
                            </Typography>
                            <Typography 
                              variant="body2" 
                              color="textSecondary"
                              sx={{ ml: 2 }}
                            >
                              {keyword.volume}%
                            </Typography>
                          </Box>
                          <LinearProgress 
                            variant="determinate" 
                            value={(keyword.volume / analysisResult.keywords[0].volume) * 100}
                            sx={{ 
                              height: 6,
                              borderRadius: 3,
                              backgroundColor: 'rgba(0,0,0,0.05)',
                              '& .MuiLinearProgress-bar': {
                                borderRadius: 3,
                                backgroundColor: index === 0 ? '#4CAF50' : '#81C784'
                              }
                            }}
                          />
                        </ListItem>
                      ))}
                    </List>
                  ) : (
                    <Box sx={{ 
                      height: '100%', 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center' 
                    }}>
                      <Typography color="textSecondary">
                        No keyword data available
                      </Typography>
                    </Box>
                  )}
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
