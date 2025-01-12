import React, { useState, useRef } from 'react';
import { Container, Paper, Grid, Typography, Box, Chip, CircularProgress, Button, IconButton } from '@mui/material';
import { styled } from '@mui/material/styles';
import { DropzoneArea } from 'mui-file-dropzone';
import CameraAltIcon from '@mui/icons-material/CameraAlt';
import CloseIcon from '@mui/icons-material/Close';
import './App.css';

const StyledPaper = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(3),
  height: '100%',
  backgroundColor: '#ffffff',
  borderRadius: '12px',
  boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
  transition: 'transform 0.2s ease-in-out',
  '&:hover': {
    transform: 'translateY(-2px)',
  },
}));

const ImageContainer = styled(Box)({
  width: '100%',
  height: '400px',
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  overflow: 'hidden',
  borderRadius: '8px',
  backgroundColor: '#f5f5f5',
  '& img': {
    maxWidth: '100%',
    maxHeight: '100%',
    objectFit: 'contain',
  },
});

const KeywordChip = styled(Chip)(({ theme }) => ({
  margin: theme.spacing(0.5),
  backgroundColor: '#e3f2fd',
  '&:hover': {
    backgroundColor: '#bbdefb',
  },
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
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Typography variant="h3" component="h1" gutterBottom align="center" sx={{ mb: 4, color: '#1a237e' }}>
        Grail Meter
      </Typography>

      {!selectedImage && !showCamera && (
        <Grid container spacing={2} justifyContent="center">
          <Grid item xs={12} md={6}>
            <StyledPaper>
              <DropzoneArea
                acceptedFiles={['image/*']}
                dropzoneText="Drag and drop an image here or click"
                onChange={handleImageChange}
                maxFileSize={5000000}
                showFileNames
                showPreviewsInDropzone={false}
                useChipsForPreview
              />
            </StyledPaper>
          </Grid>
          <Grid item xs={12} md={6}>
            <StyledPaper sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '200px' }}>
              <Button
                variant="contained"
                startIcon={<CameraAltIcon />}
                onClick={startCamera}
                sx={{ fontSize: '1.2rem', py: 2, px: 4 }}
              >
                Take Photo
              </Button>
            </StyledPaper>
          </Grid>
        </Grid>
      )}

      {showCamera && (
        <StyledPaper sx={{ position: 'relative', mb: 2 }}>
          <IconButton
            onClick={stopCamera}
            sx={{ position: 'absolute', top: 8, right: 8, zIndex: 2 }}
          >
            <CloseIcon />
          </IconButton>
          <Box sx={{ position: 'relative', width: '100%', height: '500px' }}>
            <video
              ref={videoRef}
              autoPlay
              playsInline
              style={{ width: '100%', height: '100%', objectFit: 'contain' }}
            />
            <Button
              variant="contained"
              onClick={captureImage}
              sx={{ position: 'absolute', bottom: 16, left: '50%', transform: 'translateX(-50%)' }}
            >
              Capture
            </Button>
          </Box>
        </StyledPaper>
      )}

      {loading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
          <CircularProgress />
        </Box>
      )}

      {error && (
        <Typography color="error" align="center" sx={{ my: 2 }}>
          {error}
        </Typography>
      )}

      {analysisResult && !loading && (
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <StyledPaper>
              <ImageContainer>
                {imageUrl && <img src={imageUrl} alt="Selected item" />}
              </ImageContainer>
            </StyledPaper>
          </Grid>
          <Grid item xs={12} md={6}>
            <StyledPaper>
              <Typography variant="h5" gutterBottom>
                Analysis Results
              </Typography>
              
              <Box sx={{ mb: 2 }}>
                <Typography variant="h6" color="primary">
                  {analysisResult.brand} - {analysisResult.category}
                </Typography>
                <Typography variant="subtitle1">
                  Condition: {analysisResult.condition}/10
                </Typography>
              </Box>

              {analysisResult.details && (
                <Box sx={{ mb: 2 }}>
                  <Typography variant="h6">Details</Typography>
                  <Typography variant="body1">
                    <strong>Materials:</strong> {analysisResult.details.materials}
                  </Typography>
                  <Typography variant="body1">
                    <strong>Colors:</strong> {analysisResult.details.colorway}
                  </Typography>
                  <Typography variant="body1">
                    <strong>Style:</strong> {analysisResult.details.style}
                  </Typography>
                  {analysisResult.details.notable_features && (
                    <Box sx={{ mt: 1 }}>
                      <Typography variant="body1">
                        <strong>Notable Features:</strong>
                      </Typography>
                      <ul style={{ marginTop: 4 }}>
                        {Array.isArray(analysisResult.details.notable_features) 
                          ? analysisResult.details.notable_features.map((feature, index) => (
                            <li key={index}>{feature}</li>
                          ))
                          : <li>{analysisResult.details.notable_features}</li>
                        }
                      </ul>
                    </Box>
                  )}
                </Box>
              )}

              {analysisResult.estimated_retail_range && (
                <Box sx={{ mb: 2 }}>
                  <Typography variant="h6">Estimated Retail Range</Typography>
                  <Typography variant="body1">
                    ${analysisResult.estimated_retail_range.min} - ${analysisResult.estimated_retail_range.max}
                  </Typography>
                </Box>
              )}

              {analysisResult.authenticity_indicators && (
                <Box sx={{ mb: 2 }}>
                  <Typography variant="h6">Authenticity Indicators</Typography>
                  <ul style={{ marginTop: 4 }}>
                    {Array.isArray(analysisResult.authenticity_indicators) 
                      ? analysisResult.authenticity_indicators.map((indicator, index) => (
                        <li key={index}>{indicator}</li>
                      ))
                      : <li>{analysisResult.authenticity_indicators}</li>
                    }
                  </ul>
                </Box>
              )}

              <Box sx={{ mb: 2 }}>
                <Typography variant="h6">Keywords</Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                  {analysisResult.seo_keywords.map((keyword, index) => (
                    <KeywordChip key={index} label={keyword} />
                  ))}
                </Box>
              </Box>

              {analysisResult.error && (
                <Box sx={{ mt: 2, p: 2, bgcolor: '#ffebee', borderRadius: 1 }}>
                  <Typography color="error">
                    Error: {analysisResult.error}
                  </Typography>
                  {analysisResult.details?.error_type && (
                    <Typography variant="caption" color="error">
                      Type: {analysisResult.details.error_type}
                    </Typography>
                  )}
                </Box>
              )}
            </StyledPaper>
          </Grid>
        </Grid>
      )}
    </Container>
  );
}

export default App;
