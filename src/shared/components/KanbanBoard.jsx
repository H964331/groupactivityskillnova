// ════════════════════════════════════════════════════════════
//  KanbanBoard — drag-and-drop task board
//  Optimistic UI + server sync
// ════════════════════════════════════════════════════════════
import { useState, useEffect, useCallback, useRef } from 'react';
import {
  DndContext, DragOverlay, PointerSensor, useSensor, useSensors, closestCorners,
} from '@dnd-kit/core';
import {
  SortableContext, useSortable, verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Plus, AlertCircle, Clock, CheckCircle, Loader2, GripVertical, Paperclip, X } from 'lucide-react';
import api from '../../lib/api';
import notify from '../../lib/toast';
import { formatRelative } from '../../lib/utils';
import { getSocket } from '../../lib/socket';

const COLUMNS = [
  { id: 'TODO',        title: 'To do',         color: '#94a3b8' },
  { id: 'IN_PROGRESS', title: 'In progress',   color: '#ff6d34' },
  { id: 'REVIEW',      title: 'In review',     color: '#7C3AED' },
  { id: 'DONE',        title: 'Done',          color: '#00bea3' },
];

const PRIORITY_COLORS = {
  URGENT: '#dc2626', HIGH: '#ff6d34', MEDIUM: '#f59e0b', LOW: '#94a3b8',
};

const STATUS_ICON = {
  TODO: Clock, IN_PROGRESS: Loader2, REVIEW: AlertCircle, DONE: CheckCircle, BLOCKED: AlertCircle,
};

const TaskCard = ({ task, isOverlay = false, canEdit = true, onClick }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: task.id,
    data: { type: 'task', task },
    disabled: !canEdit,
  });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.4 : 1 };
  const StatusIcon = STATUS_ICON[task.status] || Clock;
  const overdue = task.dueDate && task.status !== 'DONE' && new Date(task.dueDate) < new Date();
  return (
    <div
      ref={setNodeRef}
      style={{
        ...style,
        background: 'var(--card)',
        border: '1px solid var(--border)',
        borderRadius: 10,
        padding: 12,
        marginBottom: 8,
        cursor: canEdit ? 'grab' : 'default',
        boxShadow: isOverlay ? '0 10px 30px rgba(0,0,0,0.18)' : 'none',
        position: 'relative',
      }}
      {...attributes}
      {...listeners}
      onClick={onClick}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
        <div style={{ width: 8, height: 8, borderRadius: '50%', background: PRIORITY_COLORS[task.priority] || '#94a3b8', flexShrink: 0 }} />
        <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', flex: 1, lineHeight: 1.35 }}>{task.title}</p>
        {canEdit && <GripVertical size={12} style={{ color: 'var(--muted)', opacity: 0.4, flexShrink: 0 }} />}
      </div>
      {task.dueDate && (
        <p style={{ fontSize: 11, color: overdue ? '#dc2626' : 'var(--muted)', display: 'flex', alignItems: 'center', gap: 4, marginTop: 4, fontWeight: overdue ? 700 : 400 }}>
          <Clock size={10} /> {overdue ? 'Overdue —' : 'Due'} {formatRelative(task.dueDate)}
        </p>
      )}
      {Array.isArray(task.attachmentIds) && task.attachmentIds.length > 0 && (
        <p style={{ fontSize: 11, color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: 4, marginTop: 4 }}>
          <Paperclip size={10} /> {task.attachmentIds.length} file{task.attachmentIds.length > 1 ? 's' : ''}
        </p>
      )}
      {task.assignee && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6 }}>
          <div style={{ width: 20, height: 20, borderRadius: '50%', background: 'linear-gradient(135deg, #ff6d34, #00bea3)', color: '#fff', fontSize: 10, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {task.assignee.name?.split(' ').map((n) => n[0]).slice(0, 2).join('')}
          </div>
          <span style={{ fontSize: 11, color: 'var(--muted)' }}>{task.assignee.name}</span>
        </div>
      )}
    </div>
  );
};

