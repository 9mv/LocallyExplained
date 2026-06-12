export type Locale = 'ca' | 'es' | 'en';

export type StoryTranslation = {
  title: string;
  body: string;
};

export type Storypoint = {
  id: string;
  slug: string;
  locationName: string;
  lat: number;
  lng: number;
  originalLocale: Locale;
  translations: Record<Locale, StoryTranslation>;
};

export type StorypointRequest = {
  id: string;
  title: string;
  body: string;
  email: string;
  locale: Locale;
  lat: number;
  lng: number;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
  reviewedAt?: string;
  reviewerNote?: string;
};

export type Messages = {
  appName: string;
  subtitle: string;
  mapTitle: string;
  mapCopy: string;
  requestStorypoint: string;
  cancelRequest: string;
  openStory: string;
  close: string;
  play: string;
  pause: string;
  tts: string;
  largerText: string;
  smallerText: string;
  askLocation: string;
  allowLocation: string;
  useDefault: string;
  requestFormTitle: string;
  requestFormEmail: string;
  requestFormStory: string;
  submitRequest: string;
  donationsTitle: string;
  whoWeAreTitle: string;
  adminTitle: string;
  adminLogin: string;
  password: string;
  login: string;
  approve: string;
  reject: string;
  pendingRequests: string;
};
