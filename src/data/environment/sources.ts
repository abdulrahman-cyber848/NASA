// Authoritative sources for the Lunar Environment Lab (all URLs verified 200).
export interface EnvSource { id: string; label: string; publisher: string; url: string }

export const ENV_SOURCES: EnvSource[] = [
  { id: 'regolith', label: 'What is Lunar Regolith?', publisher: 'NASA Science · Biological & Physical Sciences', url: 'https://science.nasa.gov/biological-physical/what-is-lunar-regolith/' },
  { id: 'hazards', label: 'What Hazards Are Caused by Lunar Regolith?', publisher: 'NASA Science · Biological & Physical Sciences', url: 'https://science.nasa.gov/biological-physical/what-hazards-are-caused-by-lunar-regolith/' },
  { id: 'mitigation', label: 'Dust Mitigation Technologies', publisher: 'NASA', url: 'https://www.nasa.gov/dust-mitigation/' },
  { id: 'suit-basics', label: 'Spacewalk Spacesuit Basics', publisher: 'NASA Johnson Space Center', url: 'https://www.nasa.gov/centers-and-facilities/johnson/spacewalk-spacesuit-basics/' },
  { id: 'artemis-suits', label: 'Artemis Generation Spacesuits (PDF)', publisher: 'NASA · 2023', url: 'https://www.nasa.gov/wp-content/uploads/2023/03/artemis-generation-spacesuits-508.pdf' },
];