const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf-8');

const regex = /\s+app\.get\('\/api\/tahun-ajaran'[\s\S]*?app\.listen\(Number\(PORT\)/;
const match = code.match(regex);
if (match) {
  const routesStr = match[0].replace(/\s+app\.listen\(Number\(PORT\)/, '');
  code = code.replace(routesStr, '');
  
  const viteSetupRegex = /\/\/ Vite \+ Frontend setup/;
  code = code.replace(viteSetupRegex, routesStr + '\n\n  // Vite + Frontend setup');
  fs.writeFileSync('server.ts', code);
}
