const fs = require('fs');
let code = fs.readFileSync('src/pages/admin/Rombel.tsx', 'utf-8');

const replacement = `        </Grid>
      </Paper>

      {/* Rombel Grid */}
      <Grid container spacing={3}>
        {filteredClasses.length === 0 ? (
          <Grid size={{ xs: 12 }}>
            <Paper sx={{ p: 5, textAlign: 'center', borderRadius: 3, border: '1px dashed #cbd5e1', bgcolor: '#f8fafc' }}>
              <SchoolIcon sx={{ fontSize: 64, color: '#94a3b8', mb: 2 }} />
              <Typography variant="h6" color="text.secondary">Tidak ada rombongan belajar</Typography>
            </Paper>
          </Grid>
        ) : (
          filteredClasses.map(cls => (
            <Grid size={{ xs: 12, md: 6, lg: 4 }} key={cls.name}>
              <Card variant="outlined" sx={{ borderRadius: 3, height: '100%', display: 'flex', flexDirection: 'column', transition: 'all 0.2s', '&:hover': { boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)' } }}>
                <Box sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', bgcolor: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                  <Box>
                    <Typography variant="h6" sx={{ fontWeight: 800, color: '#0f172a' }}>{cls.name}</Typography>
                    <Typography variant="body2" color="text.secondary">Tahun: {cls.year}</Typography>
                  </Box>
                  <Chip
                    label={cls.status}
                    size="small"
                    color={cls.status === 'LULUS' ? 'success' : cls.status === 'PKL' ? 'warning' : 'primary'}
                    sx={{ fontWeight: 700 }}
                  />
                </Box>
                <CardContent sx={{ flexGrow: 1, p: 2 }}>
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, textTransform: 'uppercase', display: 'block', mb: 1 }}>Wali Kelas</Typography>
                    {cls.teacher ? (
                      <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
                        <Avatar sx={{ bgcolor: 'primary.main', width: 36, height: 36, fontSize: '1rem', fontWeight: 600 }}>{cls.teacher.name.charAt(0)}</Avatar>
                        <Box>
                          <Typography variant="body2" sx={{ fontWeight: 700, color: '#1e293b' }}>{cls.teacher.name}</Typography>
                          <Typography variant="caption" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <WhatsAppIcon sx={{ fontSize: 14, color: '#22c55e' }} /> {cls.teacher.whatsapp}
                          </Typography>
                        </Box>
                      </Stack>
                    ) : (
                      <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                        <Avatar sx={{ bgcolor: '#e2e8f0', color: '#64748b', width: 36, height: 36 }}>
                          <PersonIcon />
                        </Avatar>
                        <Typography variant="body2" sx={{ fontStyle: 'italic', color: 'text.secondary' }}>Belum ada wali kelas</Typography>
                      </Stack>
                    )}
                    <Button
                      size="small"
                      startIcon={<AssignmentIndIcon />}
                      onClick={() => {
                        setAssignModalClass(cls);
                        setSelectedTeacherId(cls.teacher?.id || '');
                      }}
                      sx={{ mt: 1, ml: 5.5, textTransform: 'none', fontWeight: 600, py: 0 }}
                    >
                      {cls.teacher ? 'Ubah Wali Kelas' : 'Tugaskan Wali Kelas'}
                    </Button>
                  </Box>
                  <Divider sx={{ my: 2 }} />
                  <Box>
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, textTransform: 'uppercase', display: 'block', mb: 1 }}>Statistik Siswa</Typography>
                    <Grid container spacing={2}>
                      <Grid size={{ xs: 4 }}>
                        <Box sx={{ p: 1, bgcolor: '#f0f9ff', borderRadius: 2, textAlign: 'center' }}>
                          <Typography variant="h6" sx={{ fontWeight: 800, color: '#0369a1' }}>{cls.totalStudents}</Typography>
                          <Typography variant="caption" sx={{ color: '#0369a1', fontWeight: 600 }}>Total</Typography>
                        </Box>
                      </Grid>
                      <Grid size={{ xs: 4 }}>
                        <Box sx={{ p: 1, bgcolor: '#f0fdf4', borderRadius: 2, textAlign: 'center' }}>
                          <Typography variant="h6" sx={{ fontWeight: 800, color: '#15803d' }}>{cls.activeStudents}</Typography>
                          <Typography variant="caption" sx={{ color: '#15803d', fontWeight: 600 }}>Aktif</Typography>
                        </Box>
                      </Grid>
                      <Grid size={{ xs: 4 }}>
                        <Box sx={{ p: 1, bgcolor: '#f8fafc', borderRadius: 2, textAlign: 'center' }}>
                          <Typography variant="h6" sx={{ fontWeight: 800, color: '#64748b' }}>{cls.graduatedStudents}</Typography>
                          <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 600 }}>Lulus</Typography>
                        </Box>
                      </Grid>
                    </Grid>
                  </Box>
                </CardContent>
                <Box sx={{ p: 1.5, borderTop: '1px solid #e2e8f0', bgcolor: '#f8fafc', display: 'flex', gap: 1 }}>
                  <Button
                    variant="outlined"
                    fullWidth
                    size="small"
                    startIcon={<PeopleIcon />}
                    onClick={() => {
                      setActiveClass(cls);
                      setModalOpen(true);
                    }}
                    sx={{ borderRadius: 2, fontWeight: 700, textTransform: 'none' }}
                  >
                    Lihat Daftar Siswa
                  </Button>
                </Box>
              </Card>
            </Grid>
          ))
        )}
      </Grid>

      <Dialog open={promoteOpen}`;

code = code.replace(/<\/Grid>\s*<\/Paper>\s*<Dialog open=\{promoteOpen\}/, replacement);
fs.writeFileSync('src/pages/admin/Rombel.tsx', code);
