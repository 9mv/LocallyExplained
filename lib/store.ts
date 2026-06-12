import { Locale, Storypoint, StorypointRequest } from './types';

const seedStorypoints: Storypoint[] = [
  {
    id: 'cala-galdana-cliffs',
    slug: 'cala-galdana-cliffs',
    locationName: 'Cala Galdana',
    lat: 39.9376,
    lng: 3.9624,
    originalLocale: 'ca',
    translations: {
      ca: {
        title: 'Cala Galdana i els seus penya-segats',
        body: 'Cala Galdana és una de les badies més conegudes de Menorca. La seva forma tancada i els penya-segats que l’envolten expliquen la relació de l’illa amb el mar i el turisme de natura.'
      },
      es: {
        title: 'Cala Galdana y sus acantilados',
        body: 'Cala Galdana es una de las bahías más conocidas de Menorca. Su forma cerrada y los acantilados que la rodean explican la relación de la isla con el mar y el turismo de naturaleza.'
      },
      en: {
        title: 'Cala Galdana and its cliffs',
        body: 'Cala Galdana is one of the best-known bays in Menorca. Its sheltered shape and surrounding cliffs tell the story of the island’s bond with the sea and nature tourism.'
      }
    }
  },
  {
    id: 'mao-port-history',
    slug: 'mao-port-history',
    locationName: 'Maó Port',
    lat: 39.8894,
    lng: 4.2631,
    originalLocale: 'ca',
    translations: {
      ca: {
        title: 'El port de Maó',
        body: 'El port de Maó és un dels ports naturals més grans de la Mediterrània. Ha estat punt estratègic comercial i militar durant segles.'
      },
      es: {
        title: 'El puerto de Maó',
        body: 'El puerto de Maó es uno de los puertos naturales más grandes del Mediterráneo. Ha sido un punto estratégico comercial y militar durante siglos.'
      },
      en: {
        title: 'Maó Harbour',
        body: 'Maó Harbour is one of the largest natural harbours in the Mediterranean. It has been a strategic commercial and military point for centuries.'
      }
    }
  }
];

const seedRequests: StorypointRequest[] = [];

type Store = {
  storypoints: Storypoint[];
  requests: StorypointRequest[];
};

const storeKey = Symbol.for('locally-explained.store');

function getStore(): Store {
  const globalForStore = globalThis as typeof globalThis & { [storeKey]?: Store };

  if (!globalForStore[storeKey]) {
    globalForStore[storeKey] = {
      storypoints: seedStorypoints,
      requests: seedRequests
    };
  }

  return globalForStore[storeKey] as Store;
}

function createSlug(input: string) {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64);
}

export function listStorypoints() {
  return getStore().storypoints;
}

export function getStorypoint(id: string) {
  return getStore().storypoints.find((storypoint) => storypoint.id === id);
}

export function listRequests() {
  return getStore().requests;
}

export function createStorypointRequest(input: {
  title: string;
  body: string;
  email: string;
  locale: Locale;
  lat: number;
  lng: number;
}) {
  const request: StorypointRequest = {
    id: crypto.randomUUID(),
    ...input,
    status: 'pending',
    createdAt: new Date().toISOString()
  };

  getStore().requests.unshift(request);

  return request;
}

export function reviewStorypointRequest(id: string, decision: 'approved' | 'rejected') {
  const store = getStore();
  const request = store.requests.find((item) => item.id === id);

  if (!request) {
    return null;
  }

  request.status = decision;
  request.reviewedAt = new Date().toISOString();

  if (decision === 'approved') {
    store.storypoints.unshift({
      id: crypto.randomUUID(),
      slug: createSlug(request.title),
      locationName: request.title,
      lat: request.lat,
      lng: request.lng,
      originalLocale: request.locale,
      translations: {
        ca: { title: request.title, body: request.body },
        es: { title: request.title, body: request.body },
        en: { title: request.title, body: request.body }
      }
    });
  }

  return request;
}
