# System Design: The Jugaad Engineer

## 1. Architecture Overview
The application follows a standard Client-Serverless architecture. The React frontend handles image capture and compression, while serverless functions orchestrate the calls to the Gemini Multimodal API.

## 2. Data Flow
1.  **User Layer:** User uploads `Image A` (Broken) + `Image B` (Scrap).
2.  **Preprocessing:** Client-side resizing to <800px to optimize bandwidth.
3.  **Intelligence Layer (Gemini 3):**
    * *Input:* Compressed Images + Engineering System Prompt.
    * *Processing:* "Thinking Mode" analyzes physics constraints (Stress, Tension, Shear).
    * *Output:* Structured JSON containing repair steps, tool requirements, and risk assessment.
4.  **Presentation Layer:** React component maps JSON actions to SVG icons (e.g., "Cut" -> Scissors Icon) and renders the "Blueprint Card."

## 3. Component Diagram
* `[AppContainer]`
    * `[CameraInput]` -> Captures raw visual data.
    * `[AnalysisEngine]` -> Manages API state and error handling.
    * `[BlueprintView]` -> Renders the final repair steps.
    * `[TTSModule]` -> Converts text instructions to audio.
