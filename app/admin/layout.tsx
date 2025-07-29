"use client";

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
    Users, 
    UploadCloud, 
    LayoutDashboard, 
    CheckSquare, 
    Database, 
    TestTube2,
    Bot 
} from 'lucide-react';

// Cấu hình các mục trong sidebar từ code của bạn
const sidebarNavItems = [
    {
        title: "Dashboard",
        href: "/admin",
        icon: <LayoutDashboard className="h-5 w-5" />,
    },
    {
        title: "Kiểm duyệt Q&A",
        href: "/admin/moderation",
        icon: <CheckSquare className="h-5 w-5" />,
    },
    {
        title: "Knowledge Base",
        href: "/admin/knowledge-base",
        icon: <Database className="h-5 w-5" />,
    },
    {
        title: "Quản lý người dùng",
        href: "/admin/users",
        icon: <Users className="h-5 w-5" />,
    },
    {
        title: "Quản lý Datasource",
        href: "/admin/datasources",
        icon: <UploadCloud className="h-5 w-5" />,
    },
    {
        title: "Báo cáo ảo giác",
        href: "/admin/hallucination-report",
        icon: <TestTube2 className="h-5 w-5" />,
    },
];

// Component Sidebar được tách riêng cho gọn gàng
function Sidebar() {
    const pathname = usePathname();

    return (
        <div className="flex flex-col w-64 h-full px-4 py-8 bg-white border-r dark:bg-gray-900 dark:border-gray-700 rounded-xl shadow-sm">
            {/* Logo và Tiêu đề */}
            <div className="flex items-center px-2 mb-10">
                <Bot className="h-8 w-8 mr-3 text-blue-600" />
                <h2 className="text-2xl font-semibold text-gray-800 dark:text-white">ZigAI Admin</h2>
            </div>
            
            {/* Các mục điều hướng */}
            <nav className="flex flex-col gap-2">
                {sidebarNavItems.map((item) => (
                    <Link
                        key={item.href}
                        href={item.href}
                        className={`flex items-center rounded-lg px-3 py-2 text-gray-600 transition-colors duration-200 transform dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 ${
                            // So sánh chính xác href hoặc href con
                            pathname === item.href || (item.href !== "/admin" && pathname.startsWith(item.href))
                            ? "bg-blue-100 text-blue-700 dark:bg-gray-800"
                            : "hover:text-gray-800 dark:hover:text-gray-200"
                        }`}
                    >
                        {item.icon}
                        <span className="ml-3 text-sm font-medium">{item.title}</span>
                    </Link>
                ))}
            </nav>
        </div>
    );
}

/**
 * Component Layout chính cho trang Admin.
 * Component này tạo ra một cấu trúc với sidebar cố định bên trái
 * và vùng nội dung chính có thể cuộn độc lập bên phải.
 */
export default function AdminLayout({ children }: { children: React.ReactNode }) {
    return (
        <div className="flex h-screen bg-gray-50 dark:bg-gray-900">
            {/* Sidebar - Cố định, không cuộn, với margin trái */}
            <aside className="hidden md:flex flex-shrink-0 py-8 pl-[5%]">
                <Sidebar />
            </aside>

            {/* Vùng nội dung chính - Có thể cuộn */}
            <div className="flex flex-col flex-1 overflow-hidden">
                <main className="relative flex-1 focus:outline-none overflow-y-auto">
                    <div className="py-8 px-4 md:px-10">
                        {/* Nội dung của từng trang con (bao gồm cả tiêu đề) sẽ được hiển thị ở đây */}
                        {children}
                    </div>
                </main>
            </div>
        </div>
    );
}
