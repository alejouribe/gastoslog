"use client";

import { NavTabs } from "@/components/layout/nav-tabs";
import { GuardaRuta } from "@/components/auth";
import { SyncProvider } from "@/contexts/sync-context";
import { PreferenciasProvider } from "@/contexts/preferencias-context";

function AppLayoutInner({ children }: { children: React.ReactNode }) {
  return (
    <GuardaRuta>
      <div className="min-h-screen bg-gray-50 max-w-mobile mx-auto relative">
        <main className="pb-20 min-h-screen">{children}</main>
        <NavTabs />
      </div>
    </GuardaRuta>
  );
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <PreferenciasProvider>
      <SyncProvider>
        <AppLayoutInner>{children}</AppLayoutInner>
      </SyncProvider>
    </PreferenciasProvider>
  );
}
