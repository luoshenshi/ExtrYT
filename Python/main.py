import sys
import numpy as np
import librosa
from pedalboard import Pedalboard, Reverb
from pedalboard.io import AudioFile


def main():
    if len(sys.argv) < 3:
        print(
            "Usage: python main.py input_file.mp3 speed [room_size damping wet_level dry_level width]"
        )
        sys.exit(1)

    input_file = sys.argv[1]
    speed = float(sys.argv[2])

    # Defaults
    room_size, damping, wet_level, dry_level, width = 0.7, 0.5, 0.35, 0.9, 0.9

    if len(sys.argv) >= 8:
        room_size, damping, wet_level, dry_level, width = map(float, sys.argv[3:8])

    # Load audio
    with AudioFile(input_file) as f:
        audio = f.read(f.frames).astype(np.float32)
        samplerate = f.samplerate

    # Convert to mono~
    if audio.ndim == 1:
        mono_audio = audio
    elif audio.shape[0] == 1:
        mono_audio = audio[0]
    else:
        mono_audio = np.mean(audio, axis=0)

    # Slowdown via resampling
    fake_sr = int(samplerate * speed)
    slowed_audio = librosa.resample(
        mono_audio, orig_sr=fake_sr, target_sr=samplerate, res_type="kaiser_best"
    ).astype(np.float32)

    # Make stereo
    slowed_stereo = np.vstack([slowed_audio, slowed_audio])

    # Apply reverb
    board = Pedalboard(
        [
            Reverb(
                room_size=room_size,
                damping=damping,
                wet_level=wet_level,
                dry_level=dry_level,
                width=width,
            )
        ]
    )
    processed = board(slowed_stereo, samplerate)

    # Normalize
    max_val = np.max(np.abs(processed))
    if max_val > 0:
        processed = processed / max_val * 0.95

    # Save
    out_file = "output/final_output.wav"
    with AudioFile(out_file, "w", samplerate, processed.shape[0]) as f:
        f.write(processed.astype(np.float32))

    print(f"Done! Saved as {out_file}")


if __name__ == "__main__":
    main()
