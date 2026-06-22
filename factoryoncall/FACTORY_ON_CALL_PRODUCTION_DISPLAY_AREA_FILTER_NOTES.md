# Factory On Call — Production Display Area Filter Patch

Added an Area filter to the Production Display controls.

## Changes
- Added Area dropdown beside Sort.
- Defaults to All Areas.
- Loads active areas from company `areas` collection.
- Also includes station area names and areas from live calls as fallback.
- Filters displayed active calls by selected area.
- Bottom counters respect the selected area.
- Area selection persists per company in localStorage.
- Existing sort, auto-scroll, density, full screen, and live reconnect behavior preserved.

## Purpose
Allows each Production Display to be configured for either the full plant or one specific area such as Assembly, Welding, Tool Room, Shipping, etc.
