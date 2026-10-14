const fs = require('fs');

let code = fs.readFileSync('src/db.ts', 'utf-8');

// Insert table creation
const createTableSQL = `
      CREATE TABLE IF NOT EXISTS tahun_ajaran (
        id VARCHAR(255) PRIMARY KEY,
        nama VARCHAR(255) NOT NULL,
        is_active BOOLEAN DEFAULT false,
        dibuat_pada VARCHAR(255)
      );
`;

code = code.replace(
    /CREATE TABLE IF NOT EXISTS rombel_status[^{]*\([^;]+;/s,
    match => match + createTableSQL
);

fs.writeFileSync('src/db.ts', code);
