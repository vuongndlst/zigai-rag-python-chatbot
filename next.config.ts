// Nhập kiểu cấu hình Next.js để hỗ trợ kiểm tra kiểu (TypeScript)
import type { NextConfig } from "next";

// Định nghĩa cấu hình cho ứng dụng Next.js
const nextConfig: NextConfig = {
  // Bật chế độ kiểm tra nghiêm ngặt của React để cảnh báo các lỗi tiềm ẩn
  reactStrictMode: true,
};

// Xuất cấu hình để Next.js có thể sử dụng
export default nextConfig;
