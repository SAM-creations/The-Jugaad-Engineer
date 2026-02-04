# Requirements Document: The Jugaad Engineer

## 1. Problem Statement
Broken essential machinery combined with a lack of spare parts causes severe economic loss in remote areas. While scrap materials are abundant, the engineering knowledge to repurpose them is missing.

## 2. Proposed Solution
An AI-powered "Frugal Engineering" agent that uses Multimodal LLMs to analyze images of broken objects and available scrap, generating physics-valid repair instructions using only locally available materials.

## 3. Functional Requirements
* **Image Input:** Users must be able to capture/upload images of the broken item and the scrap pile.
* **Material Analysis:** The system must identify the structural properties of scrap (e.g., "Bamboo = Rigid", "Tire = Elastic").
* **Repair Logic Generation:** The AI must generate a step-by-step plan that connects the scrap to the break point.
* **Visual Guide:** The system should display icons or generated schematics for tools and actions (Cut, Tie, Glue).

## 4. Non-Functional Requirements
* **Latency:** Analysis should complete within 15 seconds.
* **Accessibility:** UI must be mobile-first and high-contrast.
* **Resilience:** Graceful degradation to text-mode if bandwidth is low.

## 5. Tech Stack Requirements
* **Frontend:** React.js, Tailwind CSS, Vite.
* **AI Models:** Google Gemini 3 (Thinking Mode), Gemini 2.5 Flash.
* **Deployment:** Vercel.
