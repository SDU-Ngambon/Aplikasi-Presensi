const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf-8');

code = code.replace(/          \}\n        \}\n        \} else if \(newClass !== student\.class\) \{/g, "          }\n        } else if (newClass !== student.class) {");

fs.writeFileSync('server.ts', code);
