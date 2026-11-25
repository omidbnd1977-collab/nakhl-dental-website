# کلینیک دندانپزشکی نخل — وب‌سایت عمومی

لندینگ فارسی RTL برای **دکتر صحرا عباسی** در کلینیک نخل قشم.

صفحهٔ اصلی سه بخش دارد (الهام‌گرفته از چیدمان YU.MED):

1. **Hero** — اسکراب اسکرول با فریم‌های فشردهٔ کلینیک + دکمه‌های تماس/رزرو  
2. **Services** — کارت‌های تصویری خدمات  
3. **Clinic Experience** — فضای کلینیک، پذیرش/اتاق درمان و اطلاعات واقعی  

ریشهٔ ریپو همان صفحهٔ اصلی است (`index.html`). فریم‌های هیرو به‌صورت تدریجی (نه همه با هم) لود می‌شوند تا صفحات GitHub سریع‌تر باز شوند.

## پیش‌نمایش

| میزبان | آدرس |
|---|---|
| GitHub Pages (نسخهٔ فعلی) | https://omidbnd1977-collab.github.io/nakhl-dental-website/ |
| Render (شاخهٔ refresh) | https://nakhl-dental-refresh.onrender.com/ |

اگر Render هنوز هیرو قدیمی (ویدیو/اسکرول) نشان می‌دهد، در [داشبورد Render](https://dashboard.render.com) سرویس `nakhl-dental-refresh` را باز کنید و **Manual Deploy → Deploy latest commit** بزنید (شاخهٔ `main` یا `design/nakhl-premium-refresh`). فایل `render.yaml` در ریشهٔ ریپو دستور اجرای صحیح (`0.0.0.0` + `PORT`) را تعریف می‌کند.

## اجرای محلی

```bash
git clone https://github.com/omidbnd1977-collab/nakhl-dental-website.git
cd nakhl-dental-website
python3 serve.py --port 3847
```

سپس `http://localhost:3847` را باز کنید.

## استقرار

هاست استاتیک (Cloudflare Pages / Netlify / Vercel / GitHub Pages) کافی است؛ ریشهٔ استقرار پوشه‌ای است که `index.html` دارد.

برای Render به‌صورت Web Service:

- **Build command:** خالی / `true`
- **Start command:** `python3 serve.py --host 0.0.0.0`
- متغیر `PORT` را Render خودش می‌گذارد

## تماس

- واتساپ: `09120153255` → https://wa.me/989120153255  
- تلفن: `07633388181` / `07633387171`  
- اینستاگرام: [@qeshm.clinic](https://instagram.com/qeshm.clinic)
