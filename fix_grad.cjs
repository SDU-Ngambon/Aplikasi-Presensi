const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf-8');

const regex = /if \(isGraduating\) \{\s*changes\.push\(\{\s*id: student\.id,[\s\S]*?await updateStudent\(student\.id, \{ status: 'LULUS' \}\);\s*\}/;

const replacement = `if (isGraduating) {
          const alumniClass = student.class.startsWith('Alumni') ? student.class : \`Alumni \${student.class}\`;
          changes.push({
            id: student.id,
            name: student.name,
            nisn: student.nisn,
            oldClass: student.class,
            newClass: alumniClass,
            oldStatus: student.status || 'AKTIF',
            newStatus: 'LULUS',
            action: 'LULUS'
          });
          graduatedCount++;
          if (!dryRun) {
            await updateStudent(student.id, { status: 'LULUS', class: alumniClass });
          }
        }`;

code = code.replace(regex, replacement);
fs.writeFileSync('server.ts', code);
