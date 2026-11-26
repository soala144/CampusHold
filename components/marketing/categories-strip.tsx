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
import { Container } from "@/components/ui/primitives";

const categories = [
  { label: "Design", icon: Palette },
  { label: "Development", icon: Code2 },
  { label: "Writing", icon: PenLine },
  { label: "Video", icon: Clapperboard },
  { label: "Photography", icon: Camera },
  { label: "Marketing", icon: Megaphone },
  { label: "Research & data", icon: ChartNoAxesColumn },
  { label: "Tutoring", icon: GraduationCap },
];

export function CategoriesStrip() {
  return (
    <Container>
      <div className="rounded-panel border border-line bg-surface px-6 py-7 md:px-10">
        <p className="text-center text-sm text-muted">Work you can hire for on CampusHold</p>
        <ul className="mt-5 flex flex-wrap items-center justify-center gap-x-8 gap-y-4">
          {categories.map(({ label, icon: Icon }) => (
            <li
              key={label}
              className="inline-flex items-center gap-2 text-[0.9375rem] font-medium tracking-tight text-muted"
            >
              <Icon className="size-4 text-subtle" aria-hidden />
              {label}
            </li>
          ))}
        </ul>
      </div>
    </Container>
  );
}
