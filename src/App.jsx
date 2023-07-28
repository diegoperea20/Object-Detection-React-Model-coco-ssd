import React, { useEffect, useState, useRef } from 'react';
import * as cocoSsd from '@tensorflow-models/coco-ssd';
import '@tensorflow/tfjs-backend-webgl';
import '@tensorflow/tfjs-backend-cpu';
import './App.css';

const App = () => {
  const [model, setModel] = useState(null);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const fileInputRef = useRef(null); // Move fileInputRef here
  const [resultado, setResultado] = useState('');
  const [cameraActive, setCameraActive] = useState(true);
  const [selectedImage, setSelectedImage] = useState(null);

  useEffect(() => {
    const loadModel = async () => {
      try {
        const model = await cocoSsd.load();
        setModel(model);
        console.log('Model loaded');
      } catch (error) {
        console.error('Error loading the model:', error);
      }
    };
    loadModel();
  }, []);

  useEffect(() => {
    if (cameraActive) {
      const startCamera = async () => {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ video: {} });
          videoRef.current.srcObject = stream;
        } catch (error) {
          console.error('Error accessing the camera:', error);
        }
      };
      startCamera();
    } else {
      const stream = videoRef.current.srcObject;
      if (stream) {
        const tracks = stream.getTracks();
        tracks.forEach((track) => track.stop());
      }
      videoRef.current.srcObject = null;
    }
  }, [cameraActive]);

  useEffect(() => {
    let animationFrameId;

    const detectFromVideo = async () => {
      if (model && videoRef.current && videoRef.current.readyState === 4) {
        const video = videoRef.current;
        const canvas = canvasRef.current;
        const context = canvas.getContext('2d');

        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;

        context.drawImage(video, 0, 0, canvas.width, canvas.height);

        const predictions = await model.detect(canvas);
        console.log('Predictions:', predictions);

        const threshold = 0.5;
        let resultText = '';
        for (const prediction of predictions) {
          if (prediction.score >= threshold) {
            const { class: label, score } = prediction;
            const roundedScore = Math.round(score * 100);
            resultText += `${label}: ${roundedScore}%\n`;
          }
        }
        setResultado(resultText);
      }

      animationFrameId = requestAnimationFrame(detectFromVideo);
    };

    detectFromVideo();

    return () => {
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
    };
  }, [model]);

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const image = await createImageBitmap(file);
      setSelectedImage(image);
      setCameraActive(false);
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');
      canvas.width = image.width;
      canvas.height = image.height;
      context.drawImage(image, 0, 0, image.width, image.height);

      const predictions = await model.detect(canvas);
      console.log('Predictions:', predictions);

      const threshold = 0.5;
      let resultText = '';
      for (const prediction of predictions) {
        if (prediction.score >= threshold) {
          const { class: label, score } = prediction;
          const roundedScore = Math.round(score * 100);
          resultText += `${label}: ${roundedScore}%\n`;
        }
      }
      setResultado(resultText);
    } catch (error) {
      console.error('Error processing the image:', error);
    }
  };

  const toggleCamera = () => {
    setCameraActive((prevCameraActive) => !prevCameraActive);
  };

  // Función para abrir el diálogo de selección de archivo y desactivar la cámara
  const openFileInput = () => {
    setCameraActive(false); // Desactivar la cámara al hacer clic en "Seleccionar imagen"
    fileInputRef.current.click();
  };

  return (
    <div className="dark-theme container">
      <video ref={videoRef} autoPlay playsInline style={{ width: '50%', height: '50%' }}></video>
      <canvas ref={canvasRef} style={{ display: 'none' }}></canvas>
      <h1>{resultado}</h1>
      {cameraActive ? (
        <button className="dark-theme deactivate-button" onClick={toggleCamera}>Desactivate Camera </button>
      ) : (
        <button className="dark-theme activate-button" onClick={toggleCamera}>Active Camera</button>
      )}

      {/* Botón de selección de imagen */}
      <button className="dark-theme select-image-button" onClick={openFileInput} style={{ margin: '10px 0' }}>Select Image</button>
      <input type="file" accept="image/*" onChange={handleFileChange} ref={fileInputRef} style={{ display: 'none' }} />

      {/* Mostrar la imagen seleccionada */}
      {selectedImage && (
        <div>
          <h2>Selected Image</h2>
          <img src={URL.createObjectURL(fileInputRef.current.files[0])} alt="Imagen seleccionada" />
        </div>
      )}
    </div>
  );
};

export default App;
