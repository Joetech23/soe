import {
  Sparkles,
  BookOpen,
  BookMarked,
  Calculator,
  Trophy,
  Users,
  Feather,
  Heart,
  Star,
  GraduationCap,
  Smile,
  MessageCircle,
  CalendarCheck,
  TrendingUp,
  CreditCard,
  Clock,
  Pencil,
  Volume2,
  HelpCircle,
  Calendar,
  Mic,
  Headphones,
  Mail,
  ArrowRight,
  Hourglass,
  Download,
  Quote,
  type LucideIcon,
} from 'lucide-react'

const ICONS: Record<string, LucideIcon> = {
  Sparkles,
  BookOpen,
  BookMarked,
  Calculator,
  Trophy,
  Users,
  Feather,
  Heart,
  Star,
  GraduationCap,
  Smile,
  MessageCircle,
  CalendarCheck,
  TrendingUp,
  CreditCard,
  Clock,
  Pencil,
  Volume2,
  HelpCircle,
  Calendar,
  Mic,
  Headphones,
  Mail,
  ArrowRight,
  Hourglass,
  Download,
  Quote,
}

export function Icon({
  name,
  className,
}: {
  name: string
  className?: string
}) {
  const Cmp = ICONS[name] ?? Sparkles
  return <Cmp className={className} aria-hidden />
}
