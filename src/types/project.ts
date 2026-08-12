export type Project = {
  title: string;
  description: string;
  stack: string[];
  visibility: "public" | "private";
  category: string[];
  year: number;
  featured: boolean;
  openSource: boolean;

  image?: string;
  link?: string;

  visual: {
    background: string;
    accent: string;
    text: string;
  };
};
