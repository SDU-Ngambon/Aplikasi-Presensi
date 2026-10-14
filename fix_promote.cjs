const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf-8');

code = code.replace(/newYear: student\.year,\s+oldStatus/g, "newYear: studentNewYear,\n            oldStatus");
code = code.replace(/year: student\.year, status: 'AKTIF'/g, "year: studentNewYear, status: 'AKTIF'");

fs.writeFileSync('server.ts', code);
