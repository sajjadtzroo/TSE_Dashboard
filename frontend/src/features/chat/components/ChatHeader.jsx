import { useState, useRef } from 'react';
import {
  ActionIcon,
  Badge,
  Box,
  Group,
  Popover,
  Select,
  Stack,
  Text,
  Tooltip,
  UnstyledButton,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import {
  IconDownload,
  IconFiles,
  IconHistory,
  IconPaperclip,
  IconPlus,
  IconRobot,
  IconTrash,
  IconX,
} from '@tabler/icons-react';
import axios from 'axios';
import styles from './ChatDrawer.module.css';
import { STATUS_COLORS } from '../../../constants/chat';

export default function ChatHeader({
  sessions,
  activeSessionId,
  ragDocs,
  uploading,
  symbolFilter,
  onNewChat,
  onLoadSession,
  onDeleteSession,
  onFetchSessions,
  onFetchDocs,
  onDeleteDoc,
  onClearChat,
  onExport,
  onClose,
  onFileUpload,
}) {
  const [sessionsPopoverOpen, setSessionsPopoverOpen] = useState(false);
  const [uploadPopoverOpen, setUploadPopoverOpen] = useState(false);
  const [uploadCategory, setUploadCategory] = useState('codal');
  const [docsPopoverOpen, setDocsPopoverOpen] = useState(false);
  const [docCategoryFilter, setDocCategoryFilter] = useState(null);
  const fileInputRef = useRef(null);

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    if (!file.name.toLowerCase().endsWith('.pdf')) {
      notifications.show({ color: 'red', message: 'فقط فایل PDF پذیرفته می‌شود.' });
      return;
    }
    if (file.size > 50 * 1024 * 1024) {
      notifications.show({ color: 'red', message: 'حجم فایل بیش از ۵۰ مگابایت است.' });
      return;
    }
    onFileUpload(file, uploadCategory);
  };

  const handleLoadSession = (sessionId) => {
    onLoadSession(sessionId);
    setSessionsPopoverOpen(false);
  };

  return (
    <>
      <Group className={styles.drawerHeader} justify="space-between">
        <Group gap="sm">
          <IconRobot size={20} stroke={1.5} style={{ color: '#10B981' }} />
          <Text className={styles.drawerTitle}>چت مالی</Text>
        </Group>
        <Group gap="sm">
          {/* New Chat */}
          <Tooltip label="چت جدید" position="bottom" withArrow>
            <ActionIcon size="sm" variant="subtle" onClick={onNewChat} aria-label="چت جدید">
              <IconPlus size={16} />
            </ActionIcon>
          </Tooltip>

          {/* Session History */}
          <Popover opened={sessionsPopoverOpen} onChange={setSessionsPopoverOpen} width={300} position="bottom-end">
            <Popover.Target>
              <ActionIcon
                size="sm"
                variant="subtle"
                title="تاریخچه"
                aria-label="تاریخچه"
                onClick={() => { onFetchSessions(); setSessionsPopoverOpen((v) => !v); }}
              >
                <IconHistory size={16} />
              </ActionIcon>
            </Popover.Target>
            <Popover.Dropdown>
              <Text size="sm" fw={600} mb="xs" style={{ direction: 'rtl' }}>گفتگوهای اخیر</Text>
              {sessions.length === 0 ? (
                <Text size="xs" c="dimmed" style={{ direction: 'rtl' }}>گفتگویی یافت نشد.</Text>
              ) : (
                <Stack gap={4} className={styles.sessionList}>
                  {sessions.map((s) => (
                    <Group
                      key={s.id}
                      justify="space-between"
                      wrap="nowrap"
                      p={6}
                      className={s.id === activeSessionId ? styles.sessionItemActive : styles.sessionItem}
                      onClick={() => handleLoadSession(s.id)}
                    >
                      <Box style={{ overflow: 'hidden', flex: 1 }}>
                        <Text size="xs" truncate style={{ direction: 'rtl' }}>{s.title}</Text>
                        <Text size="xs" c="dimmed">{new Date(s.updated_at).toLocaleDateString('fa-IR')}</Text>
                      </Box>
                      <ActionIcon
                        size="xs"
                        color="red"
                        variant="subtle"
                        onClick={(e) => { e.stopPropagation(); onDeleteSession(s.id); }}
                        aria-label={`حذف گفتگو ${s.title || s.id}`}
                      >
                        <IconTrash size={12} />
                      </ActionIcon>
                    </Group>
                  ))}
                </Stack>
              )}
            </Popover.Dropdown>
          </Popover>

          {/* Upload */}
          <Popover opened={uploadPopoverOpen} onChange={setUploadPopoverOpen} width={220} position="bottom-end">
            <Popover.Target>
              <ActionIcon
                size="sm"
                variant="subtle"
                title="آپلود PDF"
                aria-label="آپلود PDF"
                loading={uploading}
                onClick={() => setUploadPopoverOpen((v) => !v)}
              >
                <IconPaperclip size={16} />
              </ActionIcon>
            </Popover.Target>
            <Popover.Dropdown>
              <Stack gap="xs">
                <Select
                  size="xs"
                  label="دسته‌بندی سند"
                  data={[
                    { value: 'codal', label: 'کدال' },
                    { value: 'cfa', label: 'CFA' },
                    { value: 'research', label: 'تحقیقاتی' },
                    { value: 'other', label: 'سایر' },
                  ]}
                  value={uploadCategory}
                  onChange={setUploadCategory}
                />
                <UnstyledButton
                  onClick={() => { setUploadPopoverOpen(false); fileInputRef.current?.click(); }}
                  style={{
                    padding: '6px 12px',
                    borderRadius: 6,
                    background: 'rgba(16, 185, 129, 0.1)',
                    border: '1px solid rgba(16, 185, 129, 0.2)',
                    textAlign: 'center',
                    fontSize: 13,
                  }}
                >
                  انتخاب فایل
                </UnstyledButton>
              </Stack>
            </Popover.Dropdown>
          </Popover>

          {/* Documents */}
          <Popover opened={docsPopoverOpen} onChange={setDocsPopoverOpen} width={340} position="bottom-end">
            <Popover.Target>
              <ActionIcon
                size="sm"
                variant="subtle"
                title="اسناد"
                aria-label="اسناد"
                onClick={() => { onFetchDocs(); setDocsPopoverOpen((v) => !v); }}
              >
                <IconFiles size={16} />
              </ActionIcon>
            </Popover.Target>
            <Popover.Dropdown>
              <Text size="sm" fw={600} mb="xs" style={{ direction: 'rtl' }}>اسناد</Text>
              <Select
                size="xs"
                placeholder="همه دسته‌ها"
                clearable
                mb="xs"
                data={[
                  { value: 'codal', label: 'کدال' },
                  { value: 'cfa', label: 'CFA' },
                  { value: 'research', label: 'تحقیقاتی' },
                  { value: 'other', label: 'سایر' },
                ]}
                value={docCategoryFilter}
                onChange={(val) => { setDocCategoryFilter(val); onFetchDocs(val); }}
              />
              {ragDocs.length === 0 ? (
                <Text size="xs" c="dimmed" style={{ direction: 'rtl' }}>سندی یافت نشد.</Text>
              ) : (
                <Stack gap={4}>
                  {ragDocs.map((doc) => (
                    <Group key={doc.id} justify="space-between" wrap="nowrap">
                      <Box style={{ overflow: 'hidden' }}>
                        <Text size="xs" truncate>{doc.title || `#${doc.id}`}</Text>
                        <Group gap={4} mt={2}>
                          <Badge size="xs" color={STATUS_COLORS[doc.status] || 'gray'}>{doc.status}</Badge>
                          <Badge size="xs" variant="outline">{doc.source}</Badge>
                          {doc.doc_category && (
                            <Badge
                              size="xs"
                              color={doc.doc_category === 'cfa' ? 'pink' : doc.doc_category === 'research' ? 'teal' : 'gray'}
                              variant="light"
                            >
                              {doc.doc_category}
                            </Badge>
                          )}
                          {doc.symbol && <Badge size="xs">{doc.symbol}</Badge>}
                        </Group>
                      </Box>
                      {doc.source === 'upload' && (
                        <ActionIcon
                          size="xs"
                          color="red"
                          variant="subtle"
                          onClick={() => onDeleteDoc(doc.id)}
                          aria-label={`حذف سند ${doc.title || doc.id}`}
                        >
                          <IconTrash size={12} />
                        </ActionIcon>
                      )}
                    </Group>
                  ))}
                </Stack>
              )}
            </Popover.Dropdown>
          </Popover>

          {/* Export */}
          {onExport && (
            <Tooltip label="خروجی مکالمه" position="bottom" withArrow>
              <ActionIcon size="sm" variant="subtle" onClick={onExport} aria-label="خروجی مکالمه">
                <IconDownload size={16} />
              </ActionIcon>
            </Tooltip>
          )}

          {/* Clear */}
          <ActionIcon
            size="sm"
            variant="subtle"
            onClick={onClearChat}
            title="پاک کردن تاریخچه"
            aria-label="پاک کردن تاریخچه"
          >
            <IconTrash size={16} />
          </ActionIcon>

          {/* Close */}
          <ActionIcon size="sm" variant="subtle" onClick={onClose} aria-label="بستن چت">
            <IconX size={18} />
          </ActionIcon>
        </Group>
      </Group>

      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf"
        style={{ display: 'none' }}
        onChange={handleFileChange}
      />
    </>
  );
}
