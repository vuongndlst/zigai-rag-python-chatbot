import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  // `withAuth` sẽ tự động xử lý việc điều hướng người dùng chưa đăng nhập.
  // Chúng ta chỉ cần thêm logic kiểm tra vai trò (role) ở đây.
  function middleware(req) {
    const token = req.nextauth.token;
    const pathname = req.nextUrl.pathname;

    const isAdmin = token?.role === "admin";
    const isAdminRoute = pathname.startsWith("/admin");
    // Trang chat bao gồm trang chủ ("/") và các trang con của nó
    const isChatRoute = pathname === "/" || pathname.startsWith("/chat");

    // Nếu người dùng không phải admin nhưng cố gắng truy cập trang admin,
    // điều hướng họ về trang chủ.
    if (isAdminRoute && !isAdmin) {
      return NextResponse.redirect(new URL("/", req.url));
    }

    // CẬP NHẬT: Nếu người dùng là admin nhưng đang ở trang chat,
    // tự động điều hướng họ về trang admin.
    if (isChatRoute && isAdmin) {
        return NextResponse.redirect(new URL("/admin", req.url));
    }

    // Cho phép các yêu cầu khác đi qua
    return NextResponse.next();
  },
  {
    callbacks: {
      // Callback này chỉ yêu cầu người dùng phải đăng nhập để truy cập
      // các trang trong `matcher`. Logic phân quyền chi tiết được xử lý ở trên.
      authorized: ({ token }) => !!token,
    },
  }
);

// Cấu hình này đảm bảo middleware sẽ chỉ chạy trên các đường dẫn cần bảo vệ.
export const config = {
  matcher: [
    "/admin/:path*", // Bảo vệ tất cả các trang con của /admin
    "/",             // Bảo vệ trang chủ
    "/chat/:path*",  // Bảo vệ các trang chat
  ],
};
