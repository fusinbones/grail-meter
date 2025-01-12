import React, { useState, useRef } from 'react';
import { Container, Paper, Grid, Typography, Box, Chip, CircularProgress, Button, IconButton } from '@mui/material';
import { styled } from '@mui/material/styles';
import { DropzoneArea } from 'mui-file-dropzone';
import CameraAltIcon from '@mui/icons-material/CameraAlt';
import CloseIcon from '@mui/icons-material/Close';
import './App.css';

const StyledPaper = styled(Paper)(({ theme }) => `
  background-color: #FFFFFF;
  box-shadow: 0px 4px 20px rgba(0, 0, 0, 0.05);
  border-radius: 16px;
  height: 100%;
  & .glass-card {
    height: 100%;
    display: flex;
    flex-direction: column;
    padding: 24px;
  }
`);

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

const KeywordChip = styled(Chip)(({ theme }) => `
  margin: 4px;
  background-color: #F0F2F8;
  color: #4A4C58;
  border: none;
  font-weight: 500;
  &:hover {
    background-color: #E8EAF2;
    transform: translateY(-2px);
  }
  transition: all 0.3s ease;
`);

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
      <Typography 
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

          {/* Product Details */}
          <Grid item xs={12} md={6}>
            <StyledPaper>
              <div className="glass-card">
                <Typography variant="h5" sx={{ color: '#4A4C58', mb: 1, fontWeight: 600 }}>
                  {analysisResult.product.title}
                </Typography>
                <Box sx={{ mb: 2 }}>
                  <Typography variant="body1" sx={{ color: '#4A4C58', mb: 0.5 }}>
                    <strong>Color:</strong> {analysisResult.product.color}
                  </Typography>
                  <Typography variant="body1" sx={{ color: '#4A4C58', mb: 0.5 }}>
                    <strong>Category:</strong> {analysisResult.product.category}
                  </Typography>
                  <Typography variant="body1" sx={{ color: '#4A4C58', mb: 0.5 }}>
                    <strong>Gender:</strong> {analysisResult.product.gender}
                  </Typography>
                  <Typography variant="body1" sx={{ color: '#4A4C58', mb: 0.5 }}>
                    <strong>Size:</strong> {analysisResult.product.size}
                  </Typography>
                </Box>
                <Typography variant="body1" sx={{ color: '#4A4C58', mb: 0.5 }}>
                  <strong>Material:</strong> {analysisResult.product.material}
                </Typography>
              </div>
            </StyledPaper>
          </Grid>

          {/* Keywords */}
          <Grid item xs={12} md={6}>
            <StyledPaper>
              <div className="glass-card">
                <Typography variant="h6" sx={{ color: '#4A4C58', mb: 2, fontWeight: 600 }}>
                  Top 5 Keywords for Listings
                </Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                  {analysisResult.keywords && analysisResult.keywords.slice(0, 5).map((keyword, index) => (
                    <KeywordChip key={index} label={keyword} />
                  ))}
                </Box>
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
                <Typography variant="h6" sx={{ color: '#6C5CE7', fontWeight: 500, opacity: 0.8 }}>
                  Keyword Research Feature Coming Soon
                </Typography>
              </div>
            </StyledPaper>
          </Grid>
        </Grid>
      )}

      {error && (
        <Typography color="error" align="center" sx={{ mt: 2 }}>
          {error}
        </Typography>
      )}
    </Container>
  );
}

export default App;
