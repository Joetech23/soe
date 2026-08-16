import {
  LayoutDashboard,
  BarChart3,
  ShoppingBag,
  Package,
  FolderTree,
  Download,
  Users,
  GraduationCap,
  FileText,
  MessageSquare,
  UserRound,
  Mail,
  Inbox,
  type LucideIcon,
} from 'lucide-react'

const MAP: Record<string, LucideIcon> = {
  LayoutDashboard,
  BarChart3,
  ShoppingBag,
  Package,
  FolderTree,
  Download,
  Users,
  GraduationCap,
  FileText,
  MessageSquare,
  UserRound,
  Mail,
  Inbox,
}

export function AdminIcon({ name, className }: { name: string; className?: string }) {
  const Cmp = MAP[name] ?? LayoutDashboard
  return <Cmp className={className} aria-hidden />
}
