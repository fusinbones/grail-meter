import React, { useState, useRef } from 'react';
import { Container, Paper, Grid, Typography, Box, Chip, CircularProgress, Button, IconButton } from '@mui/material';
import { styled } from '@mui/material/styles';
import { DropzoneArea } from 'mui-file-dropzone';
import CameraAltIcon from '@mui/icons-material/CameraAlt';
import CloseIcon from '@mui/icons-material/Close';
import './App.css';

const StyledPaper = styled(Paper)(({ theme }) => ({
  backgroundColor: 'transparent',
  boxShadow: 'none',
  height: '100%',
  '& .glass-card': {
    height: '100%',
    display: 'flex',
    flexDirection: 'column'
  }
}));

const ImageContainer = styled(Box)({
  width: '100%',
  height: '400px',
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  overflow: 'hidden',
  borderRadius: '16px',
  background: 'rgba(0, 0, 0, 0.2)',
  backdropFilter: 'blur(8px)',
  border: '1px solid rgba(255, 255, 255, 0.1)',
  '& img': {
    maxWidth: '100%',
    maxHeight: '100%',
    objectFit: 'contain',
    borderRadius: '12px'
  },
  '@media (max-width: 600px)': {
    height: '300px'
  }
}));

const KeywordChip = styled(Chip)(({ theme }) => ({
  margin: theme.spacing(0.5),
  backgroundColor: 'rgba(255, 255, 255, 0.1)',
  color: 'rgba(255, 255, 255, 0.87)',
  border: '1px solid rgba(255, 255, 255, 0.1)',
  '&:hover': {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    transform: 'translateY(-2px)'
  },
  transition: 'all 0.3s ease'
}));

