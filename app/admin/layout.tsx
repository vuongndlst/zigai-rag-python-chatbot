"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Users, UploadCloud, LayoutDashboard, CheckSquare, Database } from "lucide-react";

// Cấu hình các mục trong sidebar
const sidebarNavItems = [
  {
    title: "Dashboard",
    href: "/admin",
    icon: <LayoutDashboard className="h-4 w-4" />,
  },
  {
    title: "Kiểm duyệt Q&A",
    href: "/admin/moderation",
    icon: <CheckSquare className="h-4 w-4" />,
  },
  {
    title: "Knowledge Base",
    href: "/admin/knowledge-base",
    icon: <Database className="h-4 w-4" />,
  },
  {
    title: "Quản lý người dùng",
    href: "/admin/users",
    icon: <Users className="h-4 w-4" />,
  },
  {
    title: "Quản lý Datasource",
    href: "/admin/datasources",
    icon: <UploadCloud className="h-4 w-4" />,
  },
];

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div className="container mx-auto py-10">
        <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2">Bảng điều khiển Admin</h1>
            <p className="text-muted-foreground">Quản lý hệ thống ZigAI.</p>
        </div>
        
        {/* Container chính cho sidebar và nội dung */}
        <div className="flex flex-col gap-8 md:flex-row md:gap-12">
            {/* Sidebar */}
            <aside className="md:w-1/5 lg:w-1/6">
                <nav className="flex flex-row gap-2 overflow-x-auto md:flex-col md:gap-1">
                    {sidebarNavItems.map((item) => (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={`inline-flex items-center whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground ${
                                pathname === item.href
                                ? "bg-accent text-accent-foreground"
                                : "text-muted-foreground"
                            }`}
                        >
                            {item.icon}
                            <span className="ml-2">{item.title}</span>
                        </Link>
                    ))}
                </nav>
            </aside>

            {/* Khu vực nội dung chính */}
            <main className="flex-1">
              {children}
            </main>
        </div>
    </div>
  );
}
