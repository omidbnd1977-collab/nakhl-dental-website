# کلینیک دندانپزشکی نخل — وب‌سایت عمومی

لندینگ فارسی RTL برای **دکتر صحرا عباسی** در کلینیک نخل قشم.

این پروژه یک **وب‌سایت استاتیک عمومی** است (نه داشبورد و نه اپ لاگین‌دار): ریشه ریپو همان صفحهٔ اصلی است (`index.html`).

هیرو: اسکراب سینمایی با GSAP ScrollTrigger روی `assets/videos/clinic-tour.mp4` (تمام‌صفحه، pin شده، بدون autoplay). `progress` مستقیماً به `video.currentTime` نگاشت می‌شود.

## اجرای محلی

```bash
python3 serve.py --port 3847
```

سپس `http://localhost:3847` را باز کنید. سرور محلی از HTTP Range پشتیبانی می‌کند.

## نوع استقرار (Deployment type)

| گزینه | مناسب برای | لاگین؟ | دامنه سفارشی |
|---|---|---|---|
| **هاست استاتیک** (پیشنهادی): Cloudflare Pages / Netlify / Vercel / GitHub Pages | وب‌سایت عمومی کلینیک | خیر | بله (`nakhl-dental.com`) |
| Cursor Apps با **Public** | پیش‌نمایش سریع روی لینک Cursor | خیر | خیر (مستند نشده) |
| Cursor Apps با **Private/Team** | فقط خودتان/تیم | بله (صفحه ورود Cursor) | خیر |

برای سایت واقعی کلینیک، **هاست استاتیک + دامنه خودتان** را انتخاب کنید. ریشه استقرار باید پوشهٔ همین پروژه باشد (همان جایی که `index.html` هست).

## اتصال دامنه سفارشی (مثلاً `nakhl-dental.com`)

### ۱) استقرار روی Cloudflare Pages (پیشنهادی)

1. در [Cloudflare Dashboard](https://dash.cloudflare.com) → **Workers & Pages** → **Create** → **Pages** → اتصال به ریپوی `nakhl-dental`.
2. تنظیمات بیلد:
   - **Framework preset:** None / Static
   - **Build command:** خالی
   - **Build output directory:** `/` (ریشه پروژه)
3. Deploy کنید. یک آدرس موقت مثل `*.pages.dev` می‌گیرید.

### ۲) اتصال `nakhl-dental.com`

1. دامنه را در Cloudflare ثبت/منتقل کنید (یا DNS را به Cloudflare بدهید).
2. در پروژهٔ Pages → **Custom domains** → `nakhl-dental.com` و در صورت نیاز `www.nakhl-dental.com` را اضافه کنید.
3. DNS معمولاً این‌طور تنظیم می‌شود (Cloudflare خودش پیشنهاد می‌دهد):
   - `@` → CNAME به آدرس Pages شما (یا A/AAAA طبق راهنمای Cloudflare)
   - `www` → CNAME به همان پروژهٔ Pages
4. SSL/HTTPS به‌صورت خودکار فعال می‌شود.

### جایگزین‌ها

- **Netlify:** New site from Git → publish directory = `.` → Domain management → Add custom domain.
- **Vercel:** Import repo → Framework = Other → Output = `.` → Domains → Add `nakhl-dental.com` و رکوردهای DNS را طبق پنل ست کنید.

## تماس

- واتساپ: `09120153255`
- تلفن: `07633388181` / `07633387171`
- اینستاگرام: [@qeshm.clinic.nakhl](https://instagram.com/qeshm.clinic.nakhl)
