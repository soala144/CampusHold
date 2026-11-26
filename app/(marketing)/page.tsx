import { Audiences } from "@/components/marketing/audiences";
import { CategoriesStrip } from "@/components/marketing/categories-strip";
import { Faq } from "@/components/marketing/faq";
import { FinalCta } from "@/components/marketing/final-cta";
import { Hero } from "@/components/marketing/hero";
import { HowItWorks } from "@/components/marketing/how-it-works";
import { Problem } from "@/components/marketing/problem";
import { Trust } from "@/components/marketing/trust";

export default function HomePage() {
  return (
    <>
      <Hero />
      <CategoriesStrip />
      <Problem />
      <HowItWorks />
      <Audiences />
      <Trust />
      <Faq />
      <FinalCta />
    </>
  );
}
