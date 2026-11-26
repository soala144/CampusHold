import {
  Camera,
  ChartNoAxesColumn,
  Code2,
  Megaphone,
  Palette,
  PenLine,
  GraduationCap,
  Clapperboard,
} from "lucide-react";
import Link from "next/link";
import { Container } from "@/components/ui/primitives";

const categories = [
  { id: "design", label: "Design", icon: Palette },
  { id: "development", label: "Development", icon: Code2 },
  { id: "writing", label: "Writing", icon: PenLine },
  { id: "video", label: "Video", icon: Clapperboard },
  { id: "photography", label: "Photography", icon: Camera },
  { id: "marketing", label: "Marketing", icon: Megaphone },
  { id: "research", label: "Research & data", icon: ChartNoAxesColumn },
  { id: "tutoring", label: "Tutoring", icon: GraduationCap },
];

export function CategoriesStrip() {
  return (
    <Container>
      <div className="rounded-panel border border-line bg-surface px-6 py-7 md:px-10">
        <p className="text-center text-sm text-muted">Browse services by category</p>
        <ul className="mt-5 flex flex-wrap items-center justify-center gap-x-8 gap-y-4">
          {categories.map(({ id, label, icon: Icon }) => (
            <li key={id}>
              <Link
                href={`/explore?category=${id}`}
                className="inline-flex items-center gap-2 text-[0.9375rem] font-medium tracking-tight text-muted transition-colors hover:text-ink"
              >
                <Icon className="size-4 text-subtle" aria-hidden />
                {label}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </Container>
  );
}
