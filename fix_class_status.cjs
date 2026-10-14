const fs = require('fs');
let code = fs.readFileSync('src/pages/admin/Rombel.tsx', 'utf-8');

code = code.replace(/status: 'AKTIF' \| 'PKL';/g, "status: 'AKTIF' | 'PKL' | 'LULUS' | string;");

fs.writeFileSync('src/pages/admin/Rombel.tsx', code);
