// ===================================
// 📧 SERVEUR EMAIL CLIENTS RATHEAU - CORRIGÉ
// ===================================

const express = require('express');
const cors = require('cors');
const multer = require('multer');
const nodemailer = require('nodemailer');
const XLSX = require('xlsx');
const path = require('path');
const fs = require('fs').promises;
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// ===================================
// MIDDLEWARE CONFIGURATION
// ===================================

app.use(cors({
  origin: 'http://localhost:3000',
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type']
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ===================================
// MULTER CONFIGURATION (FILE UPLOAD)
// ===================================

const upload = multer({
  dest: 'uploads/',
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB max
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['.xlsx', '.xls'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowedTypes.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Type de fichier non autorisé. Utilisez .xlsx ou .xls'));
    }
  }
});

// ===================================
// SMTP CONFIGURATION - CORRIGÉE
// ===================================

const createTransport = () => {
  console.log('📧 Configuration SMTP:', {
    host: process.env.SMTP_HOST || 'Non configuré',
    port: process.env.SMTP_PORT || 'Non configuré',
    user: process.env.SMTP_USER ? process.env.SMTP_USER.substring(0, 3) + '***' : 'Non configuré'
  });

  if (process.env.SMTP_HOST === 'smtp.gmail.com') {
    return nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });
  }

  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT) || 587,
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    }
  });
};

const testConnection = async () => {
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    return false;
  }
  
  try {
    const transporter = createTransport();
    await transporter.verify();
    return true;
  } catch (error) {
    console.error('❌ Erreur connexion SMTP:', error.message);
    return false;
  }
};

// ===================================
// API ROUTES
// ===================================

// Health check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    message: 'Serveur email opérationnel',
    version: '1.0.0'
  });
});

// Test API
app.get('/api/email/test', (req, res) => {
  res.json({ 
    message: 'API Email fonctionne parfaitement!', 
    timestamp: new Date().toISOString(),
    smtp_configured: !!(process.env.SMTP_USER && process.env.SMTP_PASS),
    server_running: true
  });
});

