import React, { useState, useEffect } from 'react';
import FilerobotImageEditor, { TABS, TOOLS } from 'react-filerobot-image-editor';
import axios from 'axios';

function App() {
  const [imageFile, setImageFile] = useState(null);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);

  // New states for Merge Mode
  const [uploadMode, setUploadMode] = useState('single'); // 'single' | 'merge'
  const [colorMode, setColorMode] = useState('color'); // 'color' | 'bw'
  const [printers, setPrinters] = useState([]);
  const [selectedPrinter, setSelectedPrinter] = useState('default');
  const [frontImage, setFrontImage] = useState(null);
  const [backImage, setBackImage] = useState(null);

  // API URL State
  const getDefaultApiUrl = () => {
    const stored = localStorage.getItem('printflowApiUrl');
    if (stored) return stored;
    
    // If accessed via local network IP, point to that IP instead of localhost
    const hostname = window.location.hostname;
    if (hostname && hostname !== 'localhost' && hostname !== '127.0.0.1') {
      return `http://${hostname}:3001`;
    }
    return 'http://localhost:3001';
  };

  const [apiUrl, setApiUrl] = useState(getDefaultApiUrl);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  useEffect(() => {
    localStorage.setItem('printflowApiUrl', apiUrl);
  }, [apiUrl]);

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.type === 'application/pdf') {
        if (window.confirm("Do you want to print this PDF directly?")) {
          setIsPrinting(true);
          try {
            const formData = new FormData();
            formData.append('image', file, file.name);
            formData.append('colorMode', colorMode);
            formData.append('printerId', selectedPrinter);
            
            const cleanUrl = apiUrl.replace(/\/$/, '');
            const response = await axios.post(`${cleanUrl}/api/print`, formData, {
              headers: { 
                'Content-Type': 'multipart/form-data',
                'ngrok-skip-browser-warning': 'true'
              }
            });
            if (response.data.success) {
              alert('PDF print job sent successfully!');
            } else {
              alert('Failed to send print job: ' + response.data.error);
            }
          } catch (error) {
            console.error('Print error:', error);
            alert('Error printing PDF.');
          } finally {
            setIsPrinting(false);
          }
        }
        // clear input
        e.target.value = null;
      } else {
        const url = URL.createObjectURL(file);
        setImageFile(url);
        setIsEditorOpen(true);
      }
    }
  };

  const handleFrontUpload = (e) => {
    const file = e.target.files[0];
    if (file) setFrontImage(URL.createObjectURL(file));
  };

  const handleBackUpload = (e) => {
    const file = e.target.files[0];
    if (file) setBackImage(URL.createObjectURL(file));
  };

  const removeFront = () => setFrontImage(null);
  const removeBack = () => setBackImage(null);

  const triggerMerge = async () => {
    if (!frontImage || !backImage) return;
    
    try {
      const img1 = new Image();
      const img2 = new Image();
      
      const loadImg = (img, src) => new Promise((resolve, reject) => {
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src = src;
      });

      await Promise.all([loadImg(img1, frontImage), loadImg(img2, backImage)]);

      // Calculate canvas dimensions (padding between images)
      const padding = 20;
      const canvasWidth = Math.max(img1.width, img2.width) + (padding * 2);
      const canvasHeight = img1.height + img2.height + (padding * 3);

      const canvas = document.createElement('canvas');
      canvas.width = canvasWidth;
      canvas.height = canvasHeight;
      const ctx = canvas.getContext('2d');

      // Draw white background
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvasWidth, canvasHeight);

      // Center horizontally
      const x1 = (canvasWidth - img1.width) / 2;
      const y1 = padding;
      ctx.drawImage(img1, x1, y1);

      const x2 = (canvasWidth - img2.width) / 2;
      const y2 = y1 + img1.height + padding;
      ctx.drawImage(img2, x2, y2);

      const mergedDataUrl = canvas.toDataURL('image/png');
      setImageFile(mergedDataUrl);
      setIsEditorOpen(true);
      
    } catch (error) {
      console.error("Merge error:", error);
      alert("Failed to merge images.");
    }
  };

  // Auto trigger merge when both images are present
  useEffect(() => {
    if (frontImage && backImage) {
      triggerMerge();
    }
  }, [frontImage, backImage]);

  useEffect(() => {
    const fetchPrinters = async () => {
      try {
        const cleanUrl = apiUrl.replace(/\/$/, '');
        const res = await axios.get(`${cleanUrl}/api/printers`, {
          headers: {
            'ngrok-skip-browser-warning': 'true'
          }
        });
        if (res.data.success) {
          setPrinters(res.data.printers);
        }
      } catch (err) {
        console.error("Failed to fetch printers:", err);
      }
    };
    fetchPrinters();
  }, [apiUrl]);

  const testConnection = async () => {
    try {
      const cleanUrl = apiUrl.replace(/\/$/, '');
      const res = await axios.get(`${cleanUrl}/api/printers`, {
        headers: { 'ngrok-skip-browser-warning': 'true' }
      });
      if (res.data.success) {
        setPrinters(res.data.printers);
        alert('✅ Connection Successful! Found ' + res.data.printers.length + ' printers.');
      } else {
        alert('❌ Connected, but received an error from backend.');
      }
    } catch (err) {
      alert('❌ Connection Failed!\n\nError: ' + err.message + '\n\nPlease check:\n1. Backend is running on your PC.\n2. Ngrok is running and the URL is correct.\n3. The URL must start with https://');
    }
  };

  const handlePrint = async (editedImageObject) => {
    setIsPrinting(true);
    try {
      const res = await fetch(editedImageObject.imageBase64);
      const blob = await res.blob();

      const formData = new FormData();
      formData.append('image', blob, editedImageObject.fullName || 'edited-image.png');
      formData.append('colorMode', colorMode);
      formData.append('printerId', selectedPrinter);

      const cleanUrl = apiUrl.replace(/\/$/, '');
      const response = await axios.post(`${cleanUrl}/api/print`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          'ngrok-skip-browser-warning': 'true'
        }
      });

      if (response.data.success) {
        alert('Print job sent successfully to your default printer!');
      } else {
        alert('Failed to send print job: ' + response.data.error);
      }
    } catch (error) {
      console.error('Error printing document:', error);
      alert(`Error printing image. Make sure the backend server is running.\n\nDetails: ${error.message}`);
    } finally {
      setIsPrinting(false);
      setIsEditorOpen(false);
      setImageFile(null);
      setFrontImage(null);
      setBackImage(null);
    }
  };

  const handleCloseEditor = () => {
    setIsEditorOpen(false);
    setImageFile(null);
    setFrontImage(null);
    setBackImage(null);
  };

  return (
    <div className="app-container">
      {isPrinting && (
        <div className="loading-overlay">
          <div className="spinner"></div>
          <div>Sending to Printer...</div>
        </div>
      )}

      {!isEditorOpen ? (
        <div className="header">
          <h1>PrintFlow Studio</h1>
          <p>Upload, edit, and print your documents directly to your local printer.</p>
          
          <div style={{ marginTop: '1rem', marginBottom: '2rem' }}>
            <button 
              className="toggle-btn" 
              style={{ fontSize: '0.8rem', padding: '0.5rem 1rem' }}
              onClick={() => setIsSettingsOpen(!isSettingsOpen)}
            >
              ⚙️ Backend Connection Settings
            </button>
            
            {isSettingsOpen && (
              <div className="settings-panel" style={{ marginTop: '1rem', padding: '1rem', background: 'var(--panel-bg)', borderRadius: '0.5rem', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '0.5rem', alignItems: 'center' }}>
                <label style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>Backend URL (Use Ngrok URL if hosted online):</label>
                <input 
                  type="text" 
                  value={apiUrl}
                  onChange={(e) => setApiUrl(e.target.value)}
                  style={{ padding: '0.5rem', borderRadius: '0.5rem', border: '1px solid var(--border-color)', background: 'var(--bg-color)', color: 'white', width: '300px' }}
                />
                <button 
                  onClick={testConnection}
                  style={{ marginTop: '0.5rem', padding: '0.5rem 1rem', background: 'var(--primary)', color: 'white', border: 'none', borderRadius: '0.5rem', cursor: 'pointer' }}
                >
                  Test Connection
                </button>
              </div>
            )}
          </div>
          
          <div className="mode-toggle">
            <button 
              className={`toggle-btn ${uploadMode === 'single' ? 'active' : ''}`}
              onClick={() => setUploadMode('single')}
            >
              Single Document
            </button>
            <button 
              className={`toggle-btn ${uploadMode === 'merge' ? 'active' : ''}`}
              onClick={() => setUploadMode('merge')}
            >
              ID Card Merge
            </button>
          </div>

          <div className="settings-toggle" style={{ display: 'flex', justifyContent: 'center', marginBottom: '2rem', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <label style={{ fontWeight: 600 }}>Print Color:</label>
              <select 
                value={colorMode} 
                onChange={(e) => setColorMode(e.target.value)} 
                className="select-dropdown"
              >
                <option value="color">Full Color</option>
                <option value="bw">Black & White</option>
              </select>
            </div>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <label style={{ fontWeight: 600 }}>Printer:</label>
              <select 
                value={selectedPrinter} 
                onChange={(e) => setSelectedPrinter(e.target.value)} 
                className="select-dropdown"
              >
                <option value="default">Default Printer</option>
                {printers.map((p, i) => {
                  const name = p?.name || p?.deviceId || (typeof p === 'string' ? p : 'Unknown');
                  const val = p?.deviceId || p?.name || (typeof p === 'string' ? p : 'unknown');
                  return <option key={i} value={val}>{name}</option>;
                })}
              </select>
            </div>
          </div>

          {uploadMode === 'single' ? (
            <div className="upload-card">
              <span className="upload-icon">📄</span>
              <h2>Select a Document</h2>
              <p style={{ color: 'var(--text-muted)', marginTop: '0.5rem' }}>
                Supports JPG, PNG, WEBP, PDF and more.
              </p>
              <input 
                type="file" 
                id="file-upload" 
                accept="image/*,application/pdf" 
                onChange={handleImageUpload} 
                style={{ display: 'none' }} 
              />
              <button 
                className="upload-btn" 
                onClick={() => document.getElementById('file-upload').click()}
              >
                Browse Files
              </button>
            </div>
          ) : (
            <div className="merge-container">
              <div className="upload-card mini">
                <span className="upload-icon">💳</span>
                <h2>Front Side</h2>
                <input 
                  type="file" 
                  id="front-upload" 
                  accept="image/*" 
                  onChange={handleFrontUpload} 
                  style={{ display: 'none' }} 
                />
                {!frontImage ? (
                  <button 
                    className="upload-btn" 
                    onClick={() => document.getElementById('front-upload').click()}
                  >
                    Upload Front
                  </button>
                ) : (
                  <div className="preview-container">
                    <img src={frontImage} alt="Front preview" className="mini-preview" />
                    <button className="remove-btn" onClick={removeFront}>Remove</button>
                  </div>
                )}
              </div>
              
              <div className="upload-card mini">
                <span className="upload-icon">🔄</span>
                <h2>Back Side</h2>
                <input 
                  type="file" 
                  id="back-upload" 
                  accept="image/*" 
                  onChange={handleBackUpload} 
                  style={{ display: 'none' }} 
                />
                {!backImage ? (
                  <button 
                    className="upload-btn" 
                    onClick={() => document.getElementById('back-upload').click()}
                  >
                    Upload Back
                  </button>
                ) : (
                  <div className="preview-container">
                    <img src={backImage} alt="Back preview" className="mini-preview" />
                    <button className="remove-btn" onClick={removeBack}>Remove</button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="editor-container">
          <FilerobotImageEditor
            source={imageFile}
            onSave={(editedImageObject, designState) => handlePrint(editedImageObject)}
            onClose={handleCloseEditor}
            annotationsCommon={{ fill: '#ff0000' }}
            Text={{ text: 'Add Text Here' }}
            Rotate={{ angle: 90, componentType: 'slider' }}
            Crop={{
              presetsItems: [
                { titleKey: 'classicTv', descriptionKey: '4:3', ratio: 4 / 3 },
                { titleKey: 'cinemascope', descriptionKey: '21:9', ratio: 21 / 9 },
              ],
            }}
            tabsIds={[TABS.ADJUST, TABS.ANNOTATE, TABS.WATERMARK, TABS.FILTERS, TABS.FINETUNE]}
            defaultTabId={TABS.ADJUST}
            defaultToolId={TOOLS.CROP}
            savingPixelRatio={4}
            previewPixelRatio={window.devicePixelRatio}
            theme={{ typography: { fontFamily: 'Inter, sans-serif' } }}
            translations={{
              save: 'Print Document',
              saveAs: 'Print As'
            }}
          />
        </div>
      )}
    </div>
  );
}

export default App;
