const fs = require('fs');
let code = fs.readFileSync('src/pages/admin/Rombel.tsx', 'utf-8');

const brokenSearchBar = /<Grid container spacing=\{2\} sx=\{\{ alignItems: 'center' \}\}>\s*<Grid size=\{\{ xs: 12, sm: 4, md: 4 \}\}>\s*<TextField[\s\S]*?\/>\s*<\/Grid>\s*<\/Grid>/;

const correctSearchBar = `
        <Grid container spacing={2} sx={{ alignItems: 'center' }}>
          <Grid size={{ xs: 12, sm: 4, md: 4 }}>
            <TextField
              fullWidth
              size="small"
              placeholder="Cari nama kelas atau wali kelas..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              slotProps={{
                input: {
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon color="action" fontSize="small" />
                    </InputAdornment>
                  ),
                }
              }}
            />
          </Grid>
          <Grid size={{ xs: 6, sm: 4, md: 4 }}>
            <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
              <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600, minWidth: 50 }}>
                Tingkat:
              </Typography>
              <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                {[
                  { label: 'Semua', val: 'ALL' },
                  { label: 'Kelas 10', val: '10' },
                  { label: 'Kelas 11', val: '11' },
                  { label: 'Kelas 12', val: '12' },
                ].map(item => (
                  <Chip
                    key={item.val}
                    label={item.label}
                    size="small"
                    color={selectedGrade === item.val ? 'primary' : 'default'}
                    variant={selectedGrade === item.val ? 'filled' : 'outlined'}
                    onClick={() => setSelectedGrade(item.val)}
                    sx={{ fontWeight: 600, cursor: 'pointer' }}
                  />
                ))}
              </Box>
            </Stack>
          </Grid>
          <Grid size={{ xs: 6, sm: 4, md: 4 }}>
            <Stack direction="row" spacing={1} sx={{ alignItems: 'center', justifyContent: { sm: 'flex-end' } }}>
              <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600, minWidth: 50 }}>
                Status:
              </Typography>
              <Box sx={{ display: 'flex', gap: 0.5 }}>
                {[
                  { label: 'Semua', val: 'ALL' },
                  { label: 'Aktif', val: 'AKTIF' },
                  { label: 'PKL', val: 'PKL' },
                ].map(item => (
                  <Chip
                    key={item.val}
                    label={item.label}
                    size="small"
                    color={selectedStatus === item.val ? (item.val === 'PKL' ? 'warning' : 'success') : 'default'}
                    variant={selectedStatus === item.val ? 'filled' : 'outlined'}
                    onClick={() => setSelectedStatus(item.val)}
                    sx={{ fontWeight: 600, cursor: 'pointer' }}
                  />
                ))}
              </Box>
            </Stack>
          </Grid>
        </Grid>
`;

code = code.replace(brokenSearchBar, correctSearchBar);
fs.writeFileSync('src/pages/admin/Rombel.tsx', code);