// Test connexion SMTP
app.get('/api/email/test-smtp', async (req, res) => {
  try {
    const isConnected = await testConnection();
    res.json({
      success: isConnected,
      message: isConnected ? 'Connexion SMTP OK' : 'SMTP non configuré ou connexion échouée',
      config: {
        host: process.env.SMTP_HOST || 'Non configuré',
        port: process.env.SMTP_PORT || 'Non configuré',
        user: process.env.SMTP_USER ? process.env.SMTP_USER.substring(0, 5) + '***' : 'Non configuré'
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Upload de fichier Excel
app.post('/api/email/upload', upload.single('file'), async (req, res) => {
  try {
    console.log('📁 Upload de fichier reçu');
    
    if (!req.file) {
      return res.status(400).json({ error: 'Aucun fichier uploadé' });
    }

    console.log('📄 Lecture du fichier:', req.file.filename);

    // Lire et parser le fichier Excel
    const workbook = XLSX.readFile(req.file.path);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet);

    console.log('📊 Données extraites:', data.length, 'lignes');

    // Validation des colonnes requises
    const requiredColumns = ['ID_Client', 'Nom_Société', 'Nom', 'Prénom', 'Email'];
    if (data.length > 0) {
      const columns = Object.keys(data[0]);
      const missingColumns = requiredColumns.filter(col => !columns.includes(col));
      
      if (missingColumns.length > 0) {
        console.log('❌ Colonnes manquantes:', missingColumns);
        return res.status(400).json({
          error: `Colonnes manquantes: ${missingColumns.join(', ')}`
        });
      }
    }

    // Nettoyer le fichier temporaire
    await fs.unlink(req.file.path);

    console.log('✅ Fichier traité avec succès');

    res.json({
      success: true,
      data: data,
      message: `${data.length} clients trouvés`
    });

  } catch (error) {
    console.error('💥 Erreur upload:', error);
    res.status(500).json({ error: 'Erreur lors du traitement du fichier: ' + error.message });
  }
});

// Envoi d'emails - CORRIGÉ
app.post('/api/email/send', async (req, res) => {
  try {
    console.log('📧 Demande d\'envoi d\'emails reçue');
    
    const { clients, subject, message } = req.body;

    // Validation basique
    if (!clients || !Array.isArray(clients) || clients.length === 0) {
      return res.status(400).json({ error: 'Aucun client sélectionné' });
    }

    if (!subject || subject.trim().length === 0) {
      return res.status(400).json({ error: 'Sujet requis' });
    }

    if (!message || message.trim().length === 0) {
      return res.status(400).json({ error: 'Message requis' });
    }

    console.log(`📊 Envoi à ${clients.length} clients`);

    // Vérifier la configuration SMTP
    if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
      return res.status(400).json({ 
        error: 'Configuration SMTP manquante. Veuillez configurer SMTP_USER et SMTP_PASS dans le fichier .env' 
      });
    }

    const results = [];
    const transporter = createTransport(); // CORRIGÉ: createTransport au lieu de createTransporter

    // Vérifier la connexion SMTP
    try {
      await transporter.verify();
      console.log('✅ Connexion SMTP vérifiée');
    } catch (error) {
      console.error('❌ Erreur connexion SMTP:', error);
      return res.status(500).json({ 
        error: 'Impossible de se connecter au serveur SMTP. Vérifiez votre configuration.' 
      });
    }

    // Envoyer les emails un par un
    for (let i = 0; i < clients.length; i++) {
      const client = clients[i];
      
      try {
        console.log(`📧 Envoi ${i + 1}/${clients.length} à ${client.Email}`);

        const personalizedMessage = message.replace(
          /client\(e\)/gi,
          `${client.Prénom} ${client.Nom}`
        );

        const mailOptions = {
          from: `"Équipe Ratheau" <${process.env.SMTP_USER}>`,
          to: client.Email,
          subject: subject,
          text: personalizedMessage,
          html: personalizedMessage.replace(/\n/g, '<br>')
        };

        // Ajouter pièce jointe si elle existe
        const pdfPath = path.join(__dirname, 'documents', 'formulaire_ouverture_compte.pdf');
        if (require('fs').existsSync(pdfPath)) {
          mailOptions.attachments = [{
            filename: 'formulaire_ouverture_compte.pdf',
            path: pdfPath,
            contentType: 'application/pdf'
          }];
          console.log('📎 Pièce jointe ajoutée:', pdfPath);
        } else {
          console.log('⚠️ Pièce jointe non trouvée:', pdfPath);
        }

        const info = await transporter.sendMail(mailOptions);

        results.push({
          client: client,
          success: true,
          timestamp: new Date().toISOString(),
          message: 'Email envoyé avec succès',
          messageId: info.messageId
        });

        console.log(`✅ Email envoyé à ${client.Email} - ID: ${info.messageId}`);

        // Délai entre chaque envoi (1 seconde)
        if (i < clients.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }

      } catch (error) {
        console.error(`❌ Erreur envoi à ${client.Email}:`, error.message);
        
        results.push({
          client: client,
          success: false,
          timestamp: new Date().toISOString(),
          error: error.message
        });
      }
    }

    const successCount = results.filter(r => r.success).length;
    const totalCount = results.length;

    console.log(`📊 Résultat final: ${successCount}/${totalCount} emails envoyés`);

    res.json({
      success: true,
      results: results,
      summary: {
        total: totalCount,
        success: successCount,
        failed: totalCount - successCount
      }
    });

  } catch (error) {
    console.error('💥 Erreur globale envoi emails:', error);
    res.status(500).json({ error: 'Erreur lors de l\'envoi des emails: ' + error.message });
  }
});

// ===================================
// ERROR HANDLERS
// ===================================

// 404 handler
app.use((req, res) => {
  res.status(404).json({ 
    error: 'Route non trouvée', 
    path: req.path,
    availableRoutes: [
      'GET /api/health',
      'GET /api/email/test',
      'GET /api/email/test-smtp',
      'POST /api/email/upload',
      'POST /api/email/send'
    ]
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('💥 Erreur serveur:', err);
  
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({ error: 'Fichier trop volumineux (max 10MB)' });
  }
  
  res.status(500).json({ error: err.message });
});

// ===================================
// SERVER STARTUP
// ===================================

app.listen(PORT, async () => {
  console.log('');
  console.log('🚀 ===================================');
  console.log(`📧 SERVEUR EMAIL RATHEAU - PORT ${PORT}`);
  console.log('🚀 ===================================');
  console.log('');
  console.log('🔗 URLs disponibles:');
  console.log(`   ✅ Health: http://localhost:${PORT}/api/health`);
  console.log(`   🧪 Test API: http://localhost:${PORT}/api/email/test`);
  console.log(`   📧 Test SMTP: http://localhost:${PORT}/api/email/test-smtp`);
  console.log('');
  
  // Test automatique de la configuration SMTP
  if (process.env.SMTP_USER && process.env.SMTP_PASS) {
    console.log('🧪 Test de la configuration SMTP...');
    const isConnected = await testConnection();
    if (isConnected) {
      console.log('✅ SMTP configuré et fonctionnel - Prêt pour l\'envoi!');
    } else {
      console.log('⚠️  SMTP configuré mais connexion échouée');
      console.log('💡 Vérifiez vos paramètres SMTP dans .env');
    }
  } else {
    console.log('⚠️  SMTP non configuré');
    console.log('💡 Pour envoyer des emails, éditez le fichier .env');
    console.log('   Ajoutez: SMTP_USER et SMTP_PASS');
  }
  
  console.log('');
  console.log('🎯 APPLICATION PRÊTE À UTILISER!');
  console.log('   Frontend: http://localhost:3000');
  console.log(`   Backend: http://localhost:${PORT}`);
  console.log('');
});

module.exports = app;