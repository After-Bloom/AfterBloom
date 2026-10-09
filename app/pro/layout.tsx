import { ProProvider } from "@/components/pro/ProProvider";

export default function ProLayout({ children }: { children: React.ReactNode }) {
  return <ProProvider>{children}</ProProvider>;
}
