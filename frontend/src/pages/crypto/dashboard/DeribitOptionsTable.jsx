import { useState, useEffect, useMemo } from 'react';
import { Stack, Group, Text, Loader, SegmentedControl, Select, Table, ScrollArea, Badge } from '@mantine/core';
import { deribitRest } from '../../../services/deribit';
import { toPersianNum } from '../../../utils/formatUtils';

const CURRENCIES = ['BTC', 'ETH'];

// Month order for sorting expiry dates
const MONTH_ORDER = {
  JAN: 1, FEB: 2, MAR: 3, APR: 4, MAY: 5, JUN: 6,
  JUL: 7, AUG: 8, SEP: 9, OCT: 10, NOV: 11, DEC: 12,
};

/** Parse Deribit option name like BTC-28MAR25-80000-C */
function parseOption(name) {
  const parts = name.split('-');
  if (parts.length < 4) return null;
  const [currency, expiry, strikeStr, type] = parts;
  const strike = Number(strikeStr);
  if (!strike) return null;
  return { currency, expiry, strike, type }; // type = 'C' | 'P'
}

/** Sort expiry strings (e.g. 28MAR25 < 25APR25) */
function compareExpiry(a, b) {
  const parseExp = (s) => {
    const match = s.match(/^(\d{1,2})([A-Z]{3})(\d{2,4})$/);
    if (!match) return 0;
    const [, day, mon, yr] = match;
    const year = Number(yr) + (yr.length === 2 ? 2000 : 0);
    return year * 10000 + (MONTH_ORDER[mon] || 0) * 100 + Number(day);
  };
  return parseExp(a) - parseExp(b);
}

function fmtIV(v) {
  if (v == null) return '-';
  return toPersianNum((v * 100).toFixed(1)) + '%';
}

function fmtOI(v) {
  if (v == null) return '-';
  if (v >= 1e6) return toPersianNum((v / 1e6).toFixed(1)) + 'M';
  if (v >= 1e3) return toPersianNum((v / 1e3).toFixed(0)) + 'K';
  return toPersianNum(v.toFixed(2));
}

function fmtPrice(v) {
  if (v == null) return '-';
  return toPersianNum(Number(v).toFixed(4));
}

/**
 * Options chain table: call/put pairs per strike for the selected expiry.
 * Polls Deribit REST every 15 s.
 */
export default function DeribitOptionsTable() {
  const [currency, setCurrency] = useState('BTC');
  const [options, setOptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedExpiry, setSelectedExpiry] = useState(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    async function fetchOptions() {
      try {
        const data = await deribitRest('public/get_book_summary_by_currency', {
          currency,
          kind: 'option',
        });
        if (cancelled) return;
        setOptions(data || []);
      } catch (_) {
        // keep stale data
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchOptions();
    const interval = setInterval(fetchOptions, 15_000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [currency]);

  // Derive sorted unique expiry list
  const expiries = useMemo(() => {
    const set = new Set();
    options.forEach(o => {
      const parsed = parseOption(o.instrument_name);
      if (parsed) set.add(parsed.expiry);
    });
    return [...set].sort(compareExpiry);
  }, [options]);

  // Auto-select first expiry when list changes
  useEffect(() => {
    if (expiries.length > 0 && (!selectedExpiry || !expiries.includes(selectedExpiry))) {
      setSelectedExpiry(expiries[0]);
    }
  }, [expiries, selectedExpiry]);

  // Build options chain: { [strike]: { call, put } }
  const chain = useMemo(() => {
    const map = {};
    options.forEach(o => {
      const parsed = parseOption(o.instrument_name);
      if (!parsed || parsed.expiry !== selectedExpiry) return;
      const { strike, type } = parsed;
      if (!map[strike]) map[strike] = { strike, call: null, put: null };
      if (type === 'C') map[strike].call = o;
      if (type === 'P') map[strike].put = o;
    });
    return Object.values(map).sort((a, b) => a.strike - b.strike);
  }, [options, selectedExpiry]);

  const expiryOptions = expiries.map(e => ({ value: e, label: e }));

  return (
    <Stack gap="md" pt="xs">
      <Group gap="md" wrap="wrap">
        <SegmentedControl
          value={currency}
          onChange={setCurrency}
          data={CURRENCIES}
          size="xs"
        />
        <Select
          value={selectedExpiry}
          onChange={setSelectedExpiry}
          data={expiryOptions}
          placeholder="انتخاب سررسید"
          size="xs"
          w={130}
          disabled={expiries.length === 0}
        />
        {loading && <Loader size="xs" />}
        {!loading && chain.length > 0 && (
          <Text size="xs" c="dimmed">{toPersianNum(chain.length)} استرایک</Text>
        )}
      </Group>

      {!loading && chain.length === 0 && (
        <Group justify="center" py="xl">
          <Text size="sm" c="dimmed">
            {selectedExpiry ? 'داده آپشن یافت نشد' : 'سررسید انتخاب کنید'}
          </Text>
        </Group>
      )}

      {chain.length > 0 && (
        <ScrollArea>
          <Table
            withColumnBorders
            withTableBorder
            highlightOnHover
            fz="xs"
            style={{ minWidth: 780 }}
          >
            <Table.Thead>
              <Table.Tr>
                {/* Call side */}
                <Table.Th ta="center" style={{ color: 'var(--mantine-color-green-6)' }}>OI کال</Table.Th>
                <Table.Th ta="center" style={{ color: 'var(--mantine-color-green-6)' }}>IV کال</Table.Th>
                <Table.Th ta="center" style={{ color: 'var(--mantine-color-green-6)' }}>Ask کال</Table.Th>
                <Table.Th ta="center" style={{ color: 'var(--mantine-color-green-6)' }}>Bid کال</Table.Th>
                {/* Strike center */}
                <Table.Th ta="center" fw={700}>استرایک</Table.Th>
                {/* Put side */}
                <Table.Th ta="center" style={{ color: 'var(--mantine-color-red-6)' }}>Bid پوت</Table.Th>
                <Table.Th ta="center" style={{ color: 'var(--mantine-color-red-6)' }}>Ask پوت</Table.Th>
                <Table.Th ta="center" style={{ color: 'var(--mantine-color-red-6)' }}>IV پوت</Table.Th>
                <Table.Th ta="center" style={{ color: 'var(--mantine-color-red-6)' }}>OI پوت</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {chain.map(row => (
                <Table.Tr key={row.strike}>
                  {/* Call side */}
                  <Table.Td ta="center">{fmtOI(row.call?.open_interest)}</Table.Td>
                  <Table.Td ta="center">{fmtIV(row.call?.mark_iv)}</Table.Td>
                  <Table.Td ta="center">{fmtPrice(row.call?.ask_price)}</Table.Td>
                  <Table.Td ta="center">{fmtPrice(row.call?.bid_price)}</Table.Td>
                  {/* Strike */}
                  <Table.Td ta="center">
                    <Badge variant="light" size="sm" radius="sm">
                      {toPersianNum(Number(row.strike).toLocaleString())}
                    </Badge>
                  </Table.Td>
                  {/* Put side */}
                  <Table.Td ta="center">{fmtPrice(row.put?.bid_price)}</Table.Td>
                  <Table.Td ta="center">{fmtPrice(row.put?.ask_price)}</Table.Td>
                  <Table.Td ta="center">{fmtIV(row.put?.mark_iv)}</Table.Td>
                  <Table.Td ta="center">{fmtOI(row.put?.open_interest)}</Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        </ScrollArea>
      )}
    </Stack>
  );
}
