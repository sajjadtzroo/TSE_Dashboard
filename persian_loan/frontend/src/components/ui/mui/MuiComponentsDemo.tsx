/**
 * MUI Components Demo
 * Demonstrates all MUI-based UI components with visual consistency testing
 */

import { useState } from 'react';
import { Stack, Box, Typography, Divider, Chip, Badge as MuiBadge, Tooltip as MuiTooltip } from '@mui/material';
import { InfoIcon, CheckCircle2 } from 'lucide-react';
import { Badge, Tooltip, TagChip, FilterChip, RecommendationChip } from '../index';
import { Card } from '../Card';

export function MuiComponentsDemo() {
  const [selectedFilters, setSelectedFilters] = useState<string[]>(['traditional']);

  const handleFilterToggle = (filter: string) => {
    setSelectedFilters((prev) =>
      prev.includes(filter)
        ? prev.filter((f) => f !== filter)
        : [...prev, filter]
    );
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <Typography variant="h3" component="h1" gutterBottom>
        MUI Components Demo
      </Typography>
      <Typography variant="body2" color="text.secondary" paragraph>
        Testing visual consistency of MUI-based components with dark theme
      </Typography>

      <Divider sx={{ my: 4 }} />

      {/* Badge Components */}
      <Card className="mb-6">
        <Typography variant="h5" gutterBottom>
          Badge Component (MUI Chip-based)
        </Typography>
        <Typography variant="body2" color="text.secondary" paragraph>
          Our Badge component now uses MUI Chip with custom color variants
        </Typography>

        <Box sx={{ mb: 3 }}>
          <Typography variant="subtitle2" gutterBottom>
            Small Size:
          </Typography>
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
            <Badge variant="blue" size="sm">Blue Badge</Badge>
            <Badge variant="green" size="sm">Green Badge</Badge>
            <Badge variant="yellow" size="sm">Yellow Badge</Badge>
            <Badge variant="purple" size="sm">Purple Badge</Badge>
            <Badge variant="red" size="sm">Red Badge</Badge>
            <Badge variant="gray" size="sm">Gray Badge</Badge>
          </Stack>
        </Box>

        <Box sx={{ mb: 3 }}>
          <Typography variant="subtitle2" gutterBottom>
            Medium Size:
          </Typography>
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
            <Badge variant="blue" size="md">Blue Badge</Badge>
            <Badge variant="green" size="md">Green Badge</Badge>
            <Badge variant="yellow" size="md">Yellow Badge</Badge>
            <Badge variant="purple" size="md">Purple Badge</Badge>
            <Badge variant="red" size="md">Red Badge</Badge>
            <Badge variant="gray" size="md">Gray Badge</Badge>
          </Stack>
        </Box>
      </Card>

      {/* Tooltip Component */}
      <Card className="mb-6">
        <Typography variant="h5" gutterBottom>
          Tooltip Component (MUI Tooltip with Popper)
        </Typography>
        <Typography variant="body2" color="text.secondary" paragraph>
          Better positioning with MUI Popper and theme-aware styling
        </Typography>

        <Stack direction="row" spacing={3} flexWrap="wrap" useFlexGap>
          <Tooltip content="Tooltip on top" position="top">
            <button className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-500">
              Top Tooltip
            </button>
          </Tooltip>

          <Tooltip content="Tooltip on bottom" position="bottom">
            <button className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-500">
              Bottom Tooltip
            </button>
          </Tooltip>

          <Tooltip content="Tooltip on left" position="left">
            <button className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-500">
              Left Tooltip
            </button>
          </Tooltip>

          <Tooltip content="Tooltip on right" position="right">
            <button className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-500">
              Right Tooltip
            </button>
          </Tooltip>

          <MuiTooltip title="Direct MUI Tooltip" arrow>
            <button className="px-4 py-2 bg-secondary-600 text-black rounded-lg hover:bg-secondary-500">
              Direct MUI
            </button>
          </MuiTooltip>
        </Stack>
      </Card>

      {/* Tag Chips */}
      <Card className="mb-6">
        <Typography variant="h5" gutterBottom>
          Tag Chips (for Loan Cards)
        </Typography>
        <Typography variant="body2" color="text.secondary" paragraph>
          Use in loan cards for categories and features
        </Typography>

        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
          <TagChip label="بدون ضامن" color="success" />
          <TagChip label="نرخ سود پایین" color="primary" />
          <TagChip label="تسهیلات سریع" color="warning" />
          <TagChip label="وام مسکن" color="default" />
          <TagChip label="وام خودرو" color="default" />
        </Stack>
      </Card>

      {/* Filter Chips */}
      <Card className="mb-6">
        <Typography variant="h5" gutterBottom>
          Filter Chips (for Tables)
        </Typography>
        <Typography variant="body2" color="text.secondary" paragraph>
          Use in tables and filter bars for active filters
        </Typography>

        <Box sx={{ mb: 2 }}>
          <Typography variant="subtitle2" gutterBottom>
            Filter Options:
          </Typography>
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
            <FilterChip
              label="بانک‌های سنتی"
              selected={selectedFilters.includes('traditional')}
              onClick={() => handleFilterToggle('traditional')}
              onDelete={selectedFilters.includes('traditional') ? () => handleFilterToggle('traditional') : undefined}
            />
            <FilterChip
              label="بانک‌های دیجیتال"
              selected={selectedFilters.includes('digital')}
              onClick={() => handleFilterToggle('digital')}
              onDelete={selectedFilters.includes('digital') ? () => handleFilterToggle('digital') : undefined}
            />
            <FilterChip
              label="بدون ضامن"
              selected={selectedFilters.includes('no-guarantor')}
              onClick={() => handleFilterToggle('no-guarantor')}
              onDelete={selectedFilters.includes('no-guarantor') ? () => handleFilterToggle('no-guarantor') : undefined}
            />
          </Stack>
        </Box>

        {selectedFilters.length > 0 && (
          <Box>
            <Typography variant="subtitle2" gutterBottom>
              Active Filters: {selectedFilters.length}
            </Typography>
            <Chip
              label="پاک کردن همه فیلترها"
              color="error"
              variant="outlined"
              size="small"
              onClick={() => setSelectedFilters([])}
            />
          </Box>
        )}
      </Card>

      {/* Recommendation Chips */}
      <Card className="mb-6">
        <Typography variant="h5" gutterBottom>
          Recommendation Chips
        </Typography>
        <Typography variant="body2" color="text.secondary" paragraph>
          Use for highlighting special loans or recommendations
        </Typography>

        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
          <RecommendationChip label="بهترین نرخ" type="best" />
          <RecommendationChip label="پیشنهاد ویژه" type="recommended" />
          <RecommendationChip label="ویژه" type="featured" />
          <RecommendationChip label="جدید" type="new" />
        </Stack>
      </Card>

      {/* Native MUI Badge */}
      <Card className="mb-6">
        <Typography variant="h5" gutterBottom>
          Native MUI Badge (Notification Badge)
        </Typography>
        <Typography variant="body2" color="text.secondary" paragraph>
          Use for notification counts and status indicators
        </Typography>

        <Stack direction="row" spacing={3} alignItems="center">
          <MuiBadge badgeContent={4} color="primary">
            <InfoIcon className="w-6 h-6 text-gray-300" />
          </MuiBadge>

          <MuiBadge badgeContent={12} color="secondary">
            <InfoIcon className="w-6 h-6 text-gray-300" />
          </MuiBadge>

          <MuiBadge badgeContent={99} color="error">
            <InfoIcon className="w-6 h-6 text-gray-300" />
          </MuiBadge>

          <MuiBadge variant="dot" color="success">
            <CheckCircle2 className="w-6 h-6 text-gray-300" />
          </MuiBadge>
        </Stack>
      </Card>

      {/* Native MUI Chips */}
      <Card className="mb-6">
        <Typography variant="h5" gutterBottom>
          Native MUI Chips (Various Styles)
        </Typography>
        <Typography variant="body2" color="text.secondary" paragraph>
          Direct MUI Chip components for reference
        </Typography>

        <Box sx={{ mb: 2 }}>
          <Typography variant="subtitle2" gutterBottom>
            Filled Chips:
          </Typography>
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
            <Chip label="Primary" color="primary" />
            <Chip label="Secondary" color="secondary" />
            <Chip label="Success" color="success" />
            <Chip label="Error" color="error" />
            <Chip label="Warning" color="warning" />
            <Chip label="Default" />
          </Stack>
        </Box>

        <Box>
          <Typography variant="subtitle2" gutterBottom>
            Outlined Chips:
          </Typography>
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
            <Chip label="Primary" color="primary" variant="outlined" />
            <Chip label="Secondary" color="secondary" variant="outlined" />
            <Chip label="Success" color="success" variant="outlined" />
            <Chip label="Error" color="error" variant="outlined" />
            <Chip label="Warning" color="warning" variant="outlined" />
            <Chip label="Default" variant="outlined" />
          </Stack>
        </Box>
      </Card>
    </div>
  );
}

export default MuiComponentsDemo;
