export interface IAttachment {
  thumbnail?: string;
  type?: string;
  photoUrl?: string;
  photoHeight?: number;
  photoWidth?: number;
  url?: string;
  id?: string;
  ocrText?: string;
}

export interface IComment {
  id?: string;
  text?: string;
  author?: string;
  authorId?: string;
  authorProfilePicture?: string;
  date?: string;
  likesCount?: number;
}

export interface Job {
  _id: string;
  jobTitle: string;
  company: string;
  location: string;
  salary: string;
  jobType: string;
  description: string;
  requirements: string[];
  contactInfo: string;
  contactEmail: string;
  contactPhone: string;
  postedDate: string;
  sourceUrl: string;
  rawText: string;
  category: string;
  groupUrl: string;
  scrapedAt: string;
  facebookUrl: string;
  postTime: string;
  userName: string;
  userId: string;
  likesCount: number;
  sharesCount: number;
  commentsCount: number;
  topReactionsCount: number;
  groupTitle: string;
  facebookId: string;
  attachments: IAttachment[];
  ocrTexts: string[];
  topComments: IComment[];
  createdAt: string;
  updatedAt: string;
}

export interface Category {
  slug: string;
  name: string;
  count: number;
}

export type FilterType = 'newest' | 'oldest' | 'relevance';

export interface JobQueryParams {
  search?: string;
  category?: string;
  jobType?: string;
  location?: string;
  filter?: FilterType;
  page?: number;
  limit?: number;
}
