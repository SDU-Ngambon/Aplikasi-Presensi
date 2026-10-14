import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Grid,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Switch,
  FormControlLabel,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Tabs,
  Tab,
  LinearProgress,
  Tooltip,
  Alert,
  Stack,
  Divider,
  InputAdornment,
  RadioGroup,
  Radio,
  FormLabel
} from '@mui/material';
import {
  AccessTime as AccessTimeIcon,
  Add as AddIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  Save as SaveIcon,
  Refresh as RefreshIcon,
  ContentCopy as CopyIcon,
  Category as CategoryIcon,
  CheckCircle as CheckCircleIcon,
  Help as HelpIcon,
  Schedule as ScheduleIcon,
  PlayArrow as PlayArrowIcon,
  PlaylistAdd as PlaylistAddIcon,
  Link as LinkIcon,
  LinkOff as LinkOffIcon,
  Sync as SyncIcon,
  North as NorthIcon,
  South as SouthIcon,
  Coffee as CoffeeIcon,
  School as SchoolIcon,
  Flag as FlagIcon,
  DeleteSweep as DeleteSweepIcon
} from '@mui/icons-material';
import toast from 'react-hot-toast';
import { KbmCategory, KbmDaySchedule, KbmPeriod } from '../../types';

const DAYS = [
  { index: 1, name: 'Senin' },
  { index: 2, name: 'Selasa' },
  { index: 3, name: 'Rabu' },
  { index: 4, name: 'Kamis' },
  { index: 5, name: 'Jumat' },
  { index: 6, name: 'Sabtu' },
];

// Helper to convert time "HH:MM" to minutes from midnight
function timeToMinutes(timeStr: string): number {
  if (!timeStr) return 0;
  const [h, m] = timeStr.split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
}

