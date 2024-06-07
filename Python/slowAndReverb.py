import asyncio
from pydub import AudioSegment
from moviepy.audio.io.AudioFileClip import AudioFileClip
from pedalboard.io import AudioFile
from pedalboard import *
import os
import sys

sr = 44100

### IMPORTANT VARIABLES:
FILE_TO_CONVERT_TO_WAV = sys.argv[1] if len(sys.argv) > 1 else "input.mp3"
AUDIO_SPEED = float(sys.argv[2]) if len(sys.argv) > 2 else 1
ROOM_SIZE = float(sys.argv[3]) if len(sys.argv) > 3 else 0
DRY_LEVEL = float(sys.argv[4]) if len(sys.argv) > 4 else 1
WET_LEVEL = float(sys.argv[5]) if len(sys.argv) > 5 else 0
OUTPUT_FILE_NAME = sys.argv[6] if len(sys.argv) > 6 else "output.wav"


async def extract_audio_from_mp4(mp4_file, wav_file):
    audio_clip = AudioFileClip(mp4_file)
    await asyncio.to_thread(audio_clip.write_audiofile, wav_file)


def slow_down(audio, speed=AUDIO_SPEED):
    sound_with_altered_frame_rate = audio._spawn(
        audio.raw_data, overrides={"frame_rate": int(audio.frame_rate * speed)}
    )
    return sound_with_altered_frame_rate.set_frame_rate(audio.frame_rate)


async def main():
    await extract_audio_from_mp4(FILE_TO_CONVERT_TO_WAV, "input.wav")
    print("Audio extraction completed")
    with AudioFile("input.wav").resampled_to(sr) as f:
        audio = f.read(f.frames)
    if WET_LEVEL > 0:
        board = Pedalboard(
            [
                Reverb(room_size=ROOM_SIZE, wet_level=WET_LEVEL, dry_level=DRY_LEVEL),
            ]
        )
        effected = board(audio, sr)
    else:
        effected = audio
    with AudioFile("ir.wav", "w", sr, effected.shape[0]) as f:
        f.write(effected)
    input_audio = AudioSegment.from_wav("ir.wav")
    slowed_audio = slow_down(input_audio, speed=AUDIO_SPEED)
    normalized_audio = slowed_audio.apply_gain(-slowed_audio.max_dBFS)
    normalized_audio.export(OUTPUT_FILE_NAME, format="wav")
    os.remove("./input.wav")
    os.remove("./ir.wav")


asyncio.run(main())