const Column = ({ column, tasks, canEdit, onAdd, onClickTask }) => {
  const taskIds = tasks.map((t) => t.id);
  const { setNodeRef } = useSortable({ id: column.id, data: { type: 'column' }, disabled: !canEdit });
  return (
    <div
      ref={setNodeRef}
      style={{
        background: 'var(--bg)',
        border: '1px solid var(--border)',
        borderRadius: 14,
        padding: 12,
        minHeight: 320,
        width: 280,
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, paddingLeft: 4, paddingRight: 4 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: column.color }} />
          <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>{column.title}</p>
          <span style={{ fontSize: 11, color: 'var(--muted)', background: 'var(--card)', padding: '1px 6px', borderRadius: 10 }}>{tasks.length}</span>
        </div>
        {canEdit && onAdd && (
          <button onClick={() => onAdd(column.id)} style={{ background: 'transparent', border: 'none', color: 'var(--muted)', cursor: 'pointer', padding: 4 }}>
            <Plus size={14} />
          </button>
        )}
      </div>
      <SortableContext items={taskIds} strategy={verticalListSortingStrategy}>
        <div style={{ flex: 1, overflowY: 'auto', minHeight: 100 }}>
          {tasks.map((t) => <TaskCard key={t.id} task={t} canEdit={canEdit} onClick={() => onClickTask?.(t)} />)}
          {tasks.length === 0 && (
            <p style={{ fontSize: 12, color: 'var(--muted)', textAlign: 'center', padding: 24, opacity: 0.6 }}>No tasks here.</p>
          )}
        </div>
      </SortableContext>
    </div>
  );
};

