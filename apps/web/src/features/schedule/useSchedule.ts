import { useState, useEffect } from 'react';
import { apiRequest } from '../../api/client';
import {
  ScheduleDTO,
  ScheduleBlockDTO,
  ScheduleVersionDTO,
  ScheduleDiffItemDTO,
  RescheduleResponseDTO,
} from '@tempo/shared';

export interface UseScheduleReturn {
  targetDate: string;
  setTargetDate: (date: string) => void;
  schedule: ScheduleDTO | null;
  loading: boolean;
  generating: boolean;
  actionLoading: boolean;
  error: string | null;
  setError: (err: string | null) => void;
  successMsg: string | null;
  setSuccessMsg: (msg: string | null) => void;

  // Edit block modal
  editBlock: ScheduleBlockDTO | null;
  setEditBlock: (b: ScheduleBlockDTO | null) => void;
  editStartTime: string;
  setEditStartTime: (t: string) => void;
  editEndTime: string;
  setEditEndTime: (t: string) => void;
  editTitle: string;
  setEditTitle: (t: string) => void;
  handleOpenEdit: (b: ScheduleBlockDTO) => void;
  handleSaveBlockEdit: () => Promise<void>;

  // Reschedule modal
  showRescheduleModal: boolean;
  setShowRescheduleModal: (show: boolean) => void;
  rescheduleReason: string;
  setRescheduleReason: (r: string) => void;
  additionalMinutes: number;
  setAdditionalMinutes: (m: number) => void;
  selectedTaskToExtend: string;
  setSelectedTaskToExtend: (id: string) => void;
  newMeetingTitle: string;
  setNewMeetingTitle: (t: string) => void;
  newMeetingStart: string;
  setNewMeetingStart: (t: string) => void;
  newMeetingEnd: string;
  setNewMeetingEnd: (t: string) => void;
  rescheduleDiff: ScheduleDiffItemDTO[] | null;
  changelog: string[];
  handleOpenReschedule: () => void;
  handleExecuteReschedule: () => Promise<void>;

  // Version history modal
  showVersionsModal: boolean;
  setShowVersionsModal: (show: boolean) => void;
  versions: ScheduleVersionDTO[];
  handleOpenVersions: () => Promise<void>;
  handleRestoreVersion: (v: number) => Promise<void>;
  handleQuickUndo: () => Promise<void>;

  // Date controls
  handlePrevDay: () => void;
  handleNextDay: () => void;
  handleToday: () => void;

  // Actions
  handleGenerate: (replaceConfirmed?: boolean) => Promise<void>;
  handleConfirmSchedule: () => Promise<void>;
  handleRejectSchedule: () => Promise<void>;
  handleToggleLock: (b: ScheduleBlockDTO) => Promise<void>;

  // Helpers
  formatMinutes: (mins: number) => string;
  isToday: boolean;
  isCurrentBlock: (b: ScheduleBlockDTO) => boolean;
}

