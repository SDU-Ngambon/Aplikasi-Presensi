const fs = require('fs');
let code = fs.readFileSync('src/pages/admin/Rombel.tsx', 'utf-8');

const regex = /<\/Grid>\s*<Dialog\s*open=\{promoteOpen\}/m;

const replacement = `
        </Grid>
      </Paper>
      <Dialog open={promoteOpen}`;

code = code.replace(regex, replacement);
fs.writeFileSync('src/pages/admin/Rombel.tsx', code);
