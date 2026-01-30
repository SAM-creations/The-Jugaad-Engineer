
import { RepairGuide } from '../types';

export const DEMO_GUIDE: RepairGuide = {
  title: "Simple Fan Fix using Bamboo",
  summary: "Don't throw away your broken fan! We can fix the broken neck using just two bamboo sticks and some rubber bands. It's strong and easy.",
  brokenObjectAnalysis: "The fan's neck is snapped. It can't hold the heavy motor head up anymore. The plastic is broken, but the motor works fine.",
  scrapPileAnalysis: "We found some strong bamboo sticks and an old bike inner tube. This is perfect. Bamboo is strong like a bone, and the rubber will grip it tight.",
  steps: [
    {
      title: "Prepare the Bamboo Splints",
      description: "Take two pieces of bamboo, about as long as a pencil. Split them in half so they are flat on one side. These will act like a splint for a broken bone.",
      materialUsed: "Bamboo sticks, Knife/Pliers",
      physicsPrinciple: "Splinting: The bamboo supports the weight so the plastic doesn't have to.",
      visualizationPrompt: "Macro photo of hands using pliers to split a bamboo stick on a workshop table.",
      actionType: 'CUT'
    },
    {
      title: "Cut Rubber Strips",
      description: "Cut the old bike tube into long strips, like big rubber bands. We need them to be stretchy and strong.",
      materialUsed: "Rubber inner tube, Scissors",
      physicsPrinciple: "Elasticity: Rubber wants to shrink back, which creates a very strong grip.",
      visualizationPrompt: "Close up of scissors cutting black rubber strips from an inner tube.",
      actionType: 'CUT'
    },
    {
      title: "Tie It All Together",
      description: "Hold the fan head in the right place. Put the bamboo sticks on both sides of the broken neck. Wrap the rubber strips TIGHTLY around everything. Wrap it many times until it feels solid.",
      materialUsed: "Fan, Bamboo, Rubber strips",
      physicsPrinciple: "Friction: The tight rubber pushes the bamboo against the fan so it cannot slip.",
      visualizationPrompt: "Engineering hands wrapping black rubber bands around a green bamboo stick and a white plastic pipe.",
      actionType: 'TIE'
    }
  ]
};
