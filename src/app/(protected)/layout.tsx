import React from "react";
import { auth } from "@clerk/nextjs/server";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "./dashboard/app-sidebar";
import { ProfileArea } from "./profile-area";
type Props = {
  children: React.ReactNode;
};

const SidebarLayout = async ({ children }: Props) => {
  await auth.protect();

  return (
    <SidebarProvider>
      <AppSidebar />
      <main className="m-2 w-full">
        <div className="border-sidebar-border bg-sidebar flex items-center gap-2 rounded-md border p-2 px-4 shadow">
          {/* <SearchBar /> */}
          <ProfileArea />
        </div>
        <div className="mt-4 h-4">
          {/* Main Content */}
          <div className="border-sidebar-border bg-sidebar h-[calc(100vh-5rem)] overflow-y-scroll rounded-md border p-4 shadow">
            {children}
          </div>
        </div>
      </main>
    </SidebarProvider>
  );
};

export default SidebarLayout;
