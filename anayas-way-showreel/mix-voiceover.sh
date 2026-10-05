#!/usr/bin/env bash
# Mix the narration over the music (music side-chain ducked under the voice),
# normalize to -14 LUFS, and mux into both cuts with an embedded subtitle track.
#   node audio.cjs && python3 voiceover.py --model … --voices …   (makes out/soundtrack.wav, out/voiceover.wav, out/captions.srt)
#   node render.cjs && node render.cjs --vertical                 (makes the two picture renders)
#   ./mix-voiceover.sh
set -euo pipefail
cd "$(dirname "$0")/out"
ffmpeg -hide_banner -loglevel error -y -i soundtrack.wav -i voiceover.wav -filter_complex "\
[1:a]highpass=f=90,acompressor=threshold=-20dB:ratio=3:attack=5:release=120:makeup=2,equalizer=f=3200:t=q:w=1.2:g=2.5,asplit=2[vo][key];\
[0:a]volume=0.9[mus];[mus][key]sidechaincompress=threshold=0.02:ratio=6:attack=25:release=350:makeup=1[duck];\
[duck][vo]amix=inputs=2:weights='1 1.15':normalize=0,alimiter=limit=0.89:level=false[m]" -map "[m]" -ar 48000 mix-raw.wav
I=$(ffmpeg -hide_banner -nostats -i mix-raw.wav -af ebur128 -f null - 2>&1 | grep -A2 "Integrated" | grep "I:" | awk '{print $2}')
G=$(python3 -c "print(-14-($I))")
ffmpeg -hide_banner -loglevel error -y -i mix-raw.wav -af "volume=${G}dB,alimiter=limit=0.84:level=false" mix.wav
for tag in 16x9 9x16; do
  ffmpeg -hide_banner -loglevel error -y -i "anayas-way-showreel-$tag.mp4" -i mix.wav -i captions.srt \
    -map 0:v -map 1:a -map 2 -c:v copy -c:a aac -b:a 256k -c:s mov_text -metadata:s:s:0 language=eng \
    -metadata:s:a:0 title="Voiceover + music" -movflags +faststart "anayas-way-showreel-$tag-voiceover.mp4"
  echo "wrote out/anayas-way-showreel-$tag-voiceover.mp4"
done
