import axios from 'axios'
import fs from 'fs-extra'
import path from 'path'
import { flattenDeep } from 'lodash'
import { execSync } from 'child_process'

import { TaskQueue } from 'cwait'
import { createFFmpeg, fetchFile } from '@ffmpeg/ffmpeg'

import { getMusics } from './getMusics'
import { getMusicVocals } from './getMusicVocals'
import { updateMetadata } from './updateMetadata'

import { getAudioFull, getAudioShort } from './getAudio'
import { getMusicVideo } from './getMusicVideo'

import { Music } from './@types/Music'
import { getMetadata } from './getMetadata'

const ffmpegQueue = new TaskQueue(Promise, 1)
const ffmpeg = createFFmpeg({
  log: false,
})

const nextSekaiAssetsCachePath = path.join(__dirname, '../public')

const fetchCache = async (remoteUrl: string, localPath: string, unit: string) => {
  try {
    if (!fs.existsSync(localPath)) {
      console.log(`${unit} - download`)
      const res = await axios.get(remoteUrl, {
        responseType: 'arraybuffer',
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 11_2_3) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/89.0.4389.90 Safari/537.36 Edg/89.0.774.63',
          origin: 'https://sekai.best',
        },
      })

      if (!fs.existsSync(path.dirname(localPath))) {
        fs.mkdirSync(path.dirname(localPath), { recursive: true })
      }

      fs.writeFileSync(localPath, Buffer.from(res.data))

      updateMetadata(remoteUrl, {
        trimmed: false,
      })
    }
  } catch (e) {
    console.error(e)
    console.log(remoteUrl)
  }
}

;(async () => {
  // console.log('system - no-cache')
  // console.log('system - download-prebuilt')
  // const prebuiltZip = await axios.get(process.env.SEKAI_PREBUILT_URL, {
  //   responseType: 'arraybuffer'
  // })
  // if (!fs.existsSync(nextSekaiAssetsCachePath)) {
  //   fs.mkdirSync(nextSekaiAssetsCachePath, { recursive: true })
  // }
  // fs.writeFileSync(path.join(nextSekaiAssetsCachePath, '../prebuilt.zip'), Buffer.from(prebuiltZip.data))
  // console.log('system - extract-prebuilt')
  // execSync(`unzip ${path.join(nextSekaiAssetsCachePath, '../prebuilt.zip')} -d ${path.join(nextSekaiAssetsCachePath, '..')}`)
  // fs.rmSync(path.join(nextSekaiAssetsCachePath, '../prebuilt.zip'))

  const musics = await getMusics()
  const vocals = await getMusicVocals()

  const queue = new TaskQueue(Promise, 5)

  await Promise.all(
    musics.map(
      queue.wrap<void, Music>(async music => {
        const targetVocals = vocals.filter(vocal => vocal.musicId === music.id)

        await Promise.all(
          targetVocals.map(async musicVocal => {
            await Promise.all([
              fetchCache(
                getAudioFull(musicVocal.assetbundleName),
                path.join(
                  nextSekaiAssetsCachePath,
                  getAudioFull(musicVocal.assetbundleName, true)
                ),
                `music:${music.id}:vocal:${musicVocal.id}:full`,
              ),
              fetchCache(
                getAudioShort(musicVocal.assetbundleName),
                path.join(
                  nextSekaiAssetsCachePath,
                  getAudioShort(musicVocal.assetbundleName, true)
                ),
                `music:${music.id}:vocal:${musicVocal.id}:short`,
              ),
            ])
          })
        )
      })
    )
  )

  await Promise.all(
    musics.map(
      queue.wrap<void, Music>(async music => {
        const filteredMusicCategory = music.categories.filter(category =>
          ['original', 'mv_2d'].includes(category)
        )

        await Promise.all(
          filteredMusicCategory.map(async category => {
            await fetchCache(
              getMusicVideo(music.id, category),
              path.join(nextSekaiAssetsCachePath, getMusicVideo(music.id, category, true)),
              `video:${music.id}:${category}`,
            )
          })
        )
      })
    )
  )

  interface Item {
    remote: string
    local: string
    fillerSec: number
    type: string
    unit: string
  }

  const musicUrls = flattenDeep<Item>(
    musics.map(music => {
      const targetVocals = vocals.filter(vocal => vocal.musicId === music.id)
      return targetVocals.map(musicVocal => ({
        remote: getAudioFull(musicVocal.assetbundleName),
        local: path.join(
          nextSekaiAssetsCachePath,
          getAudioFull(musicVocal.assetbundleName, true)
        ),
        fillerSec: music.fillerSec,
        type: 'mp3',
        unit: `music:${music.id}:vocal:${musicVocal.id}`,
      }))
    })
  )
  const videoUrls = flattenDeep<Item>(
    musics.map(music => {
      const filteredMusicCategory = music.categories.filter(category =>
        ['original', 'mv_2d'].includes(category)
      )

      return filteredMusicCategory.map(category => ({
        remote: getMusicVideo(music.id, category),
        local: path.join(
          nextSekaiAssetsCachePath,
          getMusicVideo(music.id, category, true)
        ),
        fillerSec: music.fillerSec,
        type: 'mp4',
        unit: `video:${music.id}:${category}`,
      }))
    })
  )

  await Promise.all(
    [...musicUrls, ...videoUrls].map(
      ffmpegQueue.wrap<void, Item>(async item => {
        const metadata = getMetadata(item.remote)
        if (!(metadata?.data?.trimmed ?? false)) {
          console.log(`${item.unit} - ffmpeg`)

          if (!ffmpeg.isLoaded()) {
            await ffmpeg.load()
          }

          // load file
          ffmpeg.FS(
            'writeFile',
            `input.${item.type}`,
            await fetchFile(item.local)
          )
          await ffmpeg.run(
            '-ss',
            `${item.fillerSec}`,
            '-i',
            `input.${item.type}`,
            // '-vcodec',
            // 'libx264',
            // '-crf',
            // '24',
            `output.${item.type}`
          )
          await fs.promises.writeFile(
            item.local,
            ffmpeg.FS('readFile', `output.${item.type}`)
          )

          updateMetadata(item.remote, {
            trimmed: true,
          })
        }
      })
    )
  )
})()
