// @ts-nocheck
import ytcog from 'ytcog'

/**
 * Download the video
 * @param {object} options options
 * @param {string=} cookie cookie
 * @param {string=} userAgent userAgent
 * @param {boolean=} debug debug
 * @returns {Promise<void>} Returns
 */
export default async function download(options, cookie, userAgent, debug) {
    const MyDL = class extends ytcog.Download {
        async fetch() {
            this.session.debugOn = this.debug
            await this.session.fetch()
            if (this.session.status === 'OK') {
                this.video = new ytcog.Video(this.session, this.options)
                this.video.debugOn = this.debug
                await this.video.fetch()
                if (this.video.status === 'OK') {
                    this.video.debug(this.video.info())
                    await this.video.download()
                    if (this.video.downloaded) {
                        this.video.debug('\n\nDone!')
                        this.video.debug(`Downloaded: ${this.video.fn}`)
                    } else {
                        throw new Error(`Video status: ${this.video.status} (${this.video.reason})`)
                    }
                } else {
                    throw new Error(`Video status: ${this.video.status} (${this.video.reason})`)
                }
            } else {
                throw new Error(`Session status: ${this.session.status} (${this.session.reason})`)
            }
        }
    }

    await (new MyDL(options, cookie, userAgent, debug)).fetch()
}
