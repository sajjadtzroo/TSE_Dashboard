import React, { useState, useMemo } from 'react';
import {
  Box,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TableSortLabel,
  Chip,
  IconButton,
  Tooltip,
} from '@mui/material';
import { OpenInNew } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import type { Bank } from '../../../types';

interface BanksTableViewProps {
  banks: Bank[];
}

type SortField = 'name' | 'category' | 'type' | 'loanCount';
type SortOrder = 'asc' | 'desc';

const BanksTableView: React.FC<BanksTableViewProps> = ({ banks }) => {
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');
  const navigate = useNavigate();

  // Sort banks
  const sortedBanks = useMemo(() => {
    const sorted = [...banks];

    sorted.sort((a, b) => {
      let comparison = 0;

      switch (sortField) {
        case 'name':
          comparison = a.nameFA.localeCompare(b.nameFA, 'fa');
          break;
        case 'category':
          const aCat = a.category === 'digital-banks' ? 'دیجیتال' : 'سنتی';
          const bCat = b.category === 'digital-banks' ? 'دیجیتال' : 'سنتی';
          comparison = aCat.localeCompare(bCat, 'fa');
          break;
        case 'type':
          comparison = (a.type || '').localeCompare(b.type || '', 'fa');
          break;
        case 'loanCount':
          comparison = (a.loansCount || 0) - (b.loansCount || 0);
          break;
        default:
          comparison = 0;
      }

      return sortOrder === 'asc' ? comparison : -comparison;
    });

    return sorted;
  }, [banks, sortField, sortOrder]);

  // Handle sort
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  // Get category color
  const getCategoryColor = (category: string): 'primary' | 'secondary' => {
    return category === 'digital-banks' ? 'primary' : 'secondary';
  };

  // Get category label
  const getCategoryLabel = (category: string): string => {
    return category === 'digital-banks' ? 'بانک دیجیتال' : 'بانک سنتی';
  };

  // Get type label
  const getTypeLabel = (type?: string): string => {
    if (!type) return '-';
    const typeMap: Record<string, string> = {
      'neobank': 'نئوبانک',
      'public': 'دولتی',
      'private': 'خصوصی',
      'semi-private': 'نیمه خصوصی',
    };
    return typeMap[type] || type;
  };

  // Handle row click
  const handleRowClick = (bankId: string) => {
    navigate(`/banks/${bankId}`);
  };

  return (
    <TableContainer component={Paper} sx={{ bgcolor: 'background.paper' }}>
      <Table sx={{ minWidth: 650 }} dir="rtl">
        <TableHead>
          <TableRow>
            <TableCell>
              <TableSortLabel
                active={sortField === 'name'}
                direction={sortField === 'name' ? sortOrder : 'asc'}
                onClick={() => handleSort('name')}
              >
                نام بانک
              </TableSortLabel>
            </TableCell>
            <TableCell align="center">
              <TableSortLabel
                active={sortField === 'category'}
                direction={sortField === 'category' ? sortOrder : 'asc'}
                onClick={() => handleSort('category')}
              >
                دسته‌بندی
              </TableSortLabel>
            </TableCell>
            <TableCell align="center">
              <TableSortLabel
                active={sortField === 'type'}
                direction={sortField === 'type' ? sortOrder : 'asc'}
                onClick={() => handleSort('type')}
              >
                نوع
              </TableSortLabel>
            </TableCell>
            <TableCell align="center">
              <TableSortLabel
                active={sortField === 'loanCount'}
                direction={sortField === 'loanCount' ? sortOrder : 'asc'}
                onClick={() => handleSort('loanCount')}
              >
                تعداد وام
              </TableSortLabel>
            </TableCell>
            <TableCell>وب‌سایت</TableCell>
            <TableCell align="center">عملیات</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {sortedBanks.map((bank) => (
            <TableRow
              key={bank.id}
              hover
              sx={{
                cursor: 'pointer',
                '&:last-child td, &:last-child th': { border: 0 }
              }}
              onClick={() => handleRowClick(bank.id)}
            >
              <TableCell component="th" scope="row">
                <Box sx={{ fontWeight: 'medium' }}>
                  {bank.nameFA}
                </Box>
                {bank.nameEN && (
                  <Box sx={{ fontSize: '0.75rem', color: 'text.secondary', mt: 0.5 }}>
                    {bank.nameEN}
                  </Box>
                )}
              </TableCell>
              <TableCell align="center">
                <Chip
                  label={getCategoryLabel(bank.category)}
                  color={getCategoryColor(bank.category)}
                  size="small"
                  variant="outlined"
                />
              </TableCell>
              <TableCell align="center">
                <Box sx={{ color: 'text.secondary' }}>
                  {getTypeLabel(bank.type)}
                </Box>
              </TableCell>
              <TableCell align="center">
                <Chip
                  label={bank.loansCount || 0}
                  color="default"
                  size="small"
                />
              </TableCell>
              <TableCell>
                {bank.website ? (
                  <Box
                    component="a"
                    href={bank.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    sx={{
                      color: 'primary.main',
                      textDecoration: 'none',
                      fontSize: '0.875rem',
                      '&:hover': {
                        textDecoration: 'underline',
                      },
                    }}
                  >
                    {bank.website.replace(/^https?:\/\//, '')}
                  </Box>
                ) : (
                  <Box sx={{ color: 'text.secondary' }}>-</Box>
                )}
              </TableCell>
              <TableCell align="center" onClick={(e) => e.stopPropagation()}>
                <Tooltip title="مشاهده جزئیات">
                  <IconButton
                    size="small"
                    onClick={() => handleRowClick(bank.id)}
                  >
                    <OpenInNew fontSize="small" />
                  </IconButton>
                </Tooltip>
              </TableCell>
            </TableRow>
          ))}
          {sortedBanks.length === 0 && (
            <TableRow>
              <TableCell colSpan={6} align="center">
                <Box sx={{ py: 3, color: 'text.secondary' }}>
                  هیچ بانکی یافت نشد
                </Box>
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </TableContainer>
  );
};

export default BanksTableView;
