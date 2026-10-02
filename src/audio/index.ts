import { AudioService } from './AudioService';

/** Servicio de audio único de la aplicación (un solo AudioContext). */
export const audio = new AudioService();
