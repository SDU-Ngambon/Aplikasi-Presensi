const fs = require('fs');

let code = fs.readFileSync('src/pages/admin/Settings.tsx', 'utf-8');

// Replace "Branding & Judul"
code = code.replace(/label="Branding & Judul"/g, 'label="Informasi Sekolah"');
code = code.replace(/value="branding"/g, 'value="info"');
code = code.replace(/categoryTab === 'branding'/g, "categoryTab === 'info'");
code = code.replace(/Branding & Waktu Otomatis/g, 'Informasi Sekolah & Waktu');

fs.writeFileSync('src/pages/admin/Settings.tsx', code);
