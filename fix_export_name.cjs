const fs = require('fs');
let code = fs.readFileSync('src/pages/admin/Rombel.tsx', 'utf-8');

code = code.replace(/onClick=\{handleExportClass\}/g, "onClick={handleExportStudents}");

fs.writeFileSync('src/pages/admin/Rombel.tsx', code);
