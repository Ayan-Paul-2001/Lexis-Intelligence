import youtubedl from 'youtube-dl-exec';
import { Buffer } from 'buffer';

async function test() {
    const url = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';
    try {
        const subprocess = youtubedl.exec(url, {
            output: '-', // stdout
            format: 'bestaudio[ext=m4a]/bestaudio',
            noWarnings: true,
            noCallHome: true,
            noCheckCertificates: true,
            preferFreeFormats: true,
            youtubeSkipDashManifest: true
        }, { stdio: ['ignore', 'pipe', 'ignore'] });

        const chunks = [];
        if (subprocess.stdout) {
            for await (const chunk of subprocess.stdout) {
                chunks.push(chunk);
            }
            const buffer = Buffer.concat(chunks);
            console.log('Done, size:', buffer.length);
        } else {
            console.error('No stdout');
        }
    } catch (e) {
        console.error(e);
    }
}
test();
