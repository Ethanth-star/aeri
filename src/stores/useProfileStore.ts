import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface UserProfile {
  userName: string;
  userAvatar: string; // Emoji, preset ID, or base64 data URL
  petName: string;
  petAvatar: string;
}

interface ProfileState extends UserProfile {
  showProfileModal: boolean;
}

interface ProfileActions {
  openProfileModal: () => void;
  closeProfileModal: () => void;
  toggleProfileModal: () => void;
  updateProfile: (profile: Partial<UserProfile>) => void;
  resetProfile: () => void;
}

const DEFAULT_PROFILE: UserProfile = {
  userName: "主人",
  userAvatar: "🦊", // 默认可爱小狐狸
  petName: "Aeri",
  petAvatar: "puppy",
};

export const PRESET_AVATARS = [
  "🦊", "🐱", "🐰", "🐼", "🐻", "🐨", "🦁", "🐯",
  "👑", "🌟", "🚀", "🎮", "☕", "🌸", "🍀", "🎵"
];

export const useProfileStore = create<ProfileState & ProfileActions>()(
  persist(
    (set) => ({
      ...DEFAULT_PROFILE,
      showProfileModal: false,

      openProfileModal: () => set({ showProfileModal: true }),
      closeProfileModal: () => set({ showProfileModal: false }),
      toggleProfileModal: () => set((s) => ({ showProfileModal: !s.showProfileModal })),

      updateProfile: (partial) => set((s) => ({ ...s, ...partial })),
      resetProfile: () => set(() => ({ ...DEFAULT_PROFILE })),
    }),
    {
      name: "aeri_user_profile",
      partialize: (state) => ({
        userName: state.userName,
        userAvatar: state.userAvatar,
        petName: state.petName,
        petAvatar: state.petAvatar,
      }),
    }
  )
);
