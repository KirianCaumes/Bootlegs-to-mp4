/* eslint-disable no-await-in-loop */
import fs from 'fs'
import axios from 'axios'
import dotenv from 'dotenv'
import download from './utils/download'

dotenv.config()

const OUTPUT_FOLDER = 'outputs'

const SPREADSHEET = {
    id: '1pHhsfhiihyAzzSA8pwOimy4feq2_5BSIuLUS3F0NLC8',
    range: "'In Flames'!A1:J300",
}

if (!fs.existsSync(OUTPUT_FOLDER))
    fs.mkdirSync(OUTPUT_FOLDER, { recursive: true })

/**
 * Get data from Google Sheet
 * @type {{
 *  title: string;
 *  date: string;
 *  city: string;
 *  country: string;
 *  setlist: string;
 *  proShot: string;
 *  video: string;
 *  full: string;
 *  link: string;
 *  setlistfm: string;
 *  comment: string;
 * }[]}
 */
const rows = (await axios.get(
    `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET.id}/values/${SPREADSHEET.range}`,
    {
        params: {
            key: process.env.API_KEY,
        },
    },
))
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

// eslint-disable-next-line no-restricted-syntax
for (const row of rows)
    try {
        const url = new URL(row.link)

        // If not youtube, skip
        if (!url.host.includes('youtube.com'))
            // eslint-disable-next-line no-continue
            continue

        /**
         * Videos from Youtube API
         * @type {{id: string, title: string, description: string}[]}
         */
        const items = url.href.includes('playlist')
            // Get all videos infos from playlist
            // eslint-disable-next-line no-await-in-loop
            ? (await axios.get(
                'https://www.googleapis.com/youtube/v3/playlistItems',
                {
                    params: {
                        playlistId: url.searchParams.get('list'),
                        key: process.env.API_KEY,
                        part: 'snippet',
                        maxResults: 30,
                    },
                },
            ))
                .data.items
                .map(x => ({
                    id: x?.snippet?.resourceId?.videoId,
                    title: x?.snippet?.title,
                    description: x?.snippet?.description,
                }))
            // Get video infos
            // eslint-disable-next-line no-await-in-loop
            : (await axios.get(
                'https://www.googleapis.com/youtube/v3/videos',
                {
                    params: {
                        id: url.searchParams.get('v'),
                        key: process.env.API_KEY,
                        part: 'snippet',
                    },
                },
            ))
                .data.items
                .map(x => ({
                    id: x?.id,
                    title: x?.snippet?.title,
                    description: x?.snippet?.description,
                }))

        if (!items[0])
            // eslint-disable-next-line no-continue
            continue

        const date = new Date(row.date.split('/').reverse().join('-'))
        const shortDate = date.toISOString()?.split('T')?.[0]

        const path = `${OUTPUT_FOLDER}/[${shortDate}] ${row.title.replace(/[/|\\:*?"<>]/g, ' ')?.trim()}`

        if (fs.existsSync(path))
            // eslint-disable-next-line no-continue
            continue

        fs.mkdirSync(path, { recursive: true })

        fs.writeFileSync(
            `${path}/README.md`,
            `${`# ${row.title}

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
            `.replace(/^ {12}/gm, '').trim()}\n`,
        )

        try {
            fs.writeFileSync(
                `${path}/thumbnail.png`,
                // eslint-disable-next-line no-await-in-loop
                (await axios.get(`https://img.youtube.com/vi/${items[0].id}/hqdefault.jpg`, { responseType: 'arraybuffer' })).data,
            )
            // eslint-disable-next-line no-empty
        } catch (error) { }

        // eslint-disable-next-line no-restricted-syntax
        for (const [index, item] of items.entries())
            await download(
                {
                    id: item.id,
                    path,
                    filename: `${items?.length > 1 ? `${index + 1} - ` : ''}${item.title.replace(/[/|\\:*?"<>]/g, ' ')?.trim()}`,
                },
                process.env.COOKIE ? encodeURI(process.env.COOKIE) : undefined,
                process.env.USER_AGENT,
            )

        // eslint-disable-next-line no-console
        console.log(`[SUCCESS] ${row.title}`)
    } catch (error) {
        // eslint-disable-next-line no-console
        console.error(`[FAIL]: ${row.title}`)
        // eslint-disable-next-line no-console
        console.error(error)
        // eslint-disable-next-line no-continue
        continue
    }

process.exit(1)
