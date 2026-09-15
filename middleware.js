import { NextResponse } from 'next/server';

// ضع الدومين الخاص بك هنا
const ALLOWED_DOMAIN = 'koralive.football';

export function middleware(req) {
  const url = req.nextUrl.clone();
  const userAgent = req.headers.get('user-agent') || '';
  const referer = req.headers.get('referer') || '';
  const origin = req.headers.get('origin') || '';
  const acceptLanguage = req.headers.get('accept-language');

  // 1. السماح لمحركات البحث بالمرور (SEO)
  const goodBots = ['googlebot', 'bingbot', 'yandex', 'duckduckbot', 'slurp'];
  const isGoodBot = goodBots.some(bot => userAgent.toLowerCase().includes(bot));
  if (isGoodBot) {
    return NextResponse.next();
  }

  // 2. حظر بوتات السكرايبينج والأدوات الآلية
  const badAgents = ['python', 'curl', 'wget', 'scraper', 'headless', 'puppeteer', 'selenium', 'phantomjs', 'playwright'];
  const isBadAgent = badAgents.some(bot => userAgent.toLowerCase().includes(bot));
  
  if (isBadAgent || userAgent.length < 10) {
    return new NextResponse('Access Denied - Automated traffic detected', { status: 403 });
  }

  // 3. التحقق من البشر (المتصفح الحقيقي يرسل لغة)
  if (!acceptLanguage) {
    return new NextResponse('Access Denied - Invalid browser', { status: 403 });
  }

  // 4. قفل الدومين (Domain Locking) لروابط الفريم والـ API
  // نطبق هذا بصرامة على الفريم وروابط البث لمنع سرقتها لمواقع أخرى
  if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/embed')) {
    const isTrustedReferer = referer.includes(ALLOWED_DOMAIN);
    const isTrustedOrigin = origin.includes(ALLOWED_DOMAIN);

    // إذا كان هناك Referer أو Origin ولكنه لا يطابق الدومين الخاص بك، اطرده فوراً
    if ((referer && !isTrustedReferer) || (origin && !isTrustedOrigin)) {
      return new NextResponse('Forbidden: Stream is locked to ' + ALLOWED_DOMAIN, { status: 403 });
    }
  }

  // إذا اجتاز كل الفحوصات، اسمح له بالمرور
  return NextResponse.next();
}

// 5. تحديد المسارات التي سيتم تطبيق هذه الحماية عليها
export const config = {
  matcher: [
    '/watch/:path*',
    '/embed/:path*',
    '/api/:path*'
  ]
};
