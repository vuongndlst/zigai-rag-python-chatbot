/* app/admin/layout.tsx */
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ReactNode } from "react";

export default function AdminLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  /** 👇 toàn bộ mục trên sidebar */
  const navItems = [
    { href: "/admin", label: "Dashboard", exact: true },
    { href: "/admin/users", label: "Users" },
    { href: "/admin/sources", label: "Data Sources" },   // <-- tab mới
  ];

  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <aside className="w-60 bg-gray-50 border-r px-4 py-6 space-y-4">
        <h2 className="text-xl font-bold mb-4">Admin</h2>

        {navItems.map(({ href, label, exact }) => {
          const active = exact ? pathname === href : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={`block px-3 py-2 rounded transition
                ${active ? "bg-indigo-600 text-white" : "hover:bg-gray-200"}
              `}
            >
              {label}
            </Link>
          );
        })}
      </aside>

      {/* Main content */}
      <main className="flex-1 p-6">{children}</main>
    </div>
  );
}
