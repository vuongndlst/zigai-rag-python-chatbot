import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  // `withAuth` sẽ tự động xử lý việc điều hướng người dùng chưa đăng nhập.
  // Chúng ta chỉ cần thêm logic kiểm tra vai trò (role) ở đây.
  function middleware(req) {
    const token = req.nextauth.token;
    const isAdminRoute = req.nextUrl.pathname.startsWith("/admin");

    // Nếu người dùng đang cố gắng truy cập vào trang admin
    // nhưng vai trò của họ không phải là 'admin',
    // hãy điều hướng họ về trang chủ.
    if (isAdminRoute && token?.role !== "admin") {
      return NextResponse.redirect(new URL("/", req.url));
    }
  },
  {
    callbacks: {
      // Callback này được gọi để quyết định xem người dùng có được
      // ủy quyền (authorized) hay không. Nếu trả về false, họ sẽ
      // bị điều hướng đến trang đăng nhập.
      authorized: ({ token }) => !!token, // Chỉ cần người dùng đã đăng nhập là được.
    },
  }
);

// Cấu hình này đảm bảo middleware sẽ chỉ chạy trên các đường dẫn
// được liệt kê, giúp tối ưu hiệu suất.
export const config = {
  matcher: [
    "/admin/:path*", // Bảo vệ tất cả các trang con của /admin
    "/",             // Bảo vệ trang chủ (yêu cầu đăng nhập)
    "/chat/:path*",  // Bảo vệ các trang chat (yêu cầu đăng nhập)
  ],
};
