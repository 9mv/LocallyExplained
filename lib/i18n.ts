import { Locale, Messages, Storypoint } from './types';

const messages: Record<Locale, Messages> = {
  ca: {
    appName: 'LocallyExplained',
    subtitle: 'Guia de històries locals sobre mapa interactiu',
    mapTitle: 'Mapa interactiu',
    mapCopy: 'Explora punts d’interès, obre històries i demana nous storypoints.',
    requestStorypoint: 'Request a storypoint',
    cancelRequest: 'Cancel request',
    openStory: 'Play',
    close: 'Tanca',
    play: 'Play',
    pause: 'Pause',
    tts: 'Text-to-speech',
    largerText: 'A+ text',
    smallerText: 'A- text',
    askLocation: 'Vols usar la teva ubicació per centrar el mapa?',
    allowLocation: 'Permet ubicació',
    useDefault: 'Usar Menorca',
    requestFormTitle: 'Títol',
    requestFormEmail: 'Email',
    requestFormStory: 'Text de la història',
    submitRequest: 'Enviar sol·licitud',
    donationsTitle: 'Donacions',
    whoWeAreTitle: 'Qui som',
    adminTitle: 'Administració',
    adminLogin: 'Login',
    password: 'Contrasenya',
    login: 'Entrar',
    approve: 'Accepta',
    reject: 'Descarta',
    pendingRequests: 'Sol·licituds pendents'
  },
  es: {
    appName: 'LocallyExplained',
    subtitle: 'Guía de historias locales sobre mapa interactivo',
    mapTitle: 'Mapa interactivo',
    mapCopy: 'Explora puntos de interés, abre historias y pide nuevos storypoints.',
    requestStorypoint: 'Request a storypoint',
    cancelRequest: 'Cancel request',
    openStory: 'Play',
    close: 'Cerrar',
    play: 'Play',
    pause: 'Pause',
    tts: 'Text-to-speech',
    largerText: 'A+ text',
    smallerText: 'A- text',
    askLocation: '¿Quieres usar tu ubicación para centrar el mapa?',
    allowLocation: 'Permitir ubicación',
    useDefault: 'Usar Menorca',
    requestFormTitle: 'Título',
    requestFormEmail: 'Email',
    requestFormStory: 'Texto de la historia',
    submitRequest: 'Enviar solicitud',
    donationsTitle: 'Donaciones',
    whoWeAreTitle: 'Quién somos',
    adminTitle: 'Administración',
    adminLogin: 'Login',
    password: 'Contraseña',
    login: 'Entrar',
    approve: 'Aceptar',
    reject: 'Descartar',
    pendingRequests: 'Solicitudes pendientes'
  },
  en: {
    appName: 'LocallyExplained',
    subtitle: 'Local story guide on an interactive map',
    mapTitle: 'Interactive map',
    mapCopy: 'Explore points of interest, open stories, and request new storypoints.',
    requestStorypoint: 'Request a storypoint',
    cancelRequest: 'Cancel request',
    openStory: 'Play',
    close: 'Close',
    play: 'Play',
    pause: 'Pause',
    tts: 'Text-to-speech',
    largerText: 'A+ text',
    smallerText: 'A- text',
    askLocation: 'Use your location to center the map?',
    allowLocation: 'Allow location',
    useDefault: 'Use Menorca',
    requestFormTitle: 'Title',
    requestFormEmail: 'Email',
    requestFormStory: 'Story text',
    submitRequest: 'Submit request',
    donationsTitle: 'Donations',
    whoWeAreTitle: 'Who we are',
    adminTitle: 'Administration',
    adminLogin: 'Login',
    password: 'Password',
    login: 'Enter',
    approve: 'Approve',
    reject: 'Reject',
    pendingRequests: 'Pending requests'
  }
};

export function isLocale(locale: string): locale is Locale {
  return locale === 'ca' || locale === 'es' || locale === 'en';
}

export function getMessages(locale: string): Messages {
  return messages[isLocale(locale) ? locale : 'ca'];
}

export function getLocaleStorypoint(storypoint: Storypoint, locale: Locale) {
  return storypoint.translations[locale] ?? storypoint.translations[storypoint.originalLocale];
}
