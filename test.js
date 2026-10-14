const fs = require('fs');
console.log(fs.readFileSync('src/pages/admin/Rombel.tsx', 'utf-8').indexOf('setActiveClass(null)'));
