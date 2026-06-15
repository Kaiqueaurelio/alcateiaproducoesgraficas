import { createFileRoute } from "@tanstack/react-router";
import { GraphicServiceCalculator } from "@/components/GraphicServiceCalculator";

export const Route = createFileRoute("/_authenticated/calculator")({
  component: CalculatorPage,
});

function CalculatorPage() {
  return <GraphicServiceCalculator />;
}
