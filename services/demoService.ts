
import { RepairGuide } from '../types';

export const DEMO_GUIDE: RepairGuide = {
  title: "Bamboo-Rubber Reinforced Fan Repair",
  summary: "A structural repair using split bamboo segments and high-tensile elastic rubber bands to restore a snapped pedestal fan neck.",
  brokenObjectAnalysis: "The primary failure point is a clean horizontal snap at the neck of the plastic pedestal fan housing. While the motor and wiring remain functional, the structural integrity is compromised, causing the fan head to droop dangerously.",
  scrapPileAnalysis: "Identified two rigid bamboo segments (high compressive strength) and a discarded bicycle inner tube (excellent elastic recovery and friction coefficient).",
  steps: [
    {
      title: "Splint Fabrication",
      description: "Select two bamboo segments approximately 20cm in length. Using pliers, split them longitudinally to create flat inner surfaces that can sit flush against the circular profile of the fan housing.",
      materialUsed: "Bamboo, pliers",
      physicsPrinciple: "Structural Splinting - Distributes mechanical stress across a larger surface area.",
      visualizationPrompt: "Macro photo of hands using pliers to split a bamboo stick on a workshop table.",
      generatedImageUrl: "https://images.unsplash.com/photo-1530124566582-aa37dd159a5d?q=80&w=1000&auto=format&fit=crop"
    },
    {
      title: "Tension Band Preparation",
      description: "Slice the rubber inner tube into continuous strips roughly 2cm wide. These will serve as high-tension fasteners that provide the necessary clamping force without slipping.",
      materialUsed: "Rubber inner tube, scissors",
      physicsPrinciple: "Elastic Tension - Uses stored potential energy to apply constant inward pressure (Normal Force).",
      visualizationPrompt: "Close up of scissors cutting black rubber strips from an inner tube.",
      generatedImageUrl: "https://images.unsplash.com/photo-1590236141027-80cdee577ce1?q=80&w=1000&auto=format&fit=crop"
    },
    {
      title: "Component Alignment",
      description: "Position the bamboo splints on opposite sides of the fracture. Wrap the rubber bands tightly around the assembly, ensuring the tension is high enough to lock the pieces into a rigid vertical column.",
      materialUsed: "Fan components, bamboo splints, rubber bands",
      physicsPrinciple: "Friction Locking - The high friction coefficient of rubber prevents the splints from sliding under the weight of the motor head.",
      visualizationPrompt: "Engineering hands wrapping black rubber bands around a green bamboo stick and a white plastic pipe.",
      generatedImageUrl: "https://images.unsplash.com/photo-1581092160562-40aa08e78837?q=80&w=1000&auto=format&fit=crop"
    }
  ]
};
