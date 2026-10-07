import type { LocalizedString, LocalizedStringList } from "../i18n/localize";

export type ResumeSkill = {
  topic: LocalizedString;
  description: LocalizedString;
};

export type ResumeExperience = {
  title: LocalizedString;
  place: string;
  period: LocalizedString;
  summary: LocalizedString;
  points: LocalizedStringList;
  instagram?: string;
  site?: string;
};

export type FeaturedProject = {
  name: string;
  case: LocalizedString;
  stack: string[];
  url?: string;
};

export type ResumeCredential = {
  title: LocalizedString;
  place: string;
  period: LocalizedString;
  certificate?: string;
  description?: LocalizedString;
  graduation?: LocalizedString;
};

export type Resume = {
  name: string;
  role: LocalizedString;
  city: string;
  phone: string;
  linkedin: string;
  email: string;
  summary: LocalizedString;
  skills: ResumeSkill[];
  experience: ResumeExperience[];
  featuredProjects: FeaturedProject[];
  education: ResumeCredential[];
  courses: ResumeCredential[];
};
