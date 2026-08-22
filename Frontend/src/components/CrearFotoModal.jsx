import { useState, useRef, useEffect } from 'react';
import Modal from './Modal';
import Button from './Button';
import { Camera, Sparkles, Upload, RefreshCw, Check, AlertCircle } from 'lucide-react';
import useAuth from '../hooks/useAuth';
import './CrearFotoModal.css';

const CrearFotoModal = ({ isOpen, onClose }) => {
  const { user, updateUser } = useAuth();
  const [activeTab, setActiveTab] = useState('camera'); // 'camera' | 'upload' | 'ai'
  const [stream, setStream] = useState(null);
  const [capturedImage, setCapturedImage] = useState(null);
  const [uploadFile, setUploadFile] = useState(null);
  const [aiPrompt, setAiPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const videoRef = useRef(null);
  const fileInputRef = useRef(null);

  // Iniciar / detener cámara al cambiar de pestaña o abrir/cerrar modal
  useEffect(() => {
    if (isOpen && activeTab === 'camera') {
      startCamera();
    } else {
      stopCamera();
    }

    return () => {
      stopCamera();
    };
  }, [isOpen, activeTab]);

  const startCamera = async () => {
    setError('');
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
        audio: false
      });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (err) {
      console.error(err);
      setError('No se pudo acceder a la cámara. Revisa los permisos de tu navegador.');
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
  };

  const capturePhoto = () => {
    if (!videoRef.current) return;
    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth || 640;
    canvas.height = videoRef.current.videoHeight || 480;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
    setCapturedImage(dataUrl);
    stopCamera();
  };

  const retakePhoto = () => {
    setCapturedImage(null);
    startCamera();
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setUploadFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setCapturedImage(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleGenerateAi = async () => {
    if (!aiPrompt.trim()) {
      setError('Escribe una descripción para generar el avatar/foto.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      // Usamos un generador de avatares artísticos mediante prompt
      const encodedPrompt = encodeURIComponent(aiPrompt.trim());
      const generatedUrl = `https://api.dicebear.com/7.x/bottts/svg?seed=${encodedPrompt}`;
      
      // Convertir SVG / URL a dataUrl para guardarlo
      const res = await fetch(generatedUrl);
      const svgText = await res.text();
      const blob = new Blob([svgText], { type: 'image/svg+xml' });
      const reader = new FileReader();
      reader.onloadend = () => {
        setCapturedImage(reader.result);
        setLoading(false);
      };
      reader.readAsDataURL(blob);
    } catch (err) {
      console.error(err);
      setError('Error al generar la foto con IA.');
      setLoading(false);
    }
  };

  // Convertir Base64 a File
  const dataURLtoFile = (dataurl, filename) => {
    const arr = dataurl.split(',');
    const mime = arr[0].match(/:(.*?);/)[1];
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }
    return new File([u8arr], filename, { type: mime });
  };

  const handleSaveAsProfile = async () => {
    if (!capturedImage) return;
    setLoading(true);
    setError('');
    setSuccessMsg('');

    try {
      const fileToUpload = uploadFile || dataURLtoFile(capturedImage, `foto_${Date.now()}.jpg`);
      const formData = new FormData();
      formData.append('foto', fileToUpload);

      await updateUser(formData);
      setSuccessMsg('¡Foto de perfil actualizada con éxito!');
      setTimeout(() => {
        handleClose();
      }, 1200);
    } catch (err) {
      console.error(err);
      setError('Error al guardar la foto de perfil.');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    stopCamera();
    setCapturedImage(null);
    setUploadFile(null);
    setAiPrompt('');
    setError('');
    setSuccessMsg('');
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Crear / Tomar Foto" size="md">
      <div className="crear-foto-modal">
        {/* Pestañas de modo */}
        <div className="crear-foto-tabs">
          <button 
            type="button"
            className={`crear-foto-tab ${activeTab === 'camera' ? 'active' : ''}`}
            onClick={() => { setActiveTab('camera'); setCapturedImage(null); }}
          >
            <Camera size={16} />
            <span>Cámara Web</span>
          </button>
          <button 
            type="button"
            className={`crear-foto-tab ${activeTab === 'upload' ? 'active' : ''}`}
            onClick={() => { setActiveTab('upload'); setCapturedImage(null); }}
          >
            <Upload size={16} />
            <span>Subir Archivo</span>
          </button>
          <button 
            type="button"
            className={`crear-foto-tab ${activeTab === 'ai' ? 'active' : ''}`}
            onClick={() => { setActiveTab('ai'); setCapturedImage(null); }}
          >
            <Sparkles size={16} />
            <span>Generar con IA</span>
          </button>
        </div>

        {error && (
          <div className="crear-foto-alert error">
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        {successMsg && (
          <div className="crear-foto-alert success">
            <Check size={16} />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Contenido según pestaña */}
        <div className="crear-foto-body">
          {activeTab === 'camera' && (
            <div className="camera-view">
              {!capturedImage ? (
                <div className="camera-preview-box">
                  <video ref={videoRef} autoPlay playsInline muted className="camera-video" />
                  <button type="button" className="capture-btn" onClick={capturePhoto}>
                    <Camera size={20} />
                    <span>Tomar Foto</span>
                  </button>
                </div>
              ) : (
                <div className="captured-preview-box">
                  <img src={capturedImage} alt="Foto capturada" className="captured-img" />
                  <div className="captured-actions">
                    <Button variant="secondary" onClick={retakePhoto}>
                      <RefreshCw size={15} />
                      <span>Volver a tomar</span>
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'upload' && (
            <div className="upload-view">
              <input 
                type="file" 
                ref={fileInputRef} 
                accept="image/*" 
                onChange={handleFileChange} 
                style={{ display: 'none' }} 
              />
              {!capturedImage ? (
                <div className="dropzone-box" onClick={() => fileInputRef.current?.click()}>
                  <Upload size={36} className="dropzone-icon" />
                  <p className="dropzone-text">Haz clic aquí para seleccionar una imagen de tu dispositivo</p>
                  <span className="dropzone-sub">JPG, PNG o WEBP</span>
                </div>
              ) : (
                <div className="captured-preview-box">
                  <img src={capturedImage} alt="Foto seleccionada" className="captured-img" />
                  <div className="captured-actions">
                    <Button variant="secondary" onClick={() => fileInputRef.current?.click()}>
                      <RefreshCw size={15} />
                      <span>Seleccionar otra</span>
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'ai' && (
            <div className="ai-view">
              <div className="ai-input-group">
                <label className="ai-label">Describe el avatar que deseas generar:</label>
                <div className="ai-input-row">
                  <input 
                    type="text" 
                    placeholder="Ej: Agente inmobiliario moderno, arquitecto con lentes..."
                    value={aiPrompt}
                    onChange={(e) => setAiPrompt(e.target.value)}
                    className="ai-text-input"
                    onKeyDown={(e) => e.key === 'Enter' && handleGenerateAi()}
                  />
                  <Button variant="primary" onClick={handleGenerateAi} disabled={loading}>
                    <Sparkles size={15} />
                    <span>{loading ? 'Generando...' : 'Generar'}</span>
                  </Button>
                </div>
              </div>

              {capturedImage && (
                <div className="captured-preview-box" style={{ marginTop: '16px' }}>
                  <img src={capturedImage} alt="Avatar generado" className="captured-img ai-img" />
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer con botón para aplicar foto */}
        <div className="crear-foto-footer">
          <Button variant="secondary" onClick={handleClose} disabled={loading}>
            Cancelar
          </Button>
          <Button 
            variant="primary" 
            onClick={handleSaveAsProfile} 
            disabled={!capturedImage || loading}
          >
            <Check size={16} />
            <span>{loading ? 'Guardando...' : 'Establecer como Foto de Perfil'}</span>
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default CrearFotoModal;
