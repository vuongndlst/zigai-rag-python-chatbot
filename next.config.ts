// Nhập kiểu cấu hình Next.js để hỗ trợ kiểm tra kiểu (TypeScript)
import type { NextConfig } from "next";

// Định nghĩa cấu hình cho ứng dụng Next.js
const nextConfig: NextConfig = {
  // Bật chế độ kiểm tra nghiêm ngặt của React để cảnh báo các lỗi tiềm ẩn
  reactStrictMode: true,

  // CẬP NHẬT: Thêm cấu hình cho Next/Image
  // Việc này cho phép ứng dụng của bạn tải hình ảnh một cách an toàn
  // từ các tên miền đã được chỉ định.
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
    ],
  },
};

// Xuất cấu hình để Next.js có thể sử dụng
export default nextConfig;