// ── Task create/edit modal — now with assignee + due date + status + attachments ──
export const TaskModal = ({ task, interns = [], onClose, onSave, onDelete }) => {
  const [title, setTitle] = useState(task?.title || '');
  const [description, setDescription] = useState(task?.description || '');
  const [priority, setPriority] = useState(task?.priority || 'MEDIUM');
  const [status, setStatus] = useState(task?.status || 'TODO');
  const [dueDate, setDueDate] = useState(task?.dueDate ? new Date(task.dueDate).toISOString().slice(0, 10) : '');
  const [assigneeId, setAssigneeId] = useState(task?.assigneeId || task?.assignee?.id || '');
  const [attachments, setAttachments] = useState(task?.attachmentFiles || []); // [{id, originalName}]
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const fileRef = useRef(null);

  if (!task) return null;
  const isNew = !task.id;

  const attachFile = async (f) => {
    if (!f) return;
    setUploading(true);
    const form = new FormData();
    form.append('file', f);
    try {
      const { data } = await api.post('/files', form, { headers: { 'Content-Type': 'multipart/form-data' } });
      setAttachments((arr) => [...arr, data.file]);
    } catch { notify.error('Upload failed'); }
    setUploading(false);
    if (fileRef.current) fileRef.current.value = '';
  };

  const removeAttachment = (id) => setAttachments((arr) => arr.filter((a) => a.id !== id));

  const save = async () => {
    if (!title.trim()) return notify.error('Title is required');
    setSaving(true);
    try {
      await onSave({
        id: task.id || null,
        projectId: task.projectId,
        title: title.trim(),
        description: description.trim() || undefined,
        priority,
        status,
        dueDate: dueDate || null,
        assigneeId: assigneeId || null,
        attachmentIds: attachments.map((a) => a.id),
      });
      onClose();
    } catch (err) {
      notify.error(err.response?.data?.error || 'Failed to save task');
    }
    setSaving(false);
  };

  const inputStyle = { width: '100%', padding: '10px 14px', borderRadius: 10, border: '1px solid var(--border)', background: 'var(--input-bg)', color: 'var(--text)', fontSize: 14 };
  const labelStyle = { fontSize: 11, fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 0.04, display: 'block', marginBottom: 4 };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: 16 }}>
      <div style={{ background: 'var(--card)', borderRadius: 16, padding: 24, width: 'min(92vw, 520px)', border: '1px solid var(--border)', maxHeight: '90vh', overflowY: 'auto' }}>
        <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16, color: 'var(--text)' }}>{isNew ? 'New task' : 'Edit task'}</h3>

        <label style={labelStyle}>Title</label>
        <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Task title" style={{ ...inputStyle, marginBottom: 12 }} />

        <label style={labelStyle}>Description</label>
        <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What needs to be done?" rows={3}
          style={{ ...inputStyle, marginBottom: 12, resize: 'vertical' }} />

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
          <div>
            <label style={labelStyle}>Priority</label>
            <select value={priority} onChange={(e) => setPriority(e.target.value)} style={inputStyle}>
              {['LOW', 'MEDIUM', 'HIGH', 'URGENT'].map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          <div>
            <label style={labelStyle}>Status</label>
            <select value={status} onChange={(e) => setStatus(e.target.value)} style={inputStyle}>
              {['TODO', 'IN_PROGRESS', 'REVIEW', 'DONE', 'BLOCKED'].map((s) => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
            </select>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
          <div>
            <label style={labelStyle}>Due date</label>
            <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>Assign to</label>
            <select value={assigneeId} onChange={(e) => setAssigneeId(e.target.value)} style={inputStyle}>
              <option value="">Unassigned</option>
              {interns.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
            </select>
          </div>
        </div>

        <label style={labelStyle}>Attachments</label>
        <div style={{ marginBottom: 16 }}>
          {attachments.map((a) => (
            <div key={a.id} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text)', padding: '6px 10px', background: 'var(--bg)', borderRadius: 8, marginBottom: 4 }}>
              <Paperclip size={12} style={{ flexShrink: 0 }} />
              <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.originalName}</span>
              <button onClick={() => removeAttachment(a.id)} style={{ background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', padding: 0 }}><X size={12} /></button>
            </div>
          ))}
          <input ref={fileRef} type="file" hidden onChange={(e) => attachFile(e.target.files?.[0])} />
          <button onClick={() => fileRef.current?.click()} disabled={uploading}
            style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--muted)', background: 'var(--bg)', border: '1px dashed var(--border)', borderRadius: 8, padding: '8px 12px', cursor: 'pointer', width: '100%', justifyContent: 'center' }}>
            {uploading ? <Loader2 size={12} className="animate-spin" /> : <Paperclip size={12} />}
            {uploading ? 'Uploading…' : 'Attach a file'}
          </button>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
          {!isNew && onDelete ? (
            <button onClick={() => onDelete(task)} style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid var(--border)', background: 'transparent', color: '#dc2626', fontSize: 13, fontWeight: 500, cursor: 'pointer' }}>Delete</button>
          ) : <span />}
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={onClose} style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--card)', color: 'var(--text)', fontSize: 13, fontWeight: 500, cursor: 'pointer' }}>Cancel</button>
            <button onClick={save} disabled={saving} style={{ padding: '8px 16px', borderRadius: 8, border: 'none', background: '#ff6d34', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>{saving ? 'Saving…' : 'Save'}</button>
          </div>
        </div>
      </div>
    </div>
  );
};

const KanbanBoard = ({ projectId, canEdit = true }) => {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTask, setActiveTask] = useState(null);
  const [modalTask, setModalTask] = useState(null);
  const [project, setProject] = useState(null);

  const fetch = useCallback(async () => {
    if (!projectId) return;
    setLoading(true);
    try {
      const [p, t] = await Promise.all([
        api.get(`/projects/${projectId}`).catch(() => null),
        api.get('/tasks', { params: { projectId, limit: 200 } }),
      ]);
      setProject(p?.data?.project);
      setTasks(t.data.items);
    } catch { /* ignore */ }
    setLoading(false);
  }, [projectId]);

  useEffect(() => {
    fetch();
    const socket = getSocket();
    if (!socket) return undefined;
    const onTaskUpdated = (data) => {
      if (data.projectId === projectId) {
        setTasks((arr) => arr.map((t) => (t.id === data.taskId ? { ...t, ...data.task } : t)));
      }
    };
    const onDashboardRefresh = () => { fetch(); };
    socket.emit('join:project', projectId);
    socket.on('task:updated', onTaskUpdated);
    socket.on('dashboard:refresh', onDashboardRefresh);
    return () => {
      socket.off('task:updated', onTaskUpdated);
      socket.off('dashboard:refresh', onDashboardRefresh);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  const onDragStart = (e) => {
    const data = e.active.data.current;
    if (data?.type === 'task') setActiveTask(data.task);
  };

  const onDragEnd = async (e) => {
    setActiveTask(null);
    const { active, over } = e;
    if (!over) return;
    const aData = active.data.current;
    const oData = over.data.current;
    if (!aData || aData.type !== 'task') return;

    let newStatus;
    if (oData?.type === 'column') {
      newStatus = over.id;
    } else if (oData?.type === 'task') {
      newStatus = oData.task.status;
    } else return;

    if (newStatus === aData.task.status) return;
    setTasks((arr) => arr.map((t) => t.id === aData.task.id ? { ...t, status: newStatus } : t));
    try {
      await api.patch(`/tasks/${aData.task.id}`, { status: newStatus });
      notify.success(`Moved to ${newStatus.replace('_', ' ').toLowerCase()}`);
    } catch (err) {
      notify.error(err.response?.data?.error || 'Failed to update');
      fetch();
    }
  };

  const onAdd = (status) => {
    setModalTask({ title: '', priority: 'MEDIUM', status, projectId, id: null });
  };

  // FIX: previously checked task._id (always undefined) so this branch never
  // ran — POST/PATCH never fired. Now correctly creates or updates.
  const onSaveTask = async (data) => {
    if (data.id) {
      await api.patch(`/tasks/${data.id}`, {
        title: data.title, description: data.description, priority: data.priority,
        status: data.status, dueDate: data.dueDate, assigneeId: data.assigneeId,
        attachmentIds: data.attachmentIds,
      });
      notify.success('Task updated');
    } else {
      await api.post('/tasks', {
        projectId: data.projectId, title: data.title, description: data.description,
        priority: data.priority, status: data.status, dueDate: data.dueDate,
        assigneeId: data.assigneeId, attachmentIds: data.attachmentIds,
      });
      notify.success('Task created');
    }
    fetch();
  };

  const onDeleteTask = async (task) => {
    if (!window.confirm(`Delete "${task.title}"?`)) return;
    try {
      await api.delete(`/tasks/${task.id}`);
      notify.success('Task deleted');
      setModalTask(null);
      fetch();
    } catch (err) { notify.error(err.response?.data?.error || 'Failed to delete'); }
  };

  const interns = (project?.interns || []).map((i) => i.user).filter(Boolean);

  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: 'var(--muted)' }}><Loader2 size={20} className="animate-spin" style={{ display: 'inline-block', verticalAlign: 'middle' }} /></div>;

  return (
    <div>
      {project && (
        <div style={{ marginBottom: 16 }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)' }}>{project.name}</h2>
          {project.description && <p style={{ fontSize: 13, color: 'var(--muted)', marginTop: 4 }}>{project.description}</p>}
        </div>
      )}
      <DndContext sensors={sensors} collisionDetection={closestCorners} onDragStart={onDragStart} onDragEnd={onDragEnd}>
        <div style={{ display: 'flex', gap: 12, overflowX: 'auto', paddingBottom: 12 }}>
          {COLUMNS.map((c) => (
            <Column
              key={c.id}
              column={c}
              tasks={tasks.filter((t) => t.status === c.id)}
              canEdit={canEdit}
              onAdd={onAdd}
              onClickTask={(t) => canEdit && setModalTask(t)}
            />
          ))}
        </div>
        <DragOverlay>{activeTask && <TaskCard task={activeTask} isOverlay />}</DragOverlay>
      </DndContext>
      {modalTask && (
        <TaskModal task={modalTask} interns={interns} onClose={() => setModalTask(null)} onSave={onSaveTask} onDelete={onDeleteTask} />
      )}
    </div>
  );
};

export default KanbanBoard;
