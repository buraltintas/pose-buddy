export const SCENES = {
  boot: 'BootScene',
  home: 'HomeScene',
  game: 'GameScene',
  levelSelect: 'LevelSelectScene',
  gallery: 'GalleryScene',
  poseLibrary: 'PoseLibraryScene',
  settings: 'SettingsScene',
} as const;

export type SceneKey = (typeof SCENES)[keyof typeof SCENES];
