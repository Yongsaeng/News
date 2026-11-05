import { NextResponse, type NextRequest } from "next/server";

/**
 * SITE_PASSWORD が設定されているときだけ、ベーシック認証でサイト全体を保護する。
 * ユーザー名は何でもよく、パスワードだけを確認する。
 * ローカルで SITE_PASSWORD を設定しなければ認証なしで開ける。
 */
export function middleware(req: NextRequest) {
  const password = process.env.SITE_PASSWORD;
  if (!password) return NextResponse.next();

  const auth = req.headers.get("authorization");
  if (auth?.startsWith("Basic ")) {
    const decoded = atob(auth.slice(6));
    const given = decoded.slice(decoded.indexOf(":") + 1);
    if (given === password) return NextResponse.next();
  }
  return new NextResponse("認証が必要です", {
    status: 401,
    headers: { "WWW-Authenticate": 'Basic realm="Morning Brief", charset="UTF-8"' },
  });
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest|icon-|apple-icon).*)"],
};
