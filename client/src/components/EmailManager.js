// client/src/components/EmailManager.js - Version Ultra-Moderne
import React, { useState, useRef } from 'react';
import { Upload, Mail, Send, CheckCircle, AlertCircle, Download, Eye } from 'lucide-react';
import axios from 'axios';
import * as XLSX from 'xlsx';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const EmailManager = () => {
  const [clients, setClients] = useState([]);
  const [selectedClients, setSelectedClients] = useState(new Set());
  const [emailMessage, setEmailMessage] = useState(
    "Cher(e) client(e),\n\nVeuillez nous transmettre ces documents afin de procéder à l'ouverture d'un compte client Ratheau.\n\nNous vous remercions pour votre confiance.\n\nCordialement,\nL'équipe Ratheau"
  );
  const [emailSubject, setEmailSubject] = useState("Documents requis - Ouverture de compte client Ratheau");
  const [isLoading, setIsLoading] = useState(false);
  const [sendResults, setSendResults] = useState([]);
  const [showResults, setShowResults] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef(null);

  // Upload et lecture du fichier Excel
  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setIsLoading(true);
    setUploadProgress(0);

    try {
      // Simulation du progress
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return prev;
          }
          return prev + Math.random() * 20;
        });
      }, 100);

      // Lecture côté client pour validation rapide
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data, { cellDates: true });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet);

      // Validation des colonnes requises
      const requiredColumns = ['ID_Client', 'Nom_Société', 'Nom', 'Prénom', 'Email'];
      if (jsonData.length > 0) {
        const columns = Object.keys(jsonData[0]);
        const missingColumns = requiredColumns.filter(col => !columns.includes(col));
        
        if (missingColumns.length > 0) {
          clearInterval(progressInterval);
          alert(`Colonnes manquantes dans le fichier Excel: ${missingColumns.join(', ')}`);
          setIsLoading(false);
          setUploadProgress(0);
          return;
        }
      }

      clearInterval(progressInterval);
      setUploadProgress(100);
      
      setTimeout(() => {
        setClients(jsonData);
        setSelectedClients(new Set());
        setSendResults([]);
        setShowResults(false);
      }, 500);

    } catch (error) {
      console.error('Erreur lecture fichier:', error);
      alert('Erreur lors de la lecture du fichier Excel');
    } finally {
      setIsLoading(false);
      setTimeout(() => setUploadProgress(0), 2000);
    }
  };

  // Gestion de la sélection des clients
  const toggleClientSelection = (index) => {
    const newSelected = new Set(selectedClients);
    if (newSelected.has(index)) {
      newSelected.delete(index);
    } else {
      newSelected.add(index);
    }
    setSelectedClients(newSelected);
  };

  const selectAllClients = () => {
    if (selectedClients.size === clients.length) {
      setSelectedClients(new Set());
    } else {
      setSelectedClients(new Set(clients.map((_, index) => index)));
    }
  };

  // Envoi des emails
  const sendEmails = async () => {
    if (selectedClients.size === 0) {
      alert('Veuillez sélectionner au moins un client');
      return;
    }

    const confirmed = window.confirm(
      `Êtes-vous sûr de vouloir envoyer ${selectedClients.size} emails?\n\nCette action est irréversible.`
    );

    if (!confirmed) return;

    setIsLoading(true);
    setSendResults([]);
    setShowResults(false);

    const selectedClientsList = Array.from(selectedClients).map(index => clients[index]);

    try {
      const response = await axios.post(`${API_BASE_URL}/email/send`, {
        clients: selectedClientsList,
        subject: emailSubject,
        message: emailMessage
      });

      setSendResults(response.data.results);
      setShowResults(true);

      // Afficher résumé avec style
      const { total, success, failed } = response.data.summary;
      alert(`🎉 Envoi terminé!\n\n✅ Réussis: ${success}\n❌ Échecs: ${failed}\n📊 Total: ${total}`);

    } catch (error) {
      console.error('Erreur envoi emails:', error);
      alert('❌ Erreur lors de l\'envoi des emails: ' + (error.response?.data?.error || error.message));
    } finally {
      setIsLoading(false);
    }
  };

  // Aperçu de l'email
  const getEmailPreview = (client) => {
    const personalizedMessage = emailMessage.replace(/client\(e\)/gi, `${client.Prénom} ${client.Nom}`);
    return {
      to: client.Email,
      subject: emailSubject,
      body: personalizedMessage
    };
  };

  // Générer fichier d'exemple
  const generateSampleExcel = () => {
    const sampleData = [
      {
        'ID_Client': 'C001',
        'Nom_Société': 'TechCorp Solutions',
        'Nom': 'Dubois',
        'Prénom': 'Jean',
        'Email': 'jean.dubois@techcorp.fr',
        'Téléphone': '01.23.45.67.89',
        'Adresse_Facturation': '123 Rue de la Technologie, 75001 Paris'
      },
      {
        'ID_Client': 'C002',
        'Nom_Société': 'InnovateWeb SARL',
        'Nom': 'Martin',
        'Prénom': 'Marie',
        'Email': 'marie.martin@innovateweb.fr',
        'Téléphone': '02.34.56.78.90',
        'Adresse_Facturation': '456 Avenue de l\'Innovation, 69000 Lyon'
      }
    ];

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(sampleData);
    XLSX.utils.book_append_sheet(wb, ws, 'Clients');
    XLSX.writeFile(wb, 'clients_exemple.xlsx');
  };

  return (
    <div className="email-app">
      {/* Background animé */}
      <div className="background-animation"></div>
      
      <div className="email-container">
        {/* Header avec effet glassmorphism */}
        <div className="email-header">
          <div className="header-content">
            <div className="header-icon">
              <Mail className="w-8 h-8" />
            </div>
            <div className="header-text">
              <h1 className="header-title">
                Gestionnaire d'Envoi d'Emails Clients Ratheau
              </h1>
              <p className="header-subtitle">
                Envoyez des emails personnalisés avec pièces jointes à vos clients sélectionnés
              </p>
            </div>
          </div>
          <div className="header-decoration"></div>
        </div>

        <div className="email-content">
          {/* Section Upload avec animations */}
          <div className="upload-section">
            <div className="upload-area" onClick={() => fileInputRef.current?.click()}>
              <div className="upload-icon-container">
                <Upload className={`upload-icon ${isLoading ? 'animate-pulse' : ''}`} />
                {isLoading && <div className="loading-spinner"></div>}
              </div>
              
              <div className="upload-text">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  accept=".xlsx,.xls"
                  className="file-input"
                  disabled={isLoading}
                />
                <button
                  className={`upload-button ${isLoading ? 'loading' : ''}`}
                  disabled={isLoading}
                >
                  <span>{isLoading ? 'Chargement...' : 'Charger fichier Excel'}</span>
                </button>
                
                {uploadProgress > 0 && (
                  <div className="progress-container">
                    <div className="progress-bar">
                      <div 
                        className="progress-fill"
                        style={{ width: `${uploadProgress}%` }}
                      ></div>
                    </div>
                    <span className="progress-text">{Math.round(uploadProgress)}%</span>
                  </div>
                )}
                
                <p className="upload-info">
                  Formats acceptés: .xlsx, .xls (max 10MB)
                </p>
              </div>
            </div>
            
            <div className="sample-download">
              <button onClick={generateSampleExcel} className="sample-button">
                <Download className="w-5 h-5" />
                Télécharger fichier d'exemple
              </button>
            </div>
          </div>

          {/* Configuration de l'email */}
          {clients.length > 0 && (
            <div className="config-section fade-in">
              <h3 className="section-title">
                <span className="title-icon">⚙️</span>
                Configuration de l'Email
              </h3>
              
              <div className="config-grid">
                <div className="form-group">
                  <label className="form-label">Objet de l'email</label>
                  <input
                    type="text"
                    value={emailSubject}
                    onChange={(e) => setEmailSubject(e.target.value)}
                    className="form-input"
                    placeholder="Objet de votre email..."
                  />
                </div>
                
                <div className="form-group full-width">
                  <label className="form-label">Message de l'email</label>
                  <textarea
                    value={emailMessage}
                    onChange={(e) => setEmailMessage(e.target.value)}
                    rows={6}
                    className="form-textarea"
                    placeholder="Votre message personnalisé..."
                  />
                  <p className="form-hint">
                    💡 Le texte "client(e)" sera remplacé par le nom du client
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Liste des clients */}
          {clients.length > 0 && (
            <div className="clients-section fade-in">
              <div className="clients-header">
                <h3 className="section-title">
                  <span className="title-icon">👥</span>
                  Clients ({clients.length} trouvés)
                </h3>
                <div className="clients-actions">
                  <button onClick={selectAllClients} className="select-all-button">
                    {selectedClients.size === clients.length ? 'Désélectionner tout' : 'Sélectionner tout'}
                  </button>
                  <span className="selection-counter">
                    {selectedClients.size} sélectionné(s)
                  </span>
                </div>
              </div>

              <div className="table-container">
                <table className="clients-table">
                  <thead>
                    <tr>
                      <th className="table-header">
                        <input
                          type="checkbox"
                          checked={selectedClients.size === clients.length && clients.length > 0}
                          onChange={selectAllClients}
                          className="table-checkbox"
                        />
                      </th>
                      <th className="table-header">ID</th>
                      <th className="table-header">Société</th>
                      <th className="table-header">Nom</th>
                      <th className="table-header">Prénom</th>
                      <th className="table-header">Email</th>
                      <th className="table-header">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {clients.map((client, index) => (
                      <tr 
                        key={index} 
                        className={`table-row ${selectedClients.has(index) ? 'selected' : ''}`}
                      >
                        <td className="table-cell">
                          <input
                            type="checkbox"
                            checked={selectedClients.has(index)}
                            onChange={() => toggleClientSelection(index)}
                            className="table-checkbox"
                          />
                        </td>
                        <td className="table-cell client-id">{client.ID_Client}</td>
                        <td className="table-cell">{client.Nom_Société}</td>
                        <td className="table-cell">{client.Nom}</td>
                        <td className="table-cell">{client.Prénom}</td>
                        <td className="table-cell client-email">{client.Email}</td>
                        <td className="table-cell">
                          <button
                            onClick={() => {
                              const preview = getEmailPreview(client);
                              alert(`📧 Aperçu email pour ${client.Prénom} ${client.Nom}:\n\nÀ: ${preview.to}\nObjet: ${preview.subject}\n\nMessage:\n${preview.body}`);
                            }}
                            className="preview-button"
                          >
                            <Eye className="w-4 h-4" />
                            Aperçu
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Bouton d'envoi spectaculaire */}
              <div className="send-section">
                <button
                  onClick={sendEmails}
                  disabled={isLoading || selectedClients.size === 0}
                  className={`send-button ${isLoading ? 'loading' : ''} ${selectedClients.size === 0 ? 'disabled' : ''}`}
                >
                  <div className="button-content">
                    {isLoading ? (
                      <>
                        <div className="loading-spinner small"></div>
                        Envoi en cours...
                      </>
                    ) : (
                      <>
                        <Send className="w-6 h-6" />
                        Envoyer emails ({selectedClients.size})
                      </>
                    )}
                  </div>
                  <div className="button-glow"></div>
                </button>
                
                {selectedClients.size > 0 && (
                  <p className="send-warning">
                    ⚠️ Cette action enverra de vrais emails aux clients sélectionnés
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Résultats d'envoi avec animations */}
          {showResults && (
            <div className="results-section slide-up">
              <h3 className="section-title">
                <span className="title-icon">📊</span>
                Résultats d'envoi
              </h3>
              <div className="results-container">
                {sendResults.map((result, index) => (
                  <div
                    key={index}
                    className={`result-item ${result.success ? 'success' : 'error'}`}
                    style={{ animationDelay: `${index * 0.1}s` }}
                  >
                    <div className="result-content">
                      <div className="result-icon">
                        {result.success ? (
                          <CheckCircle className="w-5 h-5" />
                        ) : (
                          <AlertCircle className="w-5 h-5" />
                        )}
                      </div>
                      <div className="result-info">
                        <span className="result-name">
                          {result.client.Prénom} {result.client.Nom}
                        </span>
                        <span className="result-email">({result.client.Email})</span>
                      </div>
                    </div>
                    <div className="result-status">
                      {result.success ? (
                        <span className="success-time">
                          ✅ {new Date(result.timestamp).toLocaleString('fr-FR')}
                        </span>
                      ) : (
                        <span className="error-message">❌ {result.error}</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Message d'accueil quand aucun client */}
          {clients.length === 0 && (
            <div className="welcome-section">
              <div className="welcome-content">
                <div className="welcome-icon">📧</div>
                <h3 className="welcome-title">Bienvenue dans le Gestionnaire d'Emails Ratheau</h3>
                <p className="welcome-text">
                  Commencez par charger un fichier Excel contenant vos clients ou téléchargez notre fichier d'exemple pour tester l'application.
                </p>
                <div className="welcome-features">
                  <div className="feature">
                    <span className="feature-icon">📊</span>
                    <span>Import Excel simplifié</span>
                  </div>
                  <div className="feature">
                    <span className="feature-icon">✉️</span>
                    <span>Emails personnalisés</span>
                  </div>
                  <div className="feature">
                    <span className="feature-icon">📎</span>
                    <span>Pièces jointes PDF</span>
                  </div>
                  <div className="feature">
                    <span className="feature-icon">📈</span>
                    <span>Suivi des résultats</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default EmailManager;