import axios from 'axios'
import fs from 'fs-extra'
import path from 'path'
import { flattenDeep } from 'lodash'
import { execSync } from 'child_process'

import { TaskQueue } from 'cwait'

import { getMusics } from './getMusics'
import { getMusicVocals } from './getMusicVocals'
import { updateMetadata } from './updateMetadata'

import {
	getAudioFull,
	getAudioShort,
	getAudioFullLostless,
	getAudioShortLostless,
} from './getAudio'
import { getMusicVideo } from './getMusicVideo'

import { Music } from './@types/Music'
import { getMetadata } from './getMetadata'

const ffmpegQueue = new TaskQueue(Promise, 12)

const nextSekaiAssetsCachePath = path.join(__dirname, '../public')

const fetchCache = async (
	remoteUrl: string,
	localPath: string,
	unit: string
) => {
	// ignore list
	if (['music:46:vocal:42:shortLostless'].includes(unit)) {
		return
	}

	try {
		if (!fs.existsSync(localPath) && (unit.startsWith('video:') && localPath.replace('.mp4', '.webm'))) {
			console.log(`${unit} - download`)
			const res = await axios.get(remoteUrl, {
				responseType: 'arraybuffer',
				headers: {
					'User-Agent':
						'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/103.0.5060.114 Safari/537.36 Edg/103.0.1264.51',
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
		console.log(unit)
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
								`music:${music.id}:vocal:${musicVocal.id}:full`
							),
							// fetchCache(
							//   getAudioFullLostless(musicVocal.assetbundleName),
							//   path.join(
							//     nextSekaiAssetsCachePath,
							//     getAudioFullLostless(musicVocal.assetbundleName, true)
							//   ),
							//   `music:${music.id}:vocal:${musicVocal.id}:fullLostless`,
							// ),
							fetchCache(
								getAudioShort(musicVocal.assetbundleName),
								path.join(
									nextSekaiAssetsCachePath,
									getAudioShort(musicVocal.assetbundleName, true)
								),
								`music:${music.id}:vocal:${musicVocal.id}:short`
							),
							// fetchCache(
							//   getAudioShortLostless(musicVocal.assetbundleName),
							//   path.join(
							//     nextSekaiAssetsCachePath,
							//     getAudioShortLostless(musicVocal.assetbundleName, true)
							//   ),
							//   `music:${music.id}:vocal:${musicVocal.id}:shortLostless`,
							// ),
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
							path.join(
								nextSekaiAssetsCachePath,
								getMusicVideo(music.id, category, true)
							),
							`video:${music.id}:${category}`
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

			return targetVocals.map(musicVocal =>
				[
					// 'lostless',
					'lossy',
				]
					.map(o => ({
						remote:
							o === 'lossy'
								? getAudioFull(musicVocal.assetbundleName)
								: getAudioFullLostless(musicVocal.assetbundleName),
						local: path.join(
							nextSekaiAssetsCachePath,
							o === 'lossy'
								? getAudioFull(musicVocal.assetbundleName, true)
								: getAudioFullLostless(musicVocal.assetbundleName, true)
						),
						fillerSec: music.fillerSec,
						type: o === 'lossy' ? 'mp3' : 'flac',
						unit: `music:${music.id}:vocal:${musicVocal.id}:${o}`,
					}))
					.flat()
			)
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

					// if (!ffmpeg.isLoaded()) {
					//   await ffmpeg.load()
					// }

					// // load file
					// ffmpeg.FS(
					//   'writeFile',
					//   `input.${item.type}`,
					//   await fetchFile(item.local)
					// )
					// await ffmpeg.run(
					//   '-ss',
					//   `${item.fillerSec}`,
					//   '-i',
					//   `input.${item.type}`,
					//   // '-vcodec',
					//   // 'libx264',
					//   // '-crf',
					//   // '24',
					//   `output.${item.type}`
					// )
					// await fs.promises.writeFile(
					//   item.local,
					//   ffmpeg.FS('readFile', `output.${item.type}`)
					// )

					try {
						fs.moveSync(
							item.local,
							path.join(path.dirname(item.local), `input.${item.type}`)
						)

						const command = 'ffmpeg'
						const args = [
							'-ss',
							item.fillerSec,
							'-i',
							path.join(path.dirname(item.local), `input.${item.type}`),
							// ...(item.type === 'mp4' ? ['-c:v', 'libx264', '-crf', '10'] : []),
							...(item.type === 'mp4' ? ['-c:v', 'libvpx-vp9', '-crf', '20', '-pix_fmt', 'yuv420p'] : []),
							item.type === 'mp4' ? item.local.replace('.mp4', '.webm') : item.local,
						]
						execSync(`${command} ${args.join(' ')}`)
						fs.rmSync(path.join(path.dirname(item.local), `input.${item.type}`))

						updateMetadata(item.remote, {
							trimmed: true,
						})
					} catch (e) {
						fs.appendFileSync('.cache/fail', `${item.unit}\n`)
					}
				}
			})
		)
	)
})()
