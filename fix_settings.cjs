const fs = require('fs');
let code = fs.readFileSync('src/pages/admin/Settings.tsx', 'utf-8');

// Change initial state
code = code.replace(/useState\(urlTab \|\| 'all'\);/g, "useState(urlTab || 'wa');");

// Remove the Tab
code = code.replace(/<Tab label="Semua Pengaturan" value="all".*?\/>\n/g, "");

// Remove the conditions
code = code.replace(/\(categoryTab === 'all' \|\| categoryTab === /g, "(categoryTab === ");

fs.writeFileSync('src/pages/admin/Settings.tsx', code);
