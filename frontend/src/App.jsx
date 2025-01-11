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
import TrendGraph from './components/TrendGraph';

const GlassPaper = styled(Paper)(({ theme }) => ({
  backgroundColor: 'rgba(255, 255, 255, 0.9)',
  backdropFilter: 'blur(10px)',
  padding: theme.spacing(3),
  marginBottom: theme.spacing(2)
}));

const App = () => {
  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [analysisResult, setAnalysisResult] = useState(null);

  const API_URL = import.meta.env.PROD 
    ? 'https://grail-meter-production.up.railway.app'
    : 'http://localhost:8000';

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
    setAnalysisResult(null); // Reset previous results

    try {
      const formData = new FormData();
      selectedFiles.forEach((file) => {
        formData.append('files', file);
      });

      const response = await fetch(`${API_URL}/analyze`, {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.detail || 'Failed to analyze images');
      }

      if (!result || typeof result !== 'object') {
        throw new Error('Invalid response from server');
      }

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
          bgcolor: 'background.default',
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
            bgcolor: 'background.default',
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
            borderRadius: 2
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
              color: 'primary.main',
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
              bgcolor: 'background.default',
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
                    bgcolor: 'background.paper',
                    border: '1px solid',
                    borderColor: 'divider'
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
                <Box sx={{ 
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 3
                }}>
                  {Object.entries(analysisResult)
                    .filter(([key]) => key !== 'trend_data' && key !== 'seo_keywords')
                    .map(([key, value]) => (
                      <Box key={key}>
                        <Typography 
                          variant="subtitle1" 
                          color="text.secondary"
                          sx={{ mb: 1, textTransform: 'capitalize' }}
                        >
                          {key}
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

          {/* SEO Keywords */}
          {analysisResult?.seo_keywords?.length > 0 ? (
            <List sx={{ 
              flex: 1,
              overflow: 'auto',
              py: 0
            }}>
              {analysisResult.seo_keywords
                .sort((a, b) => b.volume - a.volume)
                .map((keyword, index) => (
                  <ListItem
                    key={index}
                    divider={index < analysisResult.seo_keywords.length - 1}
                    sx={{
                      px: 2,
                      py: 1.5,
                    }}
                  >
                    <Box sx={{ width: '100%' }}>
                      <Box sx={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'space-between',
                        mb: 1
                      }}>
                        <Typography 
                          variant="body1" 
                          sx={{ 
                            fontWeight: 'medium',
                            color: 'text.primary'
                          }}
                        >
                          {keyword.keyword}
                        </Typography>
                        {keyword.volume && keyword.volume > 0 && (
                          <Typography 
                            variant="caption" 
                            sx={{ 
                              color: 'text.secondary',
                              backgroundColor: 'background.paper',
                              px: 1,
                              py: 0.25,
                              borderRadius: 1
                            }}
                          >
                            {keyword.volume}
                          </Typography>
                        )}
                      </Box>
                      <Box sx={{ 
                        width: '100%',
                        height: 4,
                        bgcolor: 'grey.100',
                        borderRadius: 2,
                        overflow: 'hidden'
                      }}>
                        <Box
                          sx={{
                            width: `${(keyword.volume / Math.max(...analysisResult.seo_keywords.map(k => k.volume || 0))) * 100}%`,
                            height: '100%',
                            bgcolor: 'primary.main',
                            transition: 'width 0.5s ease-in-out'
                          }}
                        />
                      </Box>
                    </Box>
                  </ListItem>
                ))}
            </List>
          ) : (
            <Box sx={{ 
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              p: 3
            }}>
              <Typography color="text.secondary">
                No search volume data available
              </Typography>
            </Box>
          )}

          {/* Trend Graph */}
          {analysisResult.trend_data && analysisResult.trend_data.length > 0 && (
            <Paper 
              elevation={0} 
              sx={{ 
                mt: 4,
                p: 4,
                borderRadius: 3,
                bgcolor: 'background.default',
                border: '1px solid',
                borderColor: 'divider'
              }}
            >
              <Typography 
                variant="h5" 
                gutterBottom 
                sx={{ 
                  mb: 3,
                  fontWeight: 'medium'
                }}
              >
                Market Trend Analysis
              </Typography>
              <TrendGraph 
                title={`${analysisResult.brand} ${analysisResult.category} Trend`}
                trendData={analysisResult.trend_data}
              />
            </Paper>
          )}
        </Box>
      )}
    </Container>
  );
};

export default App;
