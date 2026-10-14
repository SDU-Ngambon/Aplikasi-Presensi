const fs = require('fs');
let code = fs.readFileSync('src/pages/admin/Settings.tsx', 'utf-8');

code = code.replace(/setList\(data\);/g, "setList(Array.isArray(data) ? data : []);");

fs.writeFileSync('src/pages/admin/Settings.tsx', code);
