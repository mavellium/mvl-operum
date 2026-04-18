const crypto = require('crypto');
const fs = require('fs');

console.log('Gerando chaves RSA 4096-bit. Aguarde um momento...');

const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
  modulusLength: 4096,
  publicKeyEncoding: {
    type: 'spki',
    format: 'pem'
  },
  privateKeyEncoding: {
    type: 'pkcs8',
    format: 'pem'
  }
});

fs.writeFileSync('public.pem', publicKey);
fs.writeFileSync('private.pem', privateKey);

console.log('✅ Sucesso! Arquivos public.pem e private.pem foram criados nesta pasta.');