export type MusicCategory = 'mv' | 'image' | 'mv_2d' | 'original'

export interface Music {
  id: number
  seq: number
  releaseConditionId: number
  categories: MusicCategory[]
  title: string
  lyricist: string
  composer: string
  arranger: string
  dancerCount: number
  selfDancerPosition: number
  assetbundleName: string
  liveTalkBackgroundAssetbundleName: string
  publishedAt: number
  liveStageId: number
  fillerSec: number
}