export function useSchedule(): UseScheduleReturn {
  const [targetDate, setTargetDate] = useState<string>(() => {
    return new Date().toISOString().substring(0, 10);
  });
  const [schedule, setSchedule] = useState<ScheduleDTO | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [generating, setGenerating] = useState<boolean>(false);
  const [actionLoading, setActionLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Modals state
  const [editBlock, setEditBlock] = useState<ScheduleBlockDTO | null>(null);
  const [editStartTime, setEditStartTime] = useState<string>('');
  const [editEndTime, setEditEndTime] = useState<string>('');
  const [editTitle, setEditTitle] = useState<string>('');

  const [showRescheduleModal, setShowRescheduleModal] = useState<boolean>(false);
  const [rescheduleReason, setRescheduleReason] = useState<string>(
    'Task taking longer than expected'
  );
  const [additionalMinutes, setAdditionalMinutes] = useState<number>(30);
  const [selectedTaskToExtend, setSelectedTaskToExtend] = useState<string>('');
  const [newMeetingTitle, setNewMeetingTitle] = useState<string>('');
  const [newMeetingStart, setNewMeetingStart] = useState<string>('14:00');
  const [newMeetingEnd, setNewMeetingEnd] = useState<string>('15:00');

  const [rescheduleDiff, setRescheduleDiff] = useState<ScheduleDiffItemDTO[] | null>(null);
  const [changelog, setChangelog] = useState<string[]>([]);

  const [showVersionsModal, setShowVersionsModal] = useState<boolean>(false);
  const [versions, setVersions] = useState<ScheduleVersionDTO[]>([]);

  const fetchSchedule = async (date: string) => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiRequest<ScheduleDTO | null>(`/api/schedule?date=${date}`);
      setSchedule(data);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch schedule');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSchedule(targetDate);
  }, [targetDate]);

  const handleGenerate = async (replaceConfirmed = false) => {
    setGenerating(true);
    setError(null);
    setSuccessMsg(null);
    try {
      const data = await apiRequest<ScheduleDTO>('/api/schedule/generate', {
        method: 'POST',
        body: JSON.stringify({
          targetDate,
          replaceConfirmed,
          options: {
            includeMeals: true,
            includeLeisure: true,
            includeFreeTimeBlocks: true,
          },
        }),
      });
      if (data) {
        setSchedule(data);
        setSuccessMsg('Schedule generated successfully.');
      }
    } catch (err: any) {
      if (err.code === 'CONFIRMED_SCHEDULE_EXISTS') {
        if (
          window.confirm(
            'A confirmed schedule already exists for this date. Would you like to generate a new replacement proposal and archive the confirmed schedule?'
          )
        ) {
          handleGenerate(true);
          return;
        }
      }
      setError(err.message || 'Failed to generate schedule');
    } finally {
      setGenerating(false);
    }
  };

  const handleConfirmSchedule = async () => {
    if (!schedule) return;
    setActionLoading(true);
    setError(null);
    try {
      const data = await apiRequest<ScheduleDTO>(`/api/schedule/${schedule.id}/confirm`, {
        method: 'POST',
      });
      setSchedule(data);
      setSuccessMsg('Schedule successfully confirmed! You are all set for the day.');
    } catch (err: any) {
      setError(err.message || 'Failed to confirm schedule');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRejectSchedule = async () => {
    if (!schedule) return;
    if (!window.confirm('Are you sure you want to reject and discard this proposed schedule?')) {
      return;
    }
    setActionLoading(true);
    setError(null);
    try {
      await apiRequest(`/api/schedule/${schedule.id}/reject`, {
        method: 'POST',
      });
      setSchedule(null);
      setSuccessMsg('Proposal rejected and removed.');
    } catch (err: any) {
      setError(err.message || 'Failed to reject schedule');
    } finally {
      setActionLoading(false);
    }
  };

  const handleToggleLock = async (block: ScheduleBlockDTO) => {
    try {
      const updatedBlock = await apiRequest<ScheduleBlockDTO>(
        `/api/schedule/blocks/${block.id}/lock`,
        {
          method: 'PATCH',
          body: JSON.stringify({ isLocked: !block.isLocked }),
        }
      );

      if (schedule) {
        setSchedule({
          ...schedule,
          blocks: schedule.blocks.map((b) => (b.id === block.id ? updatedBlock : b)),
        });
      }
    } catch (err: any) {
      setError(err.message || 'Failed to toggle lock');
    }
  };

  const handleOpenEdit = (block: ScheduleBlockDTO) => {
    setEditBlock(block);
    setEditStartTime(block.startTime);
    setEditEndTime(block.endTime);
    setEditTitle(block.title);
  };

  const handleSaveBlockEdit = async () => {
    if (!editBlock) return;
    setActionLoading(true);
    setError(null);
    try {
      const updatedSchedule = await apiRequest<ScheduleDTO>(
        `/api/schedule/blocks/${editBlock.id}`,
        {
          method: 'PATCH',
          body: JSON.stringify({
            startTime: editStartTime,
            endTime: editEndTime,
            title: editTitle,
          }),
        }
      );
      setSchedule(updatedSchedule);
      setEditBlock(null);
      setSuccessMsg(`Block "${editTitle}" updated.`);
    } catch (err: any) {
      setError(err.message || 'Failed to update block');
    } finally {
      setActionLoading(false);
    }
  };

  const handleOpenReschedule = () => {
    setShowRescheduleModal(true);
    setRescheduleDiff(null);
    setChangelog([]);
    const firstTask = schedule?.blocks.find((b) => b.blockType === 'TASK' && b.taskId);
    if (firstTask?.taskId) {
      setSelectedTaskToExtend(firstTask.taskId);
    }
  };

  const handleExecuteReschedule = async () => {
    if (!schedule) return;
    setActionLoading(true);
    setError(null);
    try {
      const taskModifications: any[] = [];
      const newEvents: any[] = [];

      if (selectedTaskToExtend && additionalMinutes !== 0) {
        taskModifications.push({
          taskId: selectedTaskToExtend,
          additionalMinutes,
        });
      }

      if (newMeetingTitle.trim()) {
        newEvents.push({
          title: newMeetingTitle.trim(),
          startTime: newMeetingStart,
          endTime: newMeetingEnd,
          blockType: 'EVENT',
        });
      }

      const res = await apiRequest<RescheduleResponseDTO>(
        `/api/schedule/${schedule.id}/reschedule`,
        {
          method: 'POST',
          body: JSON.stringify({
            reason: rescheduleReason,
            taskModifications,
            newEvents,
          }),
        }
      );

      setSchedule(res.schedule);
      setRescheduleDiff(res.diff);
      setChangelog(res.changelog);
      setSuccessMsg('Intelligent rescheduling complete! Unaffected tasks were preserved.');
    } catch (err: any) {
      setError(err.message || 'Failed to reschedule');
    } finally {
      setActionLoading(false);
    }
  };

  const handleOpenVersions = async () => {
    if (!schedule) return;
    setShowVersionsModal(true);
    try {
      const list = await apiRequest<ScheduleVersionDTO[]>(`/api/schedule/${schedule.id}/versions`);
      setVersions(list);
    } catch (err: any) {
      setError(err.message || 'Failed to load versions');
    }
  };

  const handleRestoreVersion = async (versionNumber: number) => {
    if (!schedule) return;
    if (!window.confirm(`Are you sure you want to restore schedule to Version ${versionNumber}?`)) {
      return;
    }
    setActionLoading(true);
    try {
      const restored = await apiRequest<ScheduleDTO>(`/api/schedule/${schedule.id}/restore`, {
        method: 'POST',
        body: JSON.stringify({ versionNumber }),
      });
      setSchedule(restored);
      setShowVersionsModal(false);
      setSuccessMsg(`Restored schedule to version ${versionNumber}.`);
    } catch (err: any) {
      setError(err.message || 'Failed to restore version');
    } finally {
      setActionLoading(false);
    }
  };

  const handleQuickUndo = async () => {
    if (!schedule || schedule.version <= 1) return;
    await handleRestoreVersion(schedule.version - 1);
  };

  const handlePrevDay = () => {
    const d = new Date(targetDate);
    d.setDate(d.getDate() - 1);
    setTargetDate(d.toISOString().substring(0, 10));
  };

  const handleNextDay = () => {
    const d = new Date(targetDate);
    d.setDate(d.getDate() + 1);
    setTargetDate(d.toISOString().substring(0, 10));
  };

  const handleToday = () => {
    setTargetDate(new Date().toISOString().substring(0, 10));
  };

  const formatMinutes = (mins: number) => {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    if (h === 0) return `${m}m`;
    if (m === 0) return `${h}h`;
    return `${h}h ${m}m`;
  };

  const isToday = targetDate === new Date().toISOString().substring(0, 10);
  const isCurrentBlock = (block: ScheduleBlockDTO) => {
    if (!isToday) return false;
    const now = new Date();
    const currentMins = now.getHours() * 60 + now.getMinutes();
    const parseMins = (t: string) => {
      if (t.includes('T')) {
        const d = new Date(t);
        return d.getHours() * 60 + d.getMinutes();
      }
      const [h, m] = t.split(':').map(Number);
      return (h || 0) * 60 + (m || 0);
    };
    const s = parseMins(block.startTime);
    const e = parseMins(block.endTime);
    return currentMins >= s && currentMins < e;
  };

  return {
    targetDate,
    setTargetDate,
    schedule,
    loading,
    generating,
    actionLoading,
    error,
    setError,
    successMsg,
    setSuccessMsg,

    editBlock,
    setEditBlock,
    editStartTime,
    setEditStartTime,
    editEndTime,
    setEditEndTime,
    editTitle,
    setEditTitle,
    handleOpenEdit,
    handleSaveBlockEdit,

    showRescheduleModal,
    setShowRescheduleModal,
    rescheduleReason,
    setRescheduleReason,
    additionalMinutes,
    setAdditionalMinutes,
    selectedTaskToExtend,
    setSelectedTaskToExtend,
    newMeetingTitle,
    setNewMeetingTitle,
    newMeetingStart,
    setNewMeetingStart,
    newMeetingEnd,
    setNewMeetingEnd,
    rescheduleDiff,
    changelog,
    handleOpenReschedule,
    handleExecuteReschedule,

    showVersionsModal,
    setShowVersionsModal,
    versions,
    handleOpenVersions,
    handleRestoreVersion,
    handleQuickUndo,

    handlePrevDay,
    handleNextDay,
    handleToday,

    handleGenerate,
    handleConfirmSchedule,
    handleRejectSchedule,
    handleToggleLock,

    formatMinutes,
    isToday,
    isCurrentBlock,
  };
}

