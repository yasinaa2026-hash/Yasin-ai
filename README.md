# Yasin AI

تطبيق Web App أصلي باسم **Yasin AI**، مبني بـ HTML/CSS/JavaScript + Node.js/Express، مع Backend صغير لحماية مفاتيح API ودعم Streaming لمزودات OpenAI-compatible.

## التشغيل

يتطلب Node.js حديثًا.

```bash
npm install
cp .env.example .env
npm start
```

ثم افتح:

`http://localhost:3000`

على Windows يمكن نسخ `.env.example` إلى `.env` يدويًا.

## ربط مزود AI

عدّل `.env`:

```env
AI_PROVIDER=openai-compatible
AI_API_KEY=ضع_المفتاح_هنا
AI_API_URL=https://api.openai.com/v1/chat/completions
AI_MODEL=ضع_اسم_النموذج_هنا
```

لا تضع المفتاح في `public/` أو JavaScript الخاص بالمتصفح أو LocalStorage.

إذا بقيت القيم فارغة، يعمل المشروع في **Demo Mode** ويستخدم Mock Response واضحًا.

## البنية

```text
yasin-ai/
├─ public/
│  ├─ index.html
│  ├─ css/style.css
│  └─ js/
│     ├─ app.js
│     ├─ api.js
│     ├─ markdown.js
│     ├─ storage.js
│     └─ ui.js
├─ services/
│  ├─ provider.js
│  └─ providers/
│     └─ openai-compatible.js
├─ .env.example
├─ package.json
├─ server.js
└─ README.md
```

## ما تم تنفيذه

- واجهة Yasin AI أصلية Responsive.
- Light/Dark/System أساسًا.
- محادثات متعددة محفوظة في LocalStorage.
- إنشاء/حذف/فتح المحادثات.
- البحث في المحادثات.
- Markdown مبسط.
- Code Blocks مع Copy.
- Regenerate / Edit / Share / Copy.
- Streaming عبر SSE من Backend.
- Stop generating.
- Demo Mode واضح.
- Backend لا يكشف API Key للمتصفح.
- Rate limiting وHelmet.
- إعدادات Temperature وطول الاستجابة.
- اختصارات لوحة المفاتيح.
- دعم عربي RTL مع أساس متعدد اللغات.
- اختيار نماذج قابل للتوسع.
- بنية Provider/Adapter قابلة لإضافة مزودات أخرى.

## الملفات والصور

الواجهة تعرض أسماء وأحجام الملفات قبل الإرسال، لكن هذا الإصدار لا يدّعي تحليل PDF/DOCX/صور بدون Provider يدعمها.

لتنفيذ تحليل ملفات حقيقي في الإنتاج، أضف Backend File Service يتعامل مع:
- التحقق من MIME/type.
- حدود الحجم.
- تخزين مؤقت آمن.
- استخراج النص عند الحاجة.
- Vision/File APIs للمزود الذي تختاره.

## قاعدة البيانات والحسابات

هذا الإصدار يستخدم LocalStorage للتجربة. لإنتاج حقيقي، يمكن استبدال طبقة التخزين بـ PostgreSQL/Supabase/Firebase/MongoDB وإضافة Authentication وAuthorization.

## النشر

لأن مفتاح API موجود في Backend، لا يُنصح بنشر هذا الإصدار كملفات GitHub Pages فقط. استخدم استضافة تدعم Node.js/serverless functions أو افصل:
- Frontend static hosting
- Backend API hosting

وضبط Environment Variables من لوحة الاستضافة.

## ملاحظة أمنية

لا تسجل مفاتيح API في Console، ولا تحفظها في LocalStorage، ولا تضعها في ملفات `public`. أضف CORS/CSRF وسياسات جلسات مناسبة عند إضافة تسجيل الدخول والحسابات الحقيقية.