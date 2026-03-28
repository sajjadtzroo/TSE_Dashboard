import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import {
  Text, Box, Badge, Group, NumberInput, Switch, Button,
  Loader, Alert, Collapse, Divider, Tooltip,
} from '@mantine/core';
import {
  IconBuildingBank, IconChevronDown, IconChevronUp,
  IconSearch, IconAlertCircle, IconCheck, IconX,
  IconInfoCircle,
} from '@tabler/icons-react';
import rallyColors from '../../theme/rallyColors';
import { useAuth } from '../../context/AuthContext';

// ── Credit rating data ────────────────────────────────────────────────────────
const GROUPS = [
  {
    group: 'A', label: 'عالی', range: '۷۰۰–۹۰۰', color: '#10B981',
    glow: 'rgba(16,185,129,0.15)', border: 'rgba(16,185,129,0.35)',
    description: 'بهترین شرایط — حداکثر وام با کمترین محدودیت',
    subtiers: [
      { rating: 'A1', range: '۸۰۰–۹۰۰', label: 'ممتاز', score: 850 },
      { rating: 'A2', range: '۷۵۰–۸۰۰', label: 'بسیار خوب', score: 775 },
      { rating: 'A3', range: '۷۰۰–۷۵۰', label: 'خوب', score: 725 },
    ],
  },
  {
    group: 'B', label: 'خوب', range: '۵۵۰–۷۰۰', color: '#3B82F6',
    glow: 'rgba(59,130,246,0.15)', border: 'rgba(59,130,246,0.35)',
    description: 'گزینه‌های متنوع — ممکن است ضامن لازم باشد',
    subtiers: [
      { rating: 'B1', range: '۶۵۰–۷۰۰', label: 'قابل قبول', score: 675 },
      { rating: 'B2', range: '۶۰۰–۶۵۰', label: 'متوسط', score: 625 },
      { rating: 'B3', range: '۵۵۰–۶۰۰', label: 'احتیاط', score: 575 },
    ],
  },
  {
    group: 'C', label: 'محدود', range: '۴۰۰–۵۵۰', color: '#F59E0B',
    glow: 'rgba(245,158,11,0.12)', border: 'rgba(245,158,11,0.3)',
    description: 'گزینه‌های محدود — نیاز به وثیقه یا ضامن قوی',
    subtiers: [
      { rating: 'C1', range: '۵۰۰–۵۵۰', label: 'ضعیف', score: 525 },
      { rating: 'C2', range: '۴۰۰–۵۰۰', label: 'بسیار ضعیف', score: 450 },
    ],
  },
  {
    group: 'D', label: 'بحرانی', range: 'زیر ۴۰۰', color: '#EF4444',
    glow: 'rgba(239,68,68,0.10)', border: 'rgba(239,68,68,0.28)',
    description: 'دسترسی بسیار محدود — نیاز به اصلاح سابقه اعتباری',
    subtiers: [
      { rating: 'D', range: 'زیر ۴۰۰', label: 'بحرانی', score: 200 },
    ],
  },
];

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: [0.22, 1, 0.36, 1] } },
};

function LoanResultCard({ result, index }) {
  const eligible = result.relevance_score > 0.6;
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.07, duration: 0.3 }}
      style={{
        background: 'rgba(26,29,46,0.7)',
        border: `1px solid ${eligible ? 'rgba(16,185,129,0.3)' : 'rgba(255,255,255,0.08)'}`,
        borderRadius: 12,
        padding: '14px 16px',
        backdropFilter: 'blur(8px)',
        direction: 'rtl',
      }}
    >
      <Group justify="space-between" mb={6}>
        <Group gap={8}>
          <IconBuildingBank size={16} color="#10B981" stroke={1.8} />
          <Text fw={600} size="sm" c={rallyColors.textPrimary}>{result.loan_name_fa}</Text>
        </Group>
        <Badge
          size="xs"
          color={eligible ? 'teal' : 'orange'}
          variant="light"
          leftSection={eligible ? <IconCheck size={10} /> : <IconAlertCircle size={10} />}
        >
          {eligible ? 'واجد شرایط' : 'نیاز به بررسی'}
        </Badge>
      </Group>

      <Text size="xs" c={rallyColors.textSecondary} mb={8}>{result.bank_name_fa}</Text>

      <Group gap={16} wrap="wrap">
        {result.max_amount_million && (
          <Box>
            <Text size="xs" c={rallyColors.textDimmed}>حداکثر مبلغ</Text>
            <Text size="sm" fw={600} c={rallyColors.textPrimary}>
              {result.max_amount_million.toLocaleString('fa-IR')} میلیون
            </Text>
          </Box>
        )}
        {result.interest_rate_pct !== null && result.interest_rate_pct !== undefined && (
          <Box>
            <Text size="xs" c={rallyColors.textDimmed}>نرخ سود</Text>
            <Text size="sm" fw={600} c={result.interest_rate_pct === 0 ? '#10B981' : rallyColors.textPrimary}>
              {result.interest_rate_pct === 0 ? 'بدون سود' : `${result.interest_rate_pct}%`}
            </Text>
          </Box>
        )}
        <Box>
          <Text size="xs" c={rallyColors.textDimmed}>ضامن</Text>
          <Text size="sm" fw={600} c={result.has_guarantor ? '#F59E0B' : '#10B981'}>
            {result.has_guarantor ? 'لازم است' : 'نیاز نیست'}
          </Text>
        </Box>
        {result.repayment_periods_months?.length > 0 && (
          <Box>
            <Text size="xs" c={rallyColors.textDimmed}>دوره بازپرداخت</Text>
            <Text size="sm" c={rallyColors.textPrimary}>
              {result.repayment_periods_months.slice(0, 3).join('، ')} ماه
            </Text>
          </Box>
        )}
      </Group>
    </motion.div>
  );
}

