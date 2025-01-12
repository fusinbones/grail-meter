import React, { useState, useRef } from 'react';
import { Container, Paper, Grid, Typography, Box, Chip, CircularProgress, Button, IconButton, Link } from '@mui/material';
import { styled } from '@mui/material/styles';
import { DropzoneArea } from 'mui-file-dropzone';
import CameraAltIcon from '@mui/icons-material/CameraAlt';
import CloseIcon from '@mui/icons-material/Close';
import './App.css';

const StyledPaper = styled(Paper)(({ theme }) => ({
  height: '100%',
  padding: theme.spacing(3),
  backgroundColor: 'rgba(255, 255, 255, 0.9)',
  backdropFilter: 'blur(10px)',
  borderRadius: '16px',
  boxShadow: '0 4px 30px rgba(0, 0, 0, 0.1)',
  border: '1px solid rgba(255, 255, 255, 0.3)',
  overflow: 'hidden',
  display: 'flex',
  flexDirection: 'column',
  '& .glass-card': {
    flex: 1,
    overflow: 'auto',
    padding: theme.spacing(1),
    '&::-webkit-scrollbar': {
      width: '8px',
    },
    '&::-webkit-scrollbar-track': {
      background: 'rgba(0, 0, 0, 0.05)',
      borderRadius: '4px',
    },
    '&::-webkit-scrollbar-thumb': {
      background: 'rgba(0, 0, 0, 0.2)',
      borderRadius: '4px',
      '&:hover': {
        background: 'rgba(0, 0, 0, 0.3)',
      },
    },
  },
}));

const ImageContainer = styled(Box)(({ theme }) => `
  width: 100%;
  height: 400px;
  display: flex;
  justify-content: center;
  align-items: center;
  overflow: hidden;
  border-radius: 16px;
  background: #F8F9FD;
  border: 1px solid #E8EAF2;
  & img {
    max-width: 100%;
    max-height: 100%;
    object-fit: contain;
    border-radius: 12px;
  }
  @media (max-width: 600px) {
    height: 300px;
  }
`);

const KeywordChip = styled(Chip)(({ theme }) => ({
  margin: '4px',
  height: 'auto',
  maxWidth: 'none',
  '& .MuiChip-label': {
    whiteSpace: 'normal',
    overflow: 'visible',
    textOverflow: 'clip',
    display: 'block',
    padding: '8px 12px',
    lineHeight: '1.2',
    wordBreak: 'break-word'
  }
}));

const StyledButton = styled(Button)(({ theme }) => `
  background-color: #6C5CE7;
  color: #FFFFFF;
  padding: 12px 24px;
  border-radius: 12px;
  font-weight: 600;
  text-transform: none;
  &:hover {
    background-color: #5A4AD1;
    transform: translateY(-2px);
  }
  transition: all 0.3s ease;
`);

