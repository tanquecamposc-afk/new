import { create } from 'zustand';
import { persistence } from '@/persistence/PersistenceService';
import { ProfileService } from './ProfileService';
import type { ProfileData } from './types';

/** Servicio único del perfil local (preparado para sincronizar con cuentas en el futuro). */
export const profileService = new ProfileService(persistence);

/** Espejo reactivo del perfil para la UI. */
export const useProfile = create<{ profile: ProfileData }>(() => ({ profile: profileService.profile as ProfileData }));
profileService.subscribe((p) => useProfile.setState({ profile: p }));
