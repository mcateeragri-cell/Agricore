export type Manufacturer =
  | "New Holland"
  | "John Deere"
  | "JCB"
  | "AGCO"
  | "Case IH"
  | "Claas"
  | "Kubota"
  | "Unknown";

const manufacturers = [
  {
    name: "New Holland",
    keywords: [
      "new holland",
      "electronic service tool",
      "est",
      "cnh",
      "cnhi",
      "plm",
      "t7",
      "t6",
      "t5",
      "t8",
      "cr",
      "cx",
      "fr",
      "lm",
      "boomer",
    ],
  },
  {
    name: "John Deere",
    keywords: [
      "john deere",
      "service advisor",
      "jdlink",
      "operations center",
      "6r",
      "7r",
      "8r",
      "9r",
      "9rx",
      "powertech",
    ],
  },
  {
    name: "JCB",
    keywords: [
      "jcb",
      "servicemaster",
      "livelink",
      "fastrac",
      "3cx",
      "4cx",
      "535",
      "540",
      "542",
      "hydradig",
      "tm320",
    ],
  },
  {
    name: "AGCO",
    keywords: [
      "agco",
      "massey",
      "massey ferguson",
      "fendt",
      "valtra",
      "challenger",
      "agco edt",
      "sisu",
    ],
  },
  {
    name: "Case IH",
    keywords: [
      "case ih",
      "afs",
      "maxxum",
      "puma",
      "magnum",
      "optum",
      "quadtrac",
    ],
  },
  {
    name: "Claas",
    keywords: [
      "claas",
      "lexion",
      "xerion",
      "axion",
      "arion",
    ],
  },
  {
    name: "Kubota",
    keywords: [
      "kubota",
      "m7",
      "m6",
      "m5",
      "bx",
      "l2501",
    ],
  },
] as const;

export function detectManufacturer(text: string): Manufacturer {
  const lower = text.toLowerCase();

  let bestScore = 0;
  let bestManufacturer: Manufacturer = "Unknown";

  for (const manufacturer of manufacturers) {
    let score = 0;

    for (const keyword of manufacturer.keywords) {
      if (lower.includes(keyword)) {
        score++;
      }
    }

    if (score > bestScore) {
      bestScore = score;
      bestManufacturer = manufacturer.name;
    }
  }

  return bestManufacturer;
}