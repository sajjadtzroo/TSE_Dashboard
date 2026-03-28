import {
  IconFlame,
  IconChartTreemap,
  IconScale,
  IconStar,
  IconChartLine,
  IconDroplet,
  IconDiamond,
  IconPlant,
  IconBarrel,
  IconAtom,
  IconMeat,
} from '@tabler/icons-react';

export const commodityMenuSections = [
  {
    label: 'بازار کالا',
    items: [
      { text: 'داشبورد', icon: IconFlame, path: '/commodity' },
      { text: 'نقشه بازار', icon: IconChartTreemap, path: '/commodity/heatmap' },
      { text: 'مقایسه', icon: IconScale, path: '/commodity/compare' },
      { text: 'دیده‌بان', icon: IconStar, path: '/commodity/watchlist' },
      { text: 'نمودار قیمت', icon: IconChartLine, path: '/commodity/charts' },
    ],
  },
  {
    label: 'انرژی',
    items: [
      { text: 'نفت برنت', icon: IconBarrel, path: '/commodity/BRENT' },
      { text: 'نفت خام WTI', icon: IconBarrel, path: '/commodity/WTI' },
      { text: 'گاز طبیعی', icon: IconDroplet, path: '/commodity/NATGAS' },
      { text: 'نفت گرمایشی', icon: IconDroplet, path: '/commodity/HEAT' },
      { text: 'بنزین', icon: IconDroplet, path: '/commodity/GASOLINE' },
    ],
  },
  {
    label: 'فلزات گرانبها',
    items: [
      { text: 'طلا', icon: IconDiamond, path: '/commodity/GOLD' },
      { text: 'نقره', icon: IconDiamond, path: '/commodity/SILVER' },
      { text: 'پلاتین', icon: IconDiamond, path: '/commodity/PLATINUM' },
      { text: 'پالادیوم', icon: IconDiamond, path: '/commodity/PALLADIUM' },
    ],
  },
  {
    label: 'فلزات صنعتی',
    items: [
      { text: 'مس', icon: IconAtom, path: '/commodity/COPPER' },
      { text: 'آلومینیوم', icon: IconAtom, path: '/commodity/ALUMINUM' },
      { text: 'سنگ‌آهن', icon: IconAtom, path: '/commodity/IRON_ORE' },
      { text: 'فولاد', icon: IconAtom, path: '/commodity/STEEL' },
      { text: 'روی', icon: IconAtom, path: '/commodity/ZINC' },
      { text: 'نیکل', icon: IconAtom, path: '/commodity/NICKEL' },
    ],
  },
  {
    label: 'کشاورزی',
    items: [
      { text: 'گندم', icon: IconPlant, path: '/commodity/WHEAT' },
      { text: 'ذرت', icon: IconPlant, path: '/commodity/CORN' },
      { text: 'سویا', icon: IconPlant, path: '/commodity/SOYBEAN' },
      { text: 'قهوه', icon: IconPlant, path: '/commodity/COFFEE' },
      { text: 'شکر', icon: IconPlant, path: '/commodity/SUGAR' },
      { text: 'پنبه', icon: IconPlant, path: '/commodity/COTTON' },
      { text: 'کاکائو', icon: IconPlant, path: '/commodity/COCOA' },
      { text: 'برنج', icon: IconPlant, path: '/commodity/RICE' },
    ],
  },
  {
    label: 'دام',
    items: [
      { text: 'گاو زنده', icon: IconMeat, path: '/commodity/CATTLE' },
      { text: 'خوک', icon: IconMeat, path: '/commodity/HOGS' },
    ],
  },
];
