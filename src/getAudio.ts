export const getAudioShort = (
  musicVocalAssetbundleName: string,
  trimmed?: boolean
) =>
  trimmed
    ? `music/short/${musicVocalAssetbundleName}_rip/${musicVocalAssetbundleName}_short.mp3`
    : `https://minio.dnaroma.eu/sekai-assets/music/short/${musicVocalAssetbundleName}_rip/${musicVocalAssetbundleName}_short.mp3`
export const getAudioFull = (
  musicVocalAssetbundleName: string,
  trimmed?: boolean
) =>
  trimmed
    ? `music/long/${musicVocalAssetbundleName}_rip/${musicVocalAssetbundleName}.mp3`
    : `https://minio.dnaroma.eu/sekai-assets/music/long/${musicVocalAssetbundleName}_rip/${musicVocalAssetbundleName}.mp3`
export const getAudioShortLostless = (
  musicVocalAssetbundleName: string,
  trimmed?: boolean
) =>
  trimmed
    ? `music/short/${musicVocalAssetbundleName}_rip/${musicVocalAssetbundleName}_short.flac`
    : `https://minio.dnaroma.eu/sekai-assets/music/short/${musicVocalAssetbundleName}_rip/${musicVocalAssetbundleName}_short.flac`
export const getAudioFullLostless = (
  musicVocalAssetbundleName: string,
  trimmed?: boolean
) =>
  trimmed
    ? `music/long/${musicVocalAssetbundleName}_rip/${musicVocalAssetbundleName}.flac`
    : `https://minio.dnaroma.eu/sekai-assets/music/long/${musicVocalAssetbundleName}_rip/${musicVocalAssetbundleName}.flac`