// Helper to convert minutes from midnight to "HH:MM"
function minutesToTime(totalM: number): string {
  const h = Math.floor(totalM / 60) % 24;
  const m = totalM % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

// Helper to re-index periods: KBM periods get 1..N, non-KBM activities get 0
function reindexPeriods(periods: KbmPeriod[], categories: KbmCategory[]): KbmPeriod[] {
  let jpCount = 1;
  return periods.map(p => {
    const cat = categories.find(c => c.id === p.category_id || c.name.toLowerCase() === p.category_name?.toLowerCase());
    const isTeaching = p.is_teaching !== undefined 
      ? p.is_teaching 
      : (cat ? cat.is_teaching : p.category_name?.toUpperCase() === 'KBM');

    return {
      ...p,
      is_teaching: isTeaching,
      jp_number: isTeaching ? jpCount++ : 0
    };
  });
}

// Check time continuity between periods
function checkContinuity(periods: KbmPeriod[]) {
  if (periods.length <= 1) return { isContinuous: true, issues: [] };

  const issues: Array<{ index: number; prevName: string; nextName: string; prevEnd: string; nextStart: string; diffMin: number }> = [];

  for (let i = 0; i < periods.length - 1; i++) {
    const cur = periods[i];
    const next = periods[i + 1];
    const curEnd = timeToMinutes(cur.end_time);
    const nextStart = timeToMinutes(next.start_time);

    if (curEnd !== nextStart) {
      issues.push({
        index: i,
        prevName: cur.name || (cur.jp_number > 0 ? `JP ${cur.jp_number}` : cur.category_name),
        nextName: next.name || (next.jp_number > 0 ? `JP ${next.jp_number}` : next.category_name),
        prevEnd: cur.end_time,
        nextStart: next.start_time,
        diffMin: nextStart - curEnd
      });
    }
  }

  return {
    isContinuous: issues.length === 0,
    issues
  };
}

// Automatically align time continuity: chain end_time of i to start_time of i+1
function alignContinuity(periods: KbmPeriod[]): KbmPeriod[] {
  if (periods.length <= 1) return periods;

  const result: KbmPeriod[] = [];
  let currentStart = timeToMinutes(periods[0].start_time);

  for (let i = 0; i < periods.length; i++) {
    const p = periods[i];
    const duration = Math.max(10, timeToMinutes(p.end_time) - timeToMinutes(p.start_time));
    const endMinutes = currentStart + duration;

    result.push({
      ...p,
      start_time: minutesToTime(currentStart),
      end_time: minutesToTime(endMinutes)
    });

    currentStart = endMinutes;
  }

  return result;
}

export default function KbmData() {
  const [categories, setCategories] = useState<KbmCategory[]>([]);
  const [schedules, setSchedules] = useState<KbmDaySchedule[]>([]);
  const [selectedDayIndex, setSelectedDayIndex] = useState<number>(1);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);

  // Category Modal
  const [categoryModalOpen, setCategoryModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<KbmCategory | null>(null);
  const [catName, setCatName] = useState('');
  const [catColor, setCatColor] = useState('#2563eb');
  const [catIsTeaching, setCatIsTeaching] = useState(true);
  const [catDescription, setCatDescription] = useState('');

  // Bulk Generator Modal
  const [bulkModalOpen, setBulkModalOpen] = useState(false);
  const [bulkJpCount, setBulkJpCount] = useState<number>(10);
  const [bulkStartTime, setBulkStartTime] = useState<string>('07:00');
  const [bulkDurationMinutes, setBulkDurationMinutes] = useState<number>(45);
  const [bulkIncludePreActivity, setBulkIncludePreActivity] = useState<boolean>(true);
  const [bulkPreActivityName, setBulkPreActivityName] = useState<string>('Upacara Bendera');
  const [bulkPreDuration, setBulkPreDuration] = useState<number>(45);
  const [bulkIncludeIstirahat1, setBulkIncludeIstirahat1] = useState<boolean>(true);
  const [bulkIstirahat1AfterJp, setBulkIstirahat1AfterJp] = useState<number>(4);
  const [bulkIstirahat1Duration, setBulkIstirahat1Duration] = useState<number>(30);
  const [bulkIncludeIstirahat2, setBulkIncludeIstirahat2] = useState<boolean>(true);
  const [bulkIstirahat2AfterJp, setBulkIstirahat2AfterJp] = useState<number>(7);
  const [bulkIstirahat2Duration, setBulkIstirahat2Duration] = useState<number>(30);

  // Copy Day Modal
  const [copyModalOpen, setCopyModalOpen] = useState(false);
  const [targetDays, setTargetDays] = useState<number[]>([]);
  const [clearDayConfirmOpen, setClearDayConfirmOpen] = useState(false);

  // Period Edit / Insert Modal
  const [periodModalOpen, setPeriodModalOpen] = useState(false);
  const [periodModalMode, setPeriodModalMode] = useState<'add_before' | 'insert' | 'add_end' | 'edit'>('add_end');
  const [insertIndex, setInsertIndex] = useState<number>(0);
  const [editingPeriod, setEditingPeriod] = useState<{ index: number; period: KbmPeriod } | null>(null);
  const [periodActivityType, setPeriodActivityType] = useState<'KBM' | 'NON_KBM'>('KBM');
  const [periodCustomName, setPeriodCustomName] = useState('');
  const [periodStartTime, setPeriodStartTime] = useState('07:00');
  const [periodEndTime, setPeriodEndTime] = useState('07:45');
  const [periodCategoryId, setPeriodCategoryId] = useState('');
  const [autoChainSubsequent, setAutoChainSubsequent] = useState(true);

  // Result Feedback Popup (Modern Modal)
  const [resultPopup, setResultPopup] = useState<{
    open: boolean;
    title: string;
    message: string;
    type: 'success' | 'info' | 'warning';
  }>({
    open: false,
    title: '',
    message: '',
    type: 'success'
  });

  const loadAllData = async () => {
    setLoading(true);
    setProgress(20);
    try {
      const [resCats, resScheds] = await Promise.all([
        fetch('/api/kbm/categories'),
        fetch('/api/kbm/schedules')
      ]);
      setProgress(60);
      const dataCats = await resCats.json();
      const dataScheds = await resScheds.json();
      setCategories(Array.isArray(dataCats) ? dataCats : []);
      setSchedules(Array.isArray(dataScheds) ? dataScheds : []);
      setProgress(100);
    } catch (e: any) {
      toast.error('Gagal memuat data KBM: ' + e.message);
    } finally {
      setTimeout(() => {
        setLoading(false);
        setProgress(0);
      }, 300);
    }
  };

  useEffect(() => {
    loadAllData();
  }, []);

  const currentSchedule = schedules.find(s => s.day_index === selectedDayIndex) || {
    day_index: selectedDayIndex,
    day_name: DAYS.find(d => d.index === selectedDayIndex)?.name || 'Hari',
    is_active: true,
    periods: []
  };

  const continuityStatus = checkContinuity(currentSchedule.periods);

  // Modern operation with progress bar simulation & modern popup
  const runWithProgress = async (actionDesc: string, actionFn: () => Promise<void>, successTitle: string, successMsg: string) => {
    setIsProcessing(true);
    setProgress(15);
    try {
      const pInterval = setInterval(() => {
        setProgress(prev => (prev < 85 ? prev + 20 : prev));
      }, 100);

      await actionFn();
      clearInterval(pInterval);
      setProgress(100);

      setTimeout(() => {
        setIsProcessing(false);
        setProgress(0);
        setResultPopup({
          open: true,
          title: successTitle,
          message: successMsg,
          type: 'success'
        });
      }, 350);
    } catch (err: any) {
      setIsProcessing(false);
      setProgress(0);
      toast.error(err.message || 'Terjadi kesalahan');
    }
  };

  // --- CATEGORIES HANDLERS ---
  const handleOpenAddCategory = () => {
    setEditingCategory(null);
    setCatName('');
    setCatColor('#2563eb');
    setCatIsTeaching(true);
    setCatDescription('');
    setCategoryModalOpen(true);
  };

  const handleOpenEditCategory = (cat: KbmCategory) => {
    setEditingCategory(cat);
    setCatName(cat.name);
    setCatColor(cat.color || '#2563eb');
    setCatIsTeaching(cat.is_teaching);
    setCatDescription(cat.description || '');
    setCategoryModalOpen(true);
  };

  const handleSaveCategory = async () => {
    if (!catName.trim()) {
      toast.error('Nama kategori tidak boleh kosong');
      return;
    }

    await runWithProgress(
      'Menyimpan Kategori KBM',
      async () => {
        const url = editingCategory ? `/api/kbm/categories/${editingCategory.id}` : '/api/kbm/categories';
        const method = editingCategory ? 'PUT' : 'POST';
        const res = await fetch(url, {
          method,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: catName.trim(),
            color: catColor,
            is_teaching: catIsTeaching,
            description: catDescription
          })
        });
        const data = await res.json();
        if (!data.success && !Array.isArray(data)) {
          throw new Error(data.error || 'Gagal menyimpan kategori');
        }
        await loadAllData();
        setCategoryModalOpen(false);
      },
      editingCategory ? 'Kategori Diperbarui' : 'Kategori Ditambahkan',
      `Kategori "${catName}" berhasil disimpan ke sistem.`
    );
  };

  const handleDeleteCategory = async (id: string, name: string) => {
    if (!window.confirm(`Yakin ingin menghapus kategori "${name}"?`)) return;

    await runWithProgress(
      'Menghapus Kategori',
      async () => {
        const res = await fetch(`/api/kbm/categories/${id}`, { method: 'DELETE' });
        const data = await res.json();
        if (!data.success) throw new Error(data.error || 'Gagal menghapus kategori');
        await loadAllData();
      },
      'Kategori Dihapus',
      `Kategori "${name}" berhasil dihapus dari sistem.`
    );
  };

  // --- DAY SCHEDULE HANDLERS ---
  const handleSaveCurrentSchedule = async (updatedSched: KbmDaySchedule) => {
    // Reindex periods before saving so KBM gets 1..N and non-KBM gets 0
    const cleanPeriods = reindexPeriods(updatedSched.periods, categories);
    const payload = {
      ...updatedSched,
      periods: cleanPeriods
    };

    await runWithProgress(
      'Menyimpan Jadwal JP',
      async () => {
        const res = await fetch('/api/kbm/schedules', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (!data.success) throw new Error(data.error || 'Gagal menyimpan jadwal');

        // update local state
        setSchedules(prev => {
          const idx = prev.findIndex(s => s.day_index === payload.day_index);
          if (idx >= 0) {
            const copy = [...prev];
            copy[idx] = payload;
            return copy;
          }
          return [...prev, payload];
        });
      },
      'Jadwal KBM Disimpan',
      `Pengaturan Jam Pelajaran untuk hari ${payload.day_name} berhasil diperbarui.`
    );
  };

  const handleToggleDayActive = (checked: boolean) => {
    const updated: KbmDaySchedule = {
      ...currentSchedule,
      is_active: checked
    };
    handleSaveCurrentSchedule(updated);
  };

  // --- 1-CLICK TIME CONTINUITY ALIGNMENT ---
  const handleAlignTimeContinuity = () => {
    if (currentSchedule.periods.length <= 1) {
      toast('Jadwal sudah berkesinambungan', { icon: 'ℹ️' });
      return;
    }

    const aligned = alignContinuity(currentSchedule.periods);
    const updated: KbmDaySchedule = {
      ...currentSchedule,
      periods: aligned
    };
    handleSaveCurrentSchedule(updated);
  };

  // --- QUICK BULK GENERATOR DENGAN KEGIATAN SEBELUM & DIANTARA JP ---
  const handleGeneratePeriods = () => {
    const defaultKbmCat = categories.find(c => c.is_teaching) || categories[0] || { id: 'kbm', name: 'KBM', color: '#2563eb' };
    const defaultIstirahatCat = categories.find(c => c.name.toLowerCase().includes('istirahat')) || { id: 'istirahat', name: 'Istirahat', color: '#f59e0b' };
    const defaultUpacaraCat = categories.find(c => c.name.toLowerCase().includes('upacara') || c.name.toLowerCase().includes('apel')) || { id: 'upacara', name: 'Upacara', color: '#ef4444' };

    const newPeriods: KbmPeriod[] = [];
    let currentTotalMinutes = timeToMinutes(bulkStartTime);

    // 1. Kegiatan Sebelum JP 1 (Apel / Upacara) jika diaktifkan
    if (bulkIncludePreActivity) {
      const preEnd = currentTotalMinutes + (bulkPreDuration || 45);
      newPeriods.push({
        jp_number: 0,
        is_teaching: false,
        name: bulkPreActivityName || (selectedDayIndex === 1 ? 'Upacara Bendera' : 'Apel Pagi'),
        start_time: minutesToTime(currentTotalMinutes),
        end_time: minutesToTime(preEnd),
        category_id: defaultUpacaraCat.id,
        category_name: defaultUpacaraCat.name,
        category_color: (defaultUpacaraCat as any).color || '#ef4444'
      });
      currentTotalMinutes = preEnd;
    }

    // 2. Loop JP KBM murni dari 1 sampai bulkJpCount
    for (let kbmJp = 1; kbmJp <= bulkJpCount; kbmJp++) {
      const jpEnd = currentTotalMinutes + bulkDurationMinutes;

      newPeriods.push({
        jp_number: kbmJp,
        is_teaching: true,
        name: `KBM JP ${kbmJp}`,
        start_time: minutesToTime(currentTotalMinutes),
        end_time: minutesToTime(jpEnd),
        category_id: defaultKbmCat.id,
        category_name: defaultKbmCat.name,
        category_color: (defaultKbmCat as any).color || '#2563eb'
      });
      currentTotalMinutes = jpEnd;

      // Sisipkan Istirahat 1 di antara JP
      if (bulkIncludeIstirahat1 && kbmJp === bulkIstirahat1AfterJp) {
        const ist1End = currentTotalMinutes + (bulkIstirahat1Duration || 30);
        newPeriods.push({
          jp_number: 0,
          is_teaching: false,
          name: 'Istirahat 1',
          start_time: minutesToTime(currentTotalMinutes),
          end_time: minutesToTime(ist1End),
          category_id: defaultIstirahatCat.id,
          category_name: defaultIstirahatCat.name,
          category_color: (defaultIstirahatCat as any).color || '#f59e0b'
        });
        currentTotalMinutes = ist1End;
      }

      // Sisipkan Istirahat 2 / Sholat di antara JP
      if (bulkIncludeIstirahat2 && kbmJp === bulkIstirahat2AfterJp) {
        const ist2End = currentTotalMinutes + (bulkIstirahat2Duration || 30);
        newPeriods.push({
          jp_number: 0,
          is_teaching: false,
          name: 'Istirahat 2 / Sholat',
          start_time: minutesToTime(currentTotalMinutes),
          end_time: minutesToTime(ist2End),
          category_id: defaultIstirahatCat.id,
          category_name: defaultIstirahatCat.name,
          category_color: (defaultIstirahatCat as any).color || '#f59e0b'
        });
        currentTotalMinutes = ist2End;
      }
    }

    const updatedSched: KbmDaySchedule = {
      ...currentSchedule,
      periods: newPeriods
    };

    setBulkModalOpen(false);
    handleSaveCurrentSchedule(updatedSched);
  };

  // --- COPY DAY SCHEDULE ---
  const handleCopyScheduleToDays = async () => {
    if (targetDays.length === 0) {
      toast.error('Pilih minimal satu hari tujuan');
      return;
    }

    await runWithProgress(
      'Menyalin Jadwal JP',
      async () => {
        const updatedList: KbmDaySchedule[] = [...schedules];
        for (const targetDayIdx of targetDays) {
          const targetDayName = DAYS.find(d => d.index === targetDayIdx)?.name || '';
          const newSched: KbmDaySchedule = {
            day_index: targetDayIdx,
            day_name: targetDayName,
            is_active: currentSchedule.is_active,
            periods: currentSchedule.periods.map(p => ({ ...p }))
          };

          await fetch('/api/kbm/schedules', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(newSched)
          });

          const idx = updatedList.findIndex(s => s.day_index === targetDayIdx);
          if (idx >= 0) updatedList[idx] = newSched;
          else updatedList.push(newSched);
        }

        setSchedules(updatedList);
        setCopyModalOpen(false);
      },
      'Jadwal Berhasil Disalin',
      `Jadwal dari ${currentSchedule.day_name} berhasil disalin ke ${targetDays.length} hari yang dipilih.`
    );
  };

  // --- HAPUS SEMUA JP & KEGIATAN HARI INI ---
  const handleClearDaySchedule = async () => {
    await runWithProgress(
      `Mengosongkan Jadwal ${currentSchedule.day_name}`,
      async () => {
        const res = await fetch(`/api/kbm/schedules/day/${selectedDayIndex}`, {
          method: 'DELETE'
        });
        const data = await res.json();
        if (!data.success) {
          throw new Error(data.error || 'Gagal mengosongkan jadwal hari ini');
        }

        setSchedules(prev => {
          const idx = prev.findIndex(s => s.day_index === selectedDayIndex);
          const cleared: KbmDaySchedule = {
            day_index: selectedDayIndex,
            day_name: currentSchedule.day_name,
            is_active: currentSchedule.is_active,
            periods: []
          };
          if (idx >= 0) {
            const copy = [...prev];
            copy[idx] = cleared;
            return copy;
          }
          return [...prev, cleared];
        });

        setClearDayConfirmOpen(false);
      },
      'Jadwal Berhasil Dikosongkan',
      `Seluruh susunan JP dan kegiatan untuk hari ${currentSchedule.day_name} telah berhasil dihapus. Anda dapat menyusun ulang JP dari awal.`
    );
  };

  // --- PERIOD EDIT / ADD / INSERT / DELETE ---
  const handleOpenAddBefore = () => {
    const nonKbmCat = categories.find(c => !c.is_teaching) || categories[0];
    const firstPeriod = currentSchedule.periods[0];
    let start = '07:00';
    let end = '07:45';

    if (firstPeriod) {
      end = firstPeriod.start_time;
      const endM = timeToMinutes(end);
      const startM = Math.max(0, endM - 45);
      start = minutesToTime(startM);
    }

    setPeriodModalMode('add_before');
    setInsertIndex(0);
    setEditingPeriod(null);
    setPeriodActivityType('NON_KBM');
    setPeriodCustomName(selectedDayIndex === 1 ? 'Upacara Bendera' : 'Apel Pagi');
    setPeriodStartTime(start);
    setPeriodEndTime(end);
    setPeriodCategoryId(nonKbmCat?.id || '');
    setAutoChainSubsequent(true);
    setPeriodModalOpen(true);
  };

  const handleOpenInsertAfter = (index: number) => {
    const targetPeriod = currentSchedule.periods[index];
    const nextPeriod = currentSchedule.periods[index + 1];
    const nonKbmCat = categories.find(c => !c.is_teaching && c.name.toLowerCase().includes('istirahat')) || categories.find(c => !c.is_teaching) || categories[0];

    const start = targetPeriod ? targetPeriod.end_time : '10:00';
    const startM = timeToMinutes(start);
    const endM = nextPeriod ? timeToMinutes(nextPeriod.start_time) : startM + 30;
    const end = minutesToTime(endM > startM ? endM : startM + 30);

    setPeriodModalMode('insert');
    setInsertIndex(index + 1);
    setEditingPeriod(null);
    setPeriodActivityType('NON_KBM');
    setPeriodCustomName('Istirahat');
    setPeriodStartTime(start);
    setPeriodEndTime(end);
    setPeriodCategoryId(nonKbmCat?.id || '');
    setAutoChainSubsequent(true);
    setPeriodModalOpen(true);
  };

  const handleOpenAddEnd = () => {
    const kbmCat = categories.find(c => c.is_teaching) || categories[0];
    const lastPeriod = currentSchedule.periods[currentSchedule.periods.length - 1];

    let start = '07:00';
    let end = '07:45';
    if (lastPeriod) {
      start = lastPeriod.end_time;
      const startM = timeToMinutes(start);
      end = minutesToTime(startM + 45);
    }

    setPeriodModalMode('add_end');
    setInsertIndex(currentSchedule.periods.length);
    setEditingPeriod(null);
    setPeriodActivityType('KBM');
    setPeriodCustomName('');
    setPeriodStartTime(start);
    setPeriodEndTime(end);
    setPeriodCategoryId(kbmCat?.id || '');
    setAutoChainSubsequent(false);
    setPeriodModalOpen(true);
  };

  const handleOpenEditPeriod = (period: KbmPeriod, index: number) => {
    const isTeaching = period.is_teaching !== false && period.jp_number > 0;
    setPeriodModalMode('edit');
    setEditingPeriod({ index, period });
    setPeriodActivityType(isTeaching ? 'KBM' : 'NON_KBM');
    setPeriodCustomName(period.name || '');
    setPeriodStartTime(period.start_time);
    setPeriodEndTime(period.end_time);
    setPeriodCategoryId(period.category_id);
    setAutoChainSubsequent(true);
    setPeriodModalOpen(true);
  };

  const handleSavePeriod = () => {
    const cat = categories.find(c => c.id === periodCategoryId) || categories[0];
    if (!cat) {
      toast.error('Pilih kategori kegiatan');
      return;
    }

    const isTeaching = periodActivityType === 'KBM';
    const finalName = periodCustomName.trim() || (isTeaching ? 'KBM' : cat.name);

    let updatedPeriods = [...currentSchedule.periods];

    if (periodModalMode === 'edit' && editingPeriod) {
      const prevEndTime = editingPeriod.period.end_time;
      const newEndTime = periodEndTime;
      const timeDiff = timeToMinutes(newEndTime) - timeToMinutes(prevEndTime);

      updatedPeriods[editingPeriod.index] = {
        ...editingPeriod.period,
        name: finalName,
        is_teaching: isTeaching,
        start_time: periodStartTime,
        end_time: periodEndTime,
        category_id: cat.id,
        category_name: cat.name,
        category_color: cat.color
      };

      // Auto chain subsequent periods if time shifted and autoChain is enabled
      if (autoChainSubsequent && timeDiff !== 0) {
        for (let j = editingPeriod.index + 1; j < updatedPeriods.length; j++) {
          const p = updatedPeriods[j];
          const dur = timeToMinutes(p.end_time) - timeToMinutes(p.start_time);
          const newStartM = timeToMinutes(updatedPeriods[j - 1].end_time);
          updatedPeriods[j] = {
            ...p,
            start_time: minutesToTime(newStartM),
            end_time: minutesToTime(newStartM + dur)
          };
        }
      }
    } else {
      // Add or Insert
      const newEntry: KbmPeriod = {
        jp_number: isTeaching ? 1 : 0,
        is_teaching: isTeaching,
        name: finalName,
        start_time: periodStartTime,
        end_time: periodEndTime,
        category_id: cat.id,
        category_name: cat.name,
        category_color: cat.color
      };

      if (periodModalMode === 'add_before') {
        updatedPeriods.unshift(newEntry);
      } else if (periodModalMode === 'insert') {
        updatedPeriods.splice(insertIndex, 0, newEntry);
      } else {
        updatedPeriods.push(newEntry);
      }

      // If auto-chain enabled, adjust subsequent start times to maintain continuity
      if (autoChainSubsequent) {
        const startIndex = periodModalMode === 'add_before' ? 0 : insertIndex;
        for (let j = startIndex + 1; j < updatedPeriods.length; j++) {
          const p = updatedPeriods[j];
          const dur = Math.max(10, timeToMinutes(p.end_time) - timeToMinutes(p.start_time));
          const newStartM = timeToMinutes(updatedPeriods[j - 1].end_time);
          updatedPeriods[j] = {
            ...p,
            start_time: minutesToTime(newStartM),
            end_time: minutesToTime(newStartM + dur)
          };
        }
      }
    }

    // Re-index all periods cleanly
    const reindexed = reindexPeriods(updatedPeriods, categories);

    const updatedSched: KbmDaySchedule = {
      ...currentSchedule,
      periods: reindexed
    };

    setPeriodModalOpen(false);
    handleSaveCurrentSchedule(updatedSched);
  };

  const handleDeletePeriod = (index: number) => {
    const item = currentSchedule.periods[index];
    const itemName = item.name || (item.jp_number > 0 ? `JP ${item.jp_number}` : item.category_name);
    if (!window.confirm(`Hapus "${itemName}" (${item.start_time} - ${item.end_time})?`)) return;

    let updatedPeriods = currentSchedule.periods.filter((_, i) => i !== index);

    // Auto-chain remaining periods so no gap is left
    if (updatedPeriods.length > 0 && index < updatedPeriods.length) {
      for (let j = Math.max(0, index); j < updatedPeriods.length; j++) {
        if (j > 0) {
          const dur = Math.max(10, timeToMinutes(updatedPeriods[j].end_time) - timeToMinutes(updatedPeriods[j].start_time));
          const newStartM = timeToMinutes(updatedPeriods[j - 1].end_time);
          updatedPeriods[j] = {
            ...updatedPeriods[j],
            start_time: minutesToTime(newStartM),
            end_time: minutesToTime(newStartM + dur)
          };
        }
      }
    }

    const reindexed = reindexPeriods(updatedPeriods, categories);

    const updatedSched: KbmDaySchedule = {
      ...currentSchedule,
      periods: reindexed
    };

    handleSaveCurrentSchedule(updatedSched);
  };

  const getCategoryBadge = (catName: string, catColor?: string) => {
    const cat = categories.find(c => c.name.toLowerCase() === catName.toLowerCase());
    const color = catColor || cat?.color || '#2563eb';
    return (
      <Chip
        label={catName}
        size="small"
        sx={{
          backgroundColor: color,
          color: '#ffffff',
          fontWeight: 'bold',
          fontSize: '0.75rem',
          borderRadius: '6px'
        }}
      />
    );
  };

  const kbmCount = currentSchedule.periods.filter(p => p.jp_number > 0).length;
  const nonKbmCount = currentSchedule.periods.filter(p => p.jp_number === 0).length;

  return (
    <Box sx={{ p: { xs: 2, md: 3 } }}>
      {/* Progress Bar Top */}
      {(loading || isProcessing) && (
        <Box sx={{ width: '100%', position: 'fixed', top: 0, left: 0, zIndex: 9999 }}>
          <LinearProgress variant="determinate" value={progress} sx={{ height: 4 }} />
        </Box>
      )}

      {/* Header Banner */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h5" sx={{ fontWeight: 800, color: 'text.primary', display: 'flex', alignItems: 'center', gap: 1 }}>
          <AccessTimeIcon sx={{ color: 'primary.main', fontSize: 30 }} />
          Pengaturan Data KBM (Jam Pelajaran & Kegiatan)
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Atur jam efektif, durasi, serta kegiatan sebelum/diantara JP (Upacara, Apel, Istirahat). JP adalah murni Jam Pelajaran untuk KBM dan berkesinambungan secara waktu.
        </Typography>
      </Box>

      {/* SECTION 1: KATEGORI KBM */}
      <Card sx={{ mb: 3, borderRadius: 3, boxShadow: '0 2px 10px rgba(0,0,0,0.05)' }}>
        <CardContent sx={{ p: 2.5 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 1, mb: 2 }}>
            <Box>
              <Typography variant="subtitle1" sx={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 1 }}>
                <CategoryIcon sx={{ color: 'primary.main', fontSize: 20 }} />
                Daftar Kategori Kegiatan & JP
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Kelola kategori kegiatan mengajar (KBM) serta kegiatan luar JP (Upacara, Apel, Istirahat, Sholat)
              </Typography>
            </Box>
            <Button
              variant="contained"
              size="small"
              startIcon={<AddIcon />}
              onClick={handleOpenAddCategory}
              sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 600 }}
            >
              Tambah Kategori
            </Button>
          </Box>

          <Grid container spacing={1.5}>
            {categories.map(cat => (
              <Grid size={{ xs: 12, sm: 6, md: 3 }} key={cat.id}>
                <Paper
                  elevation={0}
                  sx={{
                    p: 1.5,
                    borderRadius: 2,
                    border: '1px solid',
                    borderColor: 'divider',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    borderLeft: `5px solid ${cat.color || '#2563eb'}`,
                    backgroundColor: 'background.paper'
                  }}
                >
                  <Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                        {cat.name}
                      </Typography>
                      {cat.is_teaching ? (
                        <Chip label="Masuk JP (KBM)" size="small" color="primary" sx={{ height: 18, fontSize: '0.65rem', fontWeight: 700 }} />
                      ) : (
                        <Chip label="Non-JP (Luar JP)" size="small" variant="outlined" sx={{ height: 18, fontSize: '0.65rem' }} />
                      )}
                    </Box>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontSize: '0.7rem' }}>
                      {cat.description || (cat.is_teaching ? 'Jam Belajar Tatap Muka' : 'Kegiatan Non-Mengajar')}
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', gap: 0.5 }}>
                    <IconButton size="small" onClick={() => handleOpenEditCategory(cat)}>
                      <EditIcon fontSize="small" sx={{ fontSize: 16 }} />
                    </IconButton>
                    <IconButton size="small" color="error" onClick={() => handleDeleteCategory(cat.id, cat.name)}>
                      <DeleteIcon fontSize="small" sx={{ fontSize: 16 }} />
                    </IconButton>
                  </Box>
                </Paper>
              </Grid>
            ))}
          </Grid>
        </CardContent>
      </Card>

      {/* SECTION 2: TAB HARI EFEKTIF */}
      <Card sx={{ borderRadius: 3, boxShadow: '0 2px 10px rgba(0,0,0,0.05)' }}>
        <Box sx={{ borderBottom: 1, borderColor: 'divider', px: 2, pt: 1, bgcolor: 'background.paper' }}>
          <Tabs
            value={selectedDayIndex}
            onChange={(_, val) => setSelectedDayIndex(val)}
            variant="scrollable"
            scrollButtons="auto"
          >
            {DAYS.map(d => (
              <Tab
                key={d.index}
                value={d.index}
                label={d.name}
                sx={{
                  fontWeight: 700,
                  textTransform: 'none',
                  minWidth: 100,
                  fontSize: '0.95rem'
                }}
              />
            ))}
          </Tabs>
        </Box>

        <CardContent sx={{ p: 2.5 }}>
          {/* Day Toolbar Controls */}
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2, mb: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
              <FormControlLabel
                control={
                  <Switch
                    checked={currentSchedule.is_active}
                    onChange={e => handleToggleDayActive(e.target.checked)}
                    color="primary"
                  />
                }
                label={
                  <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                    Status: {currentSchedule.is_active ? 'Hari Aktif Sekolah' : 'Hari Libur'}
                  </Typography>
                }
              />
              <Chip
                label={`${kbmCount} JP KBM Murni`}
                color="primary"
                size="small"
                sx={{ fontWeight: 700 }}
              />
              {nonKbmCount > 0 && (
                <Chip
                  label={`${nonKbmCount} Kegiatan Non-JP`}
                  color="warning"
                  variant="outlined"
                  size="small"
                  sx={{ fontWeight: 600 }}
                />
              )}
            </Box>

            <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap' }}>
              <Button
                variant="outlined"
                size="small"
                startIcon={<ScheduleIcon />}
                onClick={() => setBulkModalOpen(true)}
                sx={{ borderRadius: 2, textTransform: 'none' }}
              >
                Susun Otomatis Hari Ini
              </Button>
              <Button
                variant="outlined"
                size="small"
                startIcon={<CopyIcon />}
                onClick={() => {
                  setTargetDays(DAYS.filter(d => d.index !== selectedDayIndex).map(d => d.index));
                  setCopyModalOpen(true);
                }}
                sx={{ borderRadius: 2, textTransform: 'none' }}
              >
                Salin ke Hari Lain
              </Button>
              <Button
                variant="outlined"
                size="small"
                color="secondary"
                startIcon={<FlagIcon />}
                onClick={handleOpenAddBefore}
                sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 600 }}
              >
                + Kegiatan Sebelum JP
              </Button>
              <Button
                variant="contained"
                size="small"
                startIcon={<AddIcon />}
                onClick={handleOpenAddEnd}
                sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 600 }}
              >
                + Baris JP KBM
              </Button>
              <Button
                variant="outlined"
                size="small"
                color="error"
                startIcon={<DeleteSweepIcon />}
                onClick={() => setClearDayConfirmOpen(true)}
                disabled={currentSchedule.periods.length === 0}
                sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 600 }}
              >
                Hapus Semua ({currentSchedule.day_name})
              </Button>
            </Stack>
          </Box>

          {/* Time Continuity Status Bar */}
          <Paper
            elevation={0}
            sx={{
              mb: 2.5,
              p: 1.5,
              borderRadius: 2,
              bgcolor: continuityStatus.isContinuous ? '#f0fdf4' : '#fffbeb',
              border: '1px solid',
              borderColor: continuityStatus.isContinuous ? '#bbf7d0' : '#fde68a',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: 1.5
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              {continuityStatus.isContinuous ? (
                <LinkIcon sx={{ color: 'success.main', fontSize: 22 }} />
              ) : (
                <LinkOffIcon sx={{ color: 'warning.main', fontSize: 22 }} />
              )}
              <Box>
                <Typography variant="subtitle2" sx={{ fontWeight: 700, color: continuityStatus.isContinuous ? '#166534' : '#92400e' }}>
                  {continuityStatus.isContinuous
                    ? 'Kesinambungan Waktu Sempurna: Seluruh JP dan kegiatan bersambung tanpa jeda/tumpang tindih.'
                    : `Perhatian: Terdapat ${continuityStatus.issues.length} ketidaksesuaian waktu antara kegiatan.`}
                </Typography>
                {!continuityStatus.isContinuous && (
                  <Typography variant="caption" sx={{ color: '#b45309', display: 'block' }}>
                    {continuityStatus.issues.map((iss, i) => (
                      <span key={i}>
                        [{iss.prevName} selesai {iss.prevEnd} ≠ {iss.nextName} mulai {iss.nextStart} ({iss.diffMin > 0 ? `jeda +${iss.diffMin}m` : `tabrakan ${iss.diffMin}m`})]
                        {i < continuityStatus.issues.length - 1 ? ', ' : ''}
                      </span>
                    ))}
                  </Typography>
                )}
              </Box>
            </Box>

            {!continuityStatus.isContinuous && (
              <Button
                variant="contained"
                color="warning"
                size="small"
                startIcon={<SyncIcon />}
                onClick={handleAlignTimeContinuity}
                sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 700, boxShadow: 'none' }}
              >
                Selaraskan Waktu Otomatis
              </Button>
            )}
          </Paper>

          {/* Table of Periods & Activities */}
          {currentSchedule.periods.length === 0 ? (
            <Alert severity="info" sx={{ borderRadius: 2 }}>
              Belum ada Jam Pelajaran atau Kegiatan yang diatur untuk hari {currentSchedule.day_name}. Klik <strong>"Susun Otomatis Hari Ini"</strong> atau tambahkan kegiatan/JP di atas.
            </Alert>
          ) : (
            <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
              <Table size="small">
                <TableHead sx={{ bgcolor: 'action.hover' }}>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 800, width: 70, textAlign: 'center' }}>Urutan</TableCell>
                    <TableCell sx={{ fontWeight: 800, width: 140 }}>Jenis / Nomor JP</TableCell>
                    <TableCell sx={{ fontWeight: 800 }}>Nama Kegiatan / Kategori</TableCell>
                    <TableCell sx={{ fontWeight: 800 }}>Rentang Waktu</TableCell>
                    <TableCell sx={{ fontWeight: 800 }}>Durasi</TableCell>
                    <TableCell sx={{ fontWeight: 800, width: 220, textAlign: 'center' }}>Aksi & Sisip Kegiatan</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {currentSchedule.periods.map((period, idx) => {
                    const isActualKbm = period.jp_number > 0 && period.is_teaching !== false;
                    const durationMin = timeToMinutes(period.end_time) - timeToMinutes(period.start_time);
                    const isPreActivity = idx === 0 && period.jp_number === 0;

                    return (
                      <TableRow
                        key={idx}
                        hover
                        sx={{
                          bgcolor: !isActualKbm ? 'rgba(245, 158, 11, 0.04)' : 'inherit',
                          '&:last-child td, &:last-child th': { border: 0 }
                        }}
                      >
                        <TableCell sx={{ textAlign: 'center', color: 'text.secondary', fontWeight: 600 }}>
                          #{idx + 1}
                        </TableCell>
                        <TableCell>
                          {isActualKbm ? (
                            <Chip
                              label={`JP ${period.jp_number}`}
                              color="primary"
                              size="small"
                              sx={{ fontWeight: 800, borderRadius: 1.5, px: 0.5 }}
                            />
                          ) : (
                            <Chip
                              icon={isPreActivity ? <FlagIcon sx={{ fontSize: '14px !important' }} /> : <CoffeeIcon sx={{ fontSize: '14px !important' }} />}
                              label="Non-JP"
                              color="warning"
                              variant="outlined"
                              size="small"
                              sx={{ fontWeight: 700, borderRadius: 1.5 }}
                            />
                          )}
                        </TableCell>
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Typography variant="body2" sx={{ fontWeight: 700 }}>
                              {period.name || (isActualKbm ? `Jam Pelajaran ${period.jp_number}` : period.category_name)}
                            </Typography>
                            {getCategoryBadge(period.category_name, period.category_color)}
                          </Box>
                          <Typography variant="caption" color="text.secondary">
                            {isActualKbm ? 'Jam Pembelajaran KBM (Dapat dipilih guru saat presensi)' : 'Kegiatan Non-KBM (Tidak masuk JP guru)'}
                          </Typography>
                        </TableCell>
                        <TableCell sx={{ fontWeight: 700, fontFamily: 'monospace', fontSize: '0.9rem' }}>
                          {period.start_time} - {period.end_time}
                        </TableCell>
                        <TableCell sx={{ color: 'text.secondary', fontWeight: 600 }}>
                          {durationMin} menit
                        </TableCell>
                        <TableCell sx={{ textAlign: 'center' }}>
                          <Stack direction="row" spacing={0.5} sx={{ justifyContent: 'center', alignItems: 'center' }}>
                            <Tooltip title="Sisip Kegiatan di Antara / Setelah Baris Ini" arrow>
                              <Button
                                size="small"
                                variant="outlined"
                                color="secondary"
                                onClick={() => handleOpenInsertAfter(idx)}
                                sx={{
                                  fontSize: '0.7rem',
                                  py: 0.2,
                                  px: 0.8,
                                  borderRadius: 1.5,
                                  textTransform: 'none',
                                  fontWeight: 600
                                }}
                              >
                                + Sisip
                              </Button>
                            </Tooltip>
                            <IconButton size="small" onClick={() => handleOpenEditPeriod(period, idx)} title="Edit Waktu / Kegiatan">
                              <EditIcon fontSize="small" />
                            </IconButton>
                            <IconButton size="small" color="error" onClick={() => handleDeletePeriod(idx)} title="Hapus Baris">
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </Stack>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </CardContent>
      </Card>

      {/* MODAL: TAMBAH / EDIT KATEGORI */}
      <Dialog open={categoryModalOpen} onClose={() => setCategoryModalOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>
          {editingCategory ? 'Edit Kategori KBM' : 'Tambah Kategori KBM'}
        </DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2} sx={{ pt: 1 }}>
            <TextField
              label="Nama Kategori"
              fullWidth
              size="small"
              value={catName}
              onChange={e => setCatName(e.target.value)}
              placeholder="Contoh: Upacara, Apel, KBM, Istirahat"
              required
            />
            <Box>
              <Typography variant="caption" sx={{ fontWeight: 600, display: 'block', mb: 0.5 }}>
                Warna Badge / Label:
              </Typography>
              <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                <input
                  type="color"
                  value={catColor}
                  onChange={e => setCatColor(e.target.value)}
                  style={{ width: 42, height: 38, border: 'none', borderRadius: 4, cursor: 'pointer' }}
                />
                <TextField
                  size="small"
                  value={catColor}
                  onChange={e => setCatColor(e.target.value)}
                  sx={{ width: 130 }}
                />
              </Stack>
            </Box>
            <FormControlLabel
              control={
                <Switch
                  checked={catIsTeaching}
                  onChange={e => setCatIsTeaching(e.target.checked)}
                  color="primary"
                />
              }
              label={
                <Box>
                  <Typography variant="body2" sx={{ fontWeight: 700 }}>
                    Apakah Termasuk Jam Mengajar Guru (KBM)?
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Jika aktif: akan diberi nomor JP berurutan (JP 1, 2, ...). Jika non-aktif: menjadi kegiatan Non-JP (0).
                  </Typography>
                </Box>
              }
            />
            <TextField
              label="Keterangan (Opsional)"
              fullWidth
              size="small"
              multiline
              rows={2}
              value={catDescription}
              onChange={e => setCatDescription(e.target.value)}
              placeholder="Deskripsi singkat kegiatan"
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setCategoryModalOpen(false)} sx={{ textTransform: 'none' }}>
            Batal
          </Button>
          <Button
            variant="contained"
            onClick={handleSaveCategory}
            startIcon={<SaveIcon />}
            sx={{ textTransform: 'none', fontWeight: 600, borderRadius: 2 }}
          >
            Simpan Kategori
          </Button>
        </DialogActions>
      </Dialog>

      {/* MODAL: BUAT OTOMATIS JP & KEGIATAN */}
      <Dialog open={bulkModalOpen} onClose={() => setBulkModalOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>
          Susun Otomatis Jadwal ({currentSchedule.day_name})
        </DialogTitle>
        <DialogContent dividers>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Sistem akan menyusun kegiatan sebelum JP (Apel/Upacara) dan di antara JP (Istirahat), serta menomori JP murni hanya untuk KBM secara berkesinambungan.
          </Typography>

          <Stack spacing={2.5}>
            {/* 1. Kegiatan Sebelum JP 1 */}
            <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, bgcolor: '#f8fafc' }}>
              <FormControlLabel
                control={
                  <Switch
                    checked={bulkIncludePreActivity}
                    onChange={e => setBulkIncludePreActivity(e.target.checked)}
                    color="primary"
                  />
                }
                label={
                  <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                    Sertakan Kegiatan Sebelum JP 1 (Non-JP)
                  </Typography>
                }
              />
              {bulkIncludePreActivity && (
                <Grid container spacing={2} sx={{ mt: 1 }}>
                  <Grid size={{ xs: 12, sm: 8 }}>
                    <TextField
                      label="Nama Kegiatan"
                      size="small"
                      fullWidth
                      value={bulkPreActivityName}
                      onChange={e => setBulkPreActivityName(e.target.value)}
                      placeholder="Contoh: Upacara Bendera / Apel Pagi"
                    />
                  </Grid>
                  <Grid size={{ xs: 12, sm: 4 }}>
                    <TextField
                      label="Durasi (Menit)"
                      type="number"
                      size="small"
                      fullWidth
                      value={bulkPreDuration}
                      onChange={e => setBulkPreDuration(Number(e.target.value))}
                    />
                  </Grid>
                </Grid>
              )}
            </Paper>

            {/* 2. Pengaturan JP KBM Murni */}
            <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1.5, color: 'primary.main' }}>
                Jam Pelajaran KBM Murni
              </Typography>
              <Grid container spacing={2}>
                <Grid size={{ xs: 12, sm: 4 }}>
                  <TextField
                    label="Jam Mulai Hari"
                    type="time"
                    fullWidth
                    size="small"
                    value={bulkStartTime}
                    onChange={e => setBulkStartTime(e.target.value)}
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 4 }}>
                  <TextField
                    label="Jumlah JP KBM"
                    type="number"
                    fullWidth
                    size="small"
                    value={bulkJpCount}
                    onChange={e => setBulkJpCount(Number(e.target.value))}
                    slotProps={{ htmlInput: { min: 1, max: 18 } }}
                    helperText="Murni jam mengajar (JP 1..N)"
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 4 }}>
                  <TextField
                    label="Durasi per JP"
                    type="number"
                    fullWidth
                    size="small"
                    value={bulkDurationMinutes}
                    onChange={e => setBulkDurationMinutes(Number(e.target.value))}
                    slotProps={{ htmlInput: { min: 15, max: 90 } }}
                    helperText="Menit per JP"
                  />
                </Grid>
              </Grid>
            </Paper>

            {/* 3. Kegiatan di Antara JP (Istirahat 1 & 2) */}
            <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, bgcolor: '#f8fafc' }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1.5, color: '#d97706' }}>
                Kegiatan Di Antara JP (Istirahat / Sholat)
              </Typography>

              <Stack spacing={2}>
                <Box>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={bulkIncludeIstirahat1}
                        onChange={e => setBulkIncludeIstirahat1(e.target.checked)}
                        color="warning"
                      />
                    }
                    label={<Typography variant="body2" sx={{ fontWeight: 600 }}>Istirahat Pertama (Non-JP)</Typography>}
                  />
                  {bulkIncludeIstirahat1 && (
                    <Grid container spacing={2} sx={{ mt: 0.5, pl: 4 }}>
                      <Grid size={{ xs: 6 }}>
                        <TextField
                          label="Setelah JP Ke"
                          type="number"
                          size="small"
                          fullWidth
                          value={bulkIstirahat1AfterJp}
                          onChange={e => setBulkIstirahat1AfterJp(Number(e.target.value))}
                          helperText="Misal setelah JP 4"
                        />
                      </Grid>
                      <Grid size={{ xs: 6 }}>
                        <TextField
                          label="Durasi (Menit)"
                          type="number"
                          size="small"
                          fullWidth
                          value={bulkIstirahat1Duration}
                          onChange={e => setBulkIstirahat1Duration(Number(e.target.value))}
                        />
                      </Grid>
                    </Grid>
                  )}
                </Box>

                <Divider />

                <Box>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={bulkIncludeIstirahat2}
                        onChange={e => setBulkIncludeIstirahat2(e.target.checked)}
                        color="warning"
                      />
                    }
                    label={<Typography variant="body2" sx={{ fontWeight: 600 }}>Istirahat Kedua / Sholat Dhuhur (Non-JP)</Typography>}
                  />
                  {bulkIncludeIstirahat2 && (
                    <Grid container spacing={2} sx={{ mt: 0.5, pl: 4 }}>
                      <Grid size={{ xs: 6 }}>
                        <TextField
                          label="Setelah JP Ke"
                          type="number"
                          size="small"
                          fullWidth
                          value={bulkIstirahat2AfterJp}
                          onChange={e => setBulkIstirahat2AfterJp(Number(e.target.value))}
                          helperText="Misal setelah JP 7"
                        />
                      </Grid>
                      <Grid size={{ xs: 6 }}>
                        <TextField
                          label="Durasi (Menit)"
                          type="number"
                          size="small"
                          fullWidth
                          value={bulkIstirahat2Duration}
                          onChange={e => setBulkIstirahat2Duration(Number(e.target.value))}
                        />
                      </Grid>
                    </Grid>
                  )}
                </Box>
              </Stack>
            </Paper>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setBulkModalOpen(false)} sx={{ textTransform: 'none' }}>
            Batal
          </Button>
          <Button
            variant="contained"
            onClick={handleGeneratePeriods}
            startIcon={<PlayArrowIcon />}
            sx={{ textTransform: 'none', fontWeight: 600, borderRadius: 2 }}
          >
            Terapkan Jadwal Berkesinambungan
          </Button>
        </DialogActions>
      </Dialog>

      {/* MODAL: EDIT / TAMBAH / SISIP BARIS JP ATAU KEGIATAN */}
      <Dialog open={periodModalOpen} onClose={() => setPeriodModalOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>
          {periodModalMode === 'edit'
            ? `Edit Kegiatan / JP`
            : periodModalMode === 'add_before'
            ? 'Tambah Kegiatan Sebelum JP'
            : periodModalMode === 'insert'
            ? 'Sisip Kegiatan di Antara JP'
            : 'Tambah Jam Pelajaran (KBM)'}
        </DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2.5} sx={{ pt: 1 }}>
            {/* Tipe: KBM vs Non-KBM */}
            <FormControl>
              <FormLabel sx={{ fontSize: '0.85rem', fontWeight: 700 }}>Sifat Aktivitas:</FormLabel>
              <RadioGroup
                row
                value={periodActivityType}
                onChange={e => {
                  const val = e.target.value as 'KBM' | 'NON_KBM';
                  setPeriodActivityType(val);
                  if (val === 'KBM') {
                    const kbmCat = categories.find(c => c.is_teaching) || categories[0];
                    if (kbmCat) setPeriodCategoryId(kbmCat.id);
                  } else {
                    const nonKbmCat = categories.find(c => !c.is_teaching) || categories[0];
                    if (nonKbmCat) setPeriodCategoryId(nonKbmCat.id);
                  }
                }}
              >
                <FormControlLabel
                  value="KBM"
                  control={<Radio size="small" />}
                  label={<Typography variant="body2" sx={{ fontWeight: 700 }}>Jam KBM (Masuk JP)</Typography>}
                />
                <FormControlLabel
                  value="NON_KBM"
                  control={<Radio size="small" />}
                  label={<Typography variant="body2" sx={{ fontWeight: 700 }}>Non-KBM (Luar JP)</Typography>}
                />
              </RadioGroup>
            </FormControl>

            <TextField
              label="Nama Kegiatan"
              fullWidth
              size="small"
              value={periodCustomName}
              onChange={e => setPeriodCustomName(e.target.value)}
              placeholder={periodActivityType === 'KBM' ? 'KBM (atau kosongkan untuk default)' : 'Contoh: Istirahat 1, Upacara, Apel, Sholat'}
            />

            <Grid container spacing={2}>
              <Grid size={{ xs: 6 }}>
                <TextField
                  label="Jam Mulai"
                  type="time"
                  fullWidth
                  size="small"
                  value={periodStartTime}
                  onChange={e => setPeriodStartTime(e.target.value)}
                />
              </Grid>
              <Grid size={{ xs: 6 }}>
                <TextField
                  label="Jam Selesai"
                  type="time"
                  fullWidth
                  size="small"
                  value={periodEndTime}
                  onChange={e => setPeriodEndTime(e.target.value)}
                />
              </Grid>
            </Grid>

            <FormControl fullWidth size="small">
              <InputLabel>Kategori Jadwal</InputLabel>
              <Select
                value={periodCategoryId}
                label="Kategori Jadwal"
                onChange={e => setPeriodCategoryId(e.target.value)}
              >
                {categories.map(c => (
                  <MenuItem key={c.id} value={c.id}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Box sx={{ width: 12, height: 12, borderRadius: '50%', bgcolor: c.color }} />
                      <Typography variant="body2">{c.name}</Typography>
                      {c.is_teaching ? (
                        <Typography variant="caption" color="primary">(KBM)</Typography>
                      ) : (
                        <Typography variant="caption" color="text.secondary">(Non-JP)</Typography>
                      )}
                    </Box>
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControlLabel
              control={
                <Switch
                  checked={autoChainSubsequent}
                  onChange={e => setAutoChainSubsequent(e.target.checked)}
                  color="primary"
                />
              }
              label={
                <Box>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    Jaga Kesinambungan Waktu Otomatis
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Menyesuaikan jam mulai baris-baris berikutnya agar tetap menyambung tanpa jeda.
                  </Typography>
                </Box>
              }
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setPeriodModalOpen(false)} sx={{ textTransform: 'none' }}>
            Batal
          </Button>
          <Button
            variant="contained"
            onClick={handleSavePeriod}
            startIcon={<SaveIcon />}
            sx={{ textTransform: 'none', fontWeight: 600, borderRadius: 2 }}
          >
            Simpan Perubahan
          </Button>
        </DialogActions>
      </Dialog>

      {/* MODAL: SALIN KE HARI LAIN */}
      <Dialog open={copyModalOpen} onClose={() => setCopyModalOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>
          Salin Jadwal dari Hari {currentSchedule.day_name}
        </DialogTitle>
        <DialogContent dividers>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Pilih hari-hari yang akan menerapkan susunan JP dan kegiatan non-JP yang sama:
          </Typography>
          <Stack spacing={1}>
            {DAYS.filter(d => d.index !== selectedDayIndex).map(d => {
              const checked = targetDays.includes(d.index);
              return (
                <FormControlLabel
                  key={d.index}
                  control={
                    <Switch
                      checked={checked}
                      onChange={e => {
                        if (e.target.checked) {
                          setTargetDays([...targetDays, d.index]);
                        } else {
                          setTargetDays(targetDays.filter(i => i !== d.index));
                        }
                      }}
                      color="primary"
                    />
                  }
                  label={<Typography variant="body2" sx={{ fontWeight: 600 }}>{d.name}</Typography>}
                />
              );
            })}
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setCopyModalOpen(false)} sx={{ textTransform: 'none' }}>
            Batal
          </Button>
          <Button
            variant="contained"
            onClick={handleCopyScheduleToDays}
            startIcon={<CopyIcon />}
            sx={{ textTransform: 'none', fontWeight: 600, borderRadius: 2 }}
          >
            Terapkan Salinan
          </Button>
        </DialogActions>
      </Dialog>

      {/* DIALOG KONFIRMASI HAPUS SEMUA JP HARI INI */}
      <Dialog
        open={clearDayConfirmOpen}
        onClose={() => !isProcessing && setClearDayConfirmOpen(false)}
        maxWidth="xs"
        fullWidth
        slotProps={{
          paper: { sx: { borderRadius: 3, p: 1 } }
        }}
      >
        <DialogTitle sx={{ fontWeight: 800, color: 'error.main', display: 'flex', alignItems: 'center', gap: 1 }}>
          <DeleteSweepIcon color="error" />
          Hapus Semua JP & Kegiatan {currentSchedule.day_name}?
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2 }}>
            Apakah Anda yakin ingin menghapus seluruh susunan Jam Pelajaran (JP) dan kegiatan untuk hari <strong>{currentSchedule.day_name}</strong>?
          </Typography>
          <Alert severity="warning" sx={{ borderRadius: 2, fontSize: '0.82rem' }}>
            Tindakan ini akan mengosongkan <strong>{currentSchedule.periods.length} baris</strong> JP dan kegiatan pada hari {currentSchedule.day_name} agar Anda dapat dengan leluasa menyusun ulang JP dari awal.
          </Alert>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button
            onClick={() => setClearDayConfirmOpen(false)}
            disabled={isProcessing}
            sx={{ textTransform: 'none', fontWeight: 600, borderRadius: 2 }}
          >
            Batal
          </Button>
          <Button
            variant="contained"
            color="error"
            startIcon={<DeleteSweepIcon />}
            onClick={handleClearDaySchedule}
            disabled={isProcessing}
            sx={{ textTransform: 'none', fontWeight: 700, borderRadius: 2 }}
          >
            Ya, Hapus Semua
          </Button>
        </DialogActions>
      </Dialog>

      {/* MODERN RESULT POPUP MODAL */}
      <Dialog
        open={resultPopup.open}
        onClose={() => setResultPopup(prev => ({ ...prev, open: false }))}
        maxWidth="xs"
        fullWidth
        slotProps={{
          paper: {
            sx: { borderRadius: 3, p: 1, textAlign: 'center' }
          }
        }}
      >
        <DialogContent>
          <Box sx={{ my: 1 }}>
            <CheckCircleIcon sx={{ fontSize: 60, color: 'success.main', mb: 1 }} />
            <Typography variant="h6" sx={{ fontWeight: 800, mb: 0.5 }}>
              {resultPopup.title}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {resultPopup.message}
            </Typography>
          </Box>
        </DialogContent>
        <DialogActions sx={{ justifyContent: 'center', pb: 2 }}>
          <Button
            variant="contained"
            onClick={() => setResultPopup(prev => ({ ...prev, open: false }))}
            sx={{ borderRadius: 2, px: 4, textTransform: 'none', fontWeight: 700 }}
          >
            Selesai
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