function App() {
  const [selectedImage, setSelectedImage] = useState(null);
  const [imageUrl, setImageUrl] = useState(null);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showCamera, setShowCamera] = useState(false);
  const videoRef = useRef(null);
  const streamRef = useRef(null);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' } 
      });
      videoRef.current.srcObject = stream;
      streamRef.current = stream;
      setShowCamera(true);
    } catch (err) {
      console.error('Error accessing camera:', err);
      setError('Unable to access camera. Please check permissions.');
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setShowCamera(false);
  };

  const captureImage = async () => {
    try {
      const video = videoRef.current;
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(video, 0, 0);
      
      // Convert canvas to blob
      const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg'));
      const file = new File([blob], 'camera-capture.jpg', { type: 'image/jpeg' });
      
      setSelectedImage(file);
      setImageUrl(URL.createObjectURL(file));
      stopCamera();
      await analyzeImage(file);
    } catch (err) {
      console.error('Error capturing image:', err);
      setError('Failed to capture image. Please try again.');
    }
  };

  const handleImageChange = async (files) => {
    if (files && files.length > 0) {
      const file = files[0];
      setSelectedImage(file);
      setImageUrl(URL.createObjectURL(file));
      await analyzeImage(file);
    }
  };

  const analyzeImage = async (file) => {
    setLoading(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('https://grail-meter-production.up.railway.app/analyze', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Failed to analyze image');
      }

      const result = await response.json();
      console.log('Analysis result:', result);  // Debug log
      setAnalysisResult(result);
    } catch (err) {
      console.error('Error:', err);  // Debug log
      setError('Error analyzing image. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container maxWidth="lg" sx={{ py: { xs: 2, md: 4 } }}>
      <Typography 
        variant="h3" 
        component="h1" 
        align="center" 
        sx={{ 
          mb: { xs: 2, md: 4 }, 
          color: 'rgba(255, 255, 255, 0.87)',
          fontSize: { xs: '2rem', md: '3rem' },
          fontWeight: 600,
          textShadow: '0 2px 4px rgba(0, 0, 0, 0.2)'
        }}
      >
        Grail Meter
      </Typography>

      {!selectedImage && !showCamera && (
        <Grid container spacing={2} justifyContent="center">
          <Grid item xs={12} md={6}>
            <StyledPaper>
              <div className="glass-card">
                <DropzoneArea
                  acceptedFiles={['image/*']}
                  dropzoneText="Drag and drop an image here or click"
                  onChange={handleImageChange}
                  maxFileSize={5000000}
                  showFileNames
                  showPreviewsInDropzone={false}
                  useChipsForPreview
                  classes={{
                    root: 'dropzone-root',
                    text: 'dropzone-text'
                  }}
                />
              </div>
            </StyledPaper>
          </Grid>
          <Grid item xs={12} md={6}>
            <StyledPaper>
              <div className="glass-card" style={{ justifyContent: 'center', alignItems: 'center' }}>
                <Button
                  variant="contained"
                  startIcon={<CameraAltIcon />}
                  onClick={startCamera}
                  sx={{
                    fontSize: { xs: '1rem', md: '1.2rem' },
                    py: 2,
                    px: 4,
                    background: 'rgba(255, 255, 255, 0.1)',
                    backdropFilter: 'blur(8px)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    '&:hover': {
                      background: 'rgba(255, 255, 255, 0.2)',
                      transform: 'translateY(-2px)'
                    },
                    transition: 'all 0.3s ease'
                  }}
                >
                  Take Photo
                </Button>
              </div>
            </StyledPaper>
          </Grid>
        </Grid>
      )}

      {showCamera && (
        <StyledPaper sx={{ mb: 2 }}>
          <div className="glass-card">
            <div className="camera-container">
              <IconButton
                onClick={stopCamera}
                className="camera-close"
              >
                <CloseIcon />
              </IconButton>
              <video
                ref={videoRef}
                autoPlay
                playsInline
                style={{ width: '100%', height: '100%', objectFit: 'contain' }}
              />
              <Button
                variant="contained"
                onClick={captureImage}
                className="camera-button"
              >
                Capture
              </Button>
            </div>
          </div>
        </StyledPaper>
      )}

      {loading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
          <CircularProgress sx={{ color: 'rgba(255, 255, 255, 0.87)' }} />
        </Box>
      )}

      {error && (
        <Typography color="error" align="center" sx={{ my: 2 }} className="error-message">
          {error}
        </Typography>
      )}

      {analysisResult && !loading && (
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <StyledPaper>
              <div className="glass-card">
                <ImageContainer>
                  {imageUrl && <img src={imageUrl} alt="Selected item" />}
                </ImageContainer>
              </div>
            </StyledPaper>
          </Grid>
          <Grid item xs={12} md={6}>
            <StyledPaper>
              <div className="glass-card">
                <Typography variant="h5" gutterBottom sx={{ color: 'rgba(255, 255, 255, 0.87)' }}>
                  Analysis Results
                </Typography>
                
                <Box sx={{ mb: 2 }}>
                  <Typography variant="h6" sx={{ color: '#90caf9' }}>
                    {analysisResult.product.title}
                  </Typography>
                  <Typography variant="subtitle1" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                    Condition: {analysisResult.seo.condition}/10
                  </Typography>
                </Box>

                {analysisResult.product.details && (
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="h6">Details</Typography>
                    <Typography variant="body1">
                      <strong>Materials:</strong> {analysisResult.product.details.materials}
                    </Typography>
                    <Typography variant="body1">
                      <strong>Colors:</strong> {analysisResult.product.details.colorway}
                    </Typography>
                    <Typography variant="body1">
                      <strong>Style:</strong> {analysisResult.product.details.style}
                    </Typography>
                    {analysisResult.product.details.notable_features && (
                      <Box sx={{ mt: 1 }}>
                        <Typography variant="body1">
                          <strong>Notable Features:</strong>
                        </Typography>
                        <ul style={{ marginTop: 4 }}>
                          {Array.isArray(analysisResult.product.details.notable_features) 
                            ? analysisResult.product.details.notable_features.map((feature, index) => (
                              <li key={index}>{feature}</li>
                            ))
                            : <li>{analysisResult.product.details.notable_features}</li>
                          }
                        </ul>
                      </Box>
                    )}
                  </Box>
                )}

                {analysisResult.product.estimated_retail_range && (
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="h6">Estimated Retail Range</Typography>
                    <Typography variant="body1">
                      ${analysisResult.product.estimated_retail_range.min} - ${analysisResult.product.estimated_retail_range.max}
                    </Typography>
                  </Box>
                )}

                {analysisResult.product.authenticity_indicators && (
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="h6">Authenticity Indicators</Typography>
                    <ul style={{ marginTop: 4 }}>
                      {Array.isArray(analysisResult.product.authenticity_indicators) 
                        ? analysisResult.product.authenticity_indicators.map((indicator, index) => (
                          <li key={index}>{indicator}</li>
                        ))
                        : <li>{analysisResult.product.authenticity_indicators}</li>
                      }
                    </ul>
                  </Box>
                )}

                <Box sx={{ mb: 2 }}>
                  <Typography variant="h6">Keywords</Typography>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                    {analysisResult.seo.primary_keywords && analysisResult.seo.primary_keywords.map((keyword, index) => (
                      <KeywordChip key={index} label={keyword} />
                    ))}
                  </Box>
                </Box>

                {analysisResult.error && (
                  <Box sx={{ mt: 2, p: 2, bgcolor: '#ffebee', borderRadius: 1 }}>
                    <Typography color="error">
                      Error: {analysisResult.error}
                    </Typography>
                    {analysisResult.product?.details?.error_type && (
                      <Typography variant="caption" color="error">
                        Type: {analysisResult.product.details.error_type}
                      </Typography>
                    )}
                  </Box>
                )}
              </div>
            </StyledPaper>
          </Grid>
        </Grid>
      )}
    </Container>
  );
}

export default App;
