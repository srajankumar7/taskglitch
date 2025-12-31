import {
  Alert,
  Avatar,
  Box,
  Button,
  Container,
  MenuItem,
  Select,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { useCallback, useMemo, useState } from 'react';

import MetricsBar from '@/components/MetricsBar';
import TaskTable from '@/components/TaskTable';
import UndoSnackbar from '@/components/UndoSnackbar';

import { UserProvider, useUser } from '@/context/UserContext';
import { TasksProvider, useTasksContext } from '@/context/TasksContext';

import { downloadCSV, toCSV } from '@/utils/csv';
import type { Task } from '@/types';

function AppContent() {
  const {
    derivedSorted,
    addTask,
    updateTask,
    deleteTask,
    undoDelete,
    clearLastDeleted,
    lastDeleted,
    error,
  } = useTasksContext();

  const { user } = useUser();

  const [q, setQ] = useState('');
  const [fStatus, setFStatus] = useState('All');
  const [fPriority, setFPriority] = useState('All');

  const filtered = useMemo(() => {
    return derivedSorted.filter(t => {
      if (q && !t.title.toLowerCase().includes(q.toLowerCase())) return false;
      if (fStatus !== 'All' && t.status !== fStatus) return false;
      if (fPriority !== 'All' && t.priority !== fPriority) return false;
      return true;
    });
  }, [derivedSorted, q, fStatus, fPriority]);

  const handleAdd = useCallback(
    (payload: Omit<Task, 'id'>) => addTask(payload),
    [addTask]
  );

  const handleUpdate = useCallback(
    (id: string, patch: Partial<Task>) => updateTask(id, patch),
    [updateTask]
  );

  const handleDelete = useCallback(
    (id: string) => deleteTask(id),
    [deleteTask]
  );

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Stack spacing={3}>
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Box>
              <Typography variant="h3" fontWeight={700}>
                TaskGlitch
              </Typography>
              <Typography color="text.secondary">
                Welcome back, {user.name.split(' ')[0]}.
              </Typography>
            </Box>

            <Stack direction="row" spacing={2} alignItems="center">
              <Button
                variant="outlined"
                onClick={() => downloadCSV('tasks.csv', toCSV(filtered))}
              >
                Export CSV
              </Button>
              <Avatar>{user.name[0]}</Avatar>
            </Stack>
          </Stack>

          {error && <Alert severity="error">{error}</Alert>}

          {/* 🔥 NO LOADING, NO SPINNER, EVER */}
          <MetricsBar />

          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <TextField
              placeholder="Search by title"
              value={q}
              onChange={e => setQ(e.target.value)}
              fullWidth
            />

            <Select value={fStatus} onChange={e => setFStatus(e.target.value)}>
              <MenuItem value="All">All Status</MenuItem>
              <MenuItem value="Todo">Todo</MenuItem>
              <MenuItem value="In Progress">In Progress</MenuItem>
              <MenuItem value="Done">Done</MenuItem>
            </Select>

            <Select value={fPriority} onChange={e => setFPriority(e.target.value)}>
              <MenuItem value="All">All Priority</MenuItem>
              <MenuItem value="High">High</MenuItem>
              <MenuItem value="Medium">Medium</MenuItem>
              <MenuItem value="Low">Low</MenuItem>
            </Select>
          </Stack>

          <TaskTable
            tasks={filtered}
            onAdd={handleAdd}
            onUpdate={handleUpdate}
            onDelete={handleDelete}
          />

          <UndoSnackbar
            open={!!lastDeleted}
            onUndo={undoDelete}
            onClose={clearLastDeleted}
          />
        </Stack>
      </Container>
    </Box>
  );
}

export default function App() {
  return (
    <UserProvider>
      <TasksProvider>
        <AppContent />
      </TasksProvider>
    </UserProvider>
  );
}
