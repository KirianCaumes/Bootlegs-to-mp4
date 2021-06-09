import fs, { createWriteStream } from 'fs'
import ytdl from 'ytdl-core'
import axios from 'axios'
import dotenv from 'dotenv'

dotenv.config()

    ;
(async () => {
    const spreadsheet = {
        id: '1pHhsfhiihyAzzSA8pwOimy4feq2_5BSIuLUS3F0NLC8',
        range: "'In Flames'!A1:J300"
    }

    // Get data from Google Sheet
    const rows = (await axios.get(
        `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheet.id}/values/${spreadsheet.range}`, {
        params: {
            key: process.env.SPREADSHEET_KEY
        }
    }))
        .data.values
        .filter((_, i) => i > 0)
        .map(x => ({
            title: x[0],
            date: x[1],
            city: x[2],
            country: x[3],
            setlist: x[4],
            proShot: x[5],
            video: x[6],
            full: x[7],
            link: x[8],
            setlistfm: x[9],
            comment: x[10],
        }))

    for (const row of rows) {
        try {
            const url = new URL(row.link)

            // If not youtube, skip
            if (!url.host.includes('youtube.com'))
                continue

            /** 
             * Videos from Youtube API
             * @type {{id: string, title: string, description: string}[]} 
             */
            const items = []

            // Get all videos infos from playlist
            if (url.href.includes('playlist')) {
                (await axios.get(
                    'https://www.googleapis.com/youtube/v3/playlistItems', {
                    params: {
                        playlistId: url.searchParams.get('list'),
                        key: process.env.YOUTUBE_KEY,
                        part: 'snippet',
                        maxResults: 30,
                    }
                }))
                    .data.items
                    .forEach(x => items.push({
                        id: x?.snippet?.resourceId?.videoId,
                        title: x?.snippet?.title,
                        description: x?.snippet?.description,
                    }))
            } else {
                // Get video infos
                (await axios.get(
                    'https://www.googleapis.com/youtube/v3/videos', {
                    params: {
                        id: url.searchParams.get('v'),
                        key: process.env.YOUTUBE_KEY,
                        part: 'snippet',
                    }
                }))
                    .data.items
                    .forEach(x => items.push({
                        id: x?.id,
                        title: x?.snippet?.title,
                        description: x?.snippet?.description,
                    }))
            }

            const date = new Date(row.date.split('/').reverse().join('-'))
            const shortDate = date.toISOString()?.split('T')?.[0]

            const path = `videos/[${shortDate}] ${row.title}`

            if (fs.existsSync(path))
                continue

            fs.mkdirSync(path, { recursive: true })

            fs.writeFileSync(
                `${path}/README.md`,
                `# ${row.title}

            ## Informations

            - Date: ${shortDate ?? ''}
            - City: ${row.city ?? ''}
            - Country: ${row.country ?? ''}
            - ProShot: ${row.proShot ?? ''}
            - Video: ${row.video ?? ''}
            - Comment: ${row.comment ?? ''}
            - Link: ${row.link ?? ''}
            - Setlist.fm: ${row.setlistfm ?? ''}

            ## Setlist

            ${row.setlist?.split('\n')?.map((x, i) => `${i + 1}. ${x}`)?.join('\n') ?? row.setlist}

            ## More informations
            
            ${items[0].description}            
            `.replace(/^            /gm, '').trim() + '\n'
            )

            try {
                fs.writeFileSync(
                    `${path}/thumbnail.png`,
                    (await axios.get(`https://img.youtube.com/vi/${items[0].id}/hqdefault.jpg`, { responseType: "arraybuffer" })).data
                )
            } catch (error) { }

            for (const item of items) {
                await new Promise((resolve, reject) => {
                    const stream = ytdl(`http://www.youtube.com/watch?v=${item.id}`, { filter: 'audioandvideo', quality: 'highest' })
                    stream.pipe(createWriteStream(`${path}/${item.title}.mp4`))
                    stream.on('end', resolve)
                    stream.on('error', reject)
                })
            }

            console.log(`[SUCCESS] ${row.title}`)
        } catch (error) {
            console.error(`[FAIL]: ${row.title}`)
            continue
        }
    }
})()
