/**
 * MUI Chip Examples and Utilities
 *
 * This file demonstrates how to use MUI Chip for:
 * - Tags in loan cards
 * - Filters in tables
 * - Recommendation badges
 */

import { Chip, Stack } from '@mui/material';
import { Check } from 'lucide-react';

/**
 * Tag Chip - For use in loan cards and bank cards
 * Example: Category tags, feature tags
 */
export function TagChip({
  label,
  color = 'default',
  onClick,
}: {
  label: string;
  color?: 'primary' | 'secondary' | 'error' | 'warning' | 'success' | 'default';
  onClick?: () => void;
}) {
  return (
    <Chip
      label={label}
      color={color}
      size="small"
      variant="outlined"
      onClick={onClick}
      sx={{
        fontWeight: 500,
        fontSize: '0.75rem',
      }}
    />
  );
}

/**
 * Filter Chip - For use in tables and filter bars
 * Example: Active filters, selected categories
 */
export function FilterChip({
  label,
  selected = false,
  onDelete,
  onClick,
}: {
  label: string;
  selected?: boolean;
  onDelete?: () => void;
  onClick?: () => void;
}) {
  return (
    <Chip
      label={label}
      color={selected ? 'primary' : 'default'}
      variant={selected ? 'filled' : 'outlined'}
      onClick={onClick}
      onDelete={onDelete}
      deleteIcon={selected ? <Check className="w-4 h-4" /> : undefined}
      size="small"
      sx={{
        fontWeight: 500,
        ...(selected && {
          backgroundColor: 'rgba(187, 134, 252, 0.2)',
          borderColor: '#BB86FC',
        }),
      }}
    />
  );
}

/**
 * Recommendation Badge Chip
 * Example: "Best Rate", "No Guarantor", "Recommended"
 */
export function RecommendationChip({
  label,
  type = 'best',
}: {
  label: string;
  type?: 'best' | 'recommended' | 'featured' | 'new';
}) {
  const colorMap = {
    best: 'success' as const,
    recommended: 'primary' as const,
    featured: 'warning' as const,
    new: 'secondary' as const,
  };

  return (
    <Chip
      label={label}
      color={colorMap[type]}
      variant="outlined"
      size="small"
      sx={{
        fontWeight: 600,
        fontSize: '0.75rem',
        borderWidth: '1.5px',
      }}
    />
  );
}

/**
 * Example: Chip group for loan card tags
 */
export function LoanCardTags({
  hasGuarantor,
  category,
  isRecommended
}: {
  hasGuarantor: boolean;
  category?: string;
  isRecommended?: boolean;
}) {
  return (
    <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
      {!hasGuarantor && (
        <TagChip label="بدون ضامن" color="success" />
      )}
      {category && (
        <TagChip label={category} color="default" />
      )}
      {isRecommended && (
        <RecommendationChip label="پیشنهاد ویژه" type="recommended" />
      )}
    </Stack>
  );
}

/**
 * Example: Filter chips for table filtering
 */
export function TableFilterChips({
  filters,
  onRemoveFilter,
  onClearAll,
}: {
  filters: Array<{ id: string; label: string }>;
  onRemoveFilter: (id: string) => void;
  onClearAll: () => void;
}) {
  if (filters.length === 0) return null;

  return (
    <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
      {filters.map((filter) => (
        <FilterChip
          key={filter.id}
          label={filter.label}
          selected
          onDelete={() => onRemoveFilter(filter.id)}
        />
      ))}
      {filters.length > 1 && (
        <Chip
          label="پاک کردن همه"
          variant="outlined"
          size="small"
          onClick={onClearAll}
          color="error"
          sx={{ fontWeight: 500 }}
        />
      )}
    </Stack>
  );
}

export default {
  TagChip,
  FilterChip,
  RecommendationChip,
  LoanCardTags,
  TableFilterChips,
};