export default function PersianLoanHome() {
  const navigate = useNavigate();
  const { token } = useAuth();

  const [selectedGroup, setSelectedGroup] = useState(null);
  const [selectedSubtier, setSelectedSubtier] = useState(null);
  const [creditScore, setCreditScore] = useState('');
  const [maxAmount, setMaxAmount] = useState('');
  const [noGuarantor, setNoGuarantor] = useState(false);
  const [showGuide, setShowGuide] = useState(false);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);
  const [answer, setAnswer] = useState('');
  const [error, setError] = useState('');

  const effectiveScore = creditScore
    ? Number(creditScore)
    : selectedSubtier?.score ?? selectedGroup?.subtiers[0]?.score ?? null;

  const canSearch = effectiveScore !== null && effectiveScore >= 0;

  const handleGroupSelect = (g) => {
    setSelectedGroup(g);
    setSelectedSubtier(null);
    setResults(null);
    setError('');
  };

  const handleSubtierSelect = (st) => {
    setSelectedSubtier(st);
    setCreditScore('');
    setResults(null);
    setError('');
  };

  const handleSearch = async () => {
    if (!canSearch) return;
    setLoading(true);
    setError('');
    setResults(null);
    setAnswer('');
    try {
      const res = await fetch('/api/persian-loan/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          credit_score: effectiveScore,
          max_amount: maxAmount ? Number(maxAmount) : null,
          no_guarantor: noGuarantor,
          message: 'مناسب‌ترین وام‌ها را پیشنهاد بده',
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || `خطا: ${res.status}`);
      }
      const data = await res.json();
      setResults(data.results || []);
      setAnswer(data.answer || '');
    } catch (e) {
      setError(e.message || 'خطا در ارتباط با سرور');
    } finally {
      setLoading(false);
    }
  };

  const activeColor = selectedGroup?.color || '#10B981';

  return (
    <Box style={{ maxWidth: 680, margin: '0 auto', padding: '24px 16px', direction: 'rtl' }}>
      {/* Header */}
      <motion.div variants={fadeUp} initial="hidden" animate="show">
        <Group gap={10} mb={4}>
          <IconBuildingBank size={28} color="#10B981" stroke={1.6} />
          <Text fw={700} size="xl" c={rallyColors.textPrimary}>وام‌یار</Text>
        </Group>
        <Text size="sm" c={rallyColors.textSecondary} mb={28}>
          رتبه اعتباری خود را انتخاب کنید تا مناسب‌ترین وام‌ها را پیشنهاد دهیم.
        </Text>
      </motion.div>

      {/* Step 1: Group cards */}
      <Text size="xs" fw={600} c={rallyColors.textDimmed} mb={10} style={{ letterSpacing: 1 }}>
        مرحله ۱ — گروه رتبه اعتباری
      </Text>
      <motion.div
        initial="hidden" animate="show"
        variants={{ show: { transition: { staggerChildren: 0.08 } } }}
        style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 24 }}
      >
        {GROUPS.map((g) => {
          const isSelected = selectedGroup?.group === g.group;
          return (
            <motion.div key={g.group} variants={fadeUp}>
              <motion.button
                onClick={() => handleGroupSelect(g)}
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.98 }}
                style={{
                  width: '100%',
                  background: isSelected
                    ? `linear-gradient(135deg, ${g.glow} 0%, rgba(26,29,46,0.85) 100%)`
                    : 'rgba(26,29,46,0.5)',
                  border: `1.5px solid ${isSelected ? g.color : 'rgba(255,255,255,0.07)'}`,
                  borderRadius: 12,
                  padding: '14px 16px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 14,
                  backdropFilter: 'blur(8px)',
                  textAlign: 'right',
                  boxShadow: isSelected ? `0 0 16px ${g.glow}` : 'none',
                  transition: 'all 0.2s',
                }}
              >
                <Box
                  style={{
                    width: 44, height: 44, borderRadius: 10,
                    background: g.glow,
                    border: `1px solid ${g.border}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <Text fw={800} size="lg" style={{ color: g.color }}>{g.group}</Text>
                </Box>
                <Box style={{ flex: 1 }}>
                  <Group gap={8} mb={2}>
                    <Text fw={700} size="sm" style={{ color: g.color }}>{g.label}</Text>
                    <Badge size="xs" variant="light" style={{ background: g.glow, color: g.color, border: `1px solid ${g.border}` }}>
                      {g.range}
                    </Badge>
                  </Group>
                  <Text size="xs" c={rallyColors.textDimmed}>{g.description}</Text>
                </Box>
                {isSelected && <IconCheck size={18} color={g.color} />}
              </motion.button>
            </motion.div>
          );
        })}
      </motion.div>

      {/* Step 2: Sub-tier or exact score */}
      <AnimatePresence>
        {selectedGroup && (
          <motion.div
            key="subtier"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
          >
            <Divider my="sm" color="rgba(255,255,255,0.06)" />
            <Text size="xs" fw={600} c={rallyColors.textDimmed} mb={10} style={{ letterSpacing: 1 }}>
              مرحله ۲ — دقیق‌تر مشخص کنید (اختیاری)
            </Text>
            <Group gap={8} mb={16} wrap="wrap">
              {selectedGroup.subtiers.map((st) => {
                const isActive = selectedSubtier?.rating === st.rating;
                return (
                  <motion.button
                    key={st.rating}
                    onClick={() => handleSubtierSelect(st)}
                    whileTap={{ scale: 0.96 }}
                    style={{
                      background: isActive ? selectedGroup.glow : 'rgba(26,29,46,0.5)',
                      border: `1px solid ${isActive ? selectedGroup.color : 'rgba(255,255,255,0.1)'}`,
                      borderRadius: 8, padding: '8px 14px', cursor: 'pointer',
                      color: isActive ? selectedGroup.color : rallyColors.textSecondary,
                      fontWeight: isActive ? 700 : 400, fontSize: 13,
                      transition: 'all 0.15s',
                    }}
                  >
                    {st.rating} <Text span size="xs" c="dimmed"> ({st.range})</Text>
                  </motion.button>
                );
              })}
            </Group>

            <Text size="xs" c={rallyColors.textDimmed} mb={6}>یا امتیاز دقیق خود را وارد کنید:</Text>
            <NumberInput
              value={creditScore}
              onChange={(v) => { setCreditScore(v); setSelectedSubtier(null); }}
              min={0} max={900} step={10}
              placeholder="مثلاً ۶۸۰"
              style={{ maxWidth: 180, direction: 'ltr' }}
              styles={{ input: { textAlign: 'center', fontSize: 15, fontWeight: 600 } }}
            />

            <Divider my="sm" color="rgba(255,255,255,0.06)" />

            {/* Optional filters */}
            <Text size="xs" fw={600} c={rallyColors.textDimmed} mb={10} style={{ letterSpacing: 1 }}>
              فیلترها (اختیاری)
            </Text>
            <Group gap={16} mb={20} wrap="wrap">
              <Box style={{ minWidth: 180 }}>
                <Text size="xs" c={rallyColors.textDimmed} mb={4}>حداکثر مبلغ (میلیون تومان)</Text>
                <NumberInput
                  value={maxAmount}
                  onChange={setMaxAmount}
                  min={1} step={50}
                  placeholder="بدون محدودیت"
                  style={{ direction: 'ltr' }}
                  styles={{ input: { textAlign: 'center' } }}
                />
              </Box>
              <Box>
                <Text size="xs" c={rallyColors.textDimmed} mb={8}>بدون ضامن</Text>
                <Switch
                  checked={noGuarantor}
                  onChange={(e) => setNoGuarantor(e.currentTarget.checked)}
                  color="teal"
                  label={noGuarantor ? 'فقط بدون ضامن' : 'همه'}
                />
              </Box>
            </Group>

            {/* Search button */}
            <Button
              fullWidth
              size="md"
              radius="xl"
              color="teal"
              leftSection={loading ? <Loader size={16} color="white" /> : <IconSearch size={18} />}
              onClick={handleSearch}
              disabled={!canSearch || loading}
              style={{ fontWeight: 700, fontSize: 15 }}
            >
              {loading ? 'در حال جستجو...' : 'جستجوی وام مناسب'}
            </Button>

            {effectiveScore !== null && (
              <Text size="xs" c={rallyColors.textDimmed} ta="center" mt={8}>
                امتیاز انتخابی: <Text span fw={700} c={activeColor}>{effectiveScore}</Text>
              </Text>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Error */}
      {error && (
        <Alert icon={<IconAlertCircle size={16} />} color="red" mt="md" radius="md">
          {error}
        </Alert>
      )}

      {/* Results */}
      <AnimatePresence>
        {results !== null && (
          <motion.div
            key="results"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            <Divider my="lg" color="rgba(255,255,255,0.06)" />
            {answer && (
              <Box
                mb="md"
                style={{
                  background: 'rgba(16,185,129,0.08)',
                  border: '1px solid rgba(16,185,129,0.2)',
                  borderRadius: 10, padding: '12px 16px',
                }}
              >
                <Group gap={8} mb={6}>
                  <IconInfoCircle size={16} color="#10B981" />
                  <Text size="xs" fw={600} c="#10B981">پیشنهاد وام‌یار</Text>
                </Group>
                <Text size="sm" c={rallyColors.textSecondary} style={{ lineHeight: 1.7 }}>
                  {answer}
                </Text>
              </Box>
            )}

            {results.length === 0 ? (
              <Alert icon={<IconX size={16} />} color="orange" radius="md">
                وامی برای این رتبه اعتباری یافت نشد. ممکن است پایگاه داده هنوز همگام‌سازی نشده باشد.
              </Alert>
            ) : (
              <>
                <Text size="sm" fw={600} c={rallyColors.textPrimary} mb={12}>
                  {results.length} وام مناسب یافت شد
                </Text>
                <Box style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {results.map((r, i) => (
                    <LoanResultCard key={i} result={r} index={i} />
                  ))}
                </Box>
                <Button
                  variant="subtle" color="teal" size="xs" mt="md" fullWidth
                  onClick={() => navigate('/persian-loan/chat')}
                >
                  گفتگوی کامل با وام‌یار ←
                </Button>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Credit guide collapsible */}
      <Divider my="xl" color="rgba(255,255,255,0.06)" />
      <motion.button
        onClick={() => setShowGuide((v) => !v)}
        style={{
          background: 'none', border: 'none', cursor: 'pointer',
          display: 'flex', alignItems: 'center', gap: 8,
          color: rallyColors.textDimmed, fontSize: 13, width: '100%',
        }}
      >
        {showGuide ? <IconChevronUp size={14} /> : <IconChevronDown size={14} />}
        جدول رتبه‌بندی اعتباری
      </motion.button>
      <Collapse in={showGuide}>
        <Box mt="sm" style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, direction: 'rtl' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                {['رتبه', 'امتیاز', 'ریسک', 'تفسیر'].map((h) => (
                  <th key={h} style={{ padding: '6px 10px', color: rallyColors.textDimmed, fontWeight: 600, textAlign: 'right' }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[
                ['A1','۸۰۰–۹۰۰','بسیار ناچیز','عالی: وام با کمترین وثیقه'],
                ['A2','۷۵۰–۸۰۰','بسیار پایین','بسیار خوب: تایید سریع'],
                ['A3','۷۰۰–۷۵۰','پایین','خوب: بدون چک برگشتی'],
                ['B1','۶۵۰–۷۰۰','پایین تا متوسط','قابل قبول: نوسانات جزئی'],
                ['B2','۶۰۰–۶۵۰','متوسط','متوسط: نیاز به ضامن'],
                ['B3','۵۵۰–۶۰۰','متوسط به بالا','احتیاط: تاخیر در سوابق'],
                ['C1','۵۰۰–۵۵۰','بالا','ضعیف: سوابق منفی'],
                ['C2','۴۰۰–۵۰۰','بسیار بالا','بسیار ضعیف: احتمال رد'],
                ['D','زیر ۴۰۰','بحرانی','چک برگشتی / معوقات سنگین'],
              ].map(([rating, range, risk, desc]) => (
                <tr key={rating} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                  <td style={{ padding: '6px 10px', fontWeight: 700, color: '#10B981' }}>{rating}</td>
                  <td style={{ padding: '6px 10px', color: rallyColors.textSecondary }}>{range}</td>
                  <td style={{ padding: '6px 10px', color: rallyColors.textDimmed }}>{risk}</td>
                  <td style={{ padding: '6px 10px', color: rallyColors.textDimmed }}>{desc}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Box>
      </Collapse>
    </Box>
  );
}
