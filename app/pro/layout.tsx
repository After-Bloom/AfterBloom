import { ProProvider } from "@/components/pro/ProProvider";
import { DraftBadge } from "@/components/pro/DraftBadge";

export default function ProLayout({ children }: { children: React.ReactNode }) {
  return <ProProvider><DraftBadge />{children}</ProProvider>;
}
