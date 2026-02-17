# Iranian Banks Data - S3 Optimized Structure

## Overview

This folder structure is optimized for AWS S3 object storage, following best practices for:
- **S3-friendly naming**: lowercase, kebab-case, no spaces or special characters
- **Flat hierarchy**: efficient for S3 prefix-based queries
- **Bilingual support**: English IDs with Persian display names in metadata

---

## Folder Structure

```
banks-s3-organized/
├── index.json                    # Main index with all banks and loans
├── README.md                     # This documentation
│
├── traditional-banks/            # بانک‌های سنتی
│   ├── bank-day/                 # بانک دی
│   │   └── loans/
│   │       ├── mahan-plan/       # طرح ماهان دی
│   │       └── business-plan/    # طرح کسب و کار
│   │
│   ├── bank-saderat/             # بانک صادرات
│   │   └── loans/
│   │       ├── jari-talaei/      # جاری طلایی دو
│   │       ├── misagh/           # میثاق
│   │       ├── saba-sepehr-pos/  # صبای سپهر (پایانه فروش)
│   │       ├── sana/             # سنا
│   │       ├── sana-2/           # سنا ۲
│   │       ├── hamyaran-sepehr/  # همیاران سپهر
│   │       ├── sepas-sepehr/     # سپاس سپهر
│   │       ├── timche/           # تیمچه
│   │       └── kharid-kala/      # خرید کالا
│   │
│   ├── bank-meli/                # بانک ملی
│   │   └── loans/
│   │       ├── kargoshaei/       # طرح کارگشای ملی
│   │       ├── mehrabani/        # مهربانی ملی
│   │       ├── etebar-meli/      # طرح اعتبار ملی
│   │       ├── tasahilat-tarjihi/# تسهیلات با نرخ ترجیحی
│   │       └── paziraneh/        # وام پذیرنه ملی
│   │
│   ├── bank-tosee-saderat/       # بانک توسعه صادرات
│   │   └── loans/
│   │       └── eshtegalzaei/     # اشتغال زایی
│   │
│   ├── bank-pasargad/            # بانک پاسارگاد
│   │   └── loans/
│   │       ├── arzan-gheimat/    # ارزان قیمت
│   │       ├── ipg-pos/          # مبتنی بر مراوده
│   │       └── cap-card/         # کاپ کارت
│   │
│   ├── bank-karafarin/           # بانک کارآفرین
│   │   └── loans/
│   │       ├── nik-afarin-plus/  # نیک آفرین پلاس
│   │       ├── kara-personnel/   # کارا (ویژه پرسنل)
│   │       ├── hamyaran-sabz/    # همیاران سبز
│   │       ├── saba-personnel/   # صبا (پرسنل شرکتها)
│   │       └── omid-afarin/      # امید آفرین
│   │
│   ├── bank-parsian/             # بانک پارسیان
│   │   └── loans/
│   │       ├── pars-vam/         # پارس وام
│   │       ├── pezhvak/          # پژواک
│   │       ├── navid/            # نوید
│   │       ├── kharid-mahal-kar/ # خرید محل کار
│   │       ├── danesh-bonian/    # شرکت های دانش بنیان
│   │       └── kharid-kala/      # خرید کالا
│   │
│   └── bank-iran-zamin/          # بانک ایران زمین
│       └── loans/
│           ├── kalayar/          # طرح کالایار
│           ├── rahkar/           # طرح راهکار
│           ├── kargozaran/       # طرح کارگزاران
│           ├── forsat/           # طرح فرصت
│           ├── toloo/            # طرح طلوع
│           ├── faraz/            # طرح فراز
│           ├── kara/             # طرح کارا
│           ├── rahgosha/         # طرح راهگشا
│           └── kar-nik/          # طرح کار نیک
│
└── digital-banks/                # بانک‌های دیجیتال
    ├── weepod/                   # ویپاد
    ├── blue-bank/                # بلوبانک
    ├── sepino/                   # سپینو
    │   └── loans/
    │       └── nitro/            # وام نیترو
    ├── bankino/                  # بانکینو
    │   └── loans/
    │       ├── vamino-monthly/   # وامینو یک ماهه
    │       └── vamino-installment/# وامینو اقساطی
    ├── neshan-bank/              # نشان بانک
    ├── qbank/                    # کیوبانک
    └── hi-bank/                  # های بانک
```

---

## S3 Upload Commands

### Using AWS CLI

```bash
# Set your bucket name
BUCKET="your-bucket-name"

# Upload entire structure
aws s3 sync ./banks-s3-organized s3://$BUCKET/banks/ --exclude ".DS_Store"

# Upload specific bank
aws s3 sync ./banks-s3-organized/traditional-banks/bank-saderat s3://$BUCKET/banks/traditional-banks/bank-saderat/

# List all files
aws s3 ls s3://$BUCKET/banks/ --recursive
```

### Using TypeScript/JavaScript SDK

```typescript
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import * as fs from "fs";
import * as path from "path";

const s3Client = new S3Client({ region: "me-south-1" });

async function uploadFile(filePath: string, s3Key: string) {
  const fileContent = fs.readFileSync(filePath);
  await s3Client.send(new PutObjectCommand({
    Bucket: "your-bucket-name",
    Key: `banks/${s3Key}`,
    Body: fileContent,
  }));
}
```

---

## Naming Conventions

| Original (Persian)         | S3-Friendly ID        |
|---------------------------|----------------------|
| بانک دی                    | bank-day             |
| بانک صادرات                | bank-saderat         |
| بانک ملی                   | bank-meli            |
| بانک پاسارگاد              | bank-pasargad        |
| بانک پارسیان              | bank-parsian         |
| بانک کارآفرین             | bank-karafarin       |
| بانک ایران زمین           | bank-iran-zamin      |
| بانک توسعه صادرات         | bank-tosee-saderat   |
| ویپاد                     | weepod               |
| بلوبانک                   | blue-bank            |
| سپینو                     | sepino               |
| بانکینو                   | bankino              |
| نشان بانک                 | neshan-bank          |
| کیوبانک                   | qbank                |
| های بانک                  | hi-bank              |

---

## Statistics

- **Total Banks**: 15
  - Traditional Banks: 8
  - Digital Banks: 7
- **Total Loan Products**: 43

---

## File Types Expected in Each Loan Folder

```
loans/{loan-id}/
├── metadata.json      # Loan details, rates, requirements
├── link.txt           # Source URL
├── data.txt           # Additional data
├── *.png / *.jpg      # Screenshots, tables
├── *.pdf              # Brochures, documents
└── *.jpeg             # Info graphics
```

---

## Migration from Old Structure

To migrate files from the old structure to this new S3-optimized structure:

```bash
# Example: Copy files from old "طرح ماهان دی" to new "mahan-plan"
cp -r "bank/day(تمامی وام ها)/طرح ماهان دی/"* banks-s3-organized/traditional-banks/bank-day/loans/mahan-plan/
```

---

## Contact

Created: 2026-02-02
Structure Version: 1.0.0