const ResponsiveTypography = styled(Typography)(({ theme }) => ({
  wordBreak: 'break-word',
  hyphens: 'auto',
  overflowWrap: 'break-word',
  width: '100%',
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
      console.log('Raw analysis result:', JSON.stringify(result, null, 2));  // More detailed logging
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
      <ResponsiveTypography 
        variant="h3" 
        component="h1" 
        align="center" 
        sx={{ 
          mb: { xs: 2, md: 4 }, 
          color: '#4A4C58',
          fontSize: { xs: '2rem', md: '3rem' },
          fontWeight: 600,
          textShadow: '0 2px 4px rgba(0, 0, 0, 0.2)'
        }}
      >
        Grail Meter
      </ResponsiveTypography>

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
                <StyledButton
                  variant="contained"
                  startIcon={<CameraAltIcon />}
                  onClick={startCamera}
                >
                  Take Photo
                </StyledButton>
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
              <StyledButton
                variant="contained"
                onClick={captureImage}
                className="camera-button"
              >
                Capture
              </StyledButton>
            </div>
          </div>
        </StyledPaper>
      )}

      {loading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
          <CircularProgress sx={{ color: '#6C5CE7' }} />
        </Box>
      )}

      {selectedImage && !loading && analysisResult && (
        <Grid container spacing={3}>
          {/* Image Preview */}
          <Grid item xs={12} md={6}>
            <StyledPaper>
              <div className="glass-card">
                <ImageContainer>
                  <img src={imageUrl} alt="Selected" />
                </ImageContainer>
              </div>
            </StyledPaper>
          </Grid>

          {/* Product Information */}
          <Grid item xs={12} md={6}>
            <StyledPaper>
              <div className="glass-card">
                <ResponsiveTypography variant="h6" sx={{ color: '#4A4C58', mb: 2, fontWeight: 600 }}>
                  Product Details
                </ResponsiveTypography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                  {analysisResult.product && Object.entries(analysisResult.product).map(([key, value]) => (
                    <Box key={key} sx={{ display: 'flex', flexDirection: 'column' }}>
                      <ResponsiveTypography variant="subtitle2" sx={{ color: '#4A4C58', fontWeight: 600, textTransform: 'capitalize' }}>
                        {key}
                      </ResponsiveTypography>
                      <ResponsiveTypography variant="body1" sx={{ color: '#666', mt: 0.5 }}>
                        {value}
                      </ResponsiveTypography>
                    </Box>
                  ))}
                </Box>
              </div>
            </StyledPaper>
          </Grid>

          {/* Keywords */}
          <Grid item xs={12} md={6}>
            <StyledPaper>
              <div className="glass-card">
                <ResponsiveTypography variant="h6" sx={{ color: '#4A4C58', mb: 2, fontWeight: 600 }}>
                  Top 5 Keywords for Listings
                </ResponsiveTypography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, mb: 3 }}>
                  {analysisResult.keywords && analysisResult.keywords.map((keyword, index) => (
                    <KeywordChip key={index} label={keyword} />
                  ))}
                </Box>
                <ResponsiveTypography variant="h6" sx={{ color: '#4A4C58', mb: 2, fontWeight: 600 }}>
                  Long Tail Keywords
                </ResponsiveTypography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  {analysisResult.longTailKeywords && analysisResult.longTailKeywords.map((keyword, index) => (
                    <KeywordChip 
                      key={index} 
                      label={keyword}
                      sx={{ 
                        backgroundColor: '#E8F0FE',
                        color: '#1A73E8',
                        '&:hover': {
                          backgroundColor: '#D2E3FC'
                        }
                      }} 
                    />
                  ))}
                </Box>
              </div>
            </StyledPaper>
          </Grid>

          {/* eBay Listings */}
          <Grid item xs={12} md={6}>
            <StyledPaper>
              <div className="glass-card">
                <ResponsiveTypography variant="h6" sx={{ color: '#4A4C58', mb: 2, fontWeight: 600 }}>
                  Similar eBay Listings
                </ResponsiveTypography>
                {analysisResult.ebayListings && analysisResult.ebayListings.map((listing, index) => (
                  <Box 
                    key={index} 
                    sx={{ 
                      mb: 2, 
                      p: 2, 
                      borderRadius: 1,
                      backgroundColor: 'rgba(255, 255, 255, 0.8)',
                      '&:hover': {
                        backgroundColor: 'rgba(255, 255, 255, 0.9)',
                      }
                    }}
                  >
                    <Link 
                      href={listing.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      sx={{ 
                        textDecoration: 'none',
                        color: 'inherit',
                        '&:hover': {
                          textDecoration: 'underline'
                        }
                      }}
                    >
                      <ResponsiveTypography variant="subtitle1" sx={{ fontWeight: 500 }}>
                        {listing.title}
                      </ResponsiveTypography>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1, flexWrap: 'wrap', gap: 1 }}>
                        <ResponsiveTypography variant="body2" color="primary.main" sx={{ fontWeight: 600 }}>
                          ${listing.price}
                        </ResponsiveTypography>
                        <ResponsiveTypography variant="body2" color="text.secondary">
                          {listing.condition}
                        </ResponsiveTypography>
                      </Box>
                    </Link>
                  </Box>
                ))}
                {analysisResult.averagePrice > 0 && (
                  <Box sx={{ mt: 3, pt: 2, borderTop: '1px solid rgba(0, 0, 0, 0.1)' }}>
                    <ResponsiveTypography variant="h6" sx={{ color: '#4A4C58', fontWeight: 600 }}>
                      Average Price: ${analysisResult.averagePrice}
                    </ResponsiveTypography>
                  </Box>
                )}
              </div>
            </StyledPaper>
          </Grid>

          {/* Keyword Research Coming Soon */}
          <Grid item xs={12} md={6}>
            <StyledPaper>
              <div className="glass-card" style={{ 
                display: 'flex', 
                justifyContent: 'center', 
                alignItems: 'center',
                minHeight: '150px',
                backgroundColor: '#F8F9FD'
              }}>
                <ResponsiveTypography variant="h6" sx={{ color: '#6C5CE7', fontWeight: 500, opacity: 0.8 }}>
                  Keyword Research Feature Coming Soon
                </ResponsiveTypography>
              </div>
            </StyledPaper>
          </Grid>
        </Grid>
      )}

      {error && (
        <ResponsiveTypography color="error" align="center" sx={{ mt: 2 }}>
          {error}
        </ResponsiveTypography>
      )}
    </Container>
  );
}

export default App;
