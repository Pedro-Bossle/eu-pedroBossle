import type { LocalizedString, LocalizedStringList } from "../i18n/localize";

export type ProjectCase = {
  context: LocalizedString;
  challenge: LocalizedString;
  solution: LocalizedString;
  result: LocalizedString;
  quote?: {
    text: LocalizedString;
    attribution: LocalizedString;
  };
};

export type Project = {
  title: string;
  description: LocalizedString;
  stack: string[];
  visibility: "public" | "private";
  category: LocalizedStringList;
  year: number;
  featured: boolean;
  openSource: boolean;

  image?: string;
  link?: string;

  visual: {
    background: string;
    accent: string;
    text?: string;
  };
  case?: ProjectCase;
};
