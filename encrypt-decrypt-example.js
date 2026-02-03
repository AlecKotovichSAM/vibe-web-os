(async () => {
    const publicKey = JSON.parse(localStorage.getItem('webos.account.v1')).publicKey;
    const privateKey = await window.Auth.getPrivateKey(prompt('Пароль:'));
    
    const encrypted = await RSAExample.encryptMessage("Хэллоу, Мир!!!", publicKey);
    console.log('Зашифровано:', encrypted);
    
    const decrypted = await RSAExample.decryptMessage(encrypted, privateKey);
    console.log('Расшифровано:', decrypted);
  })();