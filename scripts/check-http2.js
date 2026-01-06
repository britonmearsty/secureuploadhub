const https = require('https');

function checkHTTP2Support(url) {
  return new Promise((resolve, reject) => {
    const req = https.request(url, { 
      method: 'HEAD',
      // Force HTTP/2 if available
      protocol: 'https:',
    }, (res) => {
      console.log(`HTTP Version: ${res.httpVersion}`);
      console.log(`Status: ${res.statusCode}`);
      console.log('Headers:', res.headers);
      
      if (res.httpVersion === '2.0') {
        console.log('✅ HTTP/2 is enabled!');
      } else {
        console.log('❌ HTTP/2 is not enabled. Using HTTP/' + res.httpVersion);
      }
      
      resolve(res.httpVersion);
    });
    
    req.on('error', reject);
    req.end();
  });
}

// Check your deployed site
const siteUrl = process.argv[2] || 'https://your-site.vercel.app';
console.log(`Checking HTTP/2 support for: ${siteUrl}`);
checkHTTP2Support(siteUrl);