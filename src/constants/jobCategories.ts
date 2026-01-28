export interface CategoryDef {
  slug: string;
  name: string;
  keywords: string[];
}

export const JOB_CATEGORIES: CategoryDef[] = [
  {
    slug: "blue-collar",
    name: "Blue Collar",
    keywords: [
      "construction", "plumber", "plumbing", "electrician", "welder", "welding",
      "carpenter", "carpentry", "mechanic", "painter", "roofing", "roofer",
      "mason", "masonry", "hvac", "landscaping", "landscaper", "janitor",
      "custodian", "maintenance", "handyman", "laborer", "labour", "labor",
      "warehouse", "forklift", "factory", "assembly", "manufacturing",
    ],
  },
  {
    slug: "healthcare",
    name: "Healthcare",
    keywords: [
      "nurse", "nursing", "rn", "lpn", "cna", "medical", "healthcare",
      "health care", "hospital", "clinic", "dental", "dentist", "pharmacy",
      "pharmacist", "caregiver", "caregiving", "home health", "therapist",
      "therapy", "physician", "doctor", "emt", "paramedic",
    ],
  },
  {
    slug: "tech",
    name: "Tech",
    keywords: [
      "software", "developer", "engineer", "programming", "programmer",
      "frontend", "backend", "fullstack", "full-stack", "devops", "cloud",
      "data scientist", "data analyst", "machine learning", "ai ", "web developer",
      "mobile developer", "ios", "android", "react", "node", "python", "java",
      "it support", "cybersecurity", "network", "sysadmin", "database",
    ],
  },
  {
    slug: "sales-marketing",
    name: "Sales & Marketing",
    keywords: [
      "sales", "marketing", "advertising", "social media", "seo", "sem",
      "content writer", "copywriter", "brand", "account manager",
      "business development", "lead generation", "telemarketing",
      "real estate agent", "realtor", "insurance agent",
    ],
  },
  {
    slug: "food-hospitality",
    name: "Food & Hospitality",
    keywords: [
      "cook", "chef", "kitchen", "restaurant", "server", "waitress", "waiter",
      "bartender", "barista", "dishwasher", "food service", "catering",
      "hotel", "hospitality", "housekeeper", "housekeeping", "front desk",
    ],
  },
  {
    slug: "admin-office",
    name: "Admin & Office",
    keywords: [
      "admin", "administrative", "receptionist", "secretary", "office manager",
      "data entry", "clerk", "bookkeeper", "bookkeeping", "accounting",
      "accountant", "hr ", "human resources", "payroll", "customer service",
      "call center",
    ],
  },
  {
    slug: "education",
    name: "Education",
    keywords: [
      "teacher", "teaching", "tutor", "tutoring", "instructor", "professor",
      "education", "school", "daycare", "childcare", "nanny", "babysitter",
      "training", "trainer",
    ],
  },
  {
    slug: "transportation-logistics",
    name: "Transportation & Logistics",
    keywords: [
      "driver", "driving", "cdl", "truck", "delivery", "courier", "shipping",
      "logistics", "dispatcher", "freight", "moving", "mover", "uber", "lyft",
      "rideshare", "taxi", "bus driver",
    ],
  },
];

export function categorizeJob(title: string, description: string): string {
  const text = `${title} ${description}`.toLowerCase();

  for (const cat of JOB_CATEGORIES) {
    for (const keyword of cat.keywords) {
      if (text.includes(keyword)) {
        return cat.slug;
      }
    }
  }

  return "other";
}
