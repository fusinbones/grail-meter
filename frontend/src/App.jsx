import React, { useState, useRef } from 'react';
import { Container, Paper, Grid, Typography, Box, Chip, CircularProgress, Button, IconButton, Link, List, ListItem, ListItemText, ImageList, ImageListItem } from '@mui/material';
import { styled } from '@mui/material/styles';
import { DropzoneArea } from 'mui-file-dropzone';
import CameraAltIcon from '@mui/icons-material/CameraAlt';
import CloseIcon from '@mui/icons-material/Close';
import DeleteIcon from '@mui/icons-material/Delete';
import NavigateBeforeIcon from '@mui/icons-material/NavigateBefore';
import NavigateNextIcon from '@mui/icons-material/NavigateNext';
import './App.css';
import ResultsPanel from './components/ResultsPanel';

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
  position: relative;
  & img {
    max-width: 100%;
    max-height: 100%;
    object-fit: contain;
    border-radius: 12px;
  }
  & .MuiIconButton-root {
    background-color: rgba(255, 255, 255, 0.8);
    &:hover {
      background-color: rgba(255, 255, 255, 0.95);
    }
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

const ImagePreviewArea = styled(Box)(({ theme }) => ({
  width: '100%',
  padding: theme.spacing(2),
  background: 'rgba(255, 255, 255, 0.9)',
  backdropFilter: 'blur(10px)',
  borderRadius: '16px',
  boxShadow: '0 4px 30px rgba(0, 0, 0, 0.1)',
  border: '1px solid rgba(255, 255, 255, 0.3)',
  marginBottom: theme.spacing(2),
  transition: 'all 0.3s ease-in-out'
}));

const PreviewImage = styled('img')({
  width: '100%',
  height: '150px',
  objectFit: 'cover',
  borderRadius: '8px',
  transition: 'transform 0.2s ease-in-out',
  '&:hover': {
    transform: 'scale(1.02)'
  }
});

const RemoveButton = styled(IconButton)(({ theme }) => ({
  position: 'absolute',
  top: 4,
  right: 4,
  backgroundColor: 'rgba(255, 255, 255, 0.8)',
  '&:hover': {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    transform: 'scale(1.1)'
  },
  transition: 'all 0.2s ease-in-out'
}));

function App() {
  const [selectedImages, setSelectedImages] = useState([]);
  const [imageUrls, setImageUrls] = useState([]);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [showCamera, setShowCamera] = useState(false);
  const videoRef = useRef(null);
  const streamRef = useRef(null);

  const handleImageChange = async (files) => {
    if (files && files.length > 0) {
      const newImages = [...selectedImages, ...files];
      setSelectedImages(newImages);
      const newUrls = files.map(file => URL.createObjectURL(file));
      setImageUrls([...imageUrls, ...newUrls]);
    }
  };

  const handleRemoveImage = (index) => {
    const newImages = selectedImages.filter((_, i) => i !== index);
    const newUrls = imageUrls.filter((_, i) => i !== index);
    URL.revokeObjectURL(imageUrls[index]); // Clean up object URL
    setSelectedImages(newImages);
    setImageUrls(newUrls);
    if (currentImageIndex >= newImages.length) {
      setCurrentImageIndex(Math.max(0, newImages.length - 1));
    }
  };

  const handleAnalyzeImages = async () => {
    if (selectedImages.length === 0) {
      setError('Please select at least one image to analyze');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await analyzeImages(selectedImages);
    } catch (err) {
      setError('Failed to analyze images. Please try again.');
    }
    setLoading(false);
  };

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
      const canvas = document.createElement('canvas');
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      canvas.getContext('2d').drawImage(videoRef.current, 0, 0);
      
      const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg'));
      const file = new File([blob], 'camera-capture.jpg', { type: 'image/jpeg' });
      
      setSelectedImages([...selectedImages, file]);
      setImageUrls([...imageUrls, URL.createObjectURL(file)]);
      stopCamera();
    } catch (err) {
      console.error('Error capturing image:', err);
      setError('Failed to capture image. Please try again.');
    }
  };

  const handleNextImage = () => {
    setCurrentImageIndex((prev) => (prev + 1) % imageUrls.length);
  };

  const handlePrevImage = () => {
    setCurrentImageIndex((prev) => (prev - 1 + imageUrls.length) % imageUrls.length);
  };

  const analyzeImages = async (files) => {
    setLoading(true);
    setError(null);
    try {
      const formData = new FormData();
      files.forEach((file) => {
        formData.append('files', file);
      });

      const response = await fetch('https://grail-meter-production.up.railway.app/analyze', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Failed to analyze image');
      }

      const result = await response.json();
      console.log('Raw analysis result:', JSON.stringify(result, null, 2));
      setAnalysisResult(result);
    } catch (err) {
      console.error('Error:', err);
      setError('Error analyzing image. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const isValidEbayUrl = (url) => {
    try {
      const urlObj = new URL(url);
      return urlObj.hostname === 'www.ebay.com' && urlObj.pathname.startsWith('/itm/');
    } catch {
      return false;
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

      {!showCamera && (
        <>
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

          {selectedImages.length > 0 && !loading && !analysisResult && (
            <ImagePreviewArea>
              <Typography variant="h6" sx={{ mb: 2, fontWeight: 500, color: '#4A4C58' }}>
                Selected Images ({selectedImages.length})
              </Typography>
              <ImageList 
                cols={{ xs: 2, sm: 3, md: 4 }} 
                gap={16}
                sx={{ 
                  overflow: 'hidden',
                  m: 0 
                }}
              >
                {imageUrls.map((url, index) => (
                  <ImageListItem 
                    key={index}
                    sx={{ 
                      overflow: 'hidden',
                      position: 'relative',
                      '&:hover img': {
                        transform: 'scale(1.02)'
                      }
                    }}
                  >
                    <PreviewImage src={url} alt={`Selected ${index + 1}`} />
                    <RemoveButton
                      size="small"
                      onClick={() => handleRemoveImage(index)}
                      aria-label="remove image"
                    >
                      <DeleteIcon fontSize="small" />
                    </RemoveButton>
                  </ImageListItem>
                ))}
              </ImageList>
              <Box sx={{ mt: 2, display: 'flex', justifyContent: 'center' }}>
                <StyledButton
                  variant="contained"
                  onClick={handleAnalyzeImages}
                  disabled={loading}
                  sx={{ minWidth: 200 }}
                >
                  Analyze {selectedImages.length} {selectedImages.length === 1 ? 'Image' : 'Images'}
                </StyledButton>
              </Box>
            </ImagePreviewArea>
          )}
        </>
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

      {selectedImages.length && !loading && analysisResult && (
        <Grid container spacing={3}>
          {/* Image Preview */}
          <Grid item xs={12} md={6}>
            <StyledPaper>
              <div className="glass-card">
                <ImageContainer>
                  {imageUrls.length > 1 && (
                    <IconButton 
                      onClick={handlePrevImage}
                      sx={{ position: 'absolute', left: 8, zIndex: 2 }}
                    >
                      <NavigateBeforeIcon />
                    </IconButton>
                  )}
                  <img src={imageUrls[currentImageIndex]} alt={`Selected ${currentImageIndex + 1}/${imageUrls.length}`} />
                  {imageUrls.length > 1 && (
                    <IconButton 
                      onClick={handleNextImage}
                      sx={{ position: 'absolute', right: 8, zIndex: 2 }}
                    >
                      <NavigateNextIcon />
                    </IconButton>
                  )}
                </ImageContainer>
                {imageUrls.length > 1 && (
                  <Typography variant="caption" align="center" sx={{ mt: 1, display: 'block' }}>
                    Image {currentImageIndex + 1} of {imageUrls.length}
                  </Typography>
                )}
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
              <Typography variant="h6" gutterBottom>
                eBay Market Data
              </Typography>
              {analysisResult && (
                <Box sx={{ mt: 2 }}>
                  <List>
                    {analysisResult.ebayListings.map((listing, index) => (
                      <ListItem key={index} divider={index !== analysisResult.ebayListings.length - 1}>
                        <ListItemText
                          primary={
                            <Link href={listing.url} target="_blank" rel="noopener noreferrer" sx={{ color: '#1976d2' }}>
                              {listing.title}
                            </Link>
                          }
                          secondary={
                            < >
                              <Typography component="span" sx={{ display: 'block' }}>
                                Price: ${listing.price.toFixed(2)}
                              </Typography>
                              <Typography component="span" sx={{ display: 'block' }}>
                                Condition: {listing.condition}
                              </Typography>
                            </ >
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
                      mt: 3,
                      width: '100%' 
                    }}
                  >
                    <Box 
                      sx={{ 
                        position: 'relative',
                        display: 'inline-flex',
                        flexDirection: 'column', 
                        alignItems: 'center', 
                        border: '3px solid #1976d2',
                        borderRadius: '50%',
                        padding: '2rem',
                        minWidth: '150px', 
                        minHeight: '150px', 
                        justifyContent: 'center' 
                      }}
                    >
                      <Typography 
                        variant="h4" 
                        component="div" 
                        sx={{ 
                          fontWeight: 'bold',
                          color: '#1976d2',
                          textAlign: 'center' 
                        }}
                      >
                        ${analysisResult.averagePrice.toFixed(2)}
                      </Typography>
                      <Typography 
                        variant="subtitle1" 
                        sx={{ 
                          position: 'absolute',
                          bottom: '1rem', 
                          width: '100%',
                          textAlign: 'center',
                          color: '#1976d2',
                          fontWeight: 'bold'
                        }}
                      >
                        Average Price
                      </Typography>
                    </Box>
                  </Box>
                </Box>
              )}
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
