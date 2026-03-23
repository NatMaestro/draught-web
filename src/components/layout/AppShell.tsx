import { Outlet } from "react-router-dom";
import { motion } from "framer-motion";
import { DesktopSidebar } from "@/components/layout/DesktopSidebar";
import { MobileTabBar } from "@/components/layout/MobileTabBar";

export function AppShell() {
  return (
    <div className="flex min-h-[100dvh] bg-cream bg-mesh-radial">
      <DesktopSidebar />
      <motion.main
        initial={{ opacity: 0.96 }}
        animate={{ opacity: 1 }}
        className="relative flex min-h-[100dvh] min-w-0 flex-1 flex-col pb-24 md:pb-10"
      >
        <div className="mx-auto w-full max-w-3xl flex-1 px-0 md:max-w-[1200px] md:px-8 lg:px-10">
          <Outlet />
        </div>
      </motion.main>
      <MobileTabBar />
    </div>
  );
}
