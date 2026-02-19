import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { Alert, Badge, Group, Select, SegmentedControl } from '@mantine/core';
import RallyMainCard from '../../components/RallyMainCard';
import RallyDataTable from '../../components/RallyDataTable';
import RefreshButton from '../../components/RefreshButton';
import DataFreshness from '../../components/DataFreshness';
import PageHeader from '../../components/PageHeader';
import ExportButton from '../../components/ExportButton';
import usePagination from '../../hooks/usePagination';
import { formatNum } from '../../utils/formatUtils';

export default function IMEGenericPage({ config }) {
  const {
    endpoint,
    title,
    exportFilename,
    badgeLabel,
    columns,
    filters = [],
    extraBadges,
    pinLeftColumns,
    clientFilter,
  } = config;

  // Server-side filter state (sent as query params)
  const [filterValues, setFilterValues] = useState({});

  // Client-side filter state (e.g. certificates cert_type)
  const [clientFilterValue, setClientFilterValue] = useState(
    clientFilter?.defaultValue || null
  );

  // Build query string from server-side filters
  const queryString = useMemo(() => {
    const params = new URLSearchParams();
    filters.forEach((f) => {
      const val = filterValues[f.key];
      if (val) params.set(f.param, val);
    });
    const qs = params.toString();
    return qs ? `?${qs}` : '';
  }, [filterValues, filters]);

  const deps = useMemo(
    () => filters.map((f) => filterValues[f.key]),
    [filterValues, filters]
  );

  const { data: rawData = [], isLoading: loading, error: queryError, refetch: refresh, dataUpdatedAt } = useQuery({
    queryKey: [endpoint, ...deps],
    queryFn: () => axios.get(`${endpoint}${queryString}`).then(r => r.data),
    staleTime: 10 * 60 * 1000,
  });
  const error = queryError?.message || null;
  const lastUpdated = dataUpdatedAt ? new Date(dataUpdatedAt) : null;

  // Apply client-side filter if configured
  const data = useMemo(() => {
    if (!clientFilter || !clientFilterValue) return rawData;
    return clientFilter.filterFn(rawData, clientFilterValue);
  }, [rawData, clientFilter, clientFilterValue]);

  const { paged, page, setPage, perPage, setPerPage, totalRecords } = usePagination(data);

  // Derive dynamic options for Select filters
  const derivedOptions = useMemo(() => {
    const result = {};
    filters.forEach((f) => {
      if (f.deriveOptions) {
        result[f.key] = f.deriveOptions(rawData);
      }
    });
    return result;
  }, [rawData, filters]);

  if (error && !rawData.length) {
    return <Alert color="red" title="خطا">{error}</Alert>;
  }

  const handleFilterChange = (key, value) => {
    setFilterValues((prev) => ({ ...prev, [key]: value || null }));
    setPage(1);
  };

  return (
    <>
      <PageHeader title={title}>
        <DataFreshness lastUpdated={lastUpdated} />
        <ExportButton filename={exportFilename} columns={columns} records={data} />
      </PageHeader>

      <RallyMainCard mb="md" noPadding>
        <Group p="md" gap="md">
          {/* Client-side segmented filter (e.g. certificates cert_type) */}
          {clientFilter && (
            <SegmentedControl
              size="xs"
              value={clientFilterValue}
              onChange={(v) => { setClientFilterValue(v); setPage(1); }}
              data={clientFilter.data}
            />
          )}

          {/* Server-side Select filters */}
          {filters.map((f) => {
            const options = f.staticOptions
              ? f.staticOptions
              : (derivedOptions[f.key] || []).map((v) => ({ value: v, label: v }));

            return (
              <Select
                key={f.key}
                placeholder={f.placeholder}
                data={[{ value: '', label: 'همه' }, ...options]}
                value={filterValues[f.key] || ''}
                onChange={(v) => handleFilterChange(f.key, v)}
                clearable
                w={f.width}
                size="sm"
              />
            );
          })}

          <RefreshButton onRefreshComplete={refresh} />
          <Badge color="rally-green" variant="light">
            {formatNum(data.length)} {badgeLabel}
          </Badge>

          {/* Extra badges (e.g. call/put counts for options) */}
          {extraBadges && extraBadges(rawData).map((b, i) => (
            <Badge key={i} color={b.color} variant="light">{b.label}</Badge>
          ))}
        </Group>
      </RallyMainCard>

      <RallyMainCard noPadding>
        <RallyDataTable
          records={paged}
          columns={columns}
          loading={loading}
          pinLeftColumns={pinLeftColumns}
          page={page}
          onPageChange={setPage}
          recordsPerPage={perPage}
          onRecordsPerPageChange={setPerPage}
          totalRecords={totalRecords}
        />
      </RallyMainCard>
    </>
  );
}
