import { useState, useRef, useEffect } from 'react';
import {
  Box,
  Typography,
  TextField,
  IconButton,
  Paper,
  Chip,
  CircularProgress,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Alert,
} from '@mui/material';
import { IconSend, IconChevronDown, IconFileText, IconRobot, IconUser } from '@tabler/icons-react';
import axios from 'axios';
import MainCard from '../components/MainCard';
import colors from '../theme/colors';

const EXAMPLES = [
  'سود خالص شرکت فولاد چقدر بود؟',
  'درآمد عملیاتی فخوز در آخرین گزارش',
  'What is the EPS of Mobarakeh Steel?',
  'هزینه‌های مالی شرکت ایران خودرو',
];

export default function Chat() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [symbolFilter, setSymbolFilter] = useState('');
  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async (text) => {
    const query = text || input.trim();
    if (!query) return;

    setInput('');
    setMessages((prev) => [...prev, { role: 'user', content: query }]);
    setLoading(true);

    try {
      const res = await axios.post('/api/rag/chat', {
        message: query,
        symbol: symbolFilter || undefined,
        top_k: 5,
      });
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: res.data.answer,
          sources: res.data.sources,
        },
      ]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: `Error: ${err.response?.data?.detail || err.message}`,
          sources: [],
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 100px)' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
        <Typography variant="h3">Financial Report Chat</Typography>
        <TextField
          size="small"
          placeholder="Filter by symbol..."
          value={symbolFilter}
          onChange={(e) => setSymbolFilter(e.target.value)}
          sx={{ width: 160, '& .MuiInputBase-root': { height: 36 } }}
        />
      </Box>

      {/* Messages area */}
      <MainCard sx={{ flex: 1, overflow: 'auto', mb: 2, p: 0 }} content={false}>
        <Box sx={{ p: 2, minHeight: '100%' }}>
          {messages.length === 0 && (
            <Box sx={{ textAlign: 'center', py: 8 }}>
              <IconRobot size={48} stroke={1} style={{ opacity: 0.3, marginBottom: 16 }} />
              <Typography variant="h4" color="text.secondary" gutterBottom>
                Ask about financial reports
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                Ask questions about Codal financial reports in Persian or English
              </Typography>
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', justifyContent: 'center' }}>
                {EXAMPLES.map((ex) => (
                  <Chip
                    key={ex}
                    label={ex}
                    onClick={() => sendMessage(ex)}
                    sx={{
                      cursor: 'pointer',
                      bgcolor: 'rgba(33,150,243,0.1)',
                      '&:hover': { bgcolor: 'rgba(33,150,243,0.2)' },
                    }}
                  />
                ))}
              </Box>
            </Box>
          )}

          {messages.map((msg, i) => (
            <Box
              key={i}
              sx={{
                display: 'flex',
                justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
                mb: 2,
              }}
            >
              <Box sx={{ maxWidth: '80%' }}>
                <Paper
                  elevation={0}
                  sx={{
                    p: 2,
                    borderRadius: 2,
                    bgcolor: msg.role === 'user' ? 'primary.main' : colors.darkLevel1,
                    color: msg.role === 'user' ? '#fff' : 'text.primary',
                  }}
                >
                  <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-start' }}>
                    {msg.role === 'assistant' && <IconRobot size={18} stroke={1.5} style={{ flexShrink: 0, marginTop: 2 }} />}
                    <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap', direction: 'auto' }}>
                      {msg.content}
                    </Typography>
                    {msg.role === 'user' && <IconUser size={18} stroke={1.5} style={{ flexShrink: 0, marginTop: 2 }} />}
                  </Box>
                </Paper>

                {/* Sources */}
                {msg.sources && msg.sources.length > 0 && (
                  <Accordion
                    elevation={0}
                    sx={{
                      mt: 0.5,
                      bgcolor: 'transparent',
                      '&:before': { display: 'none' },
                    }}
                  >
                    <AccordionSummary
                      expandIcon={<IconChevronDown size={16} />}
                      sx={{
                        minHeight: 32,
                        py: 0,
                        '& .MuiAccordionSummary-content': { my: 0.5 },
                      }}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <IconFileText size={14} />
                        <Typography variant="caption" color="text.secondary">
                          {msg.sources.length} sources
                        </Typography>
                      </Box>
                    </AccordionSummary>
                    <AccordionDetails sx={{ pt: 0 }}>
                      {msg.sources.map((src, j) => (
                        <Box
                          key={j}
                          sx={{
                            p: 1,
                            mb: 0.5,
                            borderRadius: 1,
                            bgcolor: 'rgba(255,255,255,0.03)',
                            border: '1px solid rgba(255,255,255,0.05)',
                          }}
                        >
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                            {src.symbol && (
                              <Chip label={src.symbol} size="small" sx={{ height: 20, fontSize: '0.7rem' }} />
                            )}
                            <Typography variant="caption" color="text.secondary">
                              Page {src.page_numbers}
                            </Typography>
                            <Chip
                              label={`${(src.similarity * 100).toFixed(0)}%`}
                              size="small"
                              sx={{
                                height: 18,
                                fontSize: '0.65rem',
                                bgcolor: src.similarity > 0.7 ? 'rgba(0,230,118,0.15)' : 'rgba(255,171,0,0.15)',
                                color: src.similarity > 0.7 ? colors.successMain : colors.warningDark,
                              }}
                            />
                            {src.source_url && (
                              <Chip
                                label="PDF"
                                size="small"
                                component="a"
                                href={src.source_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                clickable
                                sx={{
                                  height: 18,
                                  fontSize: '0.65rem',
                                  bgcolor: 'rgba(244,67,54,0.15)',
                                  color: colors.errorMain,
                                }}
                              />
                            )}
                          </Box>
                          <Typography variant="caption" color="text.secondary" sx={{ direction: 'auto' }}>
                            {src.content_preview}
                          </Typography>
                        </Box>
                      ))}
                    </AccordionDetails>
                  </Accordion>
                )}
              </Box>
            </Box>
          ))}

          {loading && (
            <Box sx={{ display: 'flex', justifyContent: 'flex-start', mb: 2 }}>
              <Paper elevation={0} sx={{ p: 2, borderRadius: 2, bgcolor: colors.darkLevel1 }}>
                <CircularProgress size={20} />
              </Paper>
            </Box>
          )}

          <div ref={messagesEndRef} />
        </Box>
      </MainCard>

      {/* Input area */}
      <Box sx={{ display: 'flex', gap: 1 }}>
        <TextField
          fullWidth
          placeholder="Ask about financial reports..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={loading}
          multiline
          maxRows={3}
          sx={{
            '& .MuiOutlinedInput-root': {
              bgcolor: colors.darkLevel1,
              borderRadius: 2,
            },
          }}
        />
        <IconButton
          onClick={() => sendMessage()}
          disabled={loading || !input.trim()}
          sx={{
            bgcolor: 'primary.main',
            color: '#fff',
            borderRadius: 2,
            width: 48,
            '&:hover': { bgcolor: 'primary.dark' },
            '&.Mui-disabled': { bgcolor: 'rgba(33,150,243,0.2)' },
          }}
        >
          <IconSend size={20} />
        </IconButton>
      </Box>
    </Box>
  );
}
