require('dotenv').config();
const { testConnection } = require('./src/services/emailService');

console.log('🧪 Test de connexion SMTP...');
console.log('Configuration:');
console.log(`  Host: ${process.env.SMTP_HOST}`);
console.log(`  Port: ${process.env.SMTP_PORT}`);
console.log(`  User: ${process.env.SMTP_USER}`);
console.log(`  Pass: ${'*'.repeat(process.env.SMTP_PASS?.length || 0)}`);
console.log('');

testConnection().then(success => {
  if (success) {
    console.log('✅ Configuration SMTP OK - Prêt pour l\'envoi d\'emails!');
    process.exit(0);
  } else {
    console.log('❌ Problème de configuration SMTP');
    console.log('💡 Vérifiez vos paramètres dans .env');
    process.exit(1);
  }
}).catch(error => {
  console.error('💥 Erreur:', error.message);
  process.exit(1);
});