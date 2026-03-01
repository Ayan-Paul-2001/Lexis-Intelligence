import play from 'play-dl';
async function test() {
    const url = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';
    try {
        const stream = await play.stream(url, { discordPlayerCompatibility: false });
        console.log(stream.type);
        let total = 0;
        stream.stream.on('data', chunk => {
            total += chunk.length;
        });
        stream.stream.on('end', () => {
            console.log('Done, size:', total);
        });
    } catch (e) {
        console.error(e);
    }
}
test();
