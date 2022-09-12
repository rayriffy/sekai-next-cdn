import { MusicCategory } from './@types/Music'

export const getMusicVideo = (
	musicId: number,
	musicCategories: MusicCategory,
	trimmed?: boolean
) => {
	const mode =
		musicCategories === 'original'
			? 'original_mv'
			: musicCategories === 'mv_2d'
			? 'sekai_mv'
			: ''
	const paddedMusicId = String(musicId).padStart(4, '0')

	const fileNameSpecialCases = [
		[144, 'ainomaterial', ['mv_2d']],
		[143, 'traffic_jam', ['original']],
		[149, 'kanadetomosusora', ['mv_2d']],
		[156, 'beateater', ['mv_2d']],
		[224, '0244', ['mv_2d']],
	]
	const targetSpecialCase = fileNameSpecialCases.find(o => o[0] === musicId)
	const fileName =
		targetSpecialCase !== undefined &&
		(targetSpecialCase[2] as string[]).some(o => o === musicCategories)
			? targetSpecialCase[1]
			: paddedMusicId

	return trimmed
		? `live/2dmode/${mode}/${paddedMusicId}_rip/${paddedMusicId}.mp4`
		: `https://minio.dnaroma.eu/sekai-assets/live/2dmode/${mode}/${paddedMusicId}_rip/${fileName}.mp4`
}